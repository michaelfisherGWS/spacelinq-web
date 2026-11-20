/**
 * SpaceLinq: warehouse activity that turns into a month's service charges.
 *
 * An activity line is one thing a provider did for a customer:
 *
 *   { date: 'YYYY-MM-DD', service: 'receiving-pallet', quantity: 12, reference, note }
 *
 * `service` is a key from the service rate card (serviceRates in configSpaceLinq.js).
 * Lines come from a file exported from the provider's own system today. The same
 * shape is what a warehouse system connector, or SpaceLinq's own 3PL screens,
 * will send, so everything downstream of this file stays the same.
 */

export const ACTIVITY_COLUMNS = ['date', 'service', 'quantity', 'reference', 'note'];
export const MAX_ACTIVITY_LINES = 5000;

const clean = value => `${value ?? ''}`.trim();
const simplify = value =>
  clean(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

/**
 * Split CSV text into rows of cells. Handles quoted cells, doubled quotes,
 * commas or semicolons or tabs as the separator, and Windows line endings.
 *
 * @param {string} text
 * @returns {Array<Array<string>>} non-empty rows
 */
export const parseCsv = text => {
  const source = `${text ?? ''}`.replace(/^﻿/, '');
  const firstLine = source.split(/\r?\n/)[0] || '';
  const separator = [',', ';', '\t']
    .map(s => ({ s, n: firstLine.split(s).length }))
    .sort((a, b) => b.n - a.n)[0].s;

  const rows = [];
  let row = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < source.length; i += 1) {
    const ch = source[i];
    if (quoted) {
      if (ch === '"' && source[i + 1] === '"') {
        cell += '"';
        i += 1;
      } else if (ch === '"') {
        quoted = false;
      } else {
        cell += ch;
      }
    } else if (ch === '"') {
      quoted = true;
    } else if (ch === separator) {
      row.push(cell);
      cell = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && source[i + 1] === '\n') {
        i += 1;
      }
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
    } else {
      cell += ch;
    }
  }
  row.push(cell);
  rows.push(row);
  return rows.map(r => r.map(clean)).filter(r => r.some(c => c !== ''));
};

// Dates as YYYY-MM-DD, or day first as written in New Zealand (31/10/2026, 31-10-26).
const toIsoDate = value => {
  const text = clean(value);
  const iso = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  const dayFirst = text.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2}|\d{4})$/);
  const parts = iso
    ? [iso[1], iso[2], iso[3]]
    : dayFirst
    ? [dayFirst[3].length === 2 ? `20${dayFirst[3]}` : dayFirst[3], dayFirst[2], dayFirst[1]]
    : null;
  if (!parts) {
    return null;
  }
  const [y, m, d] = parts.map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  const isReal =
    date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
  return isReal ? date.toISOString().slice(0, 10) : null;
};

/**
 * Read activity lines from CSV text. The first row must be a header naming at
 * least `service` and `quantity`; `date`, `reference` and `note` are optional.
 *
 * @param {string} text
 * @returns {{lines: Array<Object>, error: string|null}} error is 'empty' | 'no-header' | 'too-many'
 */
export const parseActivityCsv = text => {
  const rows = parseCsv(text);
  if (rows.length === 0) {
    return { lines: [], error: 'empty' };
  }
  const header = rows[0].map(simplify);
  const column = name => header.indexOf(name);
  const serviceAt = column('service');
  const quantityAt = [column('quantity'), column('qty')].find(i => i >= 0) ?? -1;
  if (serviceAt < 0 || quantityAt < 0) {
    return { lines: [], error: 'no-header' };
  }
  if (rows.length - 1 > MAX_ACTIVITY_LINES) {
    return { lines: [], error: 'too-many' };
  }
  const cell = (row, index) => (index >= 0 ? clean(row[index]) : '');
  const lines = rows.slice(1).map((row, i) => ({
    row: i + 2,
    date: toIsoDate(cell(row, column('date'))),
    rawDate: cell(row, column('date')),
    service: cell(row, serviceAt),
    quantity: Number(cell(row, quantityAt).replace(/,/g, '')),
    reference: cell(row, column('reference')),
    note: cell(row, column('note')),
  }));
  return { lines, error: null };
};

/**
 * The month of services a payment covers: the calendar month ending the day
 * before that payment's month starts. Services are billed in arrears.
 *
 * @param {Date} instalmentStart - start of the month being paid for
 * @returns {{from: string, to: string}|null} inclusive from, exclusive to, as YYYY-MM-DD
 */
export const activityPeriodFor = instalmentStart => {
  if (!(instalmentStart instanceof Date) || Number.isNaN(instalmentStart.getTime())) {
    return null;
  }
  const to = new Date(
    Date.UTC(
      instalmentStart.getUTCFullYear(),
      instalmentStart.getUTCMonth(),
      instalmentStart.getUTCDate()
    )
  );
  const from = new Date(to);
  from.setUTCMonth(from.getUTCMonth() - 1);
  return { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) };
};

/**
 * Add activity lines up into quantities per rate card service.
 * A line counts when its service is on the listing's rate card (matched by key
 * or by label), its quantity is a positive number, and its date, if it has
 * one, falls inside the period.
 *
 * @param {Array<Object>} lines - from parseActivityCsv
 * @param {Array<{key: string, label: string}>} rateCard - the listing's priced services
 * @param {{from: string, to: string}|null} [period]
 * @returns {{quantities: Object, counted: number, skipped: Array<{row, reason}>}}
 *   reason is 'unknown-service' | 'bad-quantity' | 'bad-date' | 'outside-period'
 */
export const summariseActivity = (lines, rateCard, period = null) => {
  const byName = {};
  (rateCard || []).forEach(r => {
    byName[simplify(r.key)] = r.key;
    byName[simplify(r.label)] = r.key;
  });
  const quantities = {};
  const skipped = [];
  let counted = 0;

  (lines || []).forEach(line => {
    const key = byName[simplify(line.service)];
    const skip = reason => skipped.push({ row: line.row, service: line.service, reason });
    if (!key) {
      skip('unknown-service');
    } else if (!Number.isFinite(line.quantity) || line.quantity <= 0) {
      skip('bad-quantity');
    } else if (line.rawDate && !line.date) {
      skip('bad-date');
    } else if (period && line.date && (line.date < period.from || line.date >= period.to)) {
      skip('outside-period');
    } else {
      quantities[key] = Math.round(((quantities[key] || 0) + line.quantity) * 100) / 100;
      counted += 1;
    }
  });
  return { quantities, counted, skipped };
};

/**
 * A starter file for providers: the header and one example line per service
 * on their rate card.
 *
 * @param {Array<{key: string}>} rateCard
 * @param {string} [exampleDate] - YYYY-MM-DD
 * @returns {string} CSV text
 */
export const activityTemplateCsv = (rateCard, exampleDate = '') =>
  [
    ACTIVITY_COLUMNS.join(','),
    ...(rateCard || []).map(r => [exampleDate, r.key, 0, '', ''].join(',')),
  ].join('\n');
