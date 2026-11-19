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

// What one bookable unit is, for wording such as "2 spaces" in a price breakdown
const UNIT_KIND_BY_MODEL = { 'per-pallet': 'pallet', 'per-m2': 'sqm', 'per-space': 'space' };

/**
 * The kind of unit a listing is booked in.
 *
 * @param {Object} publicData - listing publicData
 * @returns {'pallet'|'sqm'|'space'|'unit'}
 */
export const unitKindForListing = publicData =>
  UNIT_KIND_BY_MODEL[(publicData?.pricing?.model)] || 'unit';

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
      showFilter: true,
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
  return [
    ...tagged,
    ...[...extraListingFields, dgClassesField()].filter(f => !hostedKeys.includes(f.key)),
  ];
};

/**
 * Account details asked at sign-up. Every user says whether the account is
 * personal or for a business; business accounts add their company details.
 * Customer and provider are Sharetribe user types set in Console, so the
 * personal/business choice is its own field and works for both.
 * The details are protected data: visible to the user and the operator only.
 */
export const ACCOUNT_TYPE_FIELD_KEY = 'accountType';
export const ACCOUNT_TYPE_BUSINESS = 'business';

const businessUserField = (key, label, isRequired, placeholderMessage) => ({
  key,
  scope: 'protected',
  schemaType: 'text',
  // Only asked of business accounts, see isSpaceLinqUserFieldShown
  businessOnly: true,
  showConfig: { label, displayInProfile: false },
  saveConfig: {
    label,
    displayInSignUp: true,
    isRequired,
    placeholderMessage,
    ...(isRequired ? { requiredMessage: `Please enter the ${label.toLowerCase()}.` } : {}),
  },
  userTypeConfig: { limitToUserTypeIds: false },
});

export const spaceLinqUserFields = [
  {
    key: ACCOUNT_TYPE_FIELD_KEY,
    scope: 'protected',
    schemaType: 'enum',
    enumOptions: [
      { option: 'personal', label: 'Personal' },
      { option: ACCOUNT_TYPE_BUSINESS, label: 'Business' },
    ],
    showConfig: { label: 'Account type', displayInProfile: false },
    saveConfig: {
      label: 'Is this account for you or for a business?',
      displayInSignUp: true,
      isRequired: true,
      placeholderMessage: 'Choose an account type…',
      requiredMessage: 'Please choose an account type.',
    },
    userTypeConfig: { limitToUserTypeIds: false },
  },
  businessUserField('companyName', 'Company name', true, 'Registered or trading name'),
  businessUserField('nzbn', 'NZBN (optional)', false, '13-digit New Zealand Business Number'),
  businessUserField('gstNumber', 'GST number (optional)', false, 'e.g. 123-456-789'),
  businessUserField(
    'accountsEmail',
    'Accounts email (optional)',
    false,
    'Where receipts and invoices should go'
  ),
];

/**
 * Add SpaceLinq's account fields ahead of the user fields managed in Console.
 *
 * @param {Array<Object>} userFields - user fields from hosted configuration
 * @returns {Array<Object>}
 */
export const applySpaceLinqUserFields = userFields => {
  const hosted = userFields || [];
  const hostedKeys = hosted.map(f => f.key);
  return [...spaceLinqUserFields.filter(f => !hostedKeys.includes(f.key)), ...hosted];
};

/**
 * Whether a user field is asked, given what the form holds so far.
 * Company details are asked only once the account type is "business".
 *
 * @param {Object} fieldConfig - user field config
 * @param {Object} [values] - current form values; without them every field is shown
 * @returns {boolean}
 */
export const isSpaceLinqUserFieldShown = (fieldConfig, values) =>
  !fieldConfig?.businessOnly ||
  !values ||
  values[`prot_${ACCOUNT_TYPE_FIELD_KEY}`] === ACCOUNT_TYPE_BUSINESS;

/////////////////////////////////////////
// Storage agreement between the parties //
/////////////////////////////////////////

// Keep in step with STORAGE_AGREEMENT_VERSION in server/api-util/spaceLinqOrderRecord.js
export const STORAGE_AGREEMENT_VERSION = '2026-11-draft';

/**
 * The standard agreement between a customer and a provider. The customer accepts
 * it at checkout; the provider accepts it by accepting the booking (or by offering
 * instant booking). SpaceLinq keeps the record on the booking and is not a party.
 *
 * DRAFT: this wording has not had legal review.
 */
export const storageAgreement = {
  version: STORAGE_AGREEMENT_VERSION,
  isDraft: true,
  title: 'SpaceLinq storage agreement',
  intro:
    'This agreement is between the customer who books a space and the provider who offers it. SpaceLinq runs the marketplace and keeps the record of the booking; it is not a party to this agreement.',
  sections: [
    {
      title: '1. The booking',
      body:
        'The space, dates, price and any extra services are those shown on the booking. The booking page on SpaceLinq is the record of what was agreed.',
    },
    {
      title: '2. How it is accepted',
      body:
        'The customer accepts this agreement when they confirm the booking. The provider accepts it when they accept the booking request, or by offering instant booking on the listing. SpaceLinq records who accepted, when, and which version.',
    },
    {
      title: '3. Payment',
      body:
        'The customer pays through SpaceLinq at the price shown. For an ongoing booking, each later month is charged to the saved payment method before that month starts. Extra services the provider carries out are charged at the rates shown on the listing.',
    },
    {
      title: '4. What may be stored',
      body:
        'The customer must describe their goods honestly and store only goods that are lawful and that the listing accepts. Hazardous substances may be stored only where the listing shows a current certificate for that class and the provider has agreed in writing on SpaceLinq.',
    },
    {
      title: '5. Care of the goods',
      body:
        'The provider will take reasonable care of the space and the goods in it, keep the space as described on the listing, and tell the customer promptly about any loss, damage or incident.',
    },
    {
      title: '6. Insurance and risk',
      body:
        'Unless goods insurance is shown on the booking, the customer is responsible for insuring their own goods. Each party is responsible for loss it causes by not doing what this agreement requires.',
    },
    {
      title: '7. Access',
      body:
        'The customer may access the space at the times shown on the listing, or as arranged with the provider through SpaceLinq messages.',
    },
    {
      title: '8. Unpaid charges',
      body:
        'If charges under this booking are overdue, the provider may hold the goods until they are paid. The provider must give the customer written notice through SpaceLinq before taking any further step.',
    },
    {
      title: '9. Ending the booking',
      body:
        'A booking for fixed dates ends on its last day. An ongoing booking ends when either party gives the notice shown on the listing. The customer must remove their goods by the end date and leave the space as they found it.',
    },
    {
      title: '10. Problems',
      body:
        'The parties will first try to sort out any problem through SpaceLinq messages. Either party may ask SpaceLinq to look at the booking record. New Zealand law applies.',
    },
  ],
};

///////////////////////////////////////
// Certificates and registrations     //
///////////////////////////////////////

export const MAX_CERTIFICATES = 5;
export const LOCATION_COMPLIANCE_CERTIFICATE = 'location-compliance';

// Hazardous substance classes that a location compliance certificate can cover
export const hazardClasses = [
  { key: 'class-2', label: 'Class 2 (gases)' },
  { key: 'class-3', label: 'Class 3 (flammable liquids)' },
  { key: 'class-4', label: 'Class 4 (flammable solids)' },
  { key: 'class-5', label: 'Class 5 (oxidising)' },
  { key: 'class-6', label: 'Class 6 (toxic)' },
  { key: 'class-8', label: 'Class 8 (corrosive)' },
];

export const certificateTypes = [
  {
    key: LOCATION_COMPLIANCE_CERTIFICATE,
    label: 'Hazardous substances location compliance certificate',
    shortLabel: 'Dangerous goods facility',
    hasClasses: true,
  },
  {
    key: 'transitional-facility',
    label: 'MPI approved transitional facility',
    shortLabel: 'MPI transitional facility',
  },
  {
    key: 'customs-controlled-area',
    label: 'Customs controlled area',
    shortLabel: 'Customs controlled area',
  },
  {
    key: 'food-registration',
    label: 'Food Act registration',
    shortLabel: 'Food Act registered',
  },
  {
    key: 'security',
    label: 'Security certification or monitored alarm',
    shortLabel: 'Security certified',
  },
  {
    key: 'other',
    label: 'Other certificate or registration',
    shortLabel: 'Certificate',
    custom: true,
  },
];

export const DG_CLASSES_FIELD_KEY = 'dgClasses';

/**
 * Search filter for the dangerous goods classes a listing is certified for.
 * The value is not entered by hand: it is worked out from the listing's
 * certificates each time the listing details are saved (see dgClassesForSearch).
 */
const dgClassesField = () => ({
  key: DG_CLASSES_FIELD_KEY,
  derived: true,
  scope: 'public',
  schemaType: 'multi-enum',
  enumOptions: hazardClasses.map(c => ({ option: c.key, label: c.label })),
  filterConfig: {
    indexForSearch: true,
    showFilter: true,
    filterType: 'SelectMultipleFilter',
    label: 'Dangerous goods certified',
    searchMode: 'has_any',
    group: 'secondary',
  },
  showConfig: { label: 'Dangerous goods certified', displayOnListingPage: false },
  saveConfig: { label: 'Dangerous goods certified', isRequired: false },
});

export const getCertificateType = key => certificateTypes.find(t => t.key === key) || null;

export const CERTIFICATE_VERIFIED = 'verified';
export const CERTIFICATE_DECLARED = 'declared';
export const CERTIFICATE_EXPIRED = 'expired';

const cleanText = value => (typeof value === 'string' ? value.trim() : '');
const isIsoDate = value => /^\d{4}-\d{2}-\d{2}$/.test(value || '');
const sameCertificate = (a, b) =>
  a.type === b.type && cleanText(a.number).toLowerCase() === cleanText(b.number).toLowerCase();

/**
 * Tidy the certificates entered on the listing form for saving.
 * Rows without a type, number or expiry date are dropped.
 *
 * @param {Array<Object>} certificates - form rows
 * @returns {Array<Object>} [{ type, name?, number, issuer?, expiry, classes? }]
 */
export const certificatesForSaving = certificates =>
  (Array.isArray(certificates) ? certificates : [])
    .map(row => {
      const type = getCertificateType(row?.type);
      const number = cleanText(row?.number);
      if (!type || !number || !isIsoDate(row?.expiry)) {
        return null;
      }
      const name = cleanText(row.name).slice(0, 60);
      const issuer = cleanText(row.issuer).slice(0, 80);
      const classes = hazardClasses.map(c => c.key).filter(k => (row.classes || []).includes(k));
      return {
        type: type.key,
        ...(type.custom && name ? { name } : {}),
        number: number.slice(0, 60),
        ...(issuer ? { issuer } : {}),
        expiry: row.expiry,
        ...(type.hasClasses && classes.length ? { classes } : {}),
      };
    })
    .filter(Boolean)
    .slice(0, MAX_CERTIFICATES);

/**
 * Where a certificate stands today.
 * - expired: its expiry date has passed
 * - verified: SpaceLinq has checked it (listing metadata `verifiedCertificates`
 *   holds the same type and number, with an expiry that has not passed)
 * - declared: stated by the provider, not checked
 *
 * @param {Object} certificate - from listing publicData.certificates
 * @param {Array<Object>} [verified] - listing metadata.verifiedCertificates
 * @param {Date} [now]
 * @returns {'verified'|'declared'|'expired'}
 */
export const certificateStatus = (certificate, verified, now = new Date()) => {
  const today = now.toISOString().slice(0, 10);
  if (!isIsoDate(certificate?.expiry) || certificate.expiry < today) {
    return CERTIFICATE_EXPIRED;
  }
  const match = (Array.isArray(verified) ? verified : []).find(
    v => v && sameCertificate(v, certificate)
  );
  const isVerified = !!match && (!isIsoDate(match.expiry) || match.expiry >= today);
  return isVerified ? CERTIFICATE_VERIFIED : CERTIFICATE_DECLARED;
};

/**
 * Certificates to show on a listing: current ones only, verified first.
 *
 * @param {Object} publicData - listing public data
 * @param {Object} [metadata] - listing metadata
 * @param {Date} [now]
 * @returns {Array<Object>} [{ ...certificate, status, label, classLabels }]
 */
export const currentCertificates = (publicData, metadata, now = new Date()) =>
  (Array.isArray(publicData?.certificates) ? publicData.certificates : [])
    .map(certificate => {
      const type = getCertificateType(certificate?.type);
      if (!type) {
        return null;
      }
      return {
        ...certificate,
        status: certificateStatus(certificate, metadata?.verifiedCertificates, now),
        label: type.custom && certificate.name ? certificate.name : type.label,
        shortLabel: type.custom && certificate.name ? certificate.name : type.shortLabel,
        classLabels: hazardClasses
          .filter(c => (certificate.classes || []).includes(c.key))
          .map(c => c.label),
      };
    })
    .filter(c => c && c.status !== CERTIFICATE_EXPIRED)
    .sort((a, b) => (a.status === b.status ? 0 : a.status === CERTIFICATE_VERIFIED ? -1 : 1));

/**
 * The dangerous goods classes a listing can be found under in search: those on
 * its location compliance certificates that have not expired.
 *
 * @param {Array<Object>} certificates - as saved in publicData.certificates
 * @param {Date} [now]
 * @returns {Array<string>} hazard class keys
 */
export const dgClassesForSearch = (certificates, now = new Date()) => {
  const covered = (Array.isArray(certificates) ? certificates : [])
    .filter(
      c =>
        c?.type === LOCATION_COMPLIANCE_CERTIFICATE &&
        certificateStatus(c, null, now) !== CERTIFICATE_EXPIRED
    )
    .flatMap(c => c.classes || []);
  return hazardClasses.map(c => c.key).filter(k => covered.includes(k));
};

// A certificate is flagged to its provider this many days before it expires
export const CERTIFICATE_REMINDER_DAYS = 30;

/**
 * Certificates a provider should act on: expired, or expiring soon.
 *
 * @param {Object} publicData - listing public data
 * @param {Date} [now]
 * @returns {Array<Object>} [{ label, expiry, daysLeft }] soonest first; daysLeft < 0 when expired
 */
export const certificatesNeedingRenewal = (publicData, now = new Date()) => {
  const today = Date.parse(`${now.toISOString().slice(0, 10)}T00:00:00Z`);
  return (Array.isArray(publicData?.certificates) ? publicData.certificates : [])
    .map(c => {
      const type = getCertificateType(c?.type);
      if (!type || !isIsoDate(c.expiry)) {
        return null;
      }
      const daysLeft = Math.round((Date.parse(`${c.expiry}T00:00:00Z`) - today) / 86400000);
      return {
        label: type.custom && c.name ? c.name : type.shortLabel,
        expiry: c.expiry,
        daysLeft,
      };
    })
    .filter(c => c && c.daysLeft <= CERTIFICATE_REMINDER_DAYS)
    .sort((a, b) => a.daysLeft - b.daysLeft);
};
