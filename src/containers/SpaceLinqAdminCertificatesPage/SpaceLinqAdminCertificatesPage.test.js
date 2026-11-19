import { certificateEntries } from './SpaceLinqAdminCertificatesPage';

describe('certificateEntries', () => {
  const now = new Date('2026-11-20T00:00:00.000Z');
  const cert = (type, number, expiry) => ({ type, number, expiry });

  it('lists one entry per certificate, those still to check first', () => {
    const listings = [
      {
        id: 'l1',
        title: 'A',
        certificates: [
          cert('security', 'S1', '2027-01-01'),
          cert('food-registration', 'F1', '2026-01-01'),
        ],
        verified: [{ type: 'security', number: 'S1' }],
      },
      {
        id: 'l2',
        title: 'B',
        certificates: [cert('location-compliance', 'L1', '2027-01-01')],
        verified: [],
      },
    ];
    expect(certificateEntries(listings, now).map(e => [e.listing.id, e.status])).toEqual([
      ['l2', 'declared'],
      ['l1', 'verified'],
      ['l1', 'expired'],
    ]);
    expect(certificateEntries(undefined, now)).toEqual([]);
  });
});
