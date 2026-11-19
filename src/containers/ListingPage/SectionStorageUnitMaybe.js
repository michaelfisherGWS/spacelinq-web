import React from 'react';

import { FormattedMessage } from '../../util/reactIntl';
import { getStorageUnit } from '../../config/configSpaceLinq';
import { Heading, StorageUnitIcon } from '../../components';

import css from './SectionStorageUnitMaybe.module.css';

const formatMm = mm => (mm >= 1000 ? `${(mm / 1000).toLocaleString('en-NZ')} m` : `${mm} mm`);

/**
 * SpaceLinq: shows the storage option chosen by the provider (icon, name,
 * description and size of one unit).
 *
 * @component
 * @param {Object} props
 * @param {Object} props.publicData - listing public data
 * @returns {JSX.Element|null}
 */
const SectionStorageUnitMaybe = props => {
  const { publicData } = props;
  const unit = getStorageUnit(publicData?.storageUnit);
  if (!unit) {
    return null;
  }
  const dims = publicData?.storageUnitDimensions || unit.dimensions || {};
  const sizeParts = [dims.length, dims.width, dims.height].filter(
    v => typeof v === 'number' && v > 0
  );

  return (
    <section className={css.root}>
      <Heading as="h2" rootClassName={css.heading}>
        <FormattedMessage id="ListingPage.storageUnitTitle" />
      </Heading>
      <div className={css.unit}>
        <StorageUnitIcon icon={unit.icon} className={css.icon} title={unit.label} />
        <div>
          <p className={css.label}>{publicData?.customSpaceType || unit.label}</p>
          {/* A provider-named space has no standard description */}
          {unit.custom ? null : <p className={css.description}>{unit.description}</p>}
          {publicData?.accessHours || publicData?.pricing?.minTermMonths ? (
            <ul className={css.specs}>
              {publicData.accessHours ? (
                <li>
                  <FormattedMessage
                    id="ListingPage.accessHours"
                    values={{ hours: publicData.accessHours }}
                  />
                </li>
              ) : null}
              {publicData?.pricing?.minTermMonths ? (
                <li>
                  <FormattedMessage
                    id="ListingPage.minTerm"
                    values={{ months: publicData.pricing.minTermMonths }}
                  />
                </li>
              ) : null}
            </ul>
          ) : null}
          {sizeParts.length > 0 || dims.maxWeight ? (
            <ul className={css.specs}>
              {sizeParts.length > 0 ? (
                <li>
                  <FormattedMessage
                    id="ListingPage.storageUnitSize"
                    values={{ size: sizeParts.map(formatMm).join(' × ') }}
                  />
                </li>
              ) : null}
              {dims.maxWeight ? (
                <li>
                  <FormattedMessage
                    id="ListingPage.storageUnitMaxWeight"
                    values={{ weight: dims.maxWeight.toLocaleString('en-NZ') }}
                  />
                </li>
              ) : null}
            </ul>
          ) : null}
        </div>
      </div>
    </section>
  );
};

export default SectionStorageUnitMaybe;
