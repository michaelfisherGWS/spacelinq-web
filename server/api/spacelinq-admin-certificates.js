const { getSdk, handleError } = require('../api-util/sdk');
const {
  isConfigured,
  isAdminEmail,
  integrationGet,
  integrationPost,
} = require('../api-util/spaceLinqIntegration');
const {
  sameCertificate,
  certificatesOf,
  withVerification,
  certificateRows,
} = require('../api-util/spaceLinqCertificates');

const MAX_PAGES = 5;
const PER_PAGE = 100;

const listRows = async () => {
  const rows = [];
  for (let page = 1; page <= MAX_PAGES; page += 1) {
    const response = await integrationGet('listings/query', {
      include: 'author',
      perPage: PER_PAGE,
      page,
    });
    rows.push(...certificateRows(response));
    if (page >= (response?.meta?.totalPages || 1)) {
      break;
    }
  }
  return rows;
};

/**
 * SpaceLinq: the operator's certificate verification screen.
 *
 * Body: { action: 'list' }
 *       { action: 'verify' | 'unverify', listingId, type, number }
 *
 * Only signed-in operators (SPACELINQ_ADMIN_EMAILS) get an answer, and only
 * when the Integration API application is set up.
 */
const adminCertificates = (req, res) => {
  const { action, listingId, type, number } = req.body || {};
  const sdk = getSdk(req, res);

  sdk.currentUser
    .show()
    .then(async response => {
      const email = response.data.data.attributes.email;
      if (!isAdminEmail(email)) {
        return res.status(403).json({ error: 'not-operator' });
      }
      if (!isConfigured()) {
        return res.status(200).json({ configured: false, listings: [] });
      }

      if (action === 'verify' || action === 'unverify') {
        if (typeof listingId !== 'string' || !type || !number) {
          return res.status(400).json({ error: 'listingId, type and number are required' });
        }
        const shown = await integrationGet('listings/show', { id: listingId });
        const { publicData, metadata } = shown.data.attributes;
        const certificate = certificatesOf(publicData).find(c =>
          sameCertificate(c, { type, number })
        );
        if (!certificate) {
          return res.status(404).json({ error: 'The listing no longer has that certificate.' });
        }
        await integrationPost('listings/update', {
          id: listingId,
          metadata: {
            verifiedCertificates: withVerification(
              metadata?.verifiedCertificates,
              certificate,
              action === 'verify'
            ),
          },
        });
      } else if (action !== 'list') {
        return res.status(400).json({ error: 'Unknown action' });
      }

      return res.status(200).json({ configured: true, listings: await listRows() });
    })
    .catch(e => {
      handleError(res, e);
    });
};

module.exports = adminCertificates;
