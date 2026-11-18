const { types } = require('sharetribe-flex-sdk');
const { Money } = types;
const { transactionLineItems } = require('./lineItems');

describe('transactionLineItems', () => {
  // Mock data for testing
  const mockListing = {
    attributes: {
      price: new Money(10000, 'EUR'), // €100.00
      publicData: {
        unitType: 'day',
        priceVariationsEnabled: false,
      },
    },
  };

  const mockProviderCommission = {
    percentage: 10,
    minimum_amount: 500, // €5.00
  };

  const mockCustomerCommission = {
    percentage: 5,
    minimum_amount: 200, // €2.00
  };

  const mockOrderData = {
    bookingStart: '2024-01-01T00:00:00.000Z',
    bookingEnd: '2024-01-03T00:00:00.000Z',
    seats: 2,
    stockReservationQuantity: 3,
    deliveryMethod: 'shipping',
    currency: 'EUR',
  };

  describe('Default Booking Process - Day Unit Type', () => {
    it('should create line items for day-based booking without seats', () => {
      const listing = {
        ...mockListing,
        attributes: {
          ...mockListing.attributes,
          publicData: {
            ...mockListing.attributes.publicData,
            unitType: 'day',
          },
        },
      };

      const orderData = {
        bookingStart: '2024-01-01T00:00:00.000Z',
        bookingEnd: '2024-01-03T00:00:00.000Z',
      };

      const result = transactionLineItems(
        listing,
        orderData,
        mockProviderCommission,
        mockCustomerCommission
      );

      expect(result).toHaveLength(3); // order + provider commission + customer commission

      // Check main order line item
      expect(result[0]).toEqual({
        code: 'line-item/day',
        unitPrice: new Money(10000, 'EUR'),
        quantity: 2, // 2 days between dates
        includeFor: ['customer', 'provider'],
      });

      // Check provider commission
      expect(result[1].code).toBe('line-item/provider-commission');
      expect(result[1].includeFor).toEqual(['provider']);

      // Check customer commission
      expect(result[2].code).toBe('line-item/customer-commission');
      expect(result[2].includeFor).toEqual(['customer']);
    });

    it('should create line items for day-based booking with seats', () => {
      const listing = {
        ...mockListing,
        attributes: {
          ...mockListing.attributes,
          publicData: {
            ...mockListing.attributes.publicData,
            unitType: 'day',
          },
        },
      };

      const orderData = {
        bookingStart: '2024-01-01T00:00:00.000Z',
        bookingEnd: '2024-01-03T00:00:00.000Z',
        seats: 3,
      };

      const result = transactionLineItems(
        listing,
        orderData,
        mockProviderCommission,
        mockCustomerCommission
      );

      expect(result).toHaveLength(3);

      // Check main order line item with seats
      expect(result[0]).toEqual({
        code: 'line-item/day',
        unitPrice: new Money(10000, 'EUR'),
        units: 2, // 2 days
        seats: 3, // 3 seats
        includeFor: ['customer', 'provider'],
      });
    });
  });

  describe('Default Booking Process - Night Unit Type', () => {
    it('should create line items for night-based booking without seats', () => {
      const listing = {
        ...mockListing,
        attributes: {
          ...mockListing.attributes,
          publicData: {
            ...mockListing.attributes.publicData,
            unitType: 'night',
          },
        },
      };

      const orderData = {
        bookingStart: '2024-01-01T00:00:00.000Z',
        bookingEnd: '2024-01-03T00:00:00.000Z',
      };

      const result = transactionLineItems(
        listing,
        orderData,
        mockProviderCommission,
        mockCustomerCommission
      );

      expect(result).toHaveLength(3);

      // Check main order line item
      expect(result[0]).toEqual({
        code: 'line-item/night',
        unitPrice: new Money(10000, 'EUR'),
        quantity: 2, // 2 nights between dates
        includeFor: ['customer', 'provider'],
      });
    });

    it('should create line items for night-based booking with seats', () => {
      const listing = {
        ...mockListing,
        attributes: {
          ...mockListing.attributes,
          publicData: {
            ...mockListing.attributes.publicData,
            unitType: 'night',
          },
        },
      };

      const orderData = {
        bookingStart: '2024-01-01T00:00:00.000Z',
        bookingEnd: '2024-01-03T00:00:00.000Z',
        seats: 4,
      };

      const result = transactionLineItems(
        listing,
        orderData,
        mockProviderCommission,
        mockCustomerCommission
      );

      expect(result).toHaveLength(3);

      // Check main order line item with seats
      expect(result[0]).toEqual({
        code: 'line-item/night',
        unitPrice: new Money(10000, 'EUR'),
        units: 2, // 2 nights
        seats: 4, // 4 seats
        includeFor: ['customer', 'provider'],
      });
    });
  });

  describe('Default Booking Process - Hour Unit Type', () => {
    it('should create line items for hour-based booking without seats', () => {
      const listing = {
        ...mockListing,
        attributes: {
          ...mockListing.attributes,
          publicData: {
            ...mockListing.attributes.publicData,
            unitType: 'hour',
          },
        },
      };

      const orderData = {
        bookingStart: '2024-01-01T00:00:00.000Z',
        bookingEnd: '2024-01-01T03:00:00.000Z', // 3 hours
      };

      const result = transactionLineItems(
        listing,
        orderData,
        mockProviderCommission,
        mockCustomerCommission
      );

      expect(result).toHaveLength(3);

      // Check main order line item
      expect(result[0]).toEqual({
        code: 'line-item/hour',
        unitPrice: new Money(10000, 'EUR'),
        quantity: 3, // 3 hours
        includeFor: ['customer', 'provider'],
      });
    });

    it('should create line items for hour-based booking with seats', () => {
      const listing = {
        ...mockListing,
        attributes: {
          ...mockListing.attributes,
          publicData: {
            ...mockListing.attributes.publicData,
            unitType: 'hour',
          },
        },
      };

      const orderData = {
        bookingStart: '2024-01-01T00:00:00.000Z',
        bookingEnd: '2024-01-01T03:00:00.000Z', // 3 hours
        seats: 2,
      };

      const result = transactionLineItems(
        listing,
        orderData,
        mockProviderCommission,
        mockCustomerCommission
      );

      expect(result).toHaveLength(3);

      // Check main order line item with seats
      expect(result[0]).toEqual({
        code: 'line-item/hour',
        unitPrice: new Money(10000, 'EUR'),
        units: 3, // 3 hours
        seats: 2, // 2 seats
        includeFor: ['customer', 'provider'],
      });
    });
  });

  describe('Default Booking Process - Fixed Unit Type', () => {
    it('should create line items for fixed-duration booking without seats', () => {
      const listing = {
        ...mockListing,
        attributes: {
          ...mockListing.attributes,
          publicData: {
            ...mockListing.attributes.publicData,
            unitType: 'fixed',
          },
        },
      };

      const orderData = {
        bookingStart: '2024-01-01T00:00:00.000Z',
        bookingEnd: '2024-01-01T02:00:00.000Z',
      };

      const result = transactionLineItems(
        listing,
        orderData,
        mockProviderCommission,
        mockCustomerCommission
      );

      expect(result).toHaveLength(3);

      // Check main order line item
      expect(result[0]).toEqual({
        code: 'line-item/fixed',
        unitPrice: new Money(10000, 'EUR'),
        quantity: 1, // 1 fixed session
        includeFor: ['customer', 'provider'],
      });
    });

    it('should create line items for fixed-duration booking with seats', () => {
      const listing = {
        ...mockListing,
        attributes: {
          ...mockListing.attributes,
          publicData: {
            ...mockListing.attributes.publicData,
            unitType: 'fixed',
          },
        },
      };

      const orderData = {
        bookingStart: '2024-01-01T00:00:00.000Z',
        bookingEnd: '2024-01-01T02:00:00.000Z',
        seats: 5,
      };

      const result = transactionLineItems(
        listing,
        orderData,
        mockProviderCommission,
        mockCustomerCommission
      );

      expect(result).toHaveLength(3);

      // Check main order line item with seats
      expect(result[0]).toEqual({
        code: 'line-item/fixed',
        unitPrice: new Money(10000, 'EUR'),
        units: 1, // 1 fixed session
        seats: 5, // 5 seats
        includeFor: ['customer', 'provider'],
      });
    });
  });

  describe('Default Purchase Process - Item Unit Type', () => {
    it('should create line items for item purchase with pickup delivery', () => {
      const listing = {
        ...mockListing,
        attributes: {
          ...mockListing.attributes,
          publicData: {
            ...mockListing.attributes.publicData,
            unitType: 'item',
            shippingPriceInSubunitsOneItem: 500, // €5.00
            shippingPriceInSubunitsAdditionalItems: 200, // €2.00
          },
        },
      };

      const orderData = {
        stockReservationQuantity: 2,
        deliveryMethod: 'pickup',
        currency: 'EUR',
      };

      const result = transactionLineItems(
        listing,
        orderData,
        mockProviderCommission,
        mockCustomerCommission
      );

      expect(result).toHaveLength(3); // order + provider commission + customer commission (no shipping for pickup)

      // Check main order line item
      expect(result[0]).toEqual({
        code: 'line-item/item',
        unitPrice: new Money(10000, 'EUR'),
        quantity: 2,
        includeFor: ['customer', 'provider'],
      });
    });

    it('should create line items for item purchase with shipping delivery', () => {
      const listing = {
        ...mockListing,
        attributes: {
          ...mockListing.attributes,
          publicData: {
            ...mockListing.attributes.publicData,
            unitType: 'item',
            shippingPriceInSubunitsOneItem: 500, // €5.00
            shippingPriceInSubunitsAdditionalItems: 200, // €2.00
          },
        },
      };

      const orderData = {
        stockReservationQuantity: 3,
        deliveryMethod: 'shipping',
        currency: 'EUR',
      };

      const result = transactionLineItems(
        listing,
        orderData,
        mockProviderCommission,
        mockCustomerCommission
      );

      expect(result).toHaveLength(4); // order + shipping + provider commission + customer commission

      // Check main order line item
      expect(result[0]).toEqual({
        code: 'line-item/item',
        unitPrice: new Money(10000, 'EUR'),
        quantity: 3,
        includeFor: ['customer', 'provider'],
      });

      // Check shipping line item
      expect(result[1]).toEqual({
        code: 'line-item/shipping-fee',
        unitPrice: new Money(900, 'EUR'), // €5.00 + (2 * €2.00) = €9.00
        quantity: 1,
        includeFor: ['customer', 'provider'],
      });
    });

    it('should create line items for single item purchase with shipping', () => {
      const listing = {
        ...mockListing,
        attributes: {
          ...mockListing.attributes,
          publicData: {
            ...mockListing.attributes.publicData,
            unitType: 'item',
            shippingPriceInSubunitsOneItem: 500, // €5.00
            shippingPriceInSubunitsAdditionalItems: 200, // €2.00
          },
        },
      };

      const orderData = {
        stockReservationQuantity: 1,
        deliveryMethod: 'shipping',
        currency: 'EUR',
      };

      const result = transactionLineItems(
        listing,
        orderData,
        mockProviderCommission,
        mockCustomerCommission
      );

      expect(result).toHaveLength(4); // order + shipping + provider commission + customer commission

      // Check shipping line item for single item
      expect(result[1]).toEqual({
        code: 'line-item/shipping-fee',
        unitPrice: new Money(500, 'EUR'), // €5.00 for first item only
        quantity: 1,
        includeFor: ['customer', 'provider'],
      });
    });
  });

  describe('Default Negotiation Process - Request Unit Type (Reverse Flow)', () => {
    it('should create line items for negotiation request with offer', () => {
      const listing = {
        ...mockListing,
        attributes: {
          ...mockListing.attributes,
          publicData: {
            ...mockListing.attributes.publicData,
            unitType: 'request',
          },
        },
      };

      const orderData = {
        offer: new Money(15000, 'EUR'), // €150.00 offer
        currency: 'EUR',
      };

      const result = transactionLineItems(
        listing,
        orderData,
        mockProviderCommission,
        mockCustomerCommission
      );

      expect(result).toHaveLength(3); // order + provider commission + customer commission

      // Check main order line item
      expect(result[0]).toEqual({
        code: 'line-item/request',
        unitPrice: new Money(15000, 'EUR'), // Uses the offer amount
        quantity: 1,
        includeFor: ['customer', 'provider'],
      });
    });

    it('should create line items for negotiation request without offer (uses listing price)', () => {
      const listing = {
        ...mockListing,
        attributes: {
          ...mockListing.attributes,
          publicData: {
            ...mockListing.attributes.publicData,
            unitType: 'request',
          },
        },
      };

      const orderData = {
        currency: 'EUR',
      };

      const result = transactionLineItems(
        listing,
        orderData,
        mockProviderCommission,
        mockCustomerCommission
      );

      expect(result).toHaveLength(3);

      // Check main order line item uses listing price when no offer
      expect(result[0]).toEqual({
        code: 'line-item/request',
        unitPrice: new Money(10000, 'EUR'), // Uses listing price
        quantity: 1,
        includeFor: ['customer', 'provider'],
      });
    });
  });

  describe('Price Variants', () => {
    it('should use price variant when priceVariationsEnabled is true', () => {
      const listing = {
        ...mockListing,
        attributes: {
          ...mockListing.attributes,
          publicData: {
            ...mockListing.attributes.publicData,
            unitType: 'day',
            priceVariationsEnabled: true,
            priceVariants: [
              {
                name: 'weekend',
                priceInSubunits: 15000, // €150.00
              },
            ],
          },
        },
      };

      const orderData = {
        bookingStart: '2024-01-01T00:00:00.000Z',
        bookingEnd: '2024-01-03T00:00:00.000Z',
        priceVariantName: 'weekend',
      };

      const result = transactionLineItems(
        listing,
        orderData,
        mockProviderCommission,
        mockCustomerCommission
      );

      expect(result[0].unitPrice).toEqual(new Money(15000, 'EUR'));
    });
  });

  describe('Commission Handling', () => {
    it('should not add commission line items when commissions are not provided', () => {
      const listing = {
        ...mockListing,
        attributes: {
          ...mockListing.attributes,
          publicData: {
            ...mockListing.attributes.publicData,
            unitType: 'day',
          },
        },
      };

      const orderData = {
        bookingStart: '2024-01-01T00:00:00.000Z',
        bookingEnd: '2024-01-03T00:00:00.000Z',
      };

      const result = transactionLineItems(listing, orderData, null, null);

      expect(result).toHaveLength(1); // Only order line item
      expect(result[0].code).toBe('line-item/day');
    });

    it('should use minimum commission when it is greater than percentage-based commission', () => {
      const listing = {
        ...mockListing,
        attributes: {
          ...mockListing.attributes,
          publicData: {
            ...mockListing.attributes.publicData,
            unitType: 'day',
          },
        },
      };

      const orderData = {
        bookingStart: '2024-01-01T00:00:00.000Z',
        bookingEnd: '2024-01-03T00:00:00.000Z',
      };

      const providerCommission = {
        percentage: 5,
        minimum_amount: 3000, // €30.00 minimum (greater than 5% of €200 = €10)
      };

      const result = transactionLineItems(listing, orderData, providerCommission, null);

      expect(result).toHaveLength(2); // order + provider commission
      expect(result[1].code).toBe('line-item/provider-commission');
      expect(result[1].unitPrice).toEqual(new Money(3000, 'EUR')); // Uses minimum amount
      expect(result[1].quantity).toBe(-1); // Negative for provider commission
    });

    it('should use percentage-based commission when it is greater than minimum', () => {
      const listing = {
        ...mockListing,
        attributes: {
          ...mockListing.attributes,
          publicData: {
            ...mockListing.attributes.publicData,
            unitType: 'day',
          },
        },
      };

      const orderData = {
        bookingStart: '2024-01-01T00:00:00.000Z',
        bookingEnd: '2024-01-03T00:00:00.000Z',
      };

      const providerCommission = {
        percentage: 15,
        minimum_amount: 100, // €1.00 minimum (less than 15% of €200 = €30)
      };

      const result = transactionLineItems(listing, orderData, providerCommission, null);

      expect(result).toHaveLength(2); // order + provider commission
      expect(result[1].code).toBe('line-item/provider-commission');
      expect(result[1].percentage).toBe(-15); // Negative percentage for provider commission
    });
  });

  describe('Error Handling', () => {
    it('should throw error when orderData is missing required quantity information', () => {
      const listing = {
        ...mockListing,
        attributes: {
          ...mockListing.attributes,
          publicData: {
            ...mockListing.attributes.publicData,
            unitType: 'day',
          },
        },
      };

      const orderData = {
        // Missing bookingStart and bookingEnd
      };

      expect(() => {
        transactionLineItems(listing, orderData, mockProviderCommission, mockCustomerCommission);
      }).toThrow(
        'Error: orderData is missing the following information: quantity, units, seats. Quantity or either units & seats is required.'
      );
    });

    it('should throw error when orderData is missing units and seats for seat-based booking', () => {
      const listing = {
        ...mockListing,
        attributes: {
          ...mockListing.attributes,
          publicData: {
            ...mockListing.attributes.publicData,
            unitType: 'day',
          },
        },
      };

      const orderData = {
        // Missing bookingStart and bookingEnd - this will cause calculateQuantityFromDates to return null
        seats: 2,
      };

      expect(() => {
        transactionLineItems(listing, orderData, mockProviderCommission, mockCustomerCommission);
      }).toThrow(
        'Error: orderData is missing the following information: quantity, units. Quantity or either units & seats is required.'
      );
    });

    it('should throw error when minimum commission is greater than transaction amount', () => {
      const listing = {
        ...mockListing,
        attributes: {
          ...mockListing.attributes,
          publicData: {
            ...mockListing.attributes.publicData,
            unitType: 'day',
          },
        },
      };

      const orderData = {
        bookingStart: '2024-01-01T00:00:00.000Z',
        bookingEnd: '2024-01-03T00:00:00.000Z',
      };

      const providerCommission = {
        percentage: 5,
        minimum_amount: 50000, // €500.00 minimum (greater than transaction amount)
      };

      expect(() => {
        transactionLineItems(listing, orderData, providerCommission, null);
      }).toThrow('Minimum commission amount is greater than the amount of money paid in');
    });
  });

  describe('Currency Handling', () => {
    it('should use currency from orderData when listing price has no currency', () => {
      const listing = {
        ...mockListing,
        attributes: {
          price: null, // No price attribute
          publicData: {
            ...mockListing.attributes.publicData,
            unitType: 'day',
          },
        },
      };

      const orderData = {
        bookingStart: '2024-01-01T00:00:00.000Z',
        bookingEnd: '2024-01-03T00:00:00.000Z',
        currency: 'USD',
      };

      const result = transactionLineItems(listing, orderData, null, null);

      expect(result[0].unitPrice).toBeNull(); // No unit price when no listing price
    });

    it('should use currency from listing price when available', () => {
      const listing = {
        ...mockListing,
        attributes: {
          price: new Money(10000, 'USD'), // USD currency
          publicData: {
            ...mockListing.attributes.publicData,
            unitType: 'day',
          },
        },
      };

      const orderData = {
        bookingStart: '2024-01-01T00:00:00.000Z',
        bookingEnd: '2024-01-03T00:00:00.000Z',
        currency: 'EUR', // Different currency in orderData
      };

      const result = transactionLineItems(listing, orderData, null, null);

      expect(result[0].unitPrice.currency).toBe('USD'); // Uses listing currency
    });
  });
});

describe('SpaceLinq add-on line items', () => {
  const { getSpaceLinqAddOnLineItems } = require('./lineItems');
  const publicData = {
    pricing: {
      addOns: [{ key: 'wms', price: 5000 }, { key: 'access-24-7', price: 2000 }],
    },
  };

  it('adds selected add-ons pro-rata for the booked days', () => {
    const items = getSpaceLinqAddOnLineItems(publicData, { addOns: ['wms'] }, 365 / 12, 'NZD');
    expect(items).toHaveLength(1);
    expect(items[0].code).toEqual('line-item/addon-wms');
    expect(items[0].unitPrice.amount).toEqual(5000);
  });

  it('ignores add-ons the provider does not offer', () => {
    const items = getSpaceLinqAddOnLineItems(publicData, { addOns: ['dock-handling'] }, 30, 'NZD');
    expect(items).toHaveLength(0);
  });
});

describe('SpaceLinq minimum term and monthly instalments', () => {
  const { Money } = types;
  const listing = {
    attributes: {
      price: new Money(600, 'NZD'),
      publicData: { unitType: 'day', pricing: { minTermMonths: 3 } },
    },
  };
  const day = n => new Date(Date.UTC(2027, 0, 1 + n));

  it('rejects a booking shorter than the minimum term', () => {
    const orderData = { bookingStart: day(0), bookingEnd: day(31) };
    expect(() => transactionLineItems(listing, orderData, null, null)).toThrow(/minimum term/);
  });

  it('accepts a one month instalment of an agreement that meets the minimum term', () => {
    const orderData = {
      bookingStart: day(31),
      bookingEnd: day(59),
      agreement: { start: day(0).toISOString(), end: day(120).toISOString() },
    };
    const result = transactionLineItems(listing, orderData, null, null);
    expect(result[0].code).toEqual('line-item/day');
  });

  it('rejects an instalment when the agreement itself is too short', () => {
    const orderData = {
      bookingStart: day(31),
      bookingEnd: day(59),
      agreement: { start: day(0).toISOString(), end: day(60).toISOString() },
    };
    expect(() => transactionLineItems(listing, orderData, null, null)).toThrow(/minimum term/);
  });

  it('ignores an agreement that does not contain the instalment', () => {
    const orderData = {
      bookingStart: day(200),
      bookingEnd: day(228),
      agreement: { start: day(0).toISOString(), end: day(120).toISOString() },
    };
    expect(() => transactionLineItems(listing, orderData, null, null)).toThrow(/minimum term/);
  });
});

describe('SpaceLinq fee on services', () => {
  const { Money } = types;
  const listing = {
    attributes: {
      price: new Money(200, 'NZD'),
      publicData: {
        unitType: 'day',
        pricing: { addOns: [{ key: 'goods-insurance', price: 3650 }] },
      },
    },
  };
  const orderData = {
    bookingStart: new Date(Date.UTC(2027, 0, 1)),
    bookingEnd: new Date(Date.UTC(2027, 0, 31)),
    addOns: ['goods-insurance'],
  };
  const extraLineItems = [
    {
      code: 'line-item/service-other',
      unitPrice: new Money(10000, 'NZD'),
      quantity: 1,
      includeFor: ['customer', 'provider'],
    },
  ];

  it('charges 7% of add-ons and service charges to the provider', () => {
    const result = transactionLineItems(listing, orderData, { percentage: 10 }, null, {
      extraLineItems,
    });
    const fee = result.find(i => i.code === 'line-item/service-commission');
    // 30 days of a $36.50 monthly add-on is $36.00, plus the $100.00 service charge
    expect(fee.unitPrice.amount).toEqual(3600 + 10000);
    expect(fee.percentage).toEqual(-7);
    expect(fee.includeFor).toEqual(['provider']);
  });

  it('adds no services fee when there are no services or no provider commission', () => {
    const noServices = transactionLineItems(
      listing,
      { ...orderData, addOns: [] },
      { percentage: 10 },
      null
    );
    expect(noServices.find(i => i.code === 'line-item/service-commission')).toBeUndefined();
    const noCommission = transactionLineItems(listing, orderData, null, null, { extraLineItems });
    expect(noCommission.find(i => i.code === 'line-item/service-commission')).toBeUndefined();
  });
});

describe('SpaceLinq goods insurance line item', () => {
  const { Money } = types;
  const { getSpaceLinqInsuranceLineItems } = require('./lineItems');
  // $1.50 per $1,000 per month, $4.00 for dangerous goods, up to $500,000
  const publicData = { pricing: { insurance: { rate: 150, dgRate: 400, maxValue: 50000000 } } };
  const oneMonth = 365 / 12;

  it('charges the monthly premium for the declared value', () => {
    const [item] = getSpaceLinqInsuranceLineItems(
      publicData,
      { insurance: { value: 8000000 } },
      oneMonth,
      'NZD'
    );
    expect(item.code).toEqual('line-item/insurance');
    expect(item.unitPrice.amount).toEqual(12000);
  });

  it('uses the dangerous goods rate when asked', () => {
    const [item] = getSpaceLinqInsuranceLineItems(
      publicData,
      { insurance: { value: 8000000, dg: true } },
      oneMonth,
      'NZD'
    );
    expect(item.unitPrice.amount).toEqual(32000);
  });

  it('rejects values over the limit and listings without an offer', () => {
    expect(() =>
      getSpaceLinqInsuranceLineItems(publicData, { insurance: { value: 60000000 } }, 30, 'NZD')
    ).toThrow(/declared value/);
    expect(() =>
      getSpaceLinqInsuranceLineItems({ pricing: {} }, { insurance: { value: 1000 } }, 30, 'NZD')
    ).toThrow(/does not offer/);
    expect(() =>
      getSpaceLinqInsuranceLineItems(
        { pricing: { insurance: { rate: 150, maxValue: 50000000 } } },
        { insurance: { value: 1000, dg: true } },
        30,
        'NZD'
      )
    ).toThrow(/dangerous goods/);
  });

  it('adds nothing when no insurance was asked for', () => {
    expect(getSpaceLinqInsuranceLineItems(publicData, {}, 30, 'NZD')).toEqual([]);
  });

  it('is included in the 7% services fee', () => {
    const listing = {
      attributes: { price: new Money(200, 'NZD'), publicData: { unitType: 'day', ...publicData } },
    };
    const orderData = {
      bookingStart: new Date(Date.UTC(2027, 0, 1)),
      bookingEnd: new Date(Date.UTC(2027, 0, 31)),
      insurance: { value: 8000000 },
    };
    const result = transactionLineItems(listing, orderData, { percentage: 10 }, null);
    const premium = result.find(i => i.code === 'line-item/insurance').unitPrice.amount;
    expect(result.find(i => i.code === 'line-item/service-commission').unitPrice.amount).toEqual(
      premium
    );
  });
});

describe('SpaceLinq flat monthly pricing', () => {
  const { Money } = types;
  const momentTz = require('moment-timezone');
  const timezone = 'Pacific/Auckland';
  const at = s => momentTz.tz(s, timezone).toDate();
  const listing = pricing => ({
    attributes: {
      // $180.00 a month is $5.92 a day
      price: new Money(592, 'NZD'),
      availabilityPlan: { timezone },
      publicData: { unitType: 'day', pricing },
    },
  });
  const monthly = { model: 'fixed-monthly', cycle: 'month', rate: 18000 };

  it('charges the flat monthly price for a whole month, whatever its length', () => {
    const february = transactionLineItems(
      listing(monthly),
      { bookingStart: at('2027-02-23'), bookingEnd: at('2027-03-23') },
      { percentage: 10 },
      null
    );
    expect(february[0].code).toEqual('line-item/month');
    expect(february[0].unitPrice.amount).toEqual(18000);
    expect([february[0].units, february[0].seats]).toEqual([1, 1]);
    // Commission is on the flat price
    expect(february.find(i => i.code === 'line-item/provider-commission').unitPrice.amount).toEqual(
      18000
    );

    const december = transactionLineItems(
      listing(monthly),
      { bookingStart: at('2026-12-23'), bookingEnd: at('2027-01-23') },
      null,
      null
    );
    expect(december[0].unitPrice.amount).toEqual(18000);
  });

  it('charges per unit per month when the listing is priced per square metre', () => {
    const result = transactionLineItems(
      listing({ model: 'per-m2', cycle: 'month', rate: 2000 }),
      { bookingStart: at('2027-01-15'), bookingEnd: at('2027-03-15'), seats: 12 },
      null,
      null
    );
    expect([result[0].code, result[0].unitPrice.amount, result[0].units, result[0].seats]).toEqual([
      'line-item/month',
      2000,
      2,
      12,
    ]);
  });

  it('keeps the daily rate for part months and weekly-priced listings', () => {
    const partMonth = transactionLineItems(
      listing(monthly),
      { bookingStart: at('2027-01-15'), bookingEnd: at('2027-03-01') },
      null,
      null
    );
    expect(partMonth[0].code).toEqual('line-item/day');

    const weekly = transactionLineItems(
      listing({ model: 'per-pallet', cycle: 'week', rate: 1400 }),
      { bookingStart: at('2027-01-15'), bookingEnd: at('2027-02-15'), seats: 5 },
      null,
      null
    );
    expect(weekly[0].code).toEqual('line-item/day');
  });

  it('charges monthly services and insurance flat for whole months', () => {
    const result = transactionLineItems(
      listing({
        ...monthly,
        addOns: [{ key: 'wms', price: 5000 }],
        insurance: { rate: 150, maxValue: 50000000 },
      }),
      {
        bookingStart: at('2027-02-23'),
        bookingEnd: at('2027-03-23'),
        addOns: ['wms'],
        insurance: { value: 8000000 },
      },
      null,
      null
    );
    expect(result.find(i => i.code === 'line-item/addon-wms').unitPrice.amount).toEqual(5000);
    expect(result.find(i => i.code === 'line-item/insurance').unitPrice.amount).toEqual(12000);
  });
});

describe('SpaceLinq short-stay daily rate', () => {
  const { Money } = types;
  const momentTz = require('moment-timezone');
  const timezone = 'Pacific/Auckland';
  const at = s => momentTz.tz(s, timezone).toDate();
  const listing = (pricing, price = 592) => ({
    attributes: {
      price: new Money(price, 'NZD'),
      availabilityPlan: { timezone },
      publicData: { unitType: 'day', pricing },
    },
  });
  // A car park: $180.00 a month, or $15.00 a day for short stays
  const parking = { model: 'per-space', cycle: 'month', rate: 18000, dailyRate: 1500 };

  it('charges the daily rate for a stay under a month', () => {
    const result = transactionLineItems(
      listing(parking),
      { bookingStart: at('2027-03-05'), bookingEnd: at('2027-03-08'), seats: 2 },
      { percentage: 10 },
      null
    );
    expect([result[0].code, result[0].unitPrice.amount, result[0].units, result[0].seats]).toEqual([
      'line-item/day',
      1500,
      3,
      2,
    ]);
    // Commission follows the short-stay price: 3 days x 2 spaces x $15.00
    expect(result.find(i => i.code === 'line-item/provider-commission').unitPrice.amount).toEqual(
      9000
    );
  });

  it('keeps the monthly price for a whole month and longer part months', () => {
    const month = transactionLineItems(
      listing(parking),
      { bookingStart: at('2027-03-05'), bookingEnd: at('2027-04-05'), seats: 1 },
      null,
      null
    );
    expect([month[0].code, month[0].unitPrice.amount]).toEqual(['line-item/month', 18000]);

    const sixWeeks = transactionLineItems(
      listing(parking),
      { bookingStart: at('2027-03-05'), bookingEnd: at('2027-04-16'), seats: 1 },
      null,
      null
    );
    expect([sixWeeks[0].code, sixWeeks[0].unitPrice.amount]).toEqual(['line-item/day', 592]);
  });

  it('uses the listing price when no daily rate is set', () => {
    const result = transactionLineItems(
      listing({ model: 'per-space', cycle: 'month', rate: 18000 }),
      { bookingStart: at('2027-03-05'), bookingEnd: at('2027-03-08'), seats: 1 },
      null,
      null
    );
    expect(result[0].unitPrice.amount).toEqual(592);
  });

  it('charges a day-only listing its daily price, for any length of stay', () => {
    const eventParking = { model: 'per-space', cycle: 'day', rate: 2500 };
    const result = transactionLineItems(
      listing(eventParking, 2500),
      { bookingStart: at('2027-03-05'), bookingEnd: at('2027-04-05'), seats: 1 },
      null,
      null
    );
    expect([result[0].code, result[0].unitPrice.amount, result[0].units]).toEqual([
      'line-item/day',
      2500,
      31,
    ]);
  });

  it('refuses an ongoing agreement on a day-only listing', () => {
    expect(() =>
      transactionLineItems(
        listing({ model: 'per-space', cycle: 'day', rate: 2500 }, 2500),
        {
          bookingStart: at('2027-03-05'),
          bookingEnd: at('2027-04-05'),
          seats: 1,
          agreement: { start: at('2027-03-05'), end: at('2028-03-05') },
        },
        null,
        null
      )
    ).toThrow('booked by the day');
  });
});
