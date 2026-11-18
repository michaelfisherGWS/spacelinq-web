const {
  calculateQuantityFromDates,
  calculateQuantityFromHours,
  calculateShippingFee,
  getProviderCommissionMaybe,
  getCustomerCommissionMaybe,
  hasCommissionPercentage,
  calculateTotalFromLineItems,
} = require('./lineItemHelpers');
const { types } = require('sharetribe-flex-sdk');
const momentTz = require('moment-timezone');
const { Money } = types;

/**
 * Get quantity and add extra line-items that are related to delivery method
 *
 * @param {Object} orderData should contain stockReservationQuantity and deliveryMethod
 * @param {*} publicData should contain shipping prices
 * @param {*} currency should point to the currency of listing's price.
 */
const getItemQuantityAndLineItems = (orderData, publicData, currency) => {
  // Check delivery method and shipping prices
  const quantity = orderData ? orderData.stockReservationQuantity : null;
  const deliveryMethod = orderData && orderData.deliveryMethod;
  const isShipping = deliveryMethod === 'shipping';
  const isPickup = deliveryMethod === 'pickup';
  const { shippingPriceInSubunitsOneItem, shippingPriceInSubunitsAdditionalItems } =
    publicData || {};

  // Calculate shipping fee if applicable
  const shippingFee = isShipping
    ? calculateShippingFee(
        shippingPriceInSubunitsOneItem,
        shippingPriceInSubunitsAdditionalItems,
        currency,
        quantity
      )
    : null;

  // Add line-item for given delivery method.
  // Note: by default, pickup considered as free and, therefore, we don't add pickup fee line-item
  const deliveryLineItem = !!shippingFee
    ? [
        {
          code: 'line-item/shipping-fee',
          unitPrice: shippingFee,
          quantity: 1,
          includeFor: ['customer', 'provider'],
        },
      ]
    : [];

  return { quantity, extraLineItems: deliveryLineItem };
};

const getOfferQuantityAndLineItems = orderData => {
  return { quantity: 1, extraLineItems: [] };
};

/**
 * Get quantity for digital items. The quantity is always 1, you can't have multiples of digital files.
 * @param {Object} orderData
 */
const getDigitalItemQuantityAndLineItems = orderData => {
  return { quantity: 1, extraLineItems: [] };
};

/**
 * Get quantity for fixed bookings with seats.
 * @param {Object} orderData
 * @param {number} [orderData.seats]
 */
const getFixedQuantityAndLineItems = orderData => {
  const { seats } = orderData || {};
  const hasSeats = !!seats;
  // If there are seats, the quantity is split to factors: units and seats.
  // E.g. 1 session x 2 seats (aka unit price is multiplied by 2)
  return hasSeats ? { units: 1, seats, extraLineItems: [] } : { quantity: 1, extraLineItems: [] };
};

/**
 * Get quantity for arbitrary units for time-based bookings.
 *
 * @param {Object} orderData
 * @param {string} orderData.bookingStart
 * @param {string} orderData.bookingEnd
 * @param {number} [orderData.seats]
 */
const getHourQuantityAndLineItems = orderData => {
  const { bookingStart, bookingEnd, seats } = orderData || {};
  const hasSeats = !!seats;
  const units =
    bookingStart && bookingEnd ? calculateQuantityFromHours(bookingStart, bookingEnd) : null;

  // If there are seats, the quantity is split to factors: units and seats.
  // E.g. 3 hours x 2 seats (aka unit price is multiplied by 6)
  return hasSeats ? { units, seats, extraLineItems: [] } : { quantity: units, extraLineItems: [] };
};

/**
 * Calculate quantity based on days or nights between given bookingDates.
 *
 * @param {Object} orderData
 * @param {string} orderData.bookingStart
 * @param {string} orderData.bookingEnd
 * @param {number} [orderData.seats]
 * @param {'line-item/day' | 'line-item/night'} code
 */
const getDateRangeQuantityAndLineItems = (orderData, code) => {
  const { bookingStart, bookingEnd, seats } = orderData;
  const hasSeats = !!seats;
  const units =
    bookingStart && bookingEnd ? calculateQuantityFromDates(bookingStart, bookingEnd, code) : null;

  // If there are seats, the quantity is split to factors: units and seats.
  // E.g. 3 nights x 4 seats (aka unit price is multiplied by 12)
  return hasSeats ? { units, seats, extraLineItems: [] } : { quantity: units, extraLineItems: [] };
};

/**
 * Returns collection of lineItems (max 50)
 *
 * All the line-items dedicated to _customer_ define the "payin total".
 * Similarly, the sum of all the line-items included for _provider_ create "payout total".
 * Platform gets the commission, which is the difference between payin and payout totals.
 *
 * Each line items has following fields:
 * - `code`: string, mandatory, indentifies line item type (e.g. \"line-item/cleaning-fee\"), maximum length 64 characters.
 * - `unitPrice`: money, mandatory
 * - `lineTotal`: money
 * - `quantity`: number
 * - `percentage`: number (e.g. 15.5 for 15.5%)
 * - `seats`: number
 * - `units`: number
 * - `includeFor`: array containing strings \"customer\" or \"provider\", default [\":customer\"  \":provider\" ]
 *
 * Line item must have either `quantity` or `percentage` or both `seats` and `units`.
 *
 * `includeFor` defines commissions. Customer commission is added by defining `includeFor` array `["customer"]` and provider commission by `["provider"]`.
 *
 * @param {Object} listing
 * @param {Object} orderData
 * @param {string} [orderData.priceVariantName] - The name of the price variant (potentially used with bookable unit types)
 * @param {Money} [orderData.offer] - The offer for the offer (if transition intent is "make-offer")
 * @param {Object} providerCommission
 * @param {Object} customerCommission
 * @returns {Array} lineItems
 */
// SpaceLinq: average days per month, used to pro-rata monthly add-on prices.
const DAYS_PER_MONTH = 365 / 12;

/**
 * SpaceLinq: line items for optional monthly services (add-ons) chosen by the customer.
 * Each add-on has a flat monthly price set by the provider, charged pro-rata for the booking.
 *
 * @param {Object} publicData listing public data (pricing.addOns: [{ key, price }])
 * @param {Object} orderData order data (addOns: [key])
 * @param {number} days booking length in days
 * @param {string} currency
 * @returns {Array} line items
 */
const getSpaceLinqAddOnLineItems = (publicData, orderData, days, currency) => {
  const offered = publicData?.pricing?.addOns || [];
  const selected = Array.isArray(orderData?.addOns) ? orderData.addOns : [];
  if (!days || offered.length === 0 || selected.length === 0) {
    return [];
  }
  return offered
    .filter(a => selected.includes(a.key) && Number.isInteger(a.price) && a.price > 0)
    .map(a => ({
      code: `line-item/addon-${a.key}`,
      unitPrice: new Money(Math.round((a.price * days) / DAYS_PER_MONTH), currency),
      quantity: 1,
      includeFor: ['customer', 'provider'],
    }));
};
exports.getSpaceLinqAddOnLineItems = getSpaceLinqAddOnLineItems;

/**
 * SpaceLinq: goods insurance. The provider sets a rate per $1,000 of goods per month
 * on the listing; the customer declares the value of their goods when booking.
 * Charged pro-rata for the booked days, like the other monthly services.
 *
 * @param {Object} publicData listing public data (pricing.insurance: { rate, dgRate, maxValue })
 * @param {Object} orderData order data (insurance: { value, dg }), value in cents
 * @param {number} days booking length in days
 * @param {string} currency
 * @returns {Array} zero or one line item
 * @throws 400 error if the listing does not offer the cover that was asked for
 */
const getSpaceLinqInsuranceLineItems = (publicData, orderData, days, currency) => {
  const request = orderData?.insurance;
  if (!request || !days) {
    return [];
  }
  const badRequest = message => {
    const error = new Error(message);
    error.status = 400;
    error.statusText = message;
    error.data = {};
    return error;
  };
  const offer = publicData?.pricing?.insurance;
  const value = Number(request.value);
  const rate = request.dg ? offer?.dgRate : offer?.rate;
  if (!Number.isInteger(offer?.rate) || !Number.isInteger(offer?.maxValue)) {
    throw badRequest('Error: this listing does not offer goods insurance.');
  }
  if (!Number.isInteger(rate) || rate <= 0) {
    throw badRequest('Error: this listing does not insure dangerous goods.');
  }
  if (!Number.isInteger(value) || value <= 0 || value > offer.maxValue) {
    throw badRequest('Error: the declared value is outside what this listing insures.');
  }
  const monthlyPremium = (value / 100000) * rate;
  const premium = Math.round((monthlyPremium * days) / DAYS_PER_MONTH);
  return premium > 0
    ? [
        {
          code: 'line-item/insurance',
          unitPrice: new Money(premium, currency),
          quantity: 1,
          includeFor: ['customer', 'provider'],
        },
      ]
    : [];
};
exports.getSpaceLinqInsuranceLineItems = getSpaceLinqInsuranceLineItems;

/**
 * SpaceLinq: flat monthly pricing.
 *
 * When a listing is priced per month and the booking is a whole number of calendar
 * months (15 Jan to 15 Feb, as every ongoing booking is), the customer is charged the
 * monthly price itself, not a daily rate multiplied by the days in that month.
 * Bookings that are not whole months, and listings priced per week, stay on the daily rate.
 *
 * @param {Object} listing listing with publicData.pricing ({ rate, cycle }) and availabilityPlan
 * @param {Object} orderData order data (bookingStart, bookingEnd, seats)
 * @param {string} currency
 * @returns {{lineItem: Object, months: number}|null} the storage line item, or null to use the daily rate
 */
const getSpaceLinqFlatMonthly = (listing, orderData, currency) => {
  const pricing = listing?.attributes?.publicData?.pricing;
  const { bookingStart, bookingEnd, seats } = orderData || {};
  const isMonthlyRate = pricing?.cycle === 'month' && Number.isInteger(pricing?.rate);
  if (!isMonthlyRate || pricing.rate <= 0 || pricing.model === 'quote') {
    return null;
  }
  if (!bookingStart || !bookingEnd) {
    return null;
  }
  const timeZone = listing.attributes.availabilityPlan?.timezone || 'Etc/UTC';
  const start = momentTz.tz(bookingStart, timeZone);
  const end = momentTz.tz(bookingEnd, timeZone);
  const months = end.diff(start, 'months');
  const isWholeMonths =
    months >= 1 &&
    start
      .clone()
      .add(months, 'months')
      .isSame(end);
  if (!isWholeMonths) {
    return null;
  }
  return {
    months,
    lineItem: {
      code: 'line-item/month',
      unitPrice: new Money(pricing.rate, currency),
      units: months,
      seats: Number.isInteger(seats) && seats > 0 ? seats : 1,
      includeFor: ['customer', 'provider'],
    },
  };
};
exports.getSpaceLinqFlatMonthly = getSpaceLinqFlatMonthly;

/**
 * SpaceLinq: a separate price for short stays.
 *
 * A provider can set a daily rate next to the monthly (or weekly) price. A booking
 * shorter than one calendar month is charged that daily rate per day. A month or
 * more keeps the monthly price, so neither price is worked out from the other.
 * Listings priced per day already have the daily rate as their listing price.
 *
 * @param {Object} listing listing with publicData.pricing ({ dailyRate, cycle, model })
 * @param {Object} orderData order data (bookingStart, bookingEnd)
 * @param {string} currency
 * @returns {Money|null} the daily unit price, or null to use the listing price
 */
const getSpaceLinqShortStayPrice = (listing, orderData, currency) => {
  const pricing = listing?.attributes?.publicData?.pricing;
  const { bookingStart, bookingEnd } = orderData || {};
  const hasDailyRate = Number.isInteger(pricing?.dailyRate) && pricing.dailyRate > 0;
  if (!hasDailyRate || pricing.cycle === 'day' || pricing.model === 'quote') {
    return null;
  }
  if (!bookingStart || !bookingEnd) {
    return null;
  }
  const timeZone = listing.attributes.availabilityPlan?.timezone || 'Etc/UTC';
  const start = momentTz.tz(bookingStart, timeZone);
  const end = momentTz.tz(bookingEnd, timeZone);
  const isUnderAMonth = start
    .clone()
    .add(1, 'months')
    .isAfter(end);
  return isUnderAMonth ? new Money(pricing.dailyRate, currency) : null;
};
exports.getSpaceLinqShortStayPrice = getSpaceLinqShortStayPrice;

// SpaceLinq: the marketplace fee on services (optional monthly services and
// 3PL service charges). Storage uses the commission set in Sharetribe Console.
// Set to 7 for testing so it is easy to tell apart from the 10% storage fee.
const SERVICE_COMMISSION_PERCENT = 7;
const SERVICE_COMMISSION_CODE = 'line-item/service-commission';

/**
 * SpaceLinq: provider commission on service line items.
 * Only charged when the marketplace charges providers a commission at all.
 *
 * @param {Array} serviceLineItems add-on and service charge line items
 * @param {Object} providerCommission commission asset from Sharetribe Console
 * @param {string} currency
 * @returns {Array} zero or one line item, included for the provider only
 */
const getSpaceLinqServiceCommissionMaybe = (serviceLineItems, providerCommission, currency) => {
  if (!hasCommissionPercentage(providerCommission) || serviceLineItems.length === 0) {
    return [];
  }
  const servicesTotal = calculateTotalFromLineItems(serviceLineItems);
  return servicesTotal.amount > 0
    ? [
        {
          code: SERVICE_COMMISSION_CODE,
          unitPrice: new Money(servicesTotal.amount, currency),
          percentage: -1 * SERVICE_COMMISSION_PERCENT,
          includeFor: ['provider'],
        },
      ]
    : [];
};
exports.getSpaceLinqServiceCommissionMaybe = getSpaceLinqServiceCommissionMaybe;

/**
 * SpaceLinq: length in days of the whole agreement when the order is one
 * monthly instalment of it. The instalment must sit inside the agreement.
 *
 * @param {Object} orderData order data (agreement: { start, end }, bookingStart, bookingEnd)
 * @returns {number|null} agreement length in days, or null if this is not a valid instalment
 */
const getSpaceLinqAgreementDays = orderData => {
  const { agreement, bookingStart, bookingEnd } = orderData || {};
  const toTime = v => (v instanceof Date ? v.getTime() : v ? new Date(v).getTime() : NaN);
  const [aStart, aEnd, bStart, bEnd] = [
    agreement?.start,
    agreement?.end,
    bookingStart,
    bookingEnd,
  ].map(toTime);
  if ([aStart, aEnd, bStart, bEnd].some(Number.isNaN)) {
    return null;
  }
  const isInside = aStart <= bStart && bEnd <= aEnd && bStart < bEnd;
  return isInside ? Math.round((aEnd - aStart) / (24 * 60 * 60 * 1000)) : null;
};
exports.getSpaceLinqAgreementDays = getSpaceLinqAgreementDays;

/**
 * SpaceLinq: the fifth argument is set by server code only (never from the request):
 * - skipMinTerm: the order is one month of an agreement that was already accepted
 * - extraLineItems: validated service charges to add before the commissions
 */
exports.transactionLineItems = (
  listing,
  orderData,
  providerCommission,
  customerCommission,
  options = {}
) => {
  const publicData = listing.attributes.publicData;
  // Note: the unitType needs to be one of the following:
  // day, night, hour, fixed, or item (these are related to payment processes)
  const { unitType, priceVariants, priceVariationsEnabled } = publicData;

  const isBookable = ['day', 'night', 'hour', 'fixed'].includes(unitType);
  const isNegotiationUnitType = ['offer', 'request'].includes(unitType);
  const priceAttribute = listing.attributes.price;
  const currency = priceAttribute?.currency || orderData.currency;

  const { priceVariantName, offer } = orderData || {};
  const priceVariantConfig = priceVariants
    ? priceVariants.find(pv => pv.name === priceVariantName)
    : null;
  const { priceInSubunits } = priceVariantConfig || {};
  const isPriceInSubunitsValid = Number.isInteger(priceInSubunits) && priceInSubunits >= 0;

  const unitPrice =
    isBookable && priceVariationsEnabled && isPriceInSubunitsValid
      ? new Money(priceInSubunits, currency)
      : offer instanceof Money && isNegotiationUnitType
      ? offer
      : priceAttribute;

  /**
   * Pricing starts with order's base price:
   * Listing's price is related to a single unit. It needs to be multiplied by quantity
   *
   * Initial line-item needs therefore:
   * - code (based on unitType)
   * - unitPrice
   * - quantity
   * - includedFor
   */

  const code = `line-item/${unitType}`;

  // Here "extra line-items" means line-items that are tied to unit type
  // E.g. by default, "shipping-fee" is tied to 'item' aka buying products.
  const quantityAndExtraLineItems =
    unitType === 'item'
      ? getItemQuantityAndLineItems(orderData, publicData, currency)
      : unitType === 'file'
      ? getDigitalItemQuantityAndLineItems(orderData)
      : unitType === 'fixed'
      ? getFixedQuantityAndLineItems(orderData)
      : unitType === 'hour'
      ? getHourQuantityAndLineItems(orderData)
      : ['day', 'night'].includes(unitType)
      ? getDateRangeQuantityAndLineItems(orderData, code)
      : isNegotiationUnitType
      ? getOfferQuantityAndLineItems(orderData)
      : {};

  const { quantity, units, seats, extraLineItems } = quantityAndExtraLineItems;

  // Throw error if there is no quantity information given
  if (!quantity && !(units && seats)) {
    const missingFields = [];

    if (!quantity) missingFields.push('quantity');
    if (!units) missingFields.push('units');
    if (!seats) missingFields.push('seats');

    const message = `Error: orderData is missing the following information: ${missingFields.join(
      ', '
    )}. Quantity or either units & seats is required.`;

    const error = new Error(message);
    error.status = 400;
    error.statusText = message;
    error.data = {};
    throw error;
  }

  /**
   * If you want to use pre-defined component and translations for printing the lineItems base price for order,
   * you should use one of the codes:
   * line-item/night, line-item/day, line-item/hour or line-item/item.
   *
   * Pre-definded commission components expects line item code to be one of the following:
   * 'line-item/provider-commission', 'line-item/customer-commission'
   *
   * By default OrderBreakdown prints line items inside LineItemUnknownItemsMaybe if the lineItem code is not recognized. */

  const quantityOrSeats = !!units && !!seats ? { units, seats } : { quantity };
  // SpaceLinq: whole months on a monthly-priced listing are charged the flat monthly price
  const flatMonthly = ['day', 'night'].includes(unitType)
    ? getSpaceLinqFlatMonthly(listing, orderData, currency)
    : null;
  // SpaceLinq: stays under a month use the provider's daily rate when one is set
  const shortStayPrice =
    !flatMonthly && ['day', 'night'].includes(unitType)
      ? getSpaceLinqShortStayPrice(listing, orderData, currency)
      : null;
  // SpaceLinq: a listing offered by the day only cannot be booked as an ongoing agreement
  if (['day', 'hour'].includes(publicData?.pricing?.cycle) && orderData?.agreement) {
    const message = 'Error: this listing is booked by the day or hour and has no ongoing option.';
    const error = new Error(message);
    error.status = 400;
    error.statusText = message;
    error.data = {};
    throw error;
  }
  const order = flatMonthly
    ? flatMonthly.lineItem
    : {
        code,
        unitPrice: shortStayPrice || unitPrice,
        ...quantityOrSeats,
        includeFor: ['customer', 'provider'],
      };

  // Let's keep the base price (order) as first line item and provider and customer commissions as last.
  // Note: the order matters only if OrderBreakdown component doesn't recognize line-item.
  // SpaceLinq: optional services, pro-rata for the number of booked days.
  const bookedDays = ['day', 'night'].includes(unitType) ? units || quantity : null;
  // Monthly services follow the storage: flat for whole months, pro-rata by day otherwise.
  const serviceDays = flatMonthly ? flatMonthly.months * DAYS_PER_MONTH : bookedDays;
  const addOnLineItems = getSpaceLinqAddOnLineItems(publicData, orderData, serviceDays, currency);

  // SpaceLinq: enforce the provider's minimum term (30 days per month)
  const minTermMonths = Number(publicData?.pricing?.minTermMonths) || 0;
  const minDays = minTermMonths > 0 ? Math.floor(minTermMonths * DAYS_PER_MONTH) : 0;
  // A monthly instalment covers one month of a longer agreement:
  // the minimum term applies to the whole agreement, not to the instalment.
  const termDays = getSpaceLinqAgreementDays(orderData) || bookedDays;
  if (bookedDays && minDays && termDays < minDays && !options.skipMinTerm) {
    const message = `Error: this listing has a minimum term of ${minDays} days.`;
    const error = new Error(message);
    error.status = 400;
    error.statusText = message;
    error.data = {};
    throw error;
  }

  const insuranceLineItems = getSpaceLinqInsuranceLineItems(
    publicData,
    orderData,
    serviceDays,
    currency
  );
  const serviceLineItems = [
    ...addOnLineItems,
    ...insuranceLineItems,
    ...(options.extraLineItems || []),
  ];

  const lineItems = [
    order,
    ...extraLineItems,
    ...serviceLineItems,
    ...getProviderCommissionMaybe(providerCommission, order, currency),
    ...getSpaceLinqServiceCommissionMaybe(serviceLineItems, providerCommission, currency),
    ...getCustomerCommissionMaybe(customerCommission, order, currency),
  ];

  return lineItems;
};
