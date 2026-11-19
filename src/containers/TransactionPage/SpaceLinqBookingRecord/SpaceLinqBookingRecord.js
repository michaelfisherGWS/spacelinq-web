import React, { useEffect, useState } from 'react';

import { FormattedMessage, useIntl } from '../../../util/reactIntl';
import { spaceLinqCustomerCompany } from '../../../util/api';
import { H6 } from '../../../components';

import css from './SpaceLinqBookingRecord.module.css';

/**
 * SpaceLinq: the record kept on a booking, shown to both parties.
 * - The storage agreement the customer accepted (who, when, which version).
 * - For a business customer, the company name. The provider sees it only once
 *   the booking is confirmed; the server will not give it out before then.
 *
 * @component
 * @param {Object} props
 * @param {Object} [props.transactionId] - sdk UUID of the booking
 * @param {Object} [props.protectedData] - the booking's protected data
 * @param {Array<Object>} [props.transitions] - the booking's transitions so far
 * @param {'customer'|'provider'} props.transactionRole
 * @returns {JSX.Element|null}
 */
const SpaceLinqBookingRecord = props => {
  const { transactionId, protectedData, transitions, transactionRole } = props;
  const intl = useIntl();
  const [company, setCompany] = useState(null);

  const agreement = protectedData?.storageAgreement;
  const isBusiness = !!protectedData?.customerCompanySealed;
  const id = transactionId?.uuid;
  const transitionCount = (transitions || []).length;

  // Asked again after each transition, so the name appears as soon as the booking is accepted
  useEffect(() => {
    if (!isBusiness || !id) {
      return undefined;
    }
    let isCurrent = true;
    spaceLinqCustomerCompany({ transactionId })
      .then(response => {
        if (isCurrent) {
          setCompany(response);
        }
      })
      .catch(() => {
        if (isCurrent) {
          setCompany(null);
        }
      });
    return () => {
      isCurrent = false;
    };
  }, [isBusiness, id, transitionCount]);

  if (!agreement && !isBusiness) {
    return null;
  }

  const isProvider = transactionRole === 'provider';
  const acceptedAt = agreement?.acceptedAt
    ? intl.formatDate(new Date(agreement.acceptedAt), {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      })
    : null;

  return (
    <div className={css.root}>
      <H6 as="h3" className={css.title}>
        <FormattedMessage id="SpaceLinqBookingRecord.title" />
      </H6>
      <ul className={css.list}>
        {agreement ? (
          <li className={css.item}>
            <span className={css.label}>
              <a href="/storage-agreement" target="_blank" rel="noopener noreferrer">
                <FormattedMessage id="SpaceLinqBookingRecord.agreement" />
              </a>
            </span>
            <span>
              <FormattedMessage
                id="SpaceLinqBookingRecord.agreementAccepted"
                values={{
                  name: agreement.acceptedBy || '',
                  hasName: agreement.acceptedBy ? 'yes' : 'no',
                  date: acceptedAt,
                  version: agreement.version,
                }}
              />
            </span>
          </li>
        ) : null}
        {isBusiness ? (
          <li className={css.item}>
            <span className={css.label}>
              <FormattedMessage id="SpaceLinqBookingRecord.company" />
            </span>
            <span>
              {company?.companyName ? (
                company.companyName
              ) : (
                <FormattedMessage
                  id={
                    isProvider
                      ? 'SpaceLinqBookingRecord.companyHiddenProvider'
                      : 'SpaceLinqBookingRecord.companyHiddenCustomer'
                  }
                />
              )}
            </span>
          </li>
        ) : null}
      </ul>
    </div>
  );
};

export default SpaceLinqBookingRecord;
