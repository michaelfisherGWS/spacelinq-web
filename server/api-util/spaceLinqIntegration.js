/**
 * SpaceLinq: operator access to the marketplace through Sharetribe's Integration API.
 *
 * Used for the things only the operator may do, such as recording that a
 * certificate has been verified (listing metadata). Needs an Integration API
 * application created in Sharetribe Console:
 *
 *   SHARETRIBE_INTEGRATION_CLIENT_ID
 *   SHARETRIBE_INTEGRATION_CLIENT_SECRET
 *
 * and the operators who may use the admin screens:
 *
 *   SPACELINQ_ADMIN_EMAILS   comma-separated sign-in emails
 */
const BASE_URL =
  process.env.SHARETRIBE_INTEGRATION_BASE_URL || 'https://flex-integ-api.sharetribe.com';

let cachedToken = null;

const credentials = () => ({
  clientId: process.env.SHARETRIBE_INTEGRATION_CLIENT_ID,
  clientSecret: process.env.SHARETRIBE_INTEGRATION_CLIENT_SECRET,
});

const isConfigured = () => {
  const { clientId, clientSecret } = credentials();
  return !!clientId && !!clientSecret;
};

/**
 * Is this sign-in email one of the operators?
 *
 * @param {string} email
 * @param {string} [adminEmails] - comma-separated list (defaults to SPACELINQ_ADMIN_EMAILS)
 * @returns {boolean}
 */
const isAdminEmail = (email, adminEmails = process.env.SPACELINQ_ADMIN_EMAILS) => {
  const wanted = typeof email === 'string' ? email.trim().toLowerCase() : '';
  const admins = (adminEmails || '')
    .split(',')
    .map(e => e.trim().toLowerCase())
    .filter(Boolean);
  return !!wanted && admins.includes(wanted);
};

const apiError = async (response, what) => {
  const error = new Error(`Integration API ${what} failed with status ${response.status}`);
  error.status = response.status;
  return error;
};

const getToken = async () => {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 30000) {
    return cachedToken.value;
  }
  const { clientId, clientSecret } = credentials();
  const response = await fetch(`${BASE_URL}/v1/auth/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded; charset=utf-8',
      Accept: 'application/json',
    },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'client_credentials',
      scope: 'integ',
    }).toString(),
  });
  if (!response.ok) {
    throw await apiError(response, 'sign-in');
  }
  const json = await response.json();
  cachedToken = {
    value: json.access_token,
    expiresAt: Date.now() + (Number(json.expires_in) || 60) * 1000,
  };
  return cachedToken.value;
};

const request = async (method, path, { query, body } = {}) => {
  const token = await getToken();
  const qs = query ? `?${new URLSearchParams(query).toString()}` : '';
  const response = await fetch(`${BASE_URL}/v1/integration_api/${path}${qs}`, {
    method,
    headers: {
      Authorization: `bearer ${token}`,
      Accept: 'application/json',
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  if (!response.ok) {
    throw await apiError(response, path);
  }
  return response.json();
};

module.exports = {
  isConfigured,
  isAdminEmail,
  integrationGet: (path, query) => request('GET', path, { query }),
  integrationPost: (path, body) => request('POST', path, { body }),
};
