/**
 * SpaceLinq goods insurance.
 *
 * A provider who can cover customers' goods sets, once per listing:
 * - rate: price in cents per $1,000 of goods per month
 * - dgRate: the same for dangerous goods (optional; without it DG is not covered)
 * - maxValue: the highest value of goods they will cover, in cents
 * - exclusions: free text shown to the customer
 *
 * The customer declares the value of their goods when booking and the monthly
 * premium is charged with the storage.
 */
export const INSURANCE_LINE_ITEM_CODE = 'line-item/insurance';
const CENTS_PER_THOUSAND_DOLLARS = 100000;

/**
 * @param {Object} offer listing publicData.pricing.insurance
 * @returns {boolean} true if the listing offers insurance
 */
export const hasInsuranceOffer = offer =>
  Number.isInteger(offer?.rate) && offer.rate > 0 && Number.isInteger(offer?.maxValue);

/**
 * Monthly premium in cents for a declared value.
 *
 * @param {Object} offer listing publicData.pricing.insurance
 * @param {number} value declared value of goods in cents
 * @param {boolean} dg true if the goods include dangerous goods
 * @returns {number|null} premium in cents, or null if the offer does not cover it
 */
export const monthlyPremium = (offer, value, dg) => {
  const rate = dg ? offer?.dgRate : offer?.rate;
  if (!hasInsuranceOffer(offer) || !Number.isInteger(rate) || rate <= 0) {
    return null;
  }
  if (!Number.isInteger(value) || value <= 0 || value > offer.maxValue) {
    return null;
  }
  return Math.round((value / CENTS_PER_THOUSAND_DOLLARS) * rate);
};

/**
 * Turn the booking form's insurance fields into order data.
 *
 * @param {Object} values form values (insurance: boolean, insuranceValue: string in dollars, insuranceDg: boolean)
 * @param {Object} offer listing publicData.pricing.insurance
 * @returns {{insurance: {value: number, dg: boolean}|null, status: string}}
 *   status is 'none', 'ok', 'missing-value', 'over-limit' or 'dg-not-covered'
 */
export const insuranceFromFormValues = (values, offer) => {
  if (!values?.insurance || !hasInsuranceOffer(offer)) {
    return { insurance: null, status: 'none' };
  }
  const dollars = Number(`${values.insuranceValue || ''}`.replace(/[,$\s]/g, ''));
  const value = Number.isFinite(dollars) ? Math.round(dollars * 100) : 0;
  const dg = !!values.insuranceDg;
  if (value <= 0) {
    return { insurance: null, status: 'missing-value' };
  }
  if (value > offer.maxValue) {
    return { insurance: null, status: 'over-limit' };
  }
  if (dg && !(Number.isInteger(offer.dgRate) && offer.dgRate > 0)) {
    return { insurance: null, status: 'dg-not-covered' };
  }
  return { insurance: { value, dg }, status: 'ok' };
};
