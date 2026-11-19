import React, { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';

import { FormattedMessage, useIntl } from '../../../util/reactIntl';
import { formatMoney } from '../../../util/currency';
import { types as sdkTypes } from '../../../util/sdkLoader';
import { fetchPaymentsSummary, UPCOMING_WINDOW_DAYS } from '../../../util/spaceLinqPayments';

import css from './SpaceLinqPaymentsSummary.module.css';

const { Money } = sdkTypes;

/**
 * Totals across all of a user's bookings: what has been paid (or earned),
 * what will be charged in the next 30 days, and the next payment.
 * Loads on the client when the bookings page opens.
 *
 * @component
 * @param {Object} props
 * @param {'customer'|'provider'} props.role - whose bookings are being shown
 * @returns {JSX.Element|null}
 */
const SpaceLinqPaymentsSummary = props => {
  const { role } = props;
  const intl = useIntl();
  const dispatch = useDispatch();
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    let isCurrent = true;
    setSummary(null);
    // The SDK is available to thunks as the extra argument.
    dispatch((_, getState, sdk) =>
      // Without an SDK (for example in tests) there is nothing to load
      sdk ? fetchPaymentsSummary(sdk, role) : Promise.resolve(null)
    )
      .then(result => {
        if (isCurrent) {
          setSummary(result);
        }
      })
      .catch(() => {
        // The summary is an extra: the bookings list below still works without it
      });
    return () => {
      isCurrent = false;
    };
  }, [dispatch, role]);

  // Nothing to show until there has been a payment or one is coming
  if (!summary || !summary.currency || (summary.paidAmount === 0 && summary.upcomingCount === 0)) {
    return null;
  }

  const money = amount => formatMoney(intl, new Money(amount, summary.currency));
  const { nextPayment } = summary;

  return (
    <dl className={css.root}>
      <div className={css.item}>
        <dt className={css.label}>
          <FormattedMessage id={`SpaceLinqPaymentsSummary.paid.${role}`} />
        </dt>
        <dd className={css.value}>{money(summary.paidAmount)}</dd>
      </div>
      <div className={css.item}>
        <dt className={css.label}>
          <FormattedMessage
            id={`SpaceLinqPaymentsSummary.upcoming.${role}`}
            values={{ days: UPCOMING_WINDOW_DAYS }}
          />
        </dt>
        <dd className={css.value}>{money(summary.upcomingAmount)}</dd>
        <dd className={css.detail}>
          <FormattedMessage
            id="SpaceLinqPaymentsSummary.upcomingCount"
            values={{ count: summary.upcomingCount }}
          />
        </dd>
      </div>
      {nextPayment ? (
        <div className={css.item}>
          <dt className={css.label}>
            <FormattedMessage id={`SpaceLinqPaymentsSummary.next.${role}`} />
          </dt>
          <dd className={css.value}>{money(nextPayment.amount)}</dd>
          <dd className={css.detail}>
            {intl.formatDate(nextPayment.date, {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            })}
          </dd>
        </div>
      ) : null}
    </dl>
  );
};

export default SpaceLinqPaymentsSummary;
