import { summarisePayments } from './spaceLinqPayments';

const money = amount => ({ amount, currency: 'NZD' });
const now = new Date('2026-11-19T00:00:00Z');
const daysFromNow = n => new Date(now.getTime() + n * 24 * 60 * 60 * 1000);

const booking = (payin, transitions, payout = payin) => ({
  attributes: {
    processName: 'default-booking',
    lastTransition: transitions[transitions.length - 1],
    transitions: transitions.map(transition => ({ transition })),
    payinTotal: money(payin),
    payoutTotal: money(payout),
  },
});
const month = (payin, lastTransition, startInDays, payout = payin) => ({
  attributes: {
    processName: 'spacelinq-monthly',
    lastTransition,
    transitions: [{ transition: lastTransition }],
    payinTotal: money(payin),
    payoutTotal: money(payout),
  },
  booking: { attributes: { start: daysFromNow(startInDays) } },
});

describe('summarisePayments', () => {
  it('adds up paid bookings and paid months', () => {
    const summary = summarisePayments(
      [
        booking(9000, ['transition/request-payment', 'transition/confirm-payment-instant']),
        booking(18000, [
          'transition/request-payment',
          'transition/confirm-payment',
          'transition/accept',
        ]),
        month(18000, 'transition/auto-payment', -10),
      ],
      'customer',
      now
    );
    expect(summary.paidAmount).toBe(45000);
    expect(summary.currency).toBe('NZD');
    expect(summary.upcomingCount).toBe(0);
    expect(summary.nextPayment).toBe(null);
  });

  it('leaves out bookings that were never paid, or were declined or cancelled', () => {
    const summary = summarisePayments(
      [
        booking(5000, ['transition/request-payment']),
        booking(6000, [
          'transition/request-payment',
          'transition/confirm-payment',
          'transition/decline',
        ]),
        booking(7000, [
          'transition/request-payment',
          'transition/confirm-payment',
          'transition/accept',
          'transition/cancel',
        ]),
        month(18000, 'transition/customer-cancel', 20),
      ],
      'customer',
      now
    );
    expect(summary.paidAmount).toBe(0);
    expect(summary.upcomingCount).toBe(0);
  });

  it('lists months that will be charged in the next 30 days, earliest first', () => {
    const summary = summarisePayments(
      [
        // Starts in 37 days: charged in 34 days, outside the window
        month(18000, 'transition/schedule-extension', 37),
        // Starts in 33 days: charged in 30 days
        month(18000, 'transition/accept', 33),
        // Starts in 7 days: charged in 4 days
        month(20000, 'transition/update-charges', 7),
      ],
      'customer',
      now
    );
    expect(summary.upcomingCount).toBe(2);
    expect(summary.upcomingAmount).toBe(38000);
    expect(summary.nextPayment.amount).toBe(20000);
    expect(summary.nextPayment.date).toEqual(daysFromNow(4));
  });

  it('shows a provider what they receive after fees', () => {
    const summary = summarisePayments(
      [
        booking(18000, ['transition/confirm-payment-instant'], 16200),
        month(18000, 'transition/accept', 10, 16200),
      ],
      'provider',
      now
    );
    expect(summary.paidAmount).toBe(16200);
    expect(summary.upcomingAmount).toBe(16200);
  });

  it('copes with no transactions', () => {
    expect(summarisePayments([], 'customer', now)).toEqual({
      paidAmount: 0,
      upcomingAmount: 0,
      upcomingCount: 0,
      nextPayment: null,
      currency: null,
    });
  });
});
