import React from 'react';

import { FormattedMessage } from '../../../util/reactIntl';
import { SPACE_CATEGORY_FIELD_KEY, spaceCategories } from '../../../config/configSpaceLinq';

import { NamedLink, StorageUnitIcon } from '../../../components';

import css from './SectionSpaceCategories.module.css';

export const SPACE_CATEGORIES_SECTION_TYPE = 'spaceLinqCategories';

// Line icons only, so the five tiles match. The names are StorageUnitIcon's drawn icons.
const CATEGORY_ICONS = {
  warehousing: 'garage',
  'self-storage': 'container',
  parking: 'parking',
  'event-space': 'room',
  other: 'shed',
};

/**
 * Add the category tiles to a hosted page's sections, straight after its first
 * section (the hero). Pages without sections are left alone.
 *
 * @param {Object} pageData - hosted page asset data ({ sections, meta })
 * @returns {Object} page data with the category section added
 */
export const withSpaceCategoriesSection = pageData => {
  const sections = pageData?.sections;
  const alreadyAdded = (sections || []).some(s => s.sectionType === SPACE_CATEGORIES_SECTION_TYPE);
  if (!Array.isArray(sections) || sections.length === 0 || alreadyAdded) {
    return pageData;
  }
  const tiles = { sectionType: SPACE_CATEGORIES_SECTION_TYPE, sectionId: 'space-categories' };
  return { ...pageData, sections: [sections[0], tiles, ...sections.slice(1)] };
};

/**
 * Landing page section: one tile per space category, each linking to the
 * search results for that category.
 *
 * @component
 * @param {Object} props
 * @param {string} [props.sectionId] - id of the section element
 * @returns {JSX.Element}
 */
const SectionSpaceCategories = props => {
  const { sectionId } = props;
  return (
    <section id={sectionId} className={css.root}>
      <div className={css.content}>
        <h2 className={css.title}>
          <FormattedMessage id="SectionSpaceCategories.title" />
        </h2>
        <ul className={css.tiles}>
          {spaceCategories.map(category => (
            <li key={category.key} className={css.tileItem}>
              <NamedLink
                name="SearchPage"
                to={{ search: `?pub_${SPACE_CATEGORY_FIELD_KEY}=${category.key}` }}
                className={css.tile}
              >
                <StorageUnitIcon icon={CATEGORY_ICONS[category.key]} className={css.icon} />
                <span className={css.label}>{category.label}</span>
                <span className={css.description}>{category.description}</span>
              </NamedLink>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
};

export default SectionSpaceCategories;
