import React, { useEffect, useState, useCallback } from 'react';
import { useDispatch } from 'react-redux';

import { useConfiguration } from '../../../context/configurationContext';
import { FormattedMessage, useIntl } from '../../../util/reactIntl';
import { formatMoney } from '../../../util/currency';
import { types as sdkTypes } from '../../../util/sdkLoader';
import { spaceLinqGiveNotice } from '../../../util/api';
import { serviceRates } from '../../../config/configSpaceLinq';
import {
  fetchInstalments,
  instalmentStatus,
  payInstalmentNow,
  updateInstalmentCharges,
  serviceChargesTotal,
  INSTALMENT_SCHEDULED,
  INSTALMENT_DUE,
  PAY_ERROR_NO_CARD,
  PAY_ERROR_CARD_FAILED,
} from '../../../util/spaceLinqInstalments';
import { H6, InlineTextButton, PrimaryButton, NamedLink } from '../../../components';

import css from './SpaceLinqPaymentSchedule.module.css';

const { Money } = sdkTypes;

const MS_PER_DAY = 24 * 60 * 60 * 1000;
// The saved card is charged this many days before a month starts (see process.edn).
const CHARGE_DAYS_BEFORE = 3;

const emptyChargeForm = { txId: null, quantities: {}, otherAmount: '', otherNote: '' };

// Form values for an instalment's existing charges
const chargeFormFor = tx => {
  const { serviceCharges = [], otherCharge } = tx.attributes.protectedData || {};
  return {
    txId: tx.id.uuid,
    quantities: serviceCharges.reduce((acc, c) => ({ ...acc, [c.key]: `${c.quantity}` }), {}),
    otherAmount: otherCharge?.amount ? (otherCharge.amount / 100).toFixed(2) : '',
    otherNote: otherCharge?.note || '',
  };
};

/**
 * SpaceLinq: the monthly payments of an ongoing booking, shown on the booking
 * page of the first month.
 * - The customer can give notice, and pay a month by hand if the automatic charge failed.
 * - The provider can add a month's service charges before it is charged.
 *
 * @component
 * @param {Object} props
 * @param {string} props.agreementId uuid string of the first-month transaction
 * @param {'customer'|'provider'} props.transactionRole
 * @param {Object} [props.listing] the booked listing (rate card and time zone)
 * @returns {JSX.Element|null}
 */
const SpaceLinqPaymentSchedule = props => {
  const { agreementId, transactionRole, listing } = props;
  const intl = useIntl();
  const config = useConfiguration();
  const dispatch = useDispatch();
  const [instalments, setInstalments] = useState(null);
  const [loadError, setLoadError] = useState(false);
  const [confirmingNotice, setConfirmingNotice] = useState(false);
  const [noticeInProgress, setNoticeInProgress] = useState(false);
  const [noticeResult, setNoticeResult] = useState(null);
  const [noticeError, setNoticeError] = useState(false);
  const [payingId, setPayingId] = useState(null);
  const [payError, setPayError] = useState(null);
  const [chargeForm, setChargeForm] = useState(emptyChargeForm);
  const [chargeSaving, setChargeSaving] = useState(false);
  const [chargeError, setChargeError] = useState(false);

  const timeZone = listing?.attributes?.availabilityPlan?.timezone;
  const pricing = listing?.attributes?.publicData?.pricing;
  const rateCurrency = pricing?.currency || listing?.attributes?.price?.currency;
  const rateCard = (pricing?.rateCard || [])
    .map(r => ({ ...serviceRates.find(s => s.key === r.key), price: r.price }))
    .filter(r => r.key && Number.isInteger(r.price));

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
  const isProvider = transactionRole === 'provider';
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

  const onPayNow = tx => {
    const stripe =
      typeof window !== 'undefined' && window.Stripe
        ? window.Stripe(config.stripe.publishableKey)
        : null;
    if (!stripe) {
      setPayError({ txId: tx.id.uuid, code: PAY_ERROR_CARD_FAILED });
      return;
    }
    setPayingId(tx.id.uuid);
    setPayError(null);
    dispatch((_, getState, sdk) => payInstalmentNow(sdk, stripe, tx))
      .catch(e =>
        setPayError({
          txId: tx.id.uuid,
          code: e.code === PAY_ERROR_NO_CARD ? PAY_ERROR_NO_CARD : PAY_ERROR_CARD_FAILED,
        })
      )
      .then(() => load())
      .then(() => setPayingId(null));
  };

  const onSaveCharges = tx => {
    const serviceCharges = rateCard
      .map(r => ({ key: r.key, quantity: Number(chargeForm.quantities[r.key]) || 0 }))
      .filter(c => c.quantity > 0);
    const otherAmount = Math.round((Number(chargeForm.otherAmount) || 0) * 100);
    const otherCharge =
      otherAmount > 0 ? { amount: otherAmount, note: chargeForm.otherNote.trim() } : null;
    setChargeSaving(true);
    setChargeError(false);
    updateInstalmentCharges(tx, { serviceCharges, otherCharge })
      .then(() => {
        setChargeForm(emptyChargeForm);
        return load();
      })
      .catch(() => setChargeError(true))
      .then(() => setChargeSaving(false));
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
  const paymentMethodsLink = (
    <NamedLink name="PaymentMethodsPage">
      <FormattedMessage id="SpaceLinqPaymentSchedule.paymentMethodsLink" />
    </NamedLink>
  );

  const chargesForm = tx => (
    <div className={css.chargeForm}>
      <p className={css.intro}>
        <FormattedMessage id="SpaceLinqPaymentSchedule.chargesHelp" />
      </p>
      {rateCard.map(r => (
        <label key={r.key} className={css.chargeRow}>
          <span className={css.chargeLabel}>
            <FormattedMessage
              id="SpaceLinqPaymentSchedule.chargeRate"
              values={{
                label: r.label,
                price: formatMoney(intl, new Money(r.price, rateCurrency)),
                unit: r.unit,
              }}
            />
          </span>
          <input
            className={css.chargeInput}
            type="number"
            min="0"
            step="any"
            inputMode="decimal"
            placeholder="0"
            value={chargeForm.quantities[r.key] || ''}
            onChange={e =>
              setChargeForm({
                ...chargeForm,
                quantities: { ...chargeForm.quantities, [r.key]: e.target.value },
              })
            }
          />
        </label>
      ))}
      <label className={css.chargeRow}>
        <span className={css.chargeLabel}>
          <FormattedMessage id="SpaceLinqPaymentSchedule.otherAmount" />
        </span>
        <input
          className={css.chargeInput}
          type="number"
          min="0"
          step="0.01"
          inputMode="decimal"
          placeholder="0.00"
          value={chargeForm.otherAmount}
          onChange={e => setChargeForm({ ...chargeForm, otherAmount: e.target.value })}
        />
      </label>
      <label className={css.chargeNoteRow}>
        <span className={css.chargeLabel}>
          <FormattedMessage id="SpaceLinqPaymentSchedule.otherNote" />
        </span>
        <input
          className={css.chargeNoteInput}
          type="text"
          maxLength={200}
          value={chargeForm.otherNote}
          onChange={e => setChargeForm({ ...chargeForm, otherNote: e.target.value })}
        />
      </label>
      <PrimaryButton
        className={css.confirmButton}
        type="button"
        inProgress={chargeSaving}
        onClick={() => onSaveCharges(tx)}
      >
        <FormattedMessage id="SpaceLinqPaymentSchedule.saveCharges" />
      </PrimaryButton>
      <InlineTextButton className={css.noticeLink} onClick={() => setChargeForm(emptyChargeForm)}>
        <FormattedMessage id="SpaceLinqPaymentSchedule.cancelCharges" />
      </InlineTextButton>
      {chargeError ? (
        <p className={css.error}>
          <FormattedMessage id="SpaceLinqPaymentSchedule.chargesError" />
        </p>
      ) : null}
    </div>
  );

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
            const txId = tx.id.uuid;
            const { start, end } = tx.booking?.attributes || {};
            const money = isCustomer ? tx.attributes.payinTotal : tx.attributes.payoutTotal;
            const status = instalmentStatus(tx);
            const chargeDate = start
              ? new Date(start.getTime() - CHARGE_DAYS_BEFORE * MS_PER_DAY)
              : null;
            const servicesTotal = serviceChargesTotal(tx);
            const isEditingCharges = chargeForm.txId === txId;
            return (
              <li key={txId} className={css.item}>
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
                  {servicesTotal > 0 && money ? (
                    <>
                      {' '}
                      <FormattedMessage
                        id="SpaceLinqPaymentSchedule.includesServices"
                        values={{
                          amount: formatMoney(intl, new Money(servicesTotal, money.currency)),
                        }}
                      />
                    </>
                  ) : null}
                </span>

                {isCustomer && status === INSTALMENT_DUE ? (
                  <div className={css.rowAction}>
                    <PrimaryButton
                      className={css.confirmButton}
                      type="button"
                      inProgress={payingId === txId}
                      disabled={!!payingId && payingId !== txId}
                      onClick={() => onPayNow(tx)}
                    >
                      <FormattedMessage id="SpaceLinqPaymentSchedule.payNow" />
                    </PrimaryButton>
                    {payError?.txId === txId ? (
                      <p className={css.error}>
                        <FormattedMessage
                          id={
                            payError.code === PAY_ERROR_NO_CARD
                              ? 'SpaceLinqPaymentSchedule.payErrorNoCard'
                              : 'SpaceLinqPaymentSchedule.payErrorCardFailed'
                          }
                          values={{ paymentMethodsLink }}
                        />
                      </p>
                    ) : null}
                  </div>
                ) : null}

                {isProvider && status === INSTALMENT_SCHEDULED && !isEditingCharges ? (
                  <div className={css.rowAction}>
                    <InlineTextButton
                      className={css.noticeLink}
                      onClick={() => {
                        setChargeError(false);
                        setChargeForm(chargeFormFor(tx));
                      }}
                    >
                      <FormattedMessage
                        id={
                          servicesTotal > 0
                            ? 'SpaceLinqPaymentSchedule.editCharges'
                            : 'SpaceLinqPaymentSchedule.addCharges'
                        }
                      />
                    </InlineTextButton>
                  </div>
                ) : null}

                {isProvider && isEditingCharges ? chargesForm(tx) : null}
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
