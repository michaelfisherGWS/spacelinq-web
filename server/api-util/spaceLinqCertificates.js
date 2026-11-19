/**
 * SpaceLinq: rules for the operator's certificate verification screen.
 * A certificate is verified when the listing's metadata `verifiedCertificates`
 * holds an entry with the same type and number (see certificateStatus in
 * src/config/configSpaceLinq.js).
 */
const clean = value => (typeof value === 'string' ? value.trim() : '');
const sameCertificate = (a, b) =>
  !!a &&
  !!b &&
  a.type === b.type &&
  clean(a.number).toLowerCase() === clean(b.number).toLowerCase();

const certificatesOf = publicData =>
  Array.isArray(publicData?.certificates) ? publicData.certificates : [];

/**
 * The verified list after verifying, or removing the verification of, one certificate.
 * Verifying copies the expiry the provider entered, so the badge drops on that day.
 *
 * @param {Array<Object>} verified - current metadata.verifiedCertificates
 * @param {Object} certificate - from the listing's publicData.certificates
 * @param {boolean} isVerified - true to verify, false to remove the verification
 * @returns {Array<Object>}
 */
const withVerification = (verified, certificate, isVerified) => {
  const others = (Array.isArray(verified) ? verified : []).filter(
    v => !sameCertificate(v, certificate)
  );
  return isVerified
    ? [
        ...others,
        { type: certificate.type, number: clean(certificate.number), expiry: certificate.expiry },
      ]
    : others;
};

/**
 * Listings that have certificates, shaped for the verification screen.
 *
 * @param {Object} queryResponse - Integration API listings/query response (JSON, author included)
 * @returns {Array<Object>} [{ id, title, state, provider, certificates, verified }]
 */
const certificateRows = queryResponse => {
  const authors = (queryResponse?.included || []).reduce(
    (byId, entity) => (entity.type === 'user' ? { ...byId, [entity.id]: entity } : byId),
    {}
  );
  return (queryResponse?.data || [])
    .filter(l => !l.attributes?.deleted && l.attributes?.state !== 'draft')
    .filter(l => certificatesOf(l.attributes?.publicData).length > 0)
    .map(l => {
      const author = authors[(l.relationships?.author?.data?.id)];
      return {
        id: l.id,
        title: l.attributes.title,
        state: l.attributes.state,
        provider: author?.attributes?.profile?.displayName || null,
        certificates: certificatesOf(l.attributes.publicData),
        verified: Array.isArray(l.attributes.metadata?.verifiedCertificates)
          ? l.attributes.metadata.verifiedCertificates
          : [],
      };
    });
};

module.exports = { sameCertificate, certificatesOf, withVerification, certificateRows };
