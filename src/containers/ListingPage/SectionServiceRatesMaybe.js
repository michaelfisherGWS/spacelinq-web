import React from 'react';

// Utils
import { FormattedMessage, useIntl } from '../../util/reactIntl';
import { formatMoney } from '../../util/currency';
import { types as sdkTypes } from '../../util/sdkLoader';
import { serviceRates } from '../../config/configSpaceLinq';

// Shared components
import { Heading } from '../../components';

import css from './SectionServiceRatesMaybe.module.css';

const { Money } = sdkTypes;

/**
 * SpaceLinq: the provider's 3PL service rate card, grouped as inbound, outbound and value-added.
 *
 * @component
 * @param {Object} props
 * @param {Object} props.publicData - listing publicData
 * @returns {JSX.Element|null}
 */
const SectionServiceRatesMaybe = props => {
  const intl = useIntl();
  const pricing = props.publicData?.pricing;
  const currency = pricing?.currency;
  const rows = (pricing?.rateCard || [])
    .map(r => ({ ...serviceRates.find(s => s.key === r.key), price: r.price }))
    .filter(r => r.key && Number.isInteger(r.price));
  if (!currency || rows.length === 0) {
    return null;
  }
  const groups = [...new Set(rows.map(r => r.group))];

  return (
    <section className={css.root}>
      <Heading as="h2" rootClassName={css.heading}>
        <FormattedMessage id="ListingPage.serviceRatesTitle" />
      </Heading>
      {groups.map(group => (
        <div key={group} className={css.group}>
          <h3 className={css.groupTitle}>{group}</h3>
          <ul className={css.list}>
            {rows
              .filter(r => r.group === group)
              .map(r => (
                <li key={r.key} className={css.row}>
                  <span>{r.label}</span>
                  <span className={css.price}>
                    <FormattedMessage
                      id="ListingPage.serviceRate"
                      values={{
                        price: formatMoney(intl, new Money(r.price, currency)),
                        unit: r.unit,
                      }}
                    />
                  </span>
                </li>
              ))}
          </ul>
        </div>
      ))}
      <p className={css.note}>
        <FormattedMessage id="ListingPage.serviceRatesNote" />
      </p>
    </section>
  );
};

export default SectionServiceRatesMaybe;
