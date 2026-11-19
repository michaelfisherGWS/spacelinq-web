/**
 * SpaceLinq: a summary of what a customer has paid (or a provider has earned)
 * across all their bookings, and what is coming up. Shown at the top of the
 * bookings page.
 */
import { denormalisedResponseEntities } from './data';
import { MONTHLY_PROCESS_NAME } from './spaceLinqBilling';
import {
  INSTALMENT_DUE,
  INSTALMENT_PAID,
  INSTALMENT_PENDING,
  INSTALMENT_SCHEDULED,
  instalmentStatus,
} from './spaceLinqInstalments';

// Monthly payments are charged this many days before the month starts
export const CHARGE_DAYS_BEFORE_START = 3;
export const UPCOMING_WINDOW_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;
const PAGE_SIZE = 100;
const MAX_PAGES = 3;

// A one-off booking (or the first month of an ongoing one) has been paid once
// payment was confirmed, unless it was later declined, expired or cancelled.
const PAID_TRANSITIONS = ['transition/confirm-payment', 'transition/confirm-payment-instant'];
const REFUNDED_TRANSITIONS = [
  'transition/decline',
  'transition/operator-decline',
  'transition/expire',
  'transition/cancel',
];

const isPaidBooking = tx => {
  const names = (tx.attributes.transitions || []).map(t => t.transition);
  return (
    names.some(n => PAID_TRANSITIONS.includes(n)) &&
    !names.some(n => REFUNDED_TRANSITIONS.includes(n))
  );
};

/**
 * Work out the payments summary from a user's transactions.
 *
 * @param {Array<Object>} transactions - denormalised transactions (with booking)
 * @param {'customer'|'provider'} role - whose view: customers see what they pay,
 *   providers what they receive after fees
 * @param {Date} [now]
 * @returns {Object} { paidAmount, upcomingAmount, upcomingCount, nextPayment, currency }
 *   Amounts are in minor units. nextPayment is { amount, date } or null.
 */
export const summarisePayments = (transactions, role, now = new Date()) => {
  const totalOf = tx =>
    role === 'provider' ? tx.attributes.payoutTotal : tx.attributes.payinTotal;
  const windowEnd = now.getTime() + UPCOMING_WINDOW_DAYS * DAY_MS;

  const initial = { paidAmount: 0, upcoming: [], currency: null };
  const result = (transactions || []).reduce((acc, tx) => {
    const total = totalOf(tx);
    if (!total || !Number.isInteger(total.amount)) {
      return acc;
    }
    const currency = acc.currency || total.currency;
    if (total.currency !== currency) {
      return acc;
    }
    const isMonthly = tx.attributes.processName === MONTHLY_PROCESS_NAME;
    const status = isMonthly ? instalmentStatus(tx) : null;
    const isPaid = isMonthly ? status === INSTALMENT_PAID : isPaidBooking(tx);
    if (isPaid) {
      return { ...acc, currency, paidAmount: acc.paidAmount + total.amount };
    }
    const isAwaitingCharge =
      isMonthly && [INSTALMENT_PENDING, INSTALMENT_SCHEDULED, INSTALMENT_DUE].includes(status);
    const start = tx.booking?.attributes?.start;
    if (isAwaitingCharge && start) {
      const chargeTime = new Date(start).getTime() - CHARGE_DAYS_BEFORE_START * DAY_MS;
      return chargeTime <= windowEnd
        ? {
            ...acc,
            currency,
            upcoming: [...acc.upcoming, { amount: total.amount, date: new Date(chargeTime) }],
          }
        : acc;
    }
    return acc;
  }, initial);

  const upcoming = result.upcoming.sort((a, b) => a.date - b.date);
  return {
    paidAmount: result.paidAmount,
    upcomingAmount: upcoming.reduce((sum, p) => sum + p.amount, 0),
    upcomingCount: upcoming.length,
    nextPayment: upcoming[0] || null,
    currency: result.currency,
  };
};

const fetchPage = (sdk, only, page) =>
  sdk.transactions.query({
    only,
    include: ['booking'],
    'fields.transaction': [
      'processName',
      'lastTransition',
      'transitions',
      'payinTotal',
      'payoutTotal',
    ],
    page,
    perPage: PAGE_SIZE,
  });

/**
 * Fetch a user's transactions and summarise their payments.
 * Reads up to 300 of the most recent transactions.
 *
 * @param {Object} sdk Sharetribe SDK
 * @param {'customer'|'provider'} role
 * @returns {Promise<Object>} see summarisePayments
 */
export const fetchPaymentsSummary = (sdk, role) => {
  const only = role === 'provider' ? 'sale' : 'order';
  const loadFrom = (page, collected) =>
    fetchPage(sdk, only, page).then(response => {
      const all = [...collected, ...denormalisedResponseEntities(response)];
      const totalPages = response.data.meta?.totalPages || 1;
      return page < totalPages && page < MAX_PAGES ? loadFrom(page + 1, all) : all;
    });
  return loadFrom(1, []).then(transactions => summarisePayments(transactions, role));
};
