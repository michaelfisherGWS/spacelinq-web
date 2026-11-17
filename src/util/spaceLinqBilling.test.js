import moment from 'moment-timezone';
import { splitIntoBillingPeriods, isBilledMonthly } from './spaceLinqBilling';

const tz = 'Pacific/Auckland';
const d = s => moment.tz(s, tz).toDate();
const fmt = periods =>
  periods.map(p => [
    moment.tz(p.start, tz).format('YYYY-MM-DD'),
    moment.tz(p.end, tz).format('YYYY-MM-DD'),
  ]);

describe('splitIntoBillingPeriods', () => {
  it('keeps a booking of a month or less as one period', () => {
    expect(fmt(splitIntoBillingPeriods(d('2027-01-15'), d('2027-02-15'), tz))).toEqual([
      ['2027-01-15', '2027-02-15'],
    ]);
    expect(isBilledMonthly(d('2027-01-15'), d('2027-02-15'), tz)).toBe(false);
  });

  it('splits a three month booking into three periods', () => {
    expect(fmt(splitIntoBillingPeriods(d('2027-01-15'), d('2027-04-15'), tz))).toEqual([
      ['2027-01-15', '2027-02-15'],
      ['2027-02-15', '2027-03-15'],
      ['2027-03-15', '2027-04-15'],
    ]);
    expect(isBilledMonthly(d('2027-01-15'), d('2027-04-15'), tz)).toBe(true);
  });

  it('charges a final part-month on its own when it is a week or more', () => {
    expect(fmt(splitIntoBillingPeriods(d('2027-01-15'), d('2027-03-01'), tz))).toEqual([
      ['2027-01-15', '2027-02-15'],
      ['2027-02-15', '2027-03-01'],
    ]);
  });

  it('adds a final part-month of under a week to the previous period', () => {
    expect(fmt(splitIntoBillingPeriods(d('2027-01-15'), d('2027-03-18'), tz))).toEqual([
      ['2027-01-15', '2027-02-15'],
      ['2027-02-15', '2027-03-18'],
    ]);
    expect(fmt(splitIntoBillingPeriods(d('2027-01-15'), d('2027-02-18'), tz))).toEqual([
      ['2027-01-15', '2027-02-18'],
    ]);
  });

  it('does not drift when starting at the end of a month', () => {
    expect(fmt(splitIntoBillingPeriods(d('2027-01-31'), d('2027-04-30'), tz))).toEqual([
      ['2027-01-31', '2027-02-28'],
      ['2027-02-28', '2027-03-31'],
      ['2027-03-31', '2027-04-30'],
    ]);
  });

  it('keeps local midnight across the daylight saving change', () => {
    // NZ daylight saving ends on 4 April 2027
    const periods = splitIntoBillingPeriods(d('2027-03-20'), d('2027-05-20'), tz);
    periods.forEach(p => {
      expect(moment.tz(p.start, tz).format('HH:mm')).toBe('00:00');
      expect(moment.tz(p.end, tz).format('HH:mm')).toBe('00:00');
    });
    expect(periods).toHaveLength(2);
  });

  it('returns nothing for an invalid range', () => {
    expect(splitIntoBillingPeriods(d('2027-02-01'), d('2027-01-01'), tz)).toEqual([]);
  });
});
