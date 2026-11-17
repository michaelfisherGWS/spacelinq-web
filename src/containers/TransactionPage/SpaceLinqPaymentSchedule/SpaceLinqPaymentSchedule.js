import React, { useEffect, useState, useCallback } from 'react';
import { useDispatch } from 'react-redux';

import { FormattedMessage, useIntl } from '../../../util/reactIntl';
import { formatMoney } from '../../../util/currency';
import { spaceLinqGiveNotice } from '../../../util/api';
import {
  fetchInstalments,
  instalmentStatus,
  INSTALMENT_SCHEDULED,
} from '../../../util/spaceLinqInstalments';
import { H6, InlineTextButton, PrimaryButton } from '../../../components';

import css from './SpaceLinqPaymentSchedule.module.css';

const MS_PER_DAY = 24 * 60 * 60 * 1000;
// The saved card is charged this many days before a month starts (see process.edn).
const CHARGE_DAYS_BEFORE = 3;

/**
 * SpaceLinq: the monthly payments of an ongoing booking, shown on the booking
 * page of the first month. The customer can give notice here.
 *
 * @component
 * @param {Object} props
 * @param {string} props.agreementId uuid string of the first-month transaction
 * @param {'customer'|'provider'} props.transactionRole
 * @param {string} [props.timeZone] listing time zone
 * @returns {JSX.Element|null}
 */
const SpaceLinqPaymentSchedule = props => {
  const { agreementId, transactionRole, timeZone } = props;
  const intl = useIntl();
  const dispatch = useDispatch();
  const [instalments, setInstalments] = useState(null);
  const [loadError, setLoadError] = useState(false);
  const [confirmingNotice, setConfirmingNotice] = useState(false);
  const [noticeInProgress, setNoticeInProgress] = useState(false);
  const [noticeResult, setNoticeResult] = useState(null);
  const [noticeError, setNoticeError] = useState(false);

  const load = useCallback(() => {
    // The SDK is available to thunks as the extra argument.
    return dispatch((_, getState, sdk) => fetchInstalments(sdk, agreementId, transactionRole))
      .then(result => {
        setInstalments(result);
        setLoadError(false);
      })
      .catch(() => setLoadError(true));
  }, [dispatch, agreementId, transactionRole]);

  useEffect(() => {
    load();
  }, [load]);

  const isCustomer = transactionRole === 'customer';
  const formatDate = date =>
    intl.formatDate(date, { day: 'numeric', month: 'short', year: 'numeric', timeZone });

  const onGiveNotice = () => {
    setNoticeInProgress(true);
    setNoticeError(false);
    spaceLinqGiveNotice({ agreementId })
      .then(result => {
        setNoticeResult(result);
        setConfirmingNotice(false);
        return load();
      })
      .catch(() => setNoticeError(true))
      .then(() => setNoticeInProgress(false));
  };

  if (loadError) {
    return (
      <div className={css.root}>
        <p className={css.error}>
          <FormattedMessage id="SpaceLinqPaymentSchedule.loadError" />
        </p>
      </div>
    );
  }
  if (!instalments) {
    return null;
  }

  const hasScheduled = instalments.some(tx => instalmentStatus(tx) === INSTALMENT_SCHEDULED);

  return (
    <div className={css.root}>
      <H6 as="h3" className={css.title}>
        <FormattedMessage id="SpaceLinqPaymentSchedule.title" />
      </H6>
      <p className={css.intro}>
        <FormattedMessage
          id={
            isCustomer
              ? 'SpaceLinqPaymentSchedule.introCustomer'
              : 'SpaceLinqPaymentSchedule.introProvider'
          }
          values={{ days: CHARGE_DAYS_BEFORE }}
        />
      </p>

      {instalments.length === 0 ? (
        <p className={css.intro}>
          <FormattedMessage id="SpaceLinqPaymentSchedule.empty" />
        </p>
      ) : (
        <ul className={css.list}>
          {instalments.map(tx => {
            const { start, end } = tx.booking?.attributes || {};
            const money = isCustomer ? tx.attributes.payinTotal : tx.attributes.payoutTotal;
            const status = instalmentStatus(tx);
            const chargeDate = start ? new Date(start.getTime() - CHARGE_DAYS_BEFORE * MS_PER_DAY) : null;
            return (
              <li key={tx.id.uuid} className={css.item}>
                <span className={css.period}>
                  {start && end
                    ? `${formatDate(start)} – ${formatDate(new Date(end.getTime() - MS_PER_DAY))}`
                    : null}
                </span>
                <span className={css.amount}>{money ? formatMoney(intl, money) : null}</span>
                <span className={css.status}>
                  {status ? (
                    <FormattedMessage
                      id={`SpaceLinqPaymentSchedule.status.${status}`}
                      values={{ date: chargeDate ? formatDate(chargeDate) : '' }}
                    />
                  ) : null}
                </span>
              </li>
            );
          })}
        </ul>
      )}

      {noticeResult ? (
        <p className={css.notice}>
          {noticeResult.cancelled > 0 ? (
            <FormattedMessage
              id="SpaceLinqPaymentSchedule.noticeGiven"
              values={{
                date: formatDate(new Date(new Date(noticeResult.endsAt).getTime() - MS_PER_DAY)),
              }}
            />
          ) : (
            <FormattedMessage id="SpaceLinqPaymentSchedule.noticeNothingToCancel" />
          )}
        </p>
      ) : null}

      {isCustomer && hasScheduled && !confirmingNotice ? (
        <InlineTextButton className={css.noticeLink} onClick={() => setConfirmingNotice(true)}>
          <FormattedMessage id="SpaceLinqPaymentSchedule.giveNotice" />
        </InlineTextButton>
      ) : null}

      {isCustomer && confirmingNotice ? (
        <div className={css.confirm}>
          <p className={css.intro}>
            <FormattedMessage id="SpaceLinqPaymentSchedule.confirmNoticeText" />
          </p>
          <PrimaryButton
            className={css.confirmButton}
            type="button"
            inProgress={noticeInProgress}
            onClick={onGiveNotice}
          >
            <FormattedMessage id="SpaceLinqPaymentSchedule.confirmNotice" />
          </PrimaryButton>
          <InlineTextButton className={css.noticeLink} onClick={() => setConfirmingNotice(false)}>
            <FormattedMessage id="SpaceLinqPaymentSchedule.keepBooking" />
          </InlineTextButton>
          {noticeError ? (
            <p className={css.error}>
              <FormattedMessage id="SpaceLinqPaymentSchedule.noticeError" />
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
};

export default SpaceLinqPaymentSchedule;
