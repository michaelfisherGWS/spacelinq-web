import {
  toDailyRate,
  toMonthlyRate,
  proRataForDays,
  estimateMonthlyTotal,
} from './spacelinqPricing';

describe('toDailyRate', () => {
  it('converts a weekly pallet rate', () => {
    // $14.00 per pallet per week -> $2.00 per day
    expect(toDailyRate(1400, 'week')).toBe(200);
  });
  it('converts a monthly rate', () => {
    // $120.00 per m² per month -> ~$3.95 per day
    expect(toDailyRate(12000, 'month')).toBe(395);
  });
  it('returns 0 for invalid rates', () => {
    expect(toDailyRate(0, 'month')).toBe(0);
    expect(toDailyRate(NaN, 'month')).toBe(0);
  });
});

describe('toMonthlyRate', () => {
  it('converts weekly to monthly', () => {
    expect(toMonthlyRate(1400, 'week')).toBe(6083);
  });
  it('keeps monthly as is', () => {
    expect(toMonthlyRate(12000, 'month')).toBe(12000);
  });
});

describe('proRataForDays', () => {
  it('charges a full month for ~30.4 days', () => {
    expect(proRataForDays(5000, 365 / 12)).toBe(5000);
  });
  it('charges part of a month', () => {
    expect(proRataForDays(5000, 14)).toBe(2301);
  });
});

describe('estimateMonthlyTotal', () => {
  const pricing = {
    model: 'per-pallet',
    rate: 1400,
    cycle: 'week',
    addOns: [{ key: 'wms', price: 5000 }, { key: 'access-24-7', price: 2000 }],
  };
  it('multiplies by units and adds selected add-ons', () => {
    expect(estimateMonthlyTotal(pricing, 10, ['wms'])).toBe(6083 * 10 + 5000);
  });
  it('returns 0 for quotes', () => {
    expect(estimateMonthlyTotal({ model: 'quote' }, 5)).toBe(0);
  });
});

describe('getSpaceLinqDisplayPrice', () => {
  const { getSpaceLinqDisplayPrice } = require('./spacelinqPricing');
  it('shows pallet pricing per week', () => {
    expect(
      getSpaceLinqDisplayPrice({ pricing: { model: 'per-pallet', rate: 1400, cycle: 'week' } })
    ).toEqual({ amount: 1400, perUnit: 'per pallet / week', isFrom: false, shortStay: null });
  });
  it('marks quotes as "from"', () => {
    expect(getSpaceLinqDisplayPrice({ pricing: { model: 'quote', rate: 50000 } }).isFrom).toBe(
      true
    );
  });
  it('returns null without pricing', () => {
    expect(getSpaceLinqDisplayPrice({})).toBe(null);
  });
});

describe('daily pricing', () => {
  const { getSpaceLinqDisplayPrice } = require('./spacelinqPricing');

  it('keeps a daily rate as the listing price', () => {
    expect(toDailyRate(2500, 'day')).toBe(2500);
  });
  it('shows a per-space listing by the month with its short-stay rate', () => {
    expect(
      getSpaceLinqDisplayPrice({
        pricing: { model: 'per-space', cycle: 'month', rate: 18000, dailyRate: 1500 },
      })
    ).toEqual({
      amount: 18000,
      perUnit: 'per space / month',
      isFrom: false,
      shortStay: { amount: 1500, perUnit: 'per space / day' },
    });
  });
  it('shows a day-only listing by the day, with no separate short-stay rate', () => {
    expect(
      getSpaceLinqDisplayPrice({
        pricing: { model: 'per-space', cycle: 'day', rate: 2500, dailyRate: 1500 },
      })
    ).toEqual({ amount: 2500, perUnit: 'per space / day', isFrom: false, shortStay: null });
  });
});
