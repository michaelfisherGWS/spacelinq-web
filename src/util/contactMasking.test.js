import {
  maskContactDetails,
  isContactUnlocked,
  MASKED_CONTACT_PLACEHOLDER as P,
} from './contactMasking';

describe('maskContactDetails', () => {
  it('masks email addresses', () => {
    const { text, masked } = maskContactDetails('Email me at john.smith@example.co.nz thanks');
    expect(masked).toBe(true);
    expect(text).toBe(`Email me at ${P} thanks`);
  });

  it('masks obfuscated email addresses', () => {
    const { masked } = maskContactDetails('john (at) example (dot) com');
    expect(masked).toBe(true);
  });

  it('masks NZ mobile and landline numbers', () => {
    expect(maskContactDetails('call 021 123 4567').masked).toBe(true);
    expect(maskContactDetails('ph (03) 347-1234').masked).toBe(true);
    expect(maskContactDetails('+64 21 123 4567').masked).toBe(true);
    expect(maskContactDetails('0211234567').masked).toBe(true);
  });

  it('masks web links and bare domains', () => {
    expect(maskContactDetails('see https://mywarehouse.co.nz/rates').masked).toBe(true);
    expect(maskContactDetails('www.mywarehouse.com').masked).toBe(true);
    expect(maskContactDetails('visit mywarehouse.co.nz').masked).toBe(true);
  });

  it('leaves normal storage messages alone', () => {
    const msg = 'We need 120 pallets at 2-8°C from 1 March for 6 months, about 450 m2.';
    const { text, masked } = maskContactDetails(msg);
    expect(masked).toBe(false);
    expect(text).toBe(msg);
  });

  it('handles empty input', () => {
    expect(maskContactDetails('')).toEqual({ text: '', masked: false });
    expect(maskContactDetails(null)).toEqual({ text: null, masked: false });
  });
});

describe('isContactUnlocked', () => {
  const tx = { id: { uuid: '1' } };
  it('is true for accepted and later states', () => {
    expect(isContactUnlocked(tx, () => 'accepted')).toBe(true);
    expect(isContactUnlocked(tx, () => 'delivered')).toBe(true);
  });
  it('is false before acceptance', () => {
    expect(isContactUnlocked(tx, () => 'preauthorized')).toBe(false);
    expect(isContactUnlocked(tx, () => 'inquiry')).toBe(false);
    expect(isContactUnlocked(null, () => 'accepted')).toBe(false);
  });
});
