const {
  STORAGE_AGREEMENT_VERSION,
  seal,
  unseal,
  isBookingRequest,
  isConfirmed,
  withOrderRecord,
} = require('./spaceLinqOrderRecord');

const user = protectedData => ({
  attributes: { profile: { firstName: 'Ana', lastName: 'Tester', protectedData } },
});

describe('spaceLinqOrderRecord', () => {
  const original = process.env.SHARETRIBE_SDK_CLIENT_SECRET;
  beforeEach(() => {
    process.env.SHARETRIBE_SDK_CLIENT_SECRET = 'test-secret';
  });
  afterAll(() => {
    process.env.SHARETRIBE_SDK_CLIENT_SECRET = original;
  });

  it('seals and opens details', () => {
    const sealed = seal({ companyName: 'Acme Ltd' });
    expect(sealed).not.toContain('Acme');
    expect(unseal(sealed)).toEqual({ companyName: 'Acme Ltd' });
  });

  it('does not open tampered or foreign text', () => {
    const sealed = seal({ companyName: 'Acme Ltd' });
    expect(unseal(`A${sealed.slice(1)}`)).toBeNull();
    expect(unseal('not sealed')).toBeNull();
    process.env.SHARETRIBE_SDK_CLIENT_SECRET = 'another-secret';
    expect(unseal(sealed)).toBeNull();
  });

  it('seals nothing without a key', () => {
    delete process.env.SHARETRIBE_SDK_CLIENT_SECRET;
    expect(seal({ companyName: 'Acme Ltd' })).toBeNull();
  });

  it('records the accepted agreement with server time and the customer name', () => {
    const now = new Date('2026-11-19T03:00:00.000Z');
    const result = withOrderRecord(
      { storageAgreementAccepted: true, unitType: 'day' },
      user({ accountType: 'personal' }),
      now
    );
    expect(result).toEqual({
      unitType: 'day',
      storageAgreement: {
        version: STORAGE_AGREEMENT_VERSION,
        acceptedAt: '2026-11-19T03:00:00.000Z',
        acceptedBy: 'Ana Tester',
      },
    });
  });

  it('drops a record sent by the browser', () => {
    const result = withOrderRecord(
      {
        storageAgreement: { version: 'x', acceptedAt: '2000-01-01', acceptedBy: 'Someone' },
        customerCompanySealed: 'made up',
      },
      user({ accountType: 'personal' })
    );
    expect(result).toEqual({});
  });

  it('seals the company name of a business account only', () => {
    const business = withOrderRecord({}, user({ accountType: 'business', companyName: ' Acme ' }));
    expect(unseal(business.customerCompanySealed)).toEqual({ companyName: 'Acme' });
    expect(JSON.stringify(business)).not.toContain('Acme');

    const personal = withOrderRecord({}, user({ accountType: 'personal', companyName: 'Acme' }));
    expect(personal.customerCompanySealed).toBeUndefined();
  });

  it('knows booking requests and confirmed bookings', () => {
    expect(isBookingRequest('transition/request-payment')).toBe(true);
    expect(isBookingRequest('transition/schedule-extension')).toBe(false);
    expect(isConfirmed([{ transition: 'transition/request-payment' }])).toBe(false);
    expect(
      isConfirmed([
        { transition: 'transition/request-payment' },
        { transition: 'transition/accept' },
      ])
    ).toBe(true);
    expect(isConfirmed([{ transition: 'transition/confirm-payment-instant' }])).toBe(true);
  });
});
