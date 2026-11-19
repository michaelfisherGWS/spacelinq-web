import {
  SPACE_CATEGORIES_SECTION_TYPE,
  withSpaceCategoriesSection,
} from './SectionSpaceCategories';

describe('withSpaceCategoriesSection', () => {
  const hero = { sectionType: 'hero', sectionId: 'hero' };
  const features = { sectionType: 'features', sectionId: 'features' };

  it('puts the category tiles straight after the first section', () => {
    const page = withSpaceCategoriesSection({ sections: [hero, features], meta: { a: 1 } });
    expect(page.sections.map(s => s.sectionType)).toEqual([
      'hero',
      SPACE_CATEGORIES_SECTION_TYPE,
      'features',
    ]);
    expect(page.meta).toEqual({ a: 1 });
  });

  it('adds the tiles once', () => {
    const once = withSpaceCategoriesSection({ sections: [hero] });
    expect(withSpaceCategoriesSection(once)).toBe(once);
  });

  it('leaves a page without sections alone', () => {
    expect(withSpaceCategoriesSection(undefined)).toBe(undefined);
    const empty = { sections: [] };
    expect(withSpaceCategoriesSection(empty)).toBe(empty);
  });
});
