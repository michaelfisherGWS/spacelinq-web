/**
 * SpaceLinq: location privacy for listings (the "unlock model").
 *
 * Publicly, a listing only shows its suburb/town and a map pin rounded to
 * roughly 1 km. The exact street address is stored in the listing's private
 * data, which only the provider (and marketplace operator) can read. When the
 * provider accepts a booking, the exact address is posted to the booking's
 * message thread (see sendUnlockedSiteDetails in TransactionPage.duck.js).
 */

// 2 decimal places of latitude is ~1.1 km.
const PUBLIC_COORDINATE_DECIMALS = 2;

const roundTo = (value, decimals) => {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
};

/**
 * Round coordinates so the public pin doesn't reveal the exact site.
 *
 * @param {{lat: number, lng: number}} origin
 * @returns {{lat: number, lng: number}|null}
 */
export const approximateCoordinates = origin => {
  if (!origin || typeof origin.lat !== 'number' || typeof origin.lng !== 'number') {
    return null;
  }
  return {
    lat: roundTo(origin.lat, PUBLIC_COORDINATE_DECIMALS),
    lng: roundTo(origin.lng, PUBLIC_COORDINATE_DECIMALS),
  };
};

/**
 * Turn a full address into a public, area-only address.
 * "12 Foo Street, Rolleston 7614, New Zealand" -> "Rolleston, New Zealand"
 *
 * @param {string} address - full formatted address
 * @returns {string}
 */
export const publicAreaFromAddress = address => {
  if (typeof address !== 'string' || address.trim() === '') {
    return '';
  }
  const parts = address
    .split(',')
    .map(p => p.trim())
    .filter(Boolean);

  // Drop the street line when there are enough parts to still show an area,
  // or when the first part clearly contains a street number.
  const firstHasNumber = /\d/.test(parts[0] || '');
  const areaParts = parts.length >= 3 || (parts.length === 2 && firstHasNumber) ? parts.slice(1) : parts;

  // Remove postcodes (NZ 4 digits, AU 4 digits) and tidy whitespace.
  return areaParts
    .map(p => p.replace(/\b\d{4}\b/g, '').replace(/\s{2,}/g, ' ').trim())
    .filter(Boolean)
    .join(', ');
};

/**
 * Build the site details message the provider's app posts when a booking is accepted.
 *
 * @param {Object} exactLocation - { address, building }
 * @param {string} [siteNotes] - optional access instructions / contact details from the provider
 * @returns {string|null}
 */
export const buildSiteDetailsMessage = (exactLocation, siteNotes) => {
  const address = exactLocation?.address;
  if (!address) {
    return null;
  }
  const lines = ['Booking confirmed - here are the site details:', `Address: ${address}`];
  if (exactLocation.building) {
    lines.push(`Unit / building: ${exactLocation.building}`);
  }
  if (siteNotes) {
    lines.push(`Access and contact: ${siteNotes}`);
  }
  return lines.join('\n');
};
