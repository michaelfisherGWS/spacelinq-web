const moment = require('moment-timezone');
const { nextPeriods } = require('./spacelinq-extend');

const timeZone = 'Pacific/Auckland';
const d = s => moment.tz(s, timeZone).toDate();
const fmt = periods =>
  periods.map(p => [
    moment.tz(p.start, timeZone).format('YYYY-MM-DD'),
    moment.tz(p.end, timeZone).format('YYYY-MM-DD'),
  ]);

describe('SpaceLinq ongoing booking extension', () => {
  const agreementStart = d('2026-12-01');
  const scheduledUntil = d('2027-12-01');

  it('adds nothing while twelve months are already scheduled', () => {
    expect(nextPeriods({ agreementStart, scheduledUntil, now: d('2026-11-18'), timeZone })).toEqual(
      []
    );
    expect(nextPeriods({ agreementStart, scheduledUntil, now: d('2026-12-20'), timeZone })).toEqual(
      []
    );
  });

  it('adds the next month once it falls inside twelve months', () => {
    const periods = nextPeriods({ agreementStart, scheduledUntil, now: d('2027-01-01'), timeZone });
    expect(fmt(periods)).toEqual([['2027-12-01', '2028-01-01']]);
  });

  it('catches up at most three months per call', () => {
    const periods = nextPeriods({ agreementStart, scheduledUntil, now: d('2027-09-15'), timeZone });
    expect(fmt(periods)).toEqual([
      ['2027-12-01', '2028-01-01'],
      ['2028-01-01', '2028-02-01'],
      ['2028-02-01', '2028-03-01'],
    ]);
  });

  it('keeps the day of month for a start late in the month', () => {
    const periods = nextPeriods({
      agreementStart: d('2027-01-31'),
      scheduledUntil: d('2028-01-31'),
      now: d('2027-04-01'),
      timeZone,
    });
    expect(fmt(periods)).toEqual([['2028-01-31', '2028-02-29'], ['2028-02-29', '2028-03-31']]);
  });
});
