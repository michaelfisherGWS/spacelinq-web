const {
  createCookieTokenStore,
  getSdk,
  getTrustedSdk,
  handleError,
  serialize,
} = require('../api-util/sdk');

/**
 * SpaceLinq instant booking.
 *
 * On a listing whose provider has turned on instant booking, confirming the
 * payment also accepts the booking and takes the payment, with no wait for
 * the provider. The transition is privileged so it can only run here, after
 * checking the listing.
 */
const CONFIRM_PAYMENT_INSTANT = 'transition/confirm-payment-instant';

const confirmInstant = (req, res) => {
  const { transactionId, queryParams } = req.body || {};
  if (!transactionId?.uuid) {
    return res.status(400).json({ error: 'transactionId is required' });
  }

  const tokenStore = createCookieTokenStore(req, res);
  const sdk = getSdk(req, res, tokenStore);

  sdk.transactions
    .show({ id: transactionId, include: ['listing'] })
    .then(response => {
      const listingId = response.data.data.relationships.listing.data.id.uuid;
      const listing = response.data.included.find(
        i => i.type === 'listing' && i.id.uuid === listingId
      );
      if (listing?.attributes?.publicData?.pricing?.instantBooking !== true) {
        const error = new Error('Error: this listing does not offer instant booking.');
        error.status = 403;
        error.statusText = error.message;
        error.data = {};
        throw error;
      }
      return getTrustedSdk(req, res, tokenStore);
    })
    .then(trustedSdk =>
      trustedSdk.transactions.transition(
        { id: transactionId, transition: CONFIRM_PAYMENT_INSTANT, params: {} },
        queryParams || {}
      )
    )
    .then(apiResponse => {
      const { status, statusText, data } = apiResponse;
      res
        .status(status)
        .set('Content-Type', 'application/transit+json')
        .send(serialize({ status, statusText, data }))
        .end();
    })
    .catch(e => {
      handleError(res, e);
    });
};

module.exports = confirmInstant;
