/**
 * SpaceLinq: contact-detail masking for messages.
 *
 * Until a booking has been accepted, users should not be able to swap direct
 * contact details (phone numbers, emails, web links). This keeps the first
 * deal on-platform, and is the counterpart of the "unlock model" where the
 * provider's exact address and contacts are released once a booking is
 * accepted.
 *
 * NOTE: masking runs in the client app. A determined user could still bypass
 * it by calling the Marketplace API directly, so it is a deterrent rather than
 * a guarantee. Terms of Trade should back it up.
 */

export const MASKED_CONTACT_PLACEHOLDER = '[contact details hidden until booking is confirmed]';

// Email addresses, including common obfuscations like "name (at) domain (dot) com"
// (Plain " at " / " dot " are not matched, as they appear in normal sentences.)
const EMAIL_RE = /[A-Z0-9._%+-]+\s*(?:@|\(at\)|\[at\])\s*[A-Z0-9.-]+\s*(?:\.|\(dot\)|\[dot\])\s*[A-Z]{2,}/gi;

// Web links: http(s)://..., www...., or bare domains such as example.co.nz
const URL_RE = /\b(?:https?:\/\/|www\.)[^\s]+|\b[A-Z0-9-]+(?:\.[A-Z0-9-]+)*\.(?:com|net|org|nz|au|io|co|biz|info|app|me)(?:\/[^\s]*)?\b/gi;

// Phone numbers: runs of 7+ digits that may be separated by spaces, dots,
// dashes or brackets, optionally starting with +. Covers NZ and AU formats
// such as 021 123 4567, (03) 123-4567, +64 21 123 4567.
const PHONE_RE = /(?:\+?\(?\d[\d\s().-]{5,}\d)/g;

const countDigits = str => (str.match(/\d/g) || []).length;

/**
 * Mask contact details in a message.
 *
 * @param {string} text - message text
 * @returns {{ text: string, masked: boolean }} masked text and whether anything was hidden
 */
export const maskContactDetails = text => {
  if (typeof text !== 'string' || text.length === 0) {
    return { text, masked: false };
  }

  let masked = false;
  const replace = match => {
    masked = true;
    return MASKED_CONTACT_PLACEHOLDER;
  };

  let result = text.replace(EMAIL_RE, replace);
  result = result.replace(URL_RE, replace);
  result = result.replace(PHONE_RE, match => {
    // Only treat it as a phone number if it has enough digits. This keeps
    // ordinary numbers like "120 pallets" or "2-8°C" readable.
    if (countDigits(match) >= 7) {
      masked = true;
      return MASKED_CONTACT_PLACEHOLDER;
    }
    return match;
  });

  return { text: result, masked };
};

/**
 * Booking states where direct contact is allowed (the booking has been
 * accepted by the provider, or has moved on from there).
 */
const CONTACT_UNLOCKED_STATES = [
  'accepted',
  'delivered',
  'reviewed',
  'reviewed-by-customer',
  'reviewed-by-provider',
];

/**
 * Whether contact details may be shared in this transaction.
 * Inquiry-only transactions never unlock contact details.
 *
 * @param {Object} transaction - transaction entity
 * @param {Function} getStateFn - function returning the current process state for the transaction
 * @returns {boolean}
 */
export const isContactUnlocked = (transaction, getStateFn) => {
  if (!transaction || typeof getStateFn !== 'function') {
    return false;
  }
  try {
    const state = getStateFn(transaction);
    return CONTACT_UNLOCKED_STATES.includes(state);
  } catch (e) {
    return false;
  }
};
