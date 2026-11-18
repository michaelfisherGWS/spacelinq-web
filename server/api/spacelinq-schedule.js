const moment = require('moment-timezone');
const { UUID } = require('sharetribe-flex-sdk').types;
const {
  createCookieTokenStore,
  getSdk,
  getTrustedSdk,
  handleError,
  fetchCommission,
} = require('../api-util/sdk');
const { transactionLineItems } = require('../api-util/lineItems');

/**
 * SpaceLinq: schedule the later months of an ongoing booking, straight after the
 * first month has been paid at checkout.
 *
 * Everything is worked out here from the first-month transaction (dates, quantity,
 * optional services, insurance), so the browser only sends the booking's id and the
 * months are created with one set of lookups. That keeps checkout fast.
 *
 * - Normal booking: the months wait for the provider's answer with the first month.
 * - Instant booking: the months are accepted straight away.
 * Months are created in order and scheduling stops at the first one that cannot be booked.
 */
const MONTHLY_PROCESS_NAME = 'spacelinq-monthly';
const MONTHLY_PROCESS_ALIAS = `${MONTHLY_PROCESS_NAME}/release-1`;
const SCHEDULE = 'transition/schedule';
const SCHEDULE_ACCEPTED = 'transition/schedule-extension';
const CONFIRM_PAYMENT = 'transition/confirm-payment';
const CONFIRM_PAYMENT_INSTANT = 'transition/confirm-payment-instant';
const MAX_PERIODS = 24;

/**
 * The monthly periods after the first one, counted from the agreement start in the
 * listing's time zone (15 Jan - 15 Feb is the first month, 15 Feb - 15 Mar the second...).
 *
 * @param {Date} agreementStart first day of the ongoing booking
 * @param {Date} agreementEnd end (exclusive) of the months to schedule now
 * @param {string} timeZone IANA time zone of the listing
 * @returns {Array<{start: Date, end: Date}>}
 */
const laterPeriods = (agreementStart, agreementEnd, timeZone) => {
  const tz = timeZone || 'Etc/UTC';
  const first = moment.tz(agreementStart, tz);
  const last = moment.tz(agreementEnd, tz);
  const periods = [];
  for (let k = 1; k < MAX_PERIODS; k += 1) {
    const start = first.clone().add(k, 'months');
    const end = first.clone().add(k + 1, 'months');
    if (end.isAfter(last)) {
      break;
    }
    periods.push({ start: start.toDate(), end: end.toDate() });
  }
  return periods;
};

const includedOf = (included, type, id) =>
  (included || []).find(i => i.type === type && i.id.uuid === id?.uuid);

// How many months are created at the same time.
const BATCH_SIZE = 4;

const inBatches = (items, size) =>
  items.reduce(
    (batches, item, i) =>
      i % size === 0
        ? [...batches, [item]]
        : [...batches.slice(0, -1), [...batches[batches.length - 1], item]],
    []
  );

const schedule = (req, res) => {
  const { agreementId } = req.body || {};
  if (typeof agreementId !== 'string' || agreementId.length === 0) {
    return res.status(400).json({ error: 'agreementId is required' });
  }

  const tokenStore = createCookieTokenStore(req, res);
  const sdk = getSdk(req, res, tokenStore);
  const nothingScheduled = () => res.status(200).json({ scheduled: 0, total: 0 });

  Promise.all([
    sdk.transactions.show({
      id: new UUID(agreementId),
      include: ['booking', 'listing', 'customer'],
    }),
    sdk.transactions.query({
      only: 'order',
      processNames: [MONTHLY_PROCESS_NAME],
      perPage: 100,
    }),
    sdk.currentUser.show(),
    fetchCommission(sdk),
  ])
    .then(([agreementResponse, instalmentsResponse, currentUserResponse, assetsResponse]) => {
      const agreementTx = agreementResponse.data.data;
      const { included } = agreementResponse.data;
      const { lastTransition, protectedData } = agreementTx.attributes;
      const agreement = protectedData?.agreement;
      const isCustomer =
        agreementTx.relationships?.customer?.data?.id?.uuid ===
        currentUserResponse.data.data.id.uuid;
      const isJustPaid = [CONFIRM_PAYMENT, CONFIRM_PAYMENT_INSTANT].includes(lastTransition);
      // Scheduling runs once: if this booking already has months, leave them alone.
      const alreadyScheduled = instalmentsResponse.data.data.some(
        tx => tx.attributes.protectedData?.agreementId === agreementId
      );
      if (!isCustomer || !isJustPaid || alreadyScheduled || !agreement?.start || !agreement?.end) {
        return null;
      }

      const listing = includedOf(included, 'listing', agreementTx.relationships.listing.data.id);
      const firstBooking = includedOf(
        included,
        'booking',
        agreementTx.relationships.booking.data.id
      );
      const periods = laterPeriods(
        new Date(agreement.start),
        new Date(agreement.end),
        listing.attributes.availabilityPlan?.timezone
      );

      const commissionAsset = assetsResponse.data.data[0];
      const { providerCommission, customerCommission } =
        commissionAsset?.type === 'jsonAsset' ? commissionAsset.attributes.data : {};
      const seats = firstBooking.attributes.seats;
      const { addOns, insurance } = protectedData;
      const currency = listing.attributes.price?.currency;
      const transition = lastTransition === CONFIRM_PAYMENT_INSTANT ? SCHEDULE_ACCEPTED : SCHEDULE;

      return periods.map((period, index) => ({
        processAlias: MONTHLY_PROCESS_ALIAS,
        transition,
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
            // The first month is period 1
            period: index + 2,
            unitType: 'day',
            ...(Array.isArray(addOns) && addOns.length ? { addOns } : {}),
            ...(insurance ? { insurance } : {}),
          },
        },
      }));
    })
    .then(bodies => {
      if (!bodies) {
        return nothingScheduled();
      }
      return getTrustedSdk(req, res, tokenStore)
        .then(trustedSdk =>
          // A few months at a time: one by one took about 40 seconds for a year.
          inBatches(bodies, BATCH_SIZE).reduce(
            (chain, batch) =>
              chain.then(result =>
                result.failed
                  ? result
                  : Promise.all(
                      batch.map(body =>
                        trustedSdk.transactions
                          .initiate(body)
                          .then(() => true)
                          .catch(() => false)
                      )
                    ).then(outcomes => ({
                      scheduled: result.scheduled + outcomes.filter(ok => ok).length,
                      failed: outcomes.some(ok => !ok),
                    }))
              ),
            Promise.resolve({ scheduled: 0, failed: false })
          )
        )
        .then(result =>
          res.status(200).json({ scheduled: result.scheduled, total: bodies.length })
        );
    })
    .catch(e => {
      handleError(res, e);
    });
};

module.exports = schedule;
module.exports.laterPeriods = laterPeriods;
module.exports.inBatches = inBatches;
