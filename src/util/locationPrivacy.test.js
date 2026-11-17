import {
  approximateCoordinates,
  publicAreaFromAddress,
  buildSiteDetailsMessage,
} from './locationPrivacy';

describe('approximateCoordinates', () => {
  it('rounds to 2 decimal places', () => {
    expect(approximateCoordinates({ lat: -43.59321, lng: 172.38077 })).toEqual({
      lat: -43.59,
      lng: 172.38,
    });
  });
  it('returns null for missing input', () => {
    expect(approximateCoordinates(null)).toBe(null);
  });
});

describe('publicAreaFromAddress', () => {
  it('drops the street line and postcode', () => {
    expect(publicAreaFromAddress('12 Foo Street, Rolleston 7614, New Zealand')).toBe(
      'Rolleston, New Zealand'
    );
  });
  it('handles two-part addresses with a street number', () => {
    expect(publicAreaFromAddress('5 Main Road, Christchurch')).toBe('Christchurch');
  });
  it('keeps area-only addresses', () => {
    expect(publicAreaFromAddress('Hornby, Christchurch')).toBe('Hornby, Christchurch');
  });
  it('handles empty input', () => {
    expect(publicAreaFromAddress('')).toBe('');
  });
});

describe('buildSiteDetailsMessage', () => {
  it('includes address, building and notes', () => {
    const msg = buildSiteDetailsMessage(
      { address: '12 Foo Street, Rolleston', building: 'Unit 3' },
      'Call Sam on 021 000 0000'
    );
    expect(msg).toContain('Address: 12 Foo Street, Rolleston');
    expect(msg).toContain('Unit / building: Unit 3');
    expect(msg).toContain('Call Sam');
  });
  it('returns null without an address', () => {
    expect(buildSiteDetailsMessage({})).toBe(null);
  });
});
