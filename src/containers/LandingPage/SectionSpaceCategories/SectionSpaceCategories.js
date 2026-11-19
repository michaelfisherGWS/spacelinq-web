import React from 'react';

import { FormattedMessage } from '../../../util/reactIntl';
import { SPACE_CATEGORY_FIELD_KEY, spaceCategories } from '../../../config/configSpaceLinq';

import { NamedLink } from '../../../components';

import css from './SectionSpaceCategories.module.css';

export const SPACE_CATEGORIES_SECTION_TYPE = 'spaceLinqCategories';

// One line icon per category, drawn on a 48 x 48 grid
const CATEGORY_ICONS = {
  // Warehouse with a roller door
  warehousing: (
    <>
      <path d="M5 20 24 8l19 12v20H5z" />
      <path d="M15 40V26h18v14" />
      <path d="M15 31h18M15 36h18" />
    </>
  ),
  // Lock-up unit with a padlock
  'self-storage': (
    <>
      <rect x="7" y="9" width="34" height="30" rx="2" />
      <path d="M7 16h34" />
      <rect x="19" y="26" width="10" height="8" rx="1" />
      <path d="M21 26v-2a3 3 0 0 1 6 0v2" />
    </>
  ),
  // Parking sign
  parking: (
    <>
      <rect x="8" y="8" width="32" height="32" rx="5" />
      <path d="M19 34V15h7a6 6 0 0 1 0 12h-7" />
    </>
  ),
  // Calendar with a marked day
  'event-space': (
    <>
      <rect x="7" y="11" width="34" height="29" rx="2" />
      <path d="M7 19h34M16 7v8M32 7v8" />
      <circle cx="30" cy="30" r="3" />
    </>
  ),
  // Open-ended: a dashed plot with a plus
  other: (
    <>
      <rect x="8" y="8" width="32" height="32" rx="3" strokeDasharray="4 4" />
      <path d="M24 17v14M17 24h14" />
    </>
  ),
};

const CategoryIcon = ({ category }) => (
  <svg
    className={css.icon}
    viewBox="0 0 48 48"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    focusable="false"
  >
    {CATEGORY_ICONS[category]}
  </svg>
);

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
                <CategoryIcon category={category.key} />
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
