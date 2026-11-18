/**
 * SpaceLinq pricing helpers.
 *
 * Providers set prices the way storage is sold (per pallet per week/month,
 * per m² per month, fixed monthly). Sharetribe bookings use a daily unit, so
 * the listing's `price` attribute is stored as the equivalent daily rate and
 * the original pricing is kept in publicData.pricing for display.
 *
 * All money values are in minor units (cents).
 */
import { DAYS_PER_MONTH, DAYS_PER_WEEK } from '../config/configSpaceLinq';

export const daysInCycle = cycle =>
  ['day', 'hour'].includes(cycle) ? 1 : cycle === 'week' ? DAYS_PER_WEEK : DAYS_PER_MONTH;

/**
 * Convert a per-cycle rate to a daily rate.
 *
 * @param {number} rateMinor - rate in minor units for one cycle
 * @param {'day'|'week'|'month'} cycle
 * @returns {number} daily rate in minor units, rounded to the nearest cent
 */
export const toDailyRate = (rateMinor, cycle) => {
  if (!Number.isFinite(rateMinor) || rateMinor <= 0) {
    return 0;
  }
  return Math.round(rateMinor / daysInCycle(cycle));
};

/**
 * Monthly equivalent of a per-cycle rate.
 *
 * @param {number} rateMinor
 * @param {'day'|'week'|'month'} cycle
 * @returns {number}
 */
export const toMonthlyRate = (rateMinor, cycle) =>
  cycle === 'month' || !cycle
    ? rateMinor
    : Math.round((rateMinor / daysInCycle(cycle)) * DAYS_PER_MONTH);

/**
 * Pro-rata amount of a monthly price for a number of days.
 *
 * @param {number} monthlyMinor
 * @param {number} days
 * @returns {number}
 */
export const proRataForDays = (monthlyMinor, days) => {
  if (!Number.isFinite(monthlyMinor) || !Number.isFinite(days) || days <= 0) {
    return 0;
  }
  return Math.round((monthlyMinor * days) / DAYS_PER_MONTH);
};

/**
 * Estimated monthly total for a customer: base rate x units, plus add-ons.
 *
 * @param {Object} pricing - publicData.pricing
 * @param {number} units - pallets / m² (1 for fixed monthly)
 * @param {Array<string>} selectedAddOns - add-on keys
 * @returns {number} monthly total in minor units
 */
export const estimateMonthlyTotal = (pricing, units = 1, selectedAddOns = []) => {
  if (!pricing || pricing.model === 'quote') {
    return 0;
  }
  const base = toMonthlyRate(pricing.rate || 0, pricing.cycle) * (units || 1);
  const addOnTotal = (pricing.addOns || [])
    .filter(a => selectedAddOns.includes(a.key))
    .reduce((sum, a) => sum + (a.price || 0), 0);
  return base + addOnTotal;
};

/**
 * Price to show customers for a SpaceLinq listing, in the provider's own terms.
 * Returns null when the listing has no SpaceLinq pricing.
 *
 * @param {Object} publicData - listing publicData
 * @returns {{ amount: number, perUnit: string, isFrom: boolean, shortStay: Object|null }|null}
 */
export const getSpaceLinqDisplayPrice = publicData => {
  const pricing = publicData?.pricing;
  if (!pricing || !Number.isInteger(pricing.rate) || pricing.rate <= 0) {
    return null;
  }
  const cycle = ['hour', 'day', 'week'].includes(pricing.cycle) ? pricing.cycle : 'month';
  const perUnit =
    pricing.model === 'per-pallet'
      ? `per pallet / ${cycle}`
      : pricing.model === 'per-m2'
      ? 'per m² / month'
      : pricing.model === 'per-space'
      ? `per space / ${cycle}`
      : `per ${cycle}`;
  // A separate price for stays under a month, when the provider has set one
  const hasDailyRate =
    ['week', 'month'].includes(cycle) &&
    pricing.model !== 'quote' &&
    Number.isInteger(pricing.dailyRate) &&
    pricing.dailyRate > 0;
  const shortStay = hasDailyRate
    ? {
        amount: pricing.dailyRate,
        perUnit: ['per-pallet', 'per-space'].includes(pricing.model)
          ? `per ${pricing.model === 'per-pallet' ? 'pallet' : 'space'} / day`
          : pricing.model === 'per-m2'
          ? 'per m² / day'
          : 'per day',
      }
    : null;
  return { amount: pricing.rate, perUnit, isFrom: pricing.model === 'quote', shortStay };
};

/**
 * The price to show for a listing wherever a single amount is displayed (cards,
 * map pins): the provider's own listed amount for SpaceLinq listings, otherwise
 * the listing price. Bookable SpaceLinq listings store a daily equivalent as
 * their listing price, which customers are never quoted.
 *
 * @param {Object} attributes - listing attributes ({ price, publicData })
 * @param {Function} Money - sdk Money constructor
 * @returns {Money|null}
 */
export const getDisplayedListingPrice = (attributes, Money) => {
  const { price, publicData } = attributes || {};
  const spaceLinqPrice = getSpaceLinqDisplayPrice(publicData);
  return spaceLinqPrice && price ? new Money(spaceLinqPrice.amount, price.currency) : price || null;
};
