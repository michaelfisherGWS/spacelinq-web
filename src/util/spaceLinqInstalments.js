/**
 * SpaceLinq monthly billing: reading and updating the monthly instalment
 * transactions that belong to an ongoing booking.
 *
 * The first month is a default-booking transaction (the "agreement").
 * Every later month is a spacelinq-monthly transaction whose protected data
 * points back to it with `agreementId`.
 */
import { denormalisedResponseEntities } from './data';
import { transitionPrivileged } from './api';
import { MONTHLY_PROCESS_NAME } from './spaceLinqBilling';

export const instalmentTransitions = {
  SCHEDULE: 'transition/schedule',
  SCHEDULE_EXTENSION: 'transition/schedule-extension',
  ACCEPT: 'transition/accept',
  OPERATOR_ACCEPT: 'transition/operator-accept',
  DECLINE: 'transition/decline',
  OPERATOR_DECLINE: 'transition/operator-decline',
  WITHDRAW: 'transition/withdraw',
  EXPIRE: 'transition/expire',
  UPDATE_CHARGES: 'transition/update-charges',
  CUSTOMER_CANCEL: 'transition/customer-cancel',
  PROVIDER_CANCEL: 'transition/provider-cancel',
  OPERATOR_CANCEL: 'transition/operator-cancel',
  MARK_PENDING_PAYMENT: 'transition/mark-pending-payment',
  OPERATOR_MARK_PENDING_PAYMENT: 'transition/operator-mark-pending-payment',
  AUTO_PAYMENT: 'transition/auto-payment',
  INITIATE_MANUAL_PAYMENT: 'transition/initiate-manual-payment',
  CONFIRM_MANUAL_PAYMENT: 'transition/confirm-manual-payment',
  PROVIDER_CANCEL_UNPAID: 'transition/provider-cancel-unpaid',
  OPERATOR_CANCEL_UNPAID: 'transition/operator-cancel-unpaid',
  OPERATOR_CANCEL_FROM_PENDING_CONFIRMATION: 'transition/operator-cancel-from-pending-confirmation',
  COMPLETE: 'transition/complete',
  OPERATOR_COMPLETE: 'transition/operator-complete',
  OPERATOR_REFUND: 'transition/operator-refund',
};

const t = instalmentTransitions;

// Instalment status, as shown to both parties.
export const INSTALMENT_PENDING = 'pending';
export const INSTALMENT_SCHEDULED = 'scheduled';
export const INSTALMENT_DUE = 'due';
export const INSTALMENT_PAID = 'paid';
export const INSTALMENT_DECLINED = 'declined';
export const INSTALMENT_CANCELLED = 'cancelled';

const statusByTransition = {
  [t.SCHEDULE]: INSTALMENT_PENDING,
  [t.ACCEPT]: INSTALMENT_SCHEDULED,
  [t.SCHEDULE_EXTENSION]: INSTALMENT_SCHEDULED,
  [t.OPERATOR_ACCEPT]: INSTALMENT_SCHEDULED,
  [t.UPDATE_CHARGES]: INSTALMENT_SCHEDULED,
  [t.MARK_PENDING_PAYMENT]: INSTALMENT_DUE,
  [t.OPERATOR_MARK_PENDING_PAYMENT]: INSTALMENT_DUE,
  [t.INITIATE_MANUAL_PAYMENT]: INSTALMENT_DUE,
  [t.AUTO_PAYMENT]: INSTALMENT_PAID,
  [t.CONFIRM_MANUAL_PAYMENT]: INSTALMENT_PAID,
  [t.COMPLETE]: INSTALMENT_PAID,
  [t.OPERATOR_COMPLETE]: INSTALMENT_PAID,
  [t.DECLINE]: INSTALMENT_DECLINED,
  [t.OPERATOR_DECLINE]: INSTALMENT_DECLINED,
  [t.WITHDRAW]: INSTALMENT_DECLINED,
  [t.EXPIRE]: INSTALMENT_DECLINED,
  [t.CUSTOMER_CANCEL]: INSTALMENT_CANCELLED,
  [t.PROVIDER_CANCEL]: INSTALMENT_CANCELLED,
  [t.OPERATOR_CANCEL]: INSTALMENT_CANCELLED,
  [t.PROVIDER_CANCEL_UNPAID]: INSTALMENT_CANCELLED,
  [t.OPERATOR_CANCEL_UNPAID]: INSTALMENT_CANCELLED,
  [t.OPERATOR_CANCEL_FROM_PENDING_CONFIRMATION]: INSTALMENT_CANCELLED,
  [t.OPERATOR_REFUND]: INSTALMENT_CANCELLED,
};

/**
 * @param {Object} tx instalment transaction
 * @returns {string|null} one of the INSTALMENT_* statuses
 */
export const instalmentStatus = tx => statusByTransition[(tx?.attributes?.lastTransition)] || null;

/**
 * Fetch the instalments of one ongoing booking, earliest month first.
 *
 * @param {Object} sdk Sharetribe SDK
 * @param {string} agreementId uuid string of the first-month transaction
 * @param {string} role 'customer' or 'provider'
 * @returns {Promise<Array>} denormalised instalment transactions (with booking)
 */
export const fetchInstalments = (sdk, agreementId, role) =>
  sdk.transactions
    .query({
      only: role === 'provider' ? 'sale' : 'order',
      processNames: [MONTHLY_PROCESS_NAME],
      include: ['booking'],
      perPage: 100,
    })
    .then(response =>
      denormalisedResponseEntities(response)
        .filter(tx => tx.attributes.protectedData?.agreementId === agreementId)
        .sort((a, b) => (a.booking?.attributes?.start || 0) - (b.booking?.attributes?.start || 0))
    );

/**
 * Accept or decline every instalment that is still waiting for the provider.
 * Runs one at a time; a failure stops the rest.
 *
 * @param {Object} sdk Sharetribe SDK
 * @param {string} agreementId uuid string of the first-month transaction
 * @param {string} transition instalmentTransitions.ACCEPT or .DECLINE
 * @returns {Promise<number>} number of instalments transitioned
 */
export const answerPendingInstalments = (sdk, agreementId, transition) =>
  fetchInstalments(sdk, agreementId, 'provider').then(instalments => {
    const pending = instalments.filter(tx => instalmentStatus(tx) === INSTALMENT_PENDING);
    return pending.reduce(
      (chain, tx) =>
        chain.then(count =>
          sdk.transactions.transition({ id: tx.id, transition, params: {} }).then(() => count + 1)
        ),
      Promise.resolve(0)
    );
  });

export const SERVICE_CODE_PREFIX = 'line-item/service-';
export const PAY_ERROR_NO_CARD = 'no-card';
export const PAY_ERROR_CARD_FAILED = 'card-failed';

const STRIPE_PAID_STATUSES = ['requires_capture', 'succeeded'];

const payError = code => {
  const error = new Error(code);
  error.code = code;
  return error;
};

/**
 * Pay a monthly instalment by hand with the customer's saved card. Used when the
 * automatic charge did not go through (for example after the card was replaced).
 *
 * @param {Object} sdk Sharetribe SDK
 * @param {Object} stripe Stripe.js instance
 * @param {Object} tx instalment transaction that is due for payment
 * @returns {Promise} resolves when the instalment is paid
 * @throws Error with code PAY_ERROR_NO_CARD or PAY_ERROR_CARD_FAILED
 */
export const payInstalmentNow = (sdk, stripe, tx) => {
  const clientSecretOf = transaction =>
    transaction?.attributes?.protectedData?.stripePaymentIntents?.default
      ?.stripePaymentIntentClientSecret;

  return sdk.currentUser
    .show({ include: ['stripeCustomer.defaultPaymentMethod'] })
    .then(response => {
      const [currentUser] = denormalisedResponseEntities(response);
      const paymentMethodId =
        currentUser?.stripeCustomer?.defaultPaymentMethod?.attributes?.stripePaymentMethodId;
      if (!paymentMethodId) {
        throw payError(PAY_ERROR_NO_CARD);
      }
      const isInitiated = tx.attributes.lastTransition === t.INITIATE_MANUAL_PAYMENT;
      const secretPromise = isInitiated
        ? Promise.resolve(clientSecretOf(tx))
        : sdk.transactions
            .transition(
              { id: tx.id, transition: t.INITIATE_MANUAL_PAYMENT, params: {} },
              { expand: true }
            )
            .then(res => clientSecretOf(res.data.data));
      return secretPromise.then(clientSecret => ({ clientSecret, paymentMethodId }));
    })
    .then(({ clientSecret, paymentMethodId }) =>
      // A payment that was confirmed earlier (but not recorded) must not be confirmed twice.
      stripe.retrievePaymentIntent(clientSecret).then(({ paymentIntent }) =>
        STRIPE_PAID_STATUSES.includes(paymentIntent?.status)
          ? paymentIntent
          : stripe
              .confirmCardPayment(clientSecret, { payment_method: paymentMethodId })
              .then(result => {
                if (result.error || !STRIPE_PAID_STATUSES.includes(result.paymentIntent?.status)) {
                  throw payError(PAY_ERROR_CARD_FAILED);
                }
                return result.paymentIntent;
              })
      )
    )
    .then(() =>
      sdk.transactions.transition({
        id: tx.id,
        transition: t.CONFIRM_MANUAL_PAYMENT,
        params: {},
      })
    );
};

/**
 * Provider sets the service charges of a scheduled instalment. This replaces any
 * charges entered before. Prices come from the listing's rate card on the server.
 *
 * @param {Object} tx instalment transaction
 * @param {Object} charges
 * @param {Array<{key: string, quantity: number}>} charges.serviceCharges
 * @param {{amount: number, note: string}|null} charges.otherCharge amount in cents
 * @returns {Promise}
 */
export const updateInstalmentCharges = (tx, charges) =>
  transitionPrivileged({
    isSpeculative: false,
    orderData: { serviceCharges: charges.serviceCharges, otherCharge: charges.otherCharge },
    bodyParams: { id: tx.id, transition: t.UPDATE_CHARGES, params: {} },
    queryParams: { expand: false },
  });

/**
 * @param {Object} tx instalment transaction
 * @returns {number} total of the service charges in the instalment, in cents
 */
export const serviceChargesTotal = tx =>
  (tx?.attributes?.lineItems || [])
    .filter(item => item.code.startsWith(SERVICE_CODE_PREFIX) && !item.reversal)
    .reduce((sum, item) => sum + item.lineTotal.amount, 0);
