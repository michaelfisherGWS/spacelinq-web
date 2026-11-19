const { certificateRows, withVerification } = require('./spaceLinqCertificates');
const { isAdminEmail } = require('./spaceLinqIntegration');

const lcc = {
  type: 'location-compliance',
  number: 'LCC-1',
  expiry: '2027-03-01',
  classes: ['class-3'],
};

describe('spaceLinqCertificates', () => {
  it('verifies a certificate with the expiry the provider entered', () => {
    expect(withVerification(undefined, lcc, true)).toEqual([
      { type: 'location-compliance', number: 'LCC-1', expiry: '2027-03-01' },
    ]);
  });

  it('replaces an earlier verification of the same certificate and keeps others', () => {
    const verified = [
      { type: 'security', number: 'S1', expiry: '2027-01-01' },
      { type: 'location-compliance', number: 'lcc-1', expiry: '2026-03-01' },
    ];
    expect(withVerification(verified, lcc, true)).toEqual([
      { type: 'security', number: 'S1', expiry: '2027-01-01' },
      { type: 'location-compliance', number: 'LCC-1', expiry: '2027-03-01' },
    ]);
  });

  it('removes a verification', () => {
    const verified = [
      { type: 'security', number: 'S1', expiry: '2027-01-01' },
      { type: 'location-compliance', number: 'LCC-1', expiry: '2027-03-01' },
    ];
    expect(withVerification(verified, lcc, false)).toEqual([verified[0]]);
  });

  it('lists published listings that have certificates, with the provider name', () => {
    const response = {
      data: [
        {
          id: 'l1',
          attributes: {
            title: 'DG store',
            state: 'published',
            publicData: { certificates: [lcc] },
            metadata: { verifiedCertificates: [{ type: 'location-compliance', number: 'LCC-1' }] },
          },
          relationships: { author: { data: { id: 'u1', type: 'user' } } },
        },
        { id: 'l2', attributes: { title: 'No certs', state: 'published', publicData: {} } },
        {
          id: 'l3',
          attributes: { title: 'Draft', state: 'draft', publicData: { certificates: [lcc] } },
        },
        {
          id: 'l4',
          attributes: { title: 'Gone', deleted: true, publicData: { certificates: [lcc] } },
        },
      ],
      included: [{ id: 'u1', type: 'user', attributes: { profile: { displayName: 'Ana T' } } }],
    };
    expect(certificateRows(response)).toEqual([
      {
        id: 'l1',
        title: 'DG store',
        state: 'published',
        provider: 'Ana T',
        certificates: [lcc],
        verified: [{ type: 'location-compliance', number: 'LCC-1' }],
      },
    ]);
    expect(certificateRows(undefined)).toEqual([]);
  });

  it('knows the operators by sign-in email', () => {
    expect(isAdminEmail('Boss@Example.com', 'ops@example.com, boss@example.com')).toBe(true);
    expect(isAdminEmail('someone@example.com', 'ops@example.com')).toBe(false);
    expect(isAdminEmail('', 'ops@example.com')).toBe(false);
    expect(isAdminEmail('ops@example.com', '')).toBe(false);
  });
});
