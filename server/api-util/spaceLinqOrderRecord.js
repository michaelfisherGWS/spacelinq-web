/**
 * SpaceLinq: what is recorded on a booking when the customer asks for it.
 *
 * - The storage agreement the customer accepted: version, time and name, stamped
 *   here on the server so the customer's browser cannot set them.
 * - A business customer's company name, sealed. Both parties can read a booking's
 *   protected data, so the name is encrypted here and only opened for them once
 *   the booking is confirmed (see server/api/spacelinq-customer-company.js).
 */
const crypto = require('crypto');

// Keep in step with STORAGE_AGREEMENT_VERSION in src/config/configSpaceLinq.js
const STORAGE_AGREEMENT_VERSION = '2026-11-draft';

const REQUEST_TRANSITIONS = [
  'transition/request-payment',
  'transition/request-payment-after-inquiry',
];

// A booking is confirmed once the provider (or operator) has accepted it, or it
// was paid straight away on an instant-booking listing.
const CONFIRMED_TRANSITIONS = [
  'transition/accept',
  'transition/operator-accept',
  'transition/confirm-payment-instant',
];

const sealingKey = () => {
  const secret = process.env.SHARETRIBE_SDK_CLIENT_SECRET;
  if (!secret) {
    return null;
  }
  return crypto
    .createHmac('sha256', secret)
    .update('spacelinq-customer-company-v1')
    .digest();
};

/**
 * Encrypt details so they can sit in a booking's protected data unread.
 *
 * @param {Object} details - e.g. { companyName }
 * @returns {string|null} base64 text, or null when no key is configured
 */
const seal = details => {
  const key = sealingKey();
  if (!key) {
    return null;
  }
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const body = Buffer.concat([cipher.update(JSON.stringify(details), 'utf8'), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), body]).toString('base64');
};

/**
 * Decrypt what seal() produced.
 *
 * @param {string} sealed
 * @returns {Object|null} the details, or null if they cannot be opened
 */
const unseal = sealed => {
  const key = sealingKey();
  if (!key || typeof sealed !== 'string') {
    return null;
  }
  try {
    const raw = Buffer.from(sealed, 'base64');
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, raw.subarray(0, 12));
    decipher.setAuthTag(raw.subarray(12, 28));
    const text = Buffer.concat([decipher.update(raw.subarray(28)), decipher.final()]);
    return JSON.parse(text.toString('utf8'));
  } catch (e) {
    return null;
  }
};

const isBookingRequest = transition => REQUEST_TRANSITIONS.includes(transition);

const isConfirmed = transitions =>
  (transitions || []).some(t => CONFIRMED_TRANSITIONS.includes(t.transition));

/**
 * Protected data for a booking request, with the SpaceLinq record added.
 * Anything the browser sent under the recorded keys is dropped first.
 *
 * @param {Object} protectedData - protected data sent with the request
 * @param {Object} currentUser - the customer (currentUser.show response entity)
 * @param {Date} [now]
 * @returns {Object} protected data to save
 */
const withOrderRecord = (protectedData, currentUser, now = new Date()) => {
  const {
    storageAgreementAccepted,
    storageAgreement: _ignoredAgreement,
    customerCompanySealed: _ignoredCompany,
    ...rest
  } = protectedData || {};

  const profile = currentUser?.attributes?.profile || {};
  const acceptedBy = [profile.firstName, profile.lastName].filter(Boolean).join(' ');
  const agreementMaybe =
    storageAgreementAccepted === true
      ? {
          storageAgreement: {
            version: STORAGE_AGREEMENT_VERSION,
            acceptedAt: now.toISOString(),
            acceptedBy,
          },
        }
      : {};

  const { accountType, companyName } = profile.protectedData || {};
  const name = typeof companyName === 'string' ? companyName.trim() : '';
  const sealed = accountType === 'business' && name ? seal({ companyName: name }) : null;
  const companyMaybe = sealed ? { customerCompanySealed: sealed } : {};

  return { ...rest, ...agreementMaybe, ...companyMaybe };
};

module.exports = {
  STORAGE_AGREEMENT_VERSION,
  seal,
  unseal,
  isBookingRequest,
  isConfirmed,
  withOrderRecord,
};
