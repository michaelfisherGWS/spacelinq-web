/**
 * SpaceLinq marketplace configuration.
 *
 * - SPACELINQ_LISTING_TYPES: listing type ids created in Sharetribe Console.
 * - storageUnits: the static storage options providers pick from instead of
 *   uploading photos. Each has an icon, standard dimensions and a description.
 * - pricingModels: how each listing type is priced.
 * - addOns: optional monthly services providers can offer.
 *
 * Dimensions are in millimetres, weights in kilograms.
 */

// Listing type for space booked by the hour. Defined in code, see applySpaceLinqListingTypes.
export const HOURLY_LISTING_TYPE = 'hourly-space';

const WAREHOUSING_LISTING_TYPES = [
  'pallet-storage',
  'floor-space',
  'dedicated-space',
  'quote-on-request',
];

export const SPACELINQ_LISTING_TYPES = [...WAREHOUSING_LISTING_TYPES, HOURLY_LISTING_TYPE];

export const isSpaceLinqListingType = listingType => SPACELINQ_LISTING_TYPES.includes(listingType);

/**
 * Space categories. Every listing belongs to one. The category decides which
 * storage options, listing fields and pricing choices the provider sees, so a
 * homeowner listing a car park gets a short form and a 3PL gets the full one.
 * - listingTypes: Console listing types the category can use.
 * - pricingModel: pricing model used in place of the listing type's default.
 * - dailyOnly: providers may offer the space by the day only, with no monthly price.
 * - services: the 3PL rate card is offered.
 * - goodsInsurance: the provider can offer goods insurance.
 */
export const DEFAULT_SPACE_CATEGORY = 'warehousing';

export const spaceCategories = [
  {
    key: 'warehousing',
    label: 'Warehousing and 3PL',
    description: 'Pallet spaces, floor area, bays and 3PL services for business stock.',
    listingTypes: WAREHOUSING_LISTING_TYPES,
    pricingModel: null,
    dailyOnly: false,
    services: true,
    goodsInsurance: true,
  },
  {
    key: 'self-storage',
    label: 'Self-storage and household storage',
    description: 'Lock-ups, garages, sheds and spare rooms for household or small business goods.',
    listingTypes: ['dedicated-space'],
    pricingModel: 'fixed-monthly',
    dailyOnly: false,
    services: false,
    goodsInsurance: true,
  },
  {
    key: 'parking',
    label: 'Parking and vehicle storage',
    description: 'Car parks, garages and yard space for cars, caravans, boats and trailers.',
    listingTypes: ['dedicated-space', HOURLY_LISTING_TYPE],
    pricingModel: 'per-space',
    dailyOnly: true,
    services: false,
    goodsInsurance: false,
  },
  {
    key: 'event-space',
    label: 'Event and short-stay space',
    description: 'Parking near a venue, stall or pop-up space, booked by the day or hour.',
    listingTypes: ['dedicated-space', HOURLY_LISTING_TYPE],
    pricingModel: 'per-space',
    dailyOnly: true,
    services: false,
    goodsInsurance: false,
  },
  {
    key: 'other',
    label: 'Other space',
    description: 'Any other space you can rent out. Name it yourself and set your own rate.',
    listingTypes: ['dedicated-space', HOURLY_LISTING_TYPE],
    pricingModel: 'per-space',
    dailyOnly: true,
    services: false,
    goodsInsurance: false,
  },
];

/**
 * How a non-warehousing provider is asked to choose between the listing types
 * of their category: by how the space is booked, not by a warehouse term.
 */
export const bookingStyleLabels = {
  'dedicated-space': 'By the day or month',
  [HOURLY_LISTING_TYPE]: 'By the hour',
};

/**
 * Add SpaceLinq's code-defined listing types to the ones managed in Console.
 * Space booked by the hour is the dedicated-space listing type with the hour
 * unit and several bookable units, so it follows that type's Console settings.
 *
 * @param {Array<Object>} listingTypes - listing types from hosted configuration
 * @returns {Array<Object>}
 */
export const applySpaceLinqListingTypes = listingTypes => {
  const types = listingTypes || [];
  const base = types.find(lt => lt.listingType === 'dedicated-space');
  if (!base || types.some(lt => lt.listingType === HOURLY_LISTING_TYPE)) {
    return types;
  }
  return [
    ...types,
    {
      ...base,
      listingType: HOURLY_LISTING_TYPE,
      label: 'Space by the hour',
      transactionType: { ...base.transactionType, unitType: 'hour' },
      availabilityType: 'multipleSeats',
    },
  ];
};

export const getSpaceCategoryConfig = key => spaceCategories.find(c => c.key === key) || null;

// Storage options that older listings chose before categories existed.
const LEGACY_UNIT_CATEGORY = {
  garage: 'self-storage',
  'spare-room': 'self-storage',
  shed: 'self-storage',
  'parking-space': 'parking',
};

/**
 * The category of a listing. Listings saved before categories existed are
 * placed by their storage option; everything else is warehousing.
 *
 * @param {Object} publicData - listing publicData
 * @returns {string} category key
 */
export const getSpaceCategory = publicData => {
  const saved = publicData?.spaceCategory;
  if (getSpaceCategoryConfig(saved)) {
    return saved;
  }
  return LEGACY_UNIT_CATEGORY[(publicData?.storageUnit)] || DEFAULT_SPACE_CATEGORY;
};

/**
 * Categories a listing type can be listed under.
 *
 * @param {string} [listingType]
 * @returns {Array<Object>}
 */
export const spaceCategoriesForListingType = listingType =>
  spaceCategories.filter(c => !listingType || c.listingTypes.includes(listingType));

// Average days per month and per week, used to convert to the daily booking unit.
export const DAYS_PER_MONTH = 365 / 12; // 30.4167
export const DAYS_PER_WEEK = 7;

export const storageUnits = [
  {
    key: 'standard-pallet',
    categories: ['warehousing'],
    label: 'Standard pallet space',
    icon: 'pallet',
    listingTypes: ['pallet-storage', 'quote-on-request'],
    dimensions: { length: 1165, width: 1165, height: 1800, maxWeight: 1000 },
    description:
      'One NZ/AU standard pallet position (1165 x 1165 mm) in racking or floor stacked, up to 1.8 m high and 1,000 kg.',
  },
  {
    key: 'oversize-pallet',
    categories: ['warehousing'],
    label: 'Oversize pallet space',
    icon: 'pallet-tall',
    listingTypes: ['pallet-storage', 'quote-on-request'],
    dimensions: { length: 1165, width: 1165, height: 2400, maxWeight: 1500 },
    description:
      'A full-height pallet position for taller or heavier loads, up to 2.4 m high and 1,500 kg.',
  },
  {
    key: 'chilled-pallet',
    categories: ['warehousing'],
    label: 'Chilled / frozen pallet space',
    icon: 'pallet-cold',
    listingTypes: ['pallet-storage', 'quote-on-request'],
    dimensions: { length: 1165, width: 1165, height: 1800, maxWeight: 1000 },
    description:
      'A standard pallet position in a temperature-controlled store. Set the temperature range in Storage environment.',
  },
  {
    key: 'shelving-bay',
    categories: ['warehousing'],
    label: 'Shelving bay',
    icon: 'shelving',
    listingTypes: ['pallet-storage', 'dedicated-space', 'quote-on-request'],
    dimensions: { length: 1800, width: 600, height: 2100, maxWeight: 500 },
    description:
      'A bay of shelving for cartons and small parts, about 1.8 m wide, 0.6 m deep and 2.1 m high.',
  },
  {
    key: 'floor-area',
    categories: ['warehousing'],
    label: 'Open floor area',
    icon: 'floor',
    listingTypes: ['floor-space', 'quote-on-request'],
    dimensions: null,
    description:
      'Open indoor floor space for bulk or block-stacked goods, booked by the square metre.',
  },
  {
    key: 'yard-space',
    categories: ['warehousing', 'parking', 'event-space'],
    label: 'Outdoor yard space',
    icon: 'yard',
    listingTypes: ['floor-space', 'quote-on-request'],
    dimensions: null,
    description:
      'Secure outdoor hardstand for vehicles, machinery, containers or materials, booked by the square metre.',
  },
  {
    key: 'secure-cage',
    categories: ['warehousing'],
    label: 'Secure caged area',
    icon: 'cage',
    listingTypes: ['dedicated-space', 'quote-on-request'],
    dimensions: { length: 3000, width: 3000, height: 2400, maxWeight: null },
    description:
      'A lockable mesh cage inside the warehouse, about 3 x 3 m, for higher-value or segregated stock.',
  },
  {
    key: 'dedicated-bay',
    categories: ['warehousing'],
    label: 'Dedicated warehouse bay',
    icon: 'bay',
    listingTypes: ['dedicated-space', 'quote-on-request'],
    dimensions: null,
    description: 'A walled section of warehouse for your exclusive use. Enter the size below.',
  },
  {
    key: 'container-20',
    categories: ['warehousing', 'self-storage'],
    label: '20 ft shipping container',
    icon: 'container',
    listingTypes: ['dedicated-space', 'quote-on-request'],
    dimensions: { length: 6058, width: 2438, height: 2591, maxWeight: 28000 },
    description:
      'A standard 20 ft container on site (internal approx. 5.9 x 2.35 x 2.39 m), for your exclusive use.',
  },
  // Residential and small-scale options. They borrow existing icons until the
  // illustrated set replaces them.
  {
    key: 'garage',
    categories: ['self-storage', 'parking'],
    label: 'Garage',
    icon: 'garage',
    listingTypes: ['dedicated-space', 'quote-on-request', HOURLY_LISTING_TYPE],
    dimensions: { length: 6000, width: 3000, height: 2400, maxWeight: null },
    description:
      'A lockable single garage, about 6 x 3 m, for household goods, a vehicle or trade stock.',
  },
  {
    key: 'spare-room',
    categories: ['self-storage'],
    label: 'Spare room or loft',
    icon: 'room',
    listingTypes: ['dedicated-space', 'quote-on-request'],
    dimensions: { length: 3000, width: 3000, height: 2400, maxWeight: null },
    description: 'An indoor room, loft or basement space, about 3 x 3 m, for boxes and furniture.',
  },
  {
    key: 'shed',
    categories: ['self-storage'],
    label: 'Shed or lock-up',
    icon: 'shed',
    listingTypes: ['dedicated-space', 'quote-on-request'],
    dimensions: { length: 3000, width: 2400, height: 2100, maxWeight: null },
    description: 'A garden shed or small lock-up for tools, equipment and seasonal items.',
  },
  {
    key: 'parking-space',
    categories: ['parking', 'event-space'],
    label: 'Parking or driveway space',
    icon: 'parking',
    listingTypes: ['dedicated-space', 'quote-on-request', HOURLY_LISTING_TYPE],
    dimensions: { length: 5400, width: 2400, height: null, maxWeight: null },
    description: 'An off-street space for a car, boat, caravan or trailer.',
  },
  {
    key: 'covered-parking',
    categories: ['parking', 'event-space'],
    label: 'Covered or basement car park',
    icon: 'garage',
    listingTypes: ['dedicated-space', 'quote-on-request', HOURLY_LISTING_TYPE],
    dimensions: { length: 5400, width: 2400, height: 2100, maxWeight: null },
    description: 'An under-cover park in a carport, parking building or basement.',
  },
  {
    key: 'caravan-boat-space',
    categories: ['parking'],
    label: 'Caravan, boat or trailer space',
    icon: 'parking',
    listingTypes: ['dedicated-space', 'quote-on-request', HOURLY_LISTING_TYPE],
    dimensions: { length: 8000, width: 3000, height: null, maxWeight: null },
    description: 'A longer space for a caravan, motorhome, boat on a trailer or work trailer.',
  },
  {
    key: 'self-storage-unit',
    categories: ['self-storage'],
    label: 'Self-storage unit',
    icon: 'bay',
    listingTypes: ['dedicated-space', 'quote-on-request'],
    dimensions: { length: 3000, width: 3000, height: 2700, maxWeight: null },
    description: 'A lockable unit at a storage facility. Enter the size below.',
  },
  {
    key: 'event-site',
    categories: ['event-space'],
    label: 'Stall, pop-up or event site',
    icon: 'parking',
    listingTypes: ['dedicated-space', 'quote-on-request', HOURLY_LISTING_TYPE],
    dimensions: { length: 3000, width: 3000, height: null, maxWeight: null },
    description: 'A marked site for a market stall, food truck, pop-up shop or display.',
  },
  {
    key: 'other-space',
    categories: ['other'],
    label: 'Other space',
    icon: 'parking',
    listingTypes: ['dedicated-space', 'quote-on-request', HOURLY_LISTING_TYPE],
    dimensions: null,
    custom: true,
    description: 'A space that does not fit the other options. Tell us what it is below.',
  },
];

export const getStorageUnit = key => storageUnits.find(u => u.key === key) || null;

/**
 * Storage options a provider can pick from.
 *
 * @param {string} [listingType] - Console listing type id
 * @param {string} [category] - space category key
 * @returns {Array<Object>}
 */
export const storageUnitsForListingType = (listingType, category) =>
  storageUnits.filter(
    u =>
      (!listingType || u.listingTypes.includes(listingType)) &&
      (!category || u.categories.includes(category))
  );

/**
 * Pricing models. Each SpaceLinq listing type has one default model.
 * - unitLabel: what one "seat" of capacity means for this model.
 * - quantityLabel: label for the quantity box customers fill in when booking.
 */
export const pricingModels = {
  'per-pallet': {
    label: 'Per pallet',
    rateLabel: 'Rate per pallet',
    unitLabel: 'pallet',
    capacityLabel: 'Pallet positions available',
    quantityLabel: 'Number of pallets',
    cycles: ['week', 'month'],
  },
  'per-m2': {
    label: 'Per square metre',
    rateLabel: 'Rate per m²',
    unitLabel: 'm²',
    capacityLabel: 'Floor area available (m²)',
    quantityLabel: 'Area needed (m²)',
    cycles: ['month'],
  },
  'fixed-monthly': {
    label: 'Fixed monthly',
    rateLabel: 'Monthly price for the whole space',
    unitLabel: 'space',
    capacityLabel: null,
    cycles: ['month'],
  },
  'per-space': {
    label: 'Per space',
    rateLabel: 'Rate per space',
    unitLabel: 'space',
    capacityLabel: 'Spaces available',
    quantityLabel: 'Number of spaces',
    cycles: ['month', 'day', 'hour'],
  },
  quote: {
    label: 'Quote on request',
    rateLabel: 'Indicative price from',
    unitLabel: 'month',
    capacityLabel: null,
    cycles: ['month'],
  },
};

export const defaultPricingModelForListingType = {
  [HOURLY_LISTING_TYPE]: 'per-space',
  'pallet-storage': 'per-pallet',
  'floor-space': 'per-m2',
  'dedicated-space': 'fixed-monthly',
  'quote-on-request': 'quote',
};

/**
 * Pricing model for a listing: the category's own model when it has one,
 * otherwise the default for the listing type.
 *
 * @param {string} listingType
 * @param {string} category
 * @returns {string} pricing model key
 */
export const pricingModelFor = (listingType, category) =>
  (listingType !== 'quote-on-request' && getSpaceCategoryConfig(category)?.pricingModel) ||
  defaultPricingModelForListingType[listingType] ||
  'fixed-monthly';

/**
 * Optional services, each a flat monthly price set by the provider.
 */
export const addOns = [
  {
    key: 'climate-control',
    label: 'Climate control surcharge',
    categories: ['warehousing', 'self-storage'],
  },
  { key: 'access-24-7', label: '24/7 access', categories: ['warehousing', 'self-storage'] },
  { key: 'wms', label: 'WMS / inventory management', categories: ['warehousing'] },
  { key: 'dock-handling', label: 'Dock / loading handling', categories: ['warehousing'] },
  { key: 'stock-counts', label: 'Regular stock counts', categories: ['warehousing'] },
  { key: 'pallet-hire', label: 'Pallet hire', categories: ['warehousing'] },
  { key: 'ev-charging', label: 'EV charging', categories: ['parking'] },
  { key: 'power-supply', label: 'Power supply', categories: ['parking', 'event-space', 'other'] },
];

/**
 * Optional monthly services a category can offer.
 *
 * @param {string} category - space category key
 * @returns {Array<Object>}
 */
export const addOnsForSpaceCategory = category =>
  addOns.filter(a => a.categories.includes(category || DEFAULT_SPACE_CATEGORY));

/**
 * Service rate card. Providers tick the 3PL services they charge for and enter a rate.
 * Rates are shown on the listing so customers can compare. They are information only
 * until activity billing is built.
 * - unit: what the rate is charged per.
 */
export const serviceRates = [
  { key: 'receiving-pallet', group: 'Inbound', label: 'Receiving and put-away', unit: 'pallet' },
  { key: 'devan-20', group: 'Inbound', label: 'Container devanning, 20 ft', unit: 'container' },
  { key: 'devan-40', group: 'Inbound', label: 'Container devanning, 40 ft', unit: 'container' },
  { key: 'palletising', group: 'Inbound', label: 'Palletising and wrapping', unit: 'pallet' },
  { key: 'pallet-out', group: 'Outbound', label: 'Full pallet dispatch', unit: 'pallet' },
  { key: 'carton-pick', group: 'Outbound', label: 'Carton pick', unit: 'carton' },
  { key: 'order-pick-pack', group: 'Outbound', label: 'Pick and pack, first item', unit: 'order' },
  { key: 'extra-item', group: 'Outbound', label: 'Pick and pack, extra item', unit: 'item' },
  { key: 'cross-dock', group: 'Outbound', label: 'Cross-docking', unit: 'pallet' },
  { key: 'labelling', group: 'Value-added', label: 'Labelling or relabelling', unit: 'unit' },
  { key: 'returns', group: 'Value-added', label: 'Returns processing', unit: 'item' },
  { key: 'labour-hour', group: 'Value-added', label: 'Labour for other work', unit: 'hour' },
];

const slug = label =>
  label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

const WAREHOUSING_ONLY = ['warehousing'];
const SMALL_SPACE_CATEGORIES = ['self-storage', 'parking', 'event-space', 'other'];

// Console-managed fields that only make sense for warehousing listings.
const WAREHOUSING_CONSOLE_FIELDS = [
  'goodsType',
  'servicesOffered',
  'storageEnvironment',
  'storageFormat',
  'storageType',
];

export const SPACE_CATEGORY_FIELD_KEY = 'spaceCategory';

/**
 * Whether a listing field is asked for (and shown) in a category.
 * Fields without a `spaceCategories` list apply to every category.
 *
 * @param {string} category - space category key
 * @param {Object} fieldConfig - listing field config
 * @returns {boolean}
 */
export const isFieldForSpaceCategory = (category, fieldConfig) =>
  !Array.isArray(fieldConfig?.spaceCategories) || fieldConfig.spaceCategories.includes(category);

/**
 * Whether a listing field applies to a listing. Listings outside SpaceLinq's
 * listing types are not limited by category.
 *
 * @param {string} listingType - Console listing type id
 * @param {string} category - space category key
 * @param {Object} fieldConfig - listing field config
 * @returns {boolean}
 */
export const isFieldForSpaceListing = (listingType, category, fieldConfig) =>
  !isSpaceLinqListingType(listingType) ||
  isFieldForSpaceCategory(category || DEFAULT_SPACE_CATEGORY, fieldConfig);

const multiEnumField = (key, label, options, spaceCategoryKeys, listingTypeIds) => ({
  key,
  ...(spaceCategoryKeys ? { spaceCategories: spaceCategoryKeys } : {}),
  scope: 'public',
  schemaType: 'multi-enum',
  enumOptions: options.map(o => ({ option: slug(o), label: o })),
  ...(listingTypeIds ? { listingTypeConfig: { limitToListingTypeIds: true, listingTypeIds } } : {}),
  // Not searchable until the field is also added in Console, which creates the search schema.
  filterConfig: { indexForSearch: false, label },
  showConfig: { label, displayOnListingPage: true },
  saveConfig: { label, isRequired: false },
});

/**
 * Listing fields SpaceLinq adds on top of the ones managed in Console.
 * A Console field with the same key replaces the one here.
 */
export const extraListingFields = [
  multiEnumField(
    'inbound_services',
    'Inbound services',
    [
      'Container devanning (unpack)',
      'Receiving and put-away',
      'Palletising and wrapping',
      'Inspection and quality checks',
    ],
    WAREHOUSING_ONLY
  ),
  multiEnumField(
    'outbound_services',
    'Outbound services',
    [
      'Full pallet dispatch',
      'Carton pick',
      'Pick and pack (each)',
      'E-commerce fulfilment',
      'Cross-docking',
      'Container loading',
    ],
    WAREHOUSING_ONLY
  ),
  multiEnumField(
    'value_added_services',
    'Value-added services',
    ['Kitting and assembly', 'Labelling and relabelling', 'Repacking', 'Returns processing'],
    WAREHOUSING_ONLY
  ),
  multiEnumField(
    'transport',
    'Transport',
    ['Local delivery', 'Linehaul or freight forwarding', 'Container cartage'],
    WAREHOUSING_ONLY
  ),
  multiEnumField(
    'systems_reporting',
    'Systems and reporting',
    [
      'WMS with customer portal',
      'Stock-on-hand reports',
      'Stocktakes and cycle counts',
      'Online store integration',
    ],
    WAREHOUSING_ONLY
  ),
  multiEnumField(
    'compliance',
    'Compliance and certifications',
    [
      'MPI transitional facility',
      'Customs-controlled area',
      'Dangerous goods location certificate',
      'Food-grade (HACCP or similar)',
      'Insurance held',
    ],
    WAREHOUSING_ONLY
  ),
  multiEnumField(
    'site_equipment',
    'Site and equipment',
    [
      'Forklift on site',
      'Container-height dock',
      'Dock leveller',
      'Drive-in access',
      'Hardstand',
      'CCTV',
      'Monitored alarm',
      '24/7 access',
      'Fenced and gated site',
      'Security patrols',
      'Sprinkler system',
      'Pest control programme',
    ],
    WAREHOUSING_ONLY
  ),
  // Included with the space at no extra charge, like amenities at a hotel.
  multiEnumField(
    'amenities',
    'Included amenities',
    [
      'Private or separate access',
      'On-site toilets',
      'Staff room or kitchen',
      'Office or desk space',
      'Wi-Fi',
      'Customer parking',
      'Truck parking and turning area',
      'On-site staff during open hours',
    ],
    WAREHOUSING_ONLY
  ),
  multiEnumField(
    'sustainability',
    'Sustainability',
    [
      'Solar power',
      'LED lighting',
      'Electric forklifts',
      'EV charging',
      'Rainwater collection',
      'Recycling programme',
    ],
    WAREHOUSING_ONLY
  ),
  // Short lists for household, parking and other small spaces.
  multiEnumField(
    'access_security',
    'Access and security',
    [
      '24/7 access',
      'Access by arrangement',
      'Lockable',
      'Under cover',
      'Gated or fenced',
      'CCTV',
      'Alarm',
      'Good lighting',
      'Drive-up access',
      'Someone on site',
    ],
    SMALL_SPACE_CATEGORIES
  ),
  multiEnumField(
    'vehicles_accepted',
    'Vehicles that fit',
    [
      'Car',
      'Motorbike',
      'Van or ute',
      'Caravan or motorhome',
      'Boat on trailer',
      'Trailer',
      'Truck',
    ],
    ['parking', 'event-space']
  ),
  multiEnumField(
    'parking_features',
    'Parking features',
    [
      'Numbered bay',
      'EV charging',
      'Power outlet',
      'Sealed surface',
      'Easy turning room',
      'Close to public transport',
      'Walk to venue',
    ],
    ['parking', 'event-space']
  ),
  // The category itself. Chosen at the top of the listing form, searchable.
  {
    key: SPACE_CATEGORY_FIELD_KEY,
    scope: 'public',
    schemaType: 'enum',
    enumOptions: spaceCategories.map(c => ({ option: c.key, label: c.label })),
    filterConfig: {
      indexForSearch: true,
      filterType: 'SelectSingleFilter',
      label: 'Category',
      group: 'primary',
    },
    showConfig: { label: 'Category', isDetail: true, displayOnListingPage: true },
    saveConfig: { label: 'Category', isRequired: false },
  },
];

/**
 * Wording changes applied to Console-managed fields, matched by their current label.
 * - fields: new field labels.
 * - options: new option labels.
 * - hiddenFields / hiddenOptions: no longer offered (existing listing data is kept).
 */
export const listingFieldWording = {
  fields: {
    'Storage type': 'Facility type',
    'Storage environment': 'Temperature and environment',
    'Goods type': 'Goods accepted',
    'Storage format': 'Racking and storage method',
  },
  options: {
    'Bonded / customs-controlled warehouse': 'Customs-controlled area (bonded)',
    'Container & yard storage': 'Container yard / hardstand',
    'Self-storage / small units': 'Self-storage or residential (garage, room, shed)',
    'Ambient / dry (unconditioned)': 'Ambient',
    'Climate-controlled (temperature + humidity)': 'Temperature-controlled (15–25°C)',
    'Chilled / refrigerated (2–8°C)': 'Chilled (2–8°C)',
    'Frozen (-18°C to -25°C)': 'Frozen (−18°C or below)',
    'Dangerous / hazardous goods': 'Dangerous goods (DG)',
  },
  hiddenFields: ['Services offered'],
  hiddenOptions: ['Outdoor / open-air storage', 'Chemicals'],
};

/**
 * Apply SpaceLinq wording to Console-managed listing fields and add the extra fields.
 *
 * @param {Array<Object>} hostedFields - listing fields from Console, already restructured
 * @returns {Array<Object>} listing fields
 */
export const applySpaceLinqListingFields = hostedFields => {
  const w = listingFieldWording;
  const relabel = label => w.fields[label] || label;
  const reworded = (hostedFields || [])
    .filter(f => !w.hiddenFields.includes(f.showConfig?.label))
    .map(f => ({
      ...f,
      ...(f.enumOptions
        ? {
            enumOptions: f.enumOptions
              .filter(o => !w.hiddenOptions.includes(o.label))
              .map(o => ({ ...o, label: w.options[o.label] || o.label })),
          }
        : {}),
      filterConfig: { ...f.filterConfig, label: relabel(f.filterConfig?.label) },
      showConfig: { ...f.showConfig, label: relabel(f.showConfig?.label) },
      saveConfig: { ...f.saveConfig, label: relabel(f.saveConfig?.label) },
    }));
  const tagged = reworded.map(f =>
    WAREHOUSING_CONSOLE_FIELDS.includes(f.key) ? { ...f, spaceCategories: WAREHOUSING_ONLY } : f
  );
  const hostedKeys = tagged.map(f => f.key);
  return [...tagged, ...extraListingFields.filter(f => !hostedKeys.includes(f.key))];
};
