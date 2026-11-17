import React from 'react';
import classNames from 'classnames';

import css from './StorageUnitIcon.module.css';

// Simple line icons for SpaceLinq storage options. Drawn on a 64x64 grid and
// coloured with currentColor so they follow the surrounding text colour.
const paths = {
  pallet: (
    <>
      <rect x="14" y="14" width="36" height="26" rx="2" />
      <line x1="14" y1="27" x2="50" y2="27" />
      <line x1="32" y1="14" x2="32" y2="40" />
      <rect x="10" y="44" width="44" height="4" />
      <line x1="14" y1="48" x2="14" y2="54" />
      <line x1="32" y1="48" x2="32" y2="54" />
      <line x1="50" y1="48" x2="50" y2="54" />
      <line x1="10" y1="54" x2="54" y2="54" />
    </>
  ),
  'pallet-tall': (
    <>
      <rect x="16" y="6" width="32" height="34" rx="2" />
      <line x1="16" y1="17" x2="48" y2="17" />
      <line x1="16" y1="28" x2="48" y2="28" />
      <rect x="10" y="44" width="44" height="4" />
      <line x1="14" y1="48" x2="14" y2="54" />
      <line x1="32" y1="48" x2="32" y2="54" />
      <line x1="50" y1="48" x2="50" y2="54" />
      <line x1="10" y1="54" x2="54" y2="54" />
      <line x1="58" y1="6" x2="58" y2="54" />
      <polyline points="55,10 58,6 61,10" />
      <polyline points="55,50 58,54 61,50" />
    </>
  ),
  'pallet-cold': (
    <>
      <rect x="14" y="20" width="36" height="20" rx="2" />
      <rect x="10" y="44" width="44" height="4" />
      <line x1="14" y1="48" x2="14" y2="54" />
      <line x1="32" y1="48" x2="32" y2="54" />
      <line x1="50" y1="48" x2="50" y2="54" />
      <line x1="10" y1="54" x2="54" y2="54" />
      <line x1="32" y1="4" x2="32" y2="16" />
      <line x1="26.8" y1="7" x2="37.2" y2="13" />
      <line x1="26.8" y1="13" x2="37.2" y2="7" />
    </>
  ),
  shelving: (
    <>
      <line x1="12" y1="6" x2="12" y2="58" />
      <line x1="52" y1="6" x2="52" y2="58" />
      <line x1="12" y1="18" x2="52" y2="18" />
      <line x1="12" y1="32" x2="52" y2="32" />
      <line x1="12" y1="46" x2="52" y2="46" />
      <rect x="16" y="22" width="10" height="10" />
      <rect x="30" y="24" width="8" height="8" />
      <rect x="18" y="37" width="14" height="9" />
      <rect x="38" y="9" width="10" height="9" />
    </>
  ),
  floor: (
    <>
      <polygon points="6,40 32,26 58,40 32,54" />
      <line x1="19" y1="33" x2="45" y2="47" />
      <line x1="45" y1="33" x2="19" y2="47" />
      <line x1="6" y1="14" x2="6" y2="22" />
      <line x1="58" y1="14" x2="58" y2="22" />
      <line x1="6" y1="18" x2="58" y2="18" />
      <polyline points="10,15 6,18 10,21" />
      <polyline points="54,15 58,18 54,21" />
    </>
  ),
  yard: (
    <>
      <line x1="4" y1="54" x2="60" y2="54" />
      <line x1="8" y1="24" x2="8" y2="54" />
      <line x1="56" y1="24" x2="56" y2="54" />
      <line x1="8" y1="30" x2="56" y2="30" />
      <line x1="8" y1="42" x2="56" y2="42" />
      <line x1="20" y1="30" x2="20" y2="54" />
      <line x1="32" y1="30" x2="32" y2="54" />
      <line x1="44" y1="30" x2="44" y2="54" />
      <circle cx="46" cy="12" r="5" />
    </>
  ),
  cage: (
    <>
      <rect x="10" y="10" width="44" height="44" />
      <line x1="21" y1="10" x2="21" y2="54" />
      <line x1="32" y1="10" x2="32" y2="54" />
      <line x1="43" y1="10" x2="43" y2="54" />
      <line x1="10" y1="21" x2="54" y2="21" />
      <line x1="10" y1="43" x2="54" y2="43" />
      <rect x="27" y="27" width="10" height="9" rx="1" />
      <path d="M29 27v-3a3 3 0 0 1 6 0v3" />
    </>
  ),
  bay: (
    <>
      <polyline points="6,54 6,22 32,8 58,22 58,54" />
      <line x1="2" y1="54" x2="62" y2="54" />
      <rect x="20" y="30" width="24" height="24" />
      <line x1="20" y1="36" x2="44" y2="36" />
      <line x1="20" y1="42" x2="44" y2="42" />
      <line x1="20" y1="48" x2="44" y2="48" />
    </>
  ),
  container: (
    <>
      <rect x="4" y="18" width="56" height="30" />
      <line x1="12" y1="18" x2="12" y2="48" />
      <line x1="20" y1="18" x2="20" y2="48" />
      <line x1="28" y1="18" x2="28" y2="48" />
      <line x1="36" y1="18" x2="36" y2="48" />
      <line x1="44" y1="18" x2="44" y2="48" />
      <line x1="52" y1="18" x2="52" y2="48" />
      <line x1="4" y1="52" x2="60" y2="52" />
    </>
  ),
};

/**
 * Icon for a SpaceLinq storage option.
 *
 * @component
 * @param {Object} props
 * @param {string} props.icon - icon name from configSpaceLinq storageUnits
 * @param {string} [props.className] - extra class
 * @param {string} [props.title] - accessible title
 * @returns {JSX.Element|null}
 */
const StorageUnitIcon = props => {
  const { icon, className, title } = props;
  const content = paths[icon];
  if (!content) {
    return null;
  }
  return (
    <svg
      className={classNames(css.root, className)}
      viewBox="0 0 64 64"
      xmlns="http://www.w3.org/2000/svg"
      role={title ? 'img' : 'presentation'}
      aria-label={title}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {title ? <title>{title}</title> : null}
      {content}
    </svg>
  );
};

export default StorageUnitIcon;
