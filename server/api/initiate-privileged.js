const sharetribeSdk = require('sharetribe-flex-sdk');
const { assertExpectedPayinTotal } = require('../api-util/assertExpectedPayinTotal');
const { transactionLineItems } = require('../api-util/lineItems');
const { isIntentionToMakeOffer } = require('../api-util/negotiation');
const {
  createCookieTokenStore,
  getSdk,
  getTrustedSdk,
  handleError,
  serialize,
  fetchCommission,
} = require('../api-util/sdk');
const { sanitizePushPaymentBodyParams } = require('../api-util/pushPaymentMethodValidation');
const { isBookingRequest, withOrderRecord } = require('../api-util/spaceLinqOrderRecord');

const { Money } = sharetribeSdk.types;

const listingPromise = (sdk, id) => sdk.listings.show({ id });

const getFullOrderData = (orderData, bodyParams, currency) => {
  const { offerInSubunits } = orderData || {};
  const transitionName = bodyParams.transition;

  return isIntentionToMakeOffer(offerInSubunits, transitionName)
    ? {
        ...orderData,
        ...bodyParams.params,
        currency,
        offer: new Money(offerInSubunits, currency),
      }
    : { ...orderData, ...bodyParams.params };
};

const getMetadata = (orderData, transition) => {
  const { actor, offerInSubunits } = orderData || {};
  // NOTE: for now, the actor is always "provider".
  const hasActor = ['provider', 'customer'].includes(actor);
  const by = hasActor ? actor : null;

  return isIntentionToMakeOffer(offerInSubunits, transition)
    ? {
        metadata: {
          offers: [
            {
              offerInSubunits,
              by,
              transition,
            },
          ],
        },
      }
    : {};
};

module.exports = (req, res) => {
  const { isSpeculative, orderData, bodyParams: incomingBodyParams, queryParams } = req.body || {};
  let bodyParams;
  try {
    // Push payments (redirect): an example how to validate push payment method types. Unused by default.
    bodyParams = sanitizePushPaymentBodyParams(incomingBodyParams);
  } catch (e) {
    return handleError(res, e, { skipErrorLogging: true });
  }
  const transitionName = bodyParams.transition;
  // Share one cookie token store so a refresh during listings.show is reused for exchangeToken.
  const tokenStore = createCookieTokenStore(req, res);
  const sdk = getSdk(req, res, tokenStore);
  let lineItems = null;
  let metadataMaybe = {};
  let customer = null;

  // SpaceLinq: a real booking request records the storage agreement the customer
  // accepted and, for a business, the company name (sealed until confirmed).
  const isRecordedRequest = !isSpeculative && isBookingRequest(transitionName);
  if (isRecordedRequest && bodyParams?.params?.protectedData?.storageAgreementAccepted !== true) {
    return res
      .status(400)
      .json({ error: 'The storage agreement must be accepted before booking.' })
      .end();
  }
  const customerPromise = isRecordedRequest ? sdk.currentUser.show() : Promise.resolve(null);

  Promise.all([
    listingPromise(sdk, bodyParams?.params?.listingId),
    fetchCommission(sdk),
    customerPromise,
  ])
    .then(([showListingResponse, fetchAssetsResponse, customerResponse]) => {
      const listing = showListingResponse.data.data;
      customer = customerResponse?.data?.data || null;
      const commissionAsset = fetchAssetsResponse.data.data[0];

      // SpaceLinq: months that are accepted straight away may only be scheduled
      // on listings with instant booking.
      const isInstantSchedule =
        `${bodyParams?.processAlias || ''}`.startsWith('spacelinq-monthly/') &&
        transitionName === 'transition/schedule-extension';
      if (isInstantSchedule && listing.attributes.publicData?.pricing?.instantBooking !== true) {
        const error = new Error('Error: this listing does not offer instant booking.');
        error.status = 403;
        error.statusText = error.message;
        error.data = {};
        throw error;
      }

      const currency = listing.attributes.price?.currency || orderData.currency;
      const { providerCommission, customerCommission } =
        commissionAsset?.type === 'jsonAsset' ? commissionAsset.attributes.data : {};

      lineItems = transactionLineItems(
        listing,
        getFullOrderData(orderData, bodyParams, currency),
        providerCommission,
        customerCommission
      );

      // If the client sends expectedPayinTotal (checkout payment flows), ensure it
      assertExpectedPayinTotal(lineItems, orderData?.expectedPayinTotal);

      metadataMaybe = getMetadata(orderData, transitionName);

      return getTrustedSdk(req, res, tokenStore);
    })
    .then(trustedSdk => {
      const { params } = bodyParams;
      const protectedDataMaybe = isBookingRequest(transitionName)
        ? {
            protectedData: isRecordedRequest
              ? withOrderRecord(params?.protectedData, customer)
              : withOrderRecord(
                  { ...params?.protectedData, storageAgreementAccepted: false },
                  null
                ),
          }
        : {};

      // Add lineItems to the body params
      const body = {
        ...bodyParams,
        params: {
          ...params,
          ...protectedDataMaybe,
          lineItems,
          ...metadataMaybe,
        },
      };

      if (isSpeculative) {
        return trustedSdk.transactions.initiateSpeculative(body, queryParams);
      }
      return trustedSdk.transactions.initiate(body, queryParams);
    })
    .then(apiResponse => {
      const { status, statusText, data } = apiResponse;
      res
        .status(status)
        .set('Content-Type', 'application/transit+json')
        .send(
          serialize({
            status,
            statusText,
            data,
          })
        )
        .end();
    })
    .catch(e => {
      handleError(res, e);
    });
};
