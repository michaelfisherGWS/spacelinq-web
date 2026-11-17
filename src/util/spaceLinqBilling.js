/**
 * SpaceLinq monthly billing.
 *
 * A booking longer than one month is billed as monthly instalments:
 * - the first month is paid at checkout (default-booking process)
 * - each later month is its own transaction in the spacelinq-monthly process,
 *   charged automatically to the customer's saved card before the month starts.
 */
import moment from 'moment-timezone';

export const MONTHLY_PROCESS_NAME = 'spacelinq-monthly';
export const MONTHLY_PROCESS_ALIAS = `${MONTHLY_PROCESS_NAME}/release-1`;

// A final part-month shorter than this is added to the previous instalment
// instead of being charged on its own.
export const MIN_FINAL_PERIOD_DAYS = 7;
// Sharetribe allows a limited number of calls per checkout; keep agreements bounded.
export const MAX_BILLING_PERIODS = 24;

/**
 * Split a booking into monthly billing periods, counted from the start date
 * in the listing's time zone (15 Jan - 15 Feb, 15 Feb - 15 Mar, ...).
 *
 * @param {Date} start booking start (inclusive)
 * @param {Date} end booking end (exclusive)
 * @param {string} timeZone IANA time zone of the listing
 * @returns {Array<{start: Date, end: Date}>} periods in order; one period if the booking is a month or less
 */
export const splitIntoBillingPeriods = (start, end, timeZone = 'Etc/UTC') => {
  if (!(start instanceof Date) || !(end instanceof Date) || !(start < end)) {
    return [];
  }
  const first = moment.tz(start, timeZone);
  const last = moment.tz(end, timeZone);
  const periods = [];
  let k = 0;
  let periodStart = first.clone();
  while (periodStart.isBefore(last)) {
    // Always count from the original start, so a 31st start does not drift to the 28th.
    const nextStart = first.clone().add(k + 1, 'months');
    const periodEnd = nextStart.isBefore(last) ? nextStart : last.clone();
    periods.push({ start: periodStart.toDate(), end: periodEnd.toDate() });
    periodStart = periodEnd;
    k += 1;
  }

  if (periods.length > 1) {
    const stub = periods[periods.length - 1];
    const stubDays = moment.tz(stub.end, timeZone).diff(moment.tz(stub.start, timeZone), 'days');
    if (stubDays < MIN_FINAL_PERIOD_DAYS) {
      periods.pop();
      periods[periods.length - 1].end = stub.end;
    }
  }
  return periods;
};

/**
 * @returns {boolean} true if the booking should be billed in monthly instalments
 */
export const isBilledMonthly = (start, end, timeZone) => {
  const count = splitIntoBillingPeriods(start, end, timeZone).length;
  return count > 1 && count <= MAX_BILLING_PERIODS;
};
