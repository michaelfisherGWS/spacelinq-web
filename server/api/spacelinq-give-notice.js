const moment = require('moment');
const { createCookieTokenStore, getSdk, getTrustedSdk, handleError } = require('../api-util/sdk');

/**
 * SpaceLinq: the customer gives notice to end an ongoing booking.
 *
 * Every scheduled month that starts after the notice period is cancelled.
 * Months that start inside the notice period stay and are charged as normal.
 */
const MONTHLY_PROCESS_NAME = 'spacelinq-monthly';
const NOTICE_MONTHS = 1;
const CUSTOMER_CANCEL = 'transition/customer-cancel';
// Last transitions of a month that is accepted but not yet due for payment
const SCHEDULED_TRANSITIONS = [
  'transition/accept',
  'transition/operator-accept',
  'transition/schedule-extension',
  'transition/update-charges',
];

/**
 * Pick the instalments that the notice cancels.
 *
 * @param {Array} transactions API transaction resources
 * @param {Array} included API included resources (bookings)
 * @param {string} agreementId uuid string of the first-month transaction
 * @param {Date} now
 * @returns {Array<{id: Object, start: Date}>} instalments to cancel, earliest first
 */
const pickCancellable = (transactions, included, agreementId, now) => {
  const noticeEnds = moment(now)
    .add(NOTICE_MONTHS, 'months')
    .toDate();
  const bookingStart = tx => {
    const bookingId = tx.relationships?.booking?.data?.id?.uuid;
    const booking = (included || []).find(i => i.type === 'booking' && i.id.uuid === bookingId);
    return booking?.attributes?.start;
  };
  return (transactions || [])
    .filter(tx => tx.attributes.protectedData?.agreementId === agreementId)
    .filter(tx => SCHEDULED_TRANSITIONS.includes(tx.attributes.lastTransition))
    .map(tx => ({ id: tx.id, start: bookingStart(tx) }))
    .filter(i => i.start instanceof Date && i.start >= noticeEnds)
    .sort((a, b) => a.start - b.start);
};

const giveNotice = (req, res) => {
  const { agreementId } = req.body || {};
  if (typeof agreementId !== 'string' || agreementId.length === 0) {
    return res.status(400).json({ error: 'agreementId is required' });
  }

  const tokenStore = createCookieTokenStore(req, res);
  const sdk = getSdk(req, res, tokenStore);
  let cancellable = [];

  sdk.transactions
    .query({
      only: 'order',
      processNames: [MONTHLY_PROCESS_NAME],
      include: ['booking'],
      perPage: 100,
    })
    .then(response => {
      cancellable = pickCancellable(
        response.data.data,
        response.data.included,
        agreementId,
        new Date()
      );
      return cancellable.length > 0 ? getTrustedSdk(req, res, tokenStore) : null;
    })
    .then(trustedSdk =>
      cancellable.reduce(
        (chain, instalment) =>
          chain.then(() =>
            trustedSdk.transactions.transition({
              id: instalment.id,
              transition: CUSTOMER_CANCEL,
              params: {},
            })
          ),
        Promise.resolve()
      )
    )
    .then(() => {
      res.status(200).json({
        cancelled: cancellable.length,
        // Storage ends when the first cancelled month would have started
        endsAt: cancellable.length > 0 ? cancellable[0].start.toISOString() : null,
      });
    })
    .catch(e => {
      handleError(res, e);
    });
};

module.exports = giveNotice;
module.exports.pickCancellable = pickCancellable;
