const moment = require('moment-timezone');
const { laterPeriods } = require('./spacelinq-schedule');

const timeZone = 'Pacific/Auckland';
const d = s => moment.tz(s, timeZone).toDate();
const fmt = periods =>
  periods.map(p => [
    moment.tz(p.start, timeZone).format('YYYY-MM-DD'),
    moment.tz(p.end, timeZone).format('YYYY-MM-DD'),
  ]);

describe('SpaceLinq scheduling of later months', () => {
  it('schedules eleven months after the first for a twelve month agreement', () => {
    const periods = laterPeriods(d('2026-11-23'), d('2027-11-23'), timeZone);
    expect(periods).toHaveLength(11);
    expect(fmt(periods)[0]).toEqual(['2026-12-23', '2027-01-23']);
    expect(fmt(periods)[10]).toEqual(['2027-10-23', '2027-11-23']);
  });

  it('keeps the day of month for a start at the end of a month', () => {
    const periods = laterPeriods(d('2027-01-31'), d('2027-04-30'), timeZone);
    expect(fmt(periods)).toEqual([['2027-02-28', '2027-03-31'], ['2027-03-31', '2027-04-30']]);
  });

  it('schedules nothing for a single month', () => {
    expect(laterPeriods(d('2027-01-15'), d('2027-02-15'), timeZone)).toEqual([]);
  });
});

describe('inBatches', () => {
  const { inBatches } = require('./spacelinq-schedule');
  it('splits eleven months into groups of four', () => {
    const months = Array.from({ length: 11 }, (_, i) => i + 2);
    expect(inBatches(months, 4)).toEqual([[2, 3, 4, 5], [6, 7, 8, 9], [10, 11, 12]]);
  });
  it('returns nothing for nothing', () => {
    expect(inBatches([], 4)).toEqual([]);
  });
});
