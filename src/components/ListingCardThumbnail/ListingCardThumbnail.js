import React from 'react';
import classNames from 'classnames';

import { AspectRatioWrapper, StorageUnitIcon } from '../../components';
import { getStorageUnit } from '../../config/configSpaceLinq';
import { colorSchemes } from '../../util/types';
import { richText } from '../../util/richText';

import css from './ListingCardThumbnail.module.css';

const MIN_LENGTH_FOR_LONG_WORDS = 30;

/**
 * ListingCardThumbnail
 * Component for listings without an image.
 * Renders the listing title inside a styled, fixed-aspect-ratio container.
 * @component
 * @param {Object} props
 * @param {string} props.style color scheme to apply
 * @param {string} props.listingTitle listing title to display
 * @param {number} props.width aspect ratio width
 * @param {number} props.height aspect ratio height
 * @param {Function?} props.setActivePropsMaybe optional hover handlers for map highlighting
 * @param {string?} props.className optional CSS class for outer wrapper
 * @param {string?} props.storageUnit SpaceLinq storage option key; shows its icon and label
 * @returns {JSX.Element} component to display when no listing image is available
 */
const ListingCardThumbnail = props => {
  const { style, listingTitle, width, height, setActivePropsMaybe, className, storageUnit } = props;
  const unit = getStorageUnit(storageUnit);

  // Validate the provided style against the allowed color schemes.
  // Fallback to the first scheme if invalid or undefined.
  const validStyle = colorSchemes.includes(style) ? style : colorSchemes[0];

  // Combine base preview styles with the selected color scheme.
  const previewClassNames = classNames(css.preview, css[validStyle]);

  return (
    <AspectRatioWrapper
      width={width}
      height={height}
      {...setActivePropsMaybe}
      className={className}
    >
      <div className={classNames(previewClassNames, { [css.withStorageUnit]: !!unit })}>
        {unit ? (
          <div className={css.storageUnit}>
            <StorageUnitIcon icon={unit.icon} className={css.storageUnitIcon} />
            <span className={css.storageUnitLabel}>{unit.label}</span>
          </div>
        ) : null}
        {listingTitle
          ? richText(listingTitle, {
              longWordMinLength: MIN_LENGTH_FOR_LONG_WORDS,
              longWordClass: css.longWord,
            })
          : null}
      </div>
    </AspectRatioWrapper>
  );
};

export default ListingCardThumbnail;
