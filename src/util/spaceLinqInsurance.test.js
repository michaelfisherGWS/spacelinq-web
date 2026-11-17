import { monthlyPremium, insuranceFromFormValues, hasInsuranceOffer } from './spaceLinqInsurance';

describe('SpaceLinq goods insurance', () => {
  // $1.50 per $1,000 per month, $4.00 for dangerous goods, up to $500,000
  const offer = { rate: 150, dgRate: 400, maxValue: 50000000 };

  it('prices the monthly premium from the declared value', () => {
    expect(monthlyPremium(offer, 8000000, false)).toEqual(12000); // $80,000 -> $120.00
    expect(monthlyPremium(offer, 8000000, true)).toEqual(32000); // DG -> $320.00
  });

  it('does not price values over the limit or DG without a DG rate', () => {
    expect(monthlyPremium(offer, 60000000, false)).toBeNull();
    expect(monthlyPremium({ rate: 150, maxValue: 50000000 }, 8000000, true)).toBeNull();
  });

  it('reads the booking form values', () => {
    expect(insuranceFromFormValues({ insurance: true, insuranceValue: '80,000' }, offer)).toEqual({
      insurance: { value: 8000000, dg: false },
      status: 'ok',
    });
    expect(insuranceFromFormValues({ insurance: true, insuranceValue: '' }, offer).status).toEqual(
      'missing-value'
    );
    expect(
      insuranceFromFormValues({ insurance: true, insuranceValue: '600000' }, offer).status
    ).toEqual('over-limit');
    expect(
      insuranceFromFormValues({ insurance: false, insuranceValue: '5000' }, offer).status
    ).toEqual('none');
    expect(hasInsuranceOffer(null)).toBe(false);
  });
});
