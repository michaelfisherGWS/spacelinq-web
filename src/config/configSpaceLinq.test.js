import { applySpaceLinqListingFields, extraListingFields } from './configSpaceLinq';

const hosted = [
  {
    key: 'storage_type',
    scope: 'public',
    schemaType: 'multi-enum',
    enumOptions: [
      { option: 'general', label: 'General warehouse' },
      { option: 'bonded', label: 'Bonded / customs-controlled warehouse' },
      { option: 'outdoor', label: 'Outdoor / open-air storage' },
    ],
    filterConfig: { label: 'Storage type' },
    showConfig: { label: 'Storage type' },
    saveConfig: { label: 'Storage type' },
  },
  {
    key: 'services',
    scope: 'public',
    schemaType: 'multi-enum',
    enumOptions: [{ option: '3pl', label: 'Third-party logistics (3PL)' }],
    filterConfig: { label: 'Services offered' },
    showConfig: { label: 'Services offered' },
    saveConfig: { label: 'Services offered' },
  },
];

describe('applySpaceLinqListingFields', () => {
  it('rewords Console fields, hides retired ones and adds the extra fields', () => {
    const fields = applySpaceLinqListingFields(hosted);
    const facility = fields.find(f => f.key === 'storage_type');
    expect(facility.showConfig.label).toEqual('Facility type');
    expect(facility.enumOptions.map(o => o.label)).toEqual([
      'General warehouse',
      'Customs-controlled area (bonded)',
    ]);
    // option keys are untouched, so existing listing data still matches
    expect(facility.enumOptions.map(o => o.option)).toEqual(['general', 'bonded']);
    expect(fields.find(f => f.key === 'services')).toBeUndefined();
    expect(fields).toHaveLength(1 + extraListingFields.length);
  });

  it('lets a Console field with the same key replace an extra field', () => {
    const consoleField = { ...extraListingFields[0], showConfig: { label: 'From Console' } };
    const fields = applySpaceLinqListingFields([consoleField]);
    expect(fields.filter(f => f.key === consoleField.key)).toHaveLength(1);
    expect(fields[0].showConfig.label).toEqual('From Console');
  });
});
