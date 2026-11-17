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

export const SPACELINQ_LISTING_TYPES = [
  'pallet-storage',
  'floor-space',
  'dedicated-space',
  'quote-on-request',
];

export const isSpaceLinqListingType = listingType => SPACELINQ_LISTING_TYPES.includes(listingType);

// Average days per month and per week, used to convert to the daily booking unit.
export const DAYS_PER_MONTH = 365 / 12; // 30.4167
export const DAYS_PER_WEEK = 7;

export const storageUnits = [
  {
    key: 'standard-pallet',
    label: 'Standard pallet space',
    icon: 'pallet',
    listingTypes: ['pallet-storage', 'quote-on-request'],
    dimensions: { length: 1165, width: 1165, height: 1800, maxWeight: 1000 },
    description:
      'One NZ/AU standard pallet position (1165 x 1165 mm) in racking or floor stacked, up to 1.8 m high and 1,000 kg.',
  },
  {
    key: 'oversize-pallet',
    label: 'Oversize pallet space',
    icon: 'pallet-tall',
    listingTypes: ['pallet-storage', 'quote-on-request'],
    dimensions: { length: 1165, width: 1165, height: 2400, maxWeight: 1500 },
    description:
      'A full-height pallet position for taller or heavier loads, up to 2.4 m high and 1,500 kg.',
  },
  {
    key: 'chilled-pallet',
    label: 'Chilled / frozen pallet space',
    icon: 'pallet-cold',
    listingTypes: ['pallet-storage', 'quote-on-request'],
    dimensions: { length: 1165, width: 1165, height: 1800, maxWeight: 1000 },
    description:
      'A standard pallet position in a temperature-controlled store. Set the temperature range in Storage environment.',
  },
  {
    key: 'shelving-bay',
    label: 'Shelving bay',
    icon: 'shelving',
    listingTypes: ['pallet-storage', 'dedicated-space', 'quote-on-request'],
    dimensions: { length: 1800, width: 600, height: 2100, maxWeight: 500 },
    description:
      'A bay of shelving for cartons and small parts, about 1.8 m wide, 0.6 m deep and 2.1 m high.',
  },
  {
    key: 'floor-area',
    label: 'Open floor area',
    icon: 'floor',
    listingTypes: ['floor-space', 'quote-on-request'],
    dimensions: null,
    description:
      'Open indoor floor space for bulk or block-stacked goods, booked by the square metre.',
  },
  {
    key: 'yard-space',
    label: 'Outdoor yard space',
    icon: 'yard',
    listingTypes: ['floor-space', 'quote-on-request'],
    dimensions: null,
    description:
      'Secure outdoor hardstand for vehicles, machinery, containers or materials, booked by the square metre.',
  },
  {
    key: 'secure-cage',
    label: 'Secure caged area',
    icon: 'cage',
    listingTypes: ['dedicated-space', 'quote-on-request'],
    dimensions: { length: 3000, width: 3000, height: 2400, maxWeight: null },
    description:
      'A lockable mesh cage inside the warehouse, about 3 x 3 m, for higher-value or segregated stock.',
  },
  {
    key: 'dedicated-bay',
    label: 'Dedicated warehouse bay',
    icon: 'bay',
    listingTypes: ['dedicated-space', 'quote-on-request'],
    dimensions: null,
    description: 'A walled section of warehouse for your exclusive use. Enter the size below.',
  },
  {
    key: 'container-20',
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
    label: 'Garage',
    icon: 'garage',
    listingTypes: ['dedicated-space', 'quote-on-request'],
    dimensions: { length: 6000, width: 3000, height: 2400, maxWeight: null },
    description:
      'A lockable single garage, about 6 x 3 m, for household goods, a vehicle or trade stock.',
  },
  {
    key: 'spare-room',
    label: 'Spare room or loft',
    icon: 'room',
    listingTypes: ['dedicated-space', 'quote-on-request'],
    dimensions: { length: 3000, width: 3000, height: 2400, maxWeight: null },
    description: 'An indoor room, loft or basement space, about 3 x 3 m, for boxes and furniture.',
  },
  {
    key: 'shed',
    label: 'Shed or lock-up',
    icon: 'shed',
    listingTypes: ['dedicated-space', 'quote-on-request'],
    dimensions: { length: 3000, width: 2400, height: 2100, maxWeight: null },
    description: 'A garden shed or small lock-up for tools, equipment and seasonal items.',
  },
  {
    key: 'parking-space',
    label: 'Parking or driveway space',
    icon: 'parking',
    listingTypes: ['dedicated-space', 'quote-on-request'],
    dimensions: { length: 5400, width: 2400, height: null, maxWeight: null },
    description: 'An off-street space for a car, boat, caravan or trailer.',
  },
];

export const getStorageUnit = key => storageUnits.find(u => u.key === key) || null;

export const storageUnitsForListingType = listingType =>
  storageUnits.filter(u => !listingType || u.listingTypes.includes(listingType));

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
  quote: {
    label: 'Quote on request',
    rateLabel: 'Indicative price from',
    unitLabel: 'month',
    capacityLabel: null,
    cycles: ['month'],
  },
};

export const defaultPricingModelForListingType = {
  'pallet-storage': 'per-pallet',
  'floor-space': 'per-m2',
  'dedicated-space': 'fixed-monthly',
  'quote-on-request': 'quote',
};

/**
 * Optional services, each a flat monthly price set by the provider.
 */
export const addOns = [
  { key: 'climate-control', label: 'Climate control surcharge' },
  { key: 'access-24-7', label: '24/7 access' },
  { key: 'wms', label: 'WMS / inventory management' },
  { key: 'dock-handling', label: 'Dock / loading handling' },
  { key: 'goods-insurance', label: "Goods insurance (provider's cover)" },
  { key: 'stock-counts', label: 'Regular stock counts' },
  { key: 'pallet-hire', label: 'Pallet hire' },
];

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

const multiEnumField = (key, label, options, listingTypeIds) => ({
  key,
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
  multiEnumField('inbound_services', 'Inbound services', [
    'Container devanning (unpack)',
    'Receiving and put-away',
    'Palletising and wrapping',
    'Inspection and quality checks',
  ]),
  multiEnumField('outbound_services', 'Outbound services', [
    'Full pallet dispatch',
    'Carton pick',
    'Pick and pack (each)',
    'E-commerce fulfilment',
    'Cross-docking',
    'Container loading',
  ]),
  multiEnumField('value_added_services', 'Value-added services', [
    'Kitting and assembly',
    'Labelling and relabelling',
    'Repacking',
    'Returns processing',
  ]),
  multiEnumField('transport', 'Transport', [
    'Local delivery',
    'Linehaul or freight forwarding',
    'Container cartage',
  ]),
  multiEnumField('systems_reporting', 'Systems and reporting', [
    'WMS with customer portal',
    'Stock-on-hand reports',
    'Stocktakes and cycle counts',
    'Online store integration',
  ]),
  multiEnumField('compliance', 'Compliance and certifications', [
    'MPI transitional facility',
    'Customs-controlled area',
    'Dangerous goods location certificate',
    'Food-grade (HACCP or similar)',
    'Insurance held',
  ]),
  multiEnumField('site_equipment', 'Site and equipment', [
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
  ]),
  // Included with the space at no extra charge, like amenities at a hotel.
  multiEnumField('amenities', 'Included amenities', [
    'Private or separate access',
    'On-site toilets',
    'Staff room or kitchen',
    'Office or desk space',
    'Wi-Fi',
    'Customer parking',
    'Truck parking and turning area',
    'On-site staff during open hours',
  ]),
  multiEnumField('sustainability', 'Sustainability', [
    'Solar power',
    'LED lighting',
    'Electric forklifts',
    'EV charging',
    'Rainwater collection',
    'Recycling programme',
  ]),
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
  const hostedKeys = reworded.map(f => f.key);
  return [...reworded, ...extraListingFields.filter(f => !hostedKeys.includes(f.key))];
};
