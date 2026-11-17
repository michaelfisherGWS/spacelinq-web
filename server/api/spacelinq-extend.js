const moment = require('moment-timezone');
const {
  createCookieTokenStore,
  getSdk,
  getTrustedSdk,
  handleError,
  fetchCommission,
} = require('../api-util/sdk');
const { transactionLineItems } = require('../api-util/lineItems');
const { UUID } = require('sharetribe-flex-sdk').types;

/**
 * SpaceLinq: keep an ongoing booking scheduled twelve months ahead.
 *
 * Sharetribe only lets the customer start a transaction, so an ongoing booking
 * cannot extend itself. The booking page calls this endpoint whenever the
 * customer opens it, and the next months are added and accepted straight away
 * (the provider accepted the ongoing booking at the start).
 *
 * Nothing is added when notice has been given or any month was cancelled or declined.
 * New months use the listing's current price.
 */
const MONTHLY_PROCESS_NAME = 'spacelinq-monthly';
const MONTHLY_PROCESS_ALIAS = `${MONTHLY_PROCESS_NAME}/release-1`;
const SCHEDULE_EXTENSION = 'transition/schedule-extension';
const MONTHS_AHEAD = 12;
const MAX_NEW_PERIODS_PER_CALL = 3;
const MAX_PERIODS = 600;

// The first month (default-booking) must have been accepted and not cancelled.
const ACTIVE_AGREEMENT_TRANSITIONS = [
  'transition/accept',
  'transition/operator-accept',
  'transition/complete',
  'transition/operator-complete',
  'transition/review-1-by-provider',
  'transition/review-2-by-provider',
  'transition/review-1-by-customer',
  'transition/review-2-by-customer',
  'transition/expire-review-period',
  'transition/expire-customer-review-period',
  'transition/expire-provider-review-period',
];
// A month in one of these states means the booking is ending or was refused.
const ENDED_INSTALMENT_TRANSITIONS = [
  'transition/decline',
  'transition/operator-decline',
  'transition/withdraw',
  'transition/expire',
  'transition/customer-cancel',
  'transition/provider-cancel',
  'transition/operator-cancel',
  'transition/provider-cancel-unpaid',
  'transition/operator-cancel-unpaid',
  'transition/operator-cancel-from-pending-confirmation',
  'transition/operator-refund',
];

/**
 * The monthly periods to add so the booking is scheduled `monthsAhead` months from now.
 * Periods continue from the last scheduled day and keep the day of month of the agreement start.
 *
 * @param {Object} params
 * @param {Date} params.agreementStart first day of the ongoing booking
 * @param {Date} params.scheduledUntil end (exclusive) of the last scheduled month
 * @param {Date} params.now
 * @param {string} params.timeZone IANA time zone of the listing
 * @param {number} [params.monthsAhead]
 * @returns {Array<{start: Date, end: Date}>} at most MAX_NEW_PERIODS_PER_CALL periods
 */
const nextPeriods = ({ agreementStart, scheduledUntil, now, timeZone, monthsAhead }) => {
  const tz = timeZone || 'Etc/UTC';
  const first = moment.tz(agreementStart, tz);
  const horizon = moment.tz(now, tz).add(monthsAhead || MONTHS_AHEAD, 'months');
  const periods = [];
  let start = moment.tz(scheduledUntil, tz);
  // Month boundary number of the first boundary after the scheduled end
  let k = 1;
  while (
    k < MAX_PERIODS &&
    !first
      .clone()
      .add(k, 'months')
      .isAfter(start)
  ) {
    k += 1;
  }
  while (periods.length < MAX_NEW_PERIODS_PER_CALL && k < MAX_PERIODS) {
    const end = first.clone().add(k, 'months');
    if (end.isAfter(horizon)) {
      break;
    }
    periods.push({ start: start.toDate(), end: end.toDate() });
    start = end;
    k += 1;
  }
  return periods;
};

const includedOf = (included, type, id) =>
  (included || []).find(i => i.type === type && i.id.uuid === id?.uuid);

const extend = (req, res) => {
  const { agreementId, monthsAhead: requestedMonthsAhead } = req.body || {};
  if (typeof agreementId !== 'string' || agreementId.length === 0) {
    return res.status(400).json({ error: 'agreementId is required' });
  }
  // Test sites may look further ahead so the extension can be tried without waiting a month.
  const isTestSite = process.env.REACT_APP_ENV !== 'production';
  const monthsAhead =
    isTestSite && Number.isInteger(requestedMonthsAhead) && requestedMonthsAhead <= 15
      ? requestedMonthsAhead
      : MONTHS_AHEAD;

  const tokenStore = createCookieTokenStore(req, res);
  const sdk = getSdk(req, res, tokenStore);
  const nothingAdded = () => res.status(200).json({ added: 0 });

  Promise.all([
    sdk.transactions.show({
      id: new UUID(agreementId),
      include: ['booking', 'listing', 'customer'],
    }),
    sdk.transactions.query({
      only: 'order',
      processNames: [MONTHLY_PROCESS_NAME],
      include: ['booking'],
      perPage: 100,
    }),
    sdk.currentUser.show(),
    fetchCommission(sdk),
  ])
    .then(([agreementResponse, instalmentsResponse, currentUserResponse, assetsResponse]) => {
      const agreementTx = agreementResponse.data.data;
      const { included } = agreementResponse.data;
      const agreement = agreementTx.attributes.protectedData?.agreement;
      const isCustomer =
        agreementTx.relationships?.customer?.data?.id?.uuid ===
        currentUserResponse.data.data.id.uuid;
      const isActive = ACTIVE_AGREEMENT_TRANSITIONS.includes(agreementTx.attributes.lastTransition);
      if (!isCustomer || !isActive || !agreement?.ongoing || !agreement?.start) {
        return null;
      }

      const instalments = instalmentsResponse.data.data.filter(
        tx => tx.attributes.protectedData?.agreementId === agreementId
      );
      const hasEnded = instalments.some(tx =>
        ENDED_INSTALMENT_TRANSITIONS.includes(tx.attributes.lastTransition)
      );
      if (hasEnded) {
        return null;
      }

      const listing = includedOf(included, 'listing', agreementTx.relationships.listing.data.id);
      const firstBooking = includedOf(
        included,
        'booking',
        agreementTx.relationships.booking.data.id
      );
      const bookingEnds = instalments
        .map(
          tx =>
            includedOf(
              instalmentsResponse.data.included,
              'booking',
              tx.relationships?.booking?.data?.id
            )?.attributes?.end
        )
        .filter(end => end instanceof Date);
      const scheduledUntil = new Date(
        Math.max(firstBooking.attributes.end.getTime(), ...bookingEnds.map(d => d.getTime()))
      );

      const periods = nextPeriods({
        agreementStart: new Date(agreement.start),
        scheduledUntil,
        now: new Date(),
        timeZone: listing.attributes.availabilityPlan?.timezone,
        monthsAhead,
      });
      if (periods.length === 0) {
        return null;
      }

      const commissionAsset = assetsResponse.data.data[0];
      const { providerCommission, customerCommission } =
        commissionAsset?.type === 'jsonAsset' ? commissionAsset.attributes.data : {};
      const seats = firstBooking.attributes.seats;
      const addOns = agreementTx.attributes.protectedData?.addOns;
      const insurance = agreementTx.attributes.protectedData?.insurance;
      const currency = listing.attributes.price?.currency;

      return periods.map((period, index) => ({
        processAlias: MONTHLY_PROCESS_ALIAS,
        transition: SCHEDULE_EXTENSION,
        params: {
          listingId: listing.id,
          bookingStart: period.start,
          bookingEnd: period.end,
          seats,
          lineItems: transactionLineItems(
            listing,
            {
              bookingStart: period.start,
              bookingEnd: period.end,
              seats,
              addOns,
              insurance,
              currency,
            },
            providerCommission,
            customerCommission,
            { skipMinTerm: true }
          ),
          protectedData: {
            agreementId,
            period: instalments.length + 2 + index,
            unitType: 'day',
            ...(Array.isArray(addOns) && addOns.length ? { addOns } : {}),
            ...(insurance ? { insurance } : {}),
          },
        },
      }));
    })
    .then(bodies => {
      if (!bodies) {
        return nothingAdded();
      }
      return getTrustedSdk(req, res, tokenStore)
        .then(trustedSdk =>
          // One at a time, and stop at the first month that cannot be booked.
          bodies.reduce(
            (chain, body) =>
              chain.then(result =>
                result.failed
                  ? result
                  : trustedSdk.transactions
                      .initiate(body)
                      .then(() => ({ ...result, added: result.added + 1 }))
                      .catch(() => ({ ...result, failed: true }))
              ),
            Promise.resolve({ added: 0, failed: false })
          )
        )
        .then(result => res.status(200).json({ added: result.added }));
    })
    .catch(e => {
      handleError(res, e);
    });
};

module.exports = extend;
module.exports.nextPeriods = nextPeriods;
