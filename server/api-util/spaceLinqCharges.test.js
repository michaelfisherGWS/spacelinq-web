const { validateServiceCharges, getServiceChargeLineItems } = require('./spaceLinqCharges');

describe('SpaceLinq service charges', () => {
  const publicData = {
    pricing: {
      rateCard: [{ key: 'receiving-pallet', price: 850 }, { key: 'labour-hour', price: 6500 }],
    },
  };

  it('prices charges from the rate card', () => {
    const charges = validateServiceCharges(publicData, {
      serviceCharges: [
        { key: 'receiving-pallet', quantity: 40 },
        { key: 'labour-hour', quantity: 2.5 },
      ],
      otherCharge: { amount: 12000, note: 'Pallet wrap' },
    });
    const items = getServiceChargeLineItems(publicData, charges, 'NZD');
    expect(items.map(i => [i.code, i.unitPrice.amount, i.quantity])).toEqual([
      ['line-item/service-receiving-pallet', 850, 40],
      ['line-item/service-labour-hour', 6500, 2.5],
      ['line-item/service-other', 12000, 1],
    ]);
  });

  it('drops zero quantities and an empty other charge', () => {
    const charges = validateServiceCharges(publicData, {
      serviceCharges: [{ key: 'receiving-pallet', quantity: 0 }],
      otherCharge: { amount: 0, note: '' },
    });
    expect(charges).toEqual({ serviceCharges: [], otherCharge: null });
  });

  it('rejects a service that is not on the rate card', () => {
    expect(() =>
      validateServiceCharges(publicData, { serviceCharges: [{ key: 'devan-20', quantity: 1 }] })
    ).toThrow(/rate card/);
  });

  it('rejects negative quantities and an other charge without a note', () => {
    expect(() =>
      validateServiceCharges(publicData, { serviceCharges: [{ key: 'labour-hour', quantity: -1 }] })
    ).toThrow(/quantity/);
    expect(() =>
      validateServiceCharges(publicData, { otherCharge: { amount: 500, note: ' ' } })
    ).toThrow(/describe/);
  });
});
