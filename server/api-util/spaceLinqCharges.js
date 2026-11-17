const { types } = require('sharetribe-flex-sdk');
const { Money } = types;

/**
 * SpaceLinq: a provider's monthly service charges (3PL activity such as receiving,
 * picking or labour) that are added to a monthly instalment before it is charged.
 */
const MONTHLY_PROCESS_NAME = 'spacelinq-monthly';
const UPDATE_CHARGES_TRANSITION = 'transition/update-charges';
const SERVICE_CODE_PREFIX = 'line-item/service-';
const OTHER_CHARGE_CODE = `${SERVICE_CODE_PREFIX}other`;
const MAX_QUANTITY = 100000;
const MAX_OTHER_AMOUNT = 100000000; // in cents
const MAX_NOTE_LENGTH = 200;

const badRequest = message => {
  const error = new Error(message);
  error.status = 400;
  error.statusText = message;
  error.data = {};
  return error;
};

/**
 * Check the charges a provider entered against the listing's rate card.
 * Prices always come from the rate card, never from the request.
 *
 * @param {Object} publicData listing public data (pricing.rateCard: [{ key, price }])
 * @param {Object} input
 * @param {Array<{key: string, quantity: number}>} [input.serviceCharges]
 * @param {{amount: number, note: string}} [input.otherCharge] amount in cents
 * @returns {{serviceCharges: Array, otherCharge: Object|null}} cleaned values
 * @throws 400 error if a charge is not on the rate card or a number is out of range
 */
const validateServiceCharges = (publicData, input) => {
  const rateCard = publicData?.pricing?.rateCard || [];
  const rawCharges = Array.isArray(input?.serviceCharges) ? input.serviceCharges : [];

  const serviceCharges = rawCharges
    .filter(c => Number(c?.quantity) !== 0)
    .map(c => {
      const rate = rateCard.find(r => r.key === c?.key);
      const quantity = Number(c?.quantity);
      if (!rate || !Number.isInteger(rate.price) || rate.price <= 0) {
        throw badRequest(`Error: "${c?.key}" is not on this listing's rate card.`);
      }
      if (!Number.isFinite(quantity) || quantity < 0 || quantity > MAX_QUANTITY) {
        throw badRequest(`Error: the quantity for "${c.key}" is not valid.`);
      }
      // Two decimals is enough for part hours
      return { key: c.key, quantity: Math.round(quantity * 100) / 100 };
    });

  const keys = serviceCharges.map(c => c.key);
  if (new Set(keys).size !== keys.length) {
    throw badRequest('Error: a service is listed more than once.');
  }

  const otherAmount = Number(input?.otherCharge?.amount) || 0;
  if (!Number.isInteger(otherAmount) || otherAmount < 0 || otherAmount > MAX_OTHER_AMOUNT) {
    throw badRequest('Error: the other charge amount is not valid.');
  }
  const note = `${input?.otherCharge?.note || ''}`.trim().slice(0, MAX_NOTE_LENGTH);
  if (otherAmount > 0 && note.length === 0) {
    throw badRequest('Error: describe what the other charge is for.');
  }
  const otherCharge = otherAmount > 0 ? { amount: otherAmount, note } : null;

  return { serviceCharges, otherCharge };
};

/**
 * Line items for validated service charges.
 *
 * @param {Object} publicData listing public data
 * @param {{serviceCharges: Array, otherCharge: Object|null}} charges validated charges
 * @param {string} currency
 * @returns {Array} line items
 */
const getServiceChargeLineItems = (publicData, charges, currency) => {
  const rateCard = publicData?.pricing?.rateCard || [];
  const serviceItems = (charges?.serviceCharges || []).map(c => ({
    code: `${SERVICE_CODE_PREFIX}${c.key}`,
    unitPrice: new Money(rateCard.find(r => r.key === c.key).price, currency),
    quantity: c.quantity,
    includeFor: ['customer', 'provider'],
  }));
  const otherItems = charges?.otherCharge
    ? [
        {
          code: OTHER_CHARGE_CODE,
          unitPrice: new Money(charges.otherCharge.amount, currency),
          quantity: 1,
          includeFor: ['customer', 'provider'],
        },
      ]
    : [];
  return [...serviceItems, ...otherItems];
};

module.exports = {
  MONTHLY_PROCESS_NAME,
  UPDATE_CHARGES_TRANSITION,
  SERVICE_CODE_PREFIX,
  validateServiceCharges,
  getServiceChargeLineItems,
};
