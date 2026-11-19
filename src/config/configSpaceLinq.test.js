import {
  applySpaceLinqListingFields,
  getSpaceCategory,
  isFieldForSpaceListing,
  pricingModelFor,
  spaceCategories,
  storageUnits,
  storageUnitsForListingType,
  addOnsForSpaceCategory,
} from './configSpaceLinq';

describe('space categories', () => {
  it('gives every category at least one storage option for each of its listing types', () => {
    spaceCategories.forEach(c => {
      c.listingTypes
        .filter(lt => lt !== 'quote-on-request')
        .forEach(lt => {
          expect(storageUnitsForListingType(lt, c.key).length).toBeGreaterThan(0);
        });
    });
  });

  it('puts every storage option in a known category', () => {
    const keys = spaceCategories.map(c => c.key);
    storageUnits.forEach(u => {
      expect(u.categories.length).toBeGreaterThan(0);
      u.categories.forEach(c => expect(keys).toContain(c));
    });
  });

  it('offers a homeowner parking options without pallets', () => {
    const options = storageUnitsForListingType('dedicated-space', 'parking').map(u => u.key);
    expect(options).toContain('parking-space');
    expect(options).toContain('caravan-boat-space');
    expect(options).not.toContain('secure-cage');
  });

  it('places listings saved before categories existed', () => {
    expect(getSpaceCategory({ storageUnit: 'garage' })).toBe('self-storage');
    expect(getSpaceCategory({ storageUnit: 'parking-space' })).toBe('parking');
    expect(getSpaceCategory({ storageUnit: 'standard-pallet' })).toBe('warehousing');
    expect(getSpaceCategory({ storageUnit: 'garage', spaceCategory: 'parking' })).toBe('parking');
    expect(getSpaceCategory({ spaceCategory: 'made-up' })).toBe('warehousing');
  });

  it('prices parking per space and keeps warehousing on its listing type default', () => {
    expect(pricingModelFor('dedicated-space', 'parking')).toBe('per-space');
    expect(pricingModelFor('dedicated-space', 'warehousing')).toBe('fixed-monthly');
    expect(pricingModelFor('pallet-storage', 'warehousing')).toBe('per-pallet');
    expect(pricingModelFor('quote-on-request', 'parking')).toBe('quote');
  });

  it('offers each category its own optional services', () => {
    expect(addOnsForSpaceCategory('parking').map(a => a.key)).toEqual([
      'ev-charging',
      'power-supply',
    ]);
    expect(addOnsForSpaceCategory('warehousing').map(a => a.key)).toContain('pallet-hire');
    expect(addOnsForSpaceCategory(undefined).map(a => a.key)).toContain('wms');
  });
});

describe('listing fields by category', () => {
  const hosted = [
    {
      key: 'storageType',
      schemaType: 'multi-enum',
      enumOptions: [],
      showConfig: { label: 'Storage type' },
      saveConfig: { label: 'Storage type' },
      filterConfig: { label: 'Storage type' },
    },
  ];
  const fields = applySpaceLinqListingFields(hosted);
  const field = key => fields.find(f => f.key === key);

  it('asks warehouse questions only of warehousing listings', () => {
    expect(isFieldForSpaceListing('dedicated-space', 'parking', field('storageType'))).toBe(false);
    expect(isFieldForSpaceListing('dedicated-space', 'parking', field('compliance'))).toBe(false);
    expect(isFieldForSpaceListing('pallet-storage', 'warehousing', field('compliance'))).toBe(true);
    // No category saved yet means warehousing
    expect(isFieldForSpaceListing('pallet-storage', undefined, field('storageType'))).toBe(true);
  });

  it('asks parking questions only of parking and event listings', () => {
    expect(isFieldForSpaceListing('dedicated-space', 'parking', field('vehicles_accepted'))).toBe(
      true
    );
    expect(
      isFieldForSpaceListing('dedicated-space', 'self-storage', field('vehicles_accepted'))
    ).toBe(false);
    expect(isFieldForSpaceListing('dedicated-space', 'other', field('access_security'))).toBe(true);
  });

  it('does not limit listing types outside SpaceLinq', () => {
    expect(isFieldForSpaceListing('sell-bicycles', undefined, field('storageType'))).toBe(true);
  });

  it('includes the searchable category field', () => {
    expect(field('spaceCategory').enumOptions.map(o => o.option)).toEqual(
      spaceCategories.map(c => c.key)
    );
  });
});

describe('space booked by the hour', () => {
  const {
    HOURLY_LISTING_TYPE,
    applySpaceLinqListingTypes,
    isSpaceLinqListingType,
  } = require('./configSpaceLinq');
  const hosted = [
    {
      listingType: 'dedicated-space',
      label: 'Dedicated space',
      transactionType: {
        process: 'default-booking',
        alias: 'default-booking/release-1',
        unitType: 'day',
      },
      availabilityType: 'oneSeat',
      defaultListingFields: { images: false },
    },
  ];

  it('adds an hourly listing type based on dedicated space', () => {
    const types = applySpaceLinqListingTypes(hosted);
    expect(types).toHaveLength(2);
    expect(types[1]).toEqual({
      listingType: HOURLY_LISTING_TYPE,
      label: 'Space by the hour',
      transactionType: {
        process: 'default-booking',
        alias: 'default-booking/release-1',
        unitType: 'hour',
      },
      availabilityType: 'multipleSeats',
      defaultListingFields: { images: false },
    });
    // The Console listing type is left as it was
    expect(types[0]).toBe(hosted[0]);
  });

  it('does nothing when Console already has it, or has no dedicated space', () => {
    const withHourly = applySpaceLinqListingTypes(hosted);
    expect(applySpaceLinqListingTypes(withHourly)).toBe(withHourly);
    expect(applySpaceLinqListingTypes([])).toEqual([]);
    expect(applySpaceLinqListingTypes(undefined)).toEqual([]);
  });

  it('is offered for parking, event and other space, not warehousing or self-storage', () => {
    const offers = key => spaceCategories.find(c => c.key === key).listingTypes;
    expect(offers('parking')).toContain(HOURLY_LISTING_TYPE);
    expect(offers('event-space')).toContain(HOURLY_LISTING_TYPE);
    expect(offers('other')).toContain(HOURLY_LISTING_TYPE);
    expect(offers('warehousing')).not.toContain(HOURLY_LISTING_TYPE);
    expect(offers('self-storage')).not.toContain(HOURLY_LISTING_TYPE);
    expect(isSpaceLinqListingType(HOURLY_LISTING_TYPE)).toBe(true);
    expect(pricingModelFor(HOURLY_LISTING_TYPE, 'parking')).toBe('per-space');
  });
});

describe('certificates', () => {
  const {
    certificatesForSaving,
    certificateStatus,
    currentCertificates,
  } = require('./configSpaceLinq');
  const now = new Date('2026-11-19T00:00:00.000Z');
  const lcc = {
    type: 'location-compliance',
    number: 'LCC-123',
    expiry: '2027-03-01',
    classes: ['class-3', 'class-8'],
  };

  it('tidies form rows and drops incomplete ones', () => {
    expect(
      certificatesForSaving([
        { ...lcc, number: ' LCC-123 ', classes: ['class-8', 'class-3', 'nonsense'], name: 'x' },
        {
          type: 'other',
          name: ' ISO 9001 ',
          number: '9',
          expiry: '2027-01-01',
          classes: ['class-3'],
        },
        { type: 'security', number: '', expiry: '2027-01-01' },
        { type: 'security', number: '1', expiry: 'soon' },
        { type: 'made-up', number: '1', expiry: '2027-01-01' },
      ])
    ).toEqual([lcc, { type: 'other', name: 'ISO 9001', number: '9', expiry: '2027-01-01' }]);
    expect(certificatesForSaving(undefined)).toEqual([]);
  });

  it('is declared until SpaceLinq has verified the same type and number', () => {
    expect(certificateStatus(lcc, undefined, now)).toEqual('declared');
    expect(certificateStatus(lcc, [{ type: 'security', number: 'LCC-123' }], now)).toEqual(
      'declared'
    );
    expect(
      certificateStatus(lcc, [{ type: 'location-compliance', number: 'lcc-123' }], now)
    ).toEqual('verified');
  });

  it('drops the verified badge when the checked expiry passes, and expires on its date', () => {
    const verified = [{ type: 'location-compliance', number: 'LCC-123', expiry: '2026-11-18' }];
    expect(certificateStatus(lcc, verified, now)).toEqual('declared');
    expect(certificateStatus({ ...lcc, expiry: '2026-11-18' }, [], now)).toEqual('expired');
    expect(certificateStatus({ ...lcc, expiry: '2026-11-19' }, [], now)).toEqual('declared');
  });

  it('lists current certificates with verified ones first', () => {
    const publicData = {
      certificates: [
        { type: 'security', number: 'S1', expiry: '2027-01-01' },
        { type: 'food-registration', number: 'F1', expiry: '2020-01-01' },
        lcc,
      ],
    };
    const metadata = { verifiedCertificates: [{ type: 'location-compliance', number: 'LCC-123' }] };
    const result = currentCertificates(publicData, metadata, now);
    expect(result.map(c => [c.type, c.status])).toEqual([
      ['location-compliance', 'verified'],
      ['security', 'declared'],
    ]);
    expect(result[0].classLabels).toEqual(['Class 3 (flammable liquids)', 'Class 8 (corrosive)']);
    expect(currentCertificates({}, {}, now)).toEqual([]);
  });
});
