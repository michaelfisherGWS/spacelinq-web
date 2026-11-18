import React from 'react';
import { Form as FinalForm, Field } from 'react-final-form';
import classNames from 'classnames';

// Import configs and util modules
import appSettings from '../../../../config/settings';
import { FormattedMessage, useIntl } from '../../../../util/reactIntl';
import { types as sdkTypes } from '../../../../util/sdkLoader';
import { formatMoney } from '../../../../util/currency';
import {
  pricingModels,
  pricingModelFor,
  addOnsForSpaceCategory,
  getSpaceCategory,
  getSpaceCategoryConfig,
  serviceRates as serviceRateOptions,
} from '../../../../config/configSpaceLinq';
import { toDailyRate, toMonthlyRate } from '../../../../util/spacelinqPricing';

// Import shared components
import {
  Button,
  Form,
  FieldCurrencyInput,
  FieldTextInput,
  FieldCheckbox,
  FieldSelect,
} from '../../../../components';

import css from './SpaceLinqPricingForm.module.css';

const { Money } = sdkTypes;

const moneyToMinor = m => (m instanceof Money ? m.amount : null);
const minorToMoney = (amount, currency) =>
  Number.isInteger(amount) ? new Money(amount, currency) : undefined;

/**
 * Initial form values from listing publicData.pricing.
 *
 * @param {Object} publicData
 * @param {string} currency
 * @returns {Object}
 */
export const getSpaceLinqPricingInitialValues = (publicData, currency) => {
  const pricing = publicData?.pricing || {};
  const listingType = publicData?.listingType;
  const addOns = pricing.addOns || [];
  const rateCard = pricing.rateCard || [];
  const insurance = pricing.insurance || null;
  return {
    instantBooking: pricing.instantBooking === true ? ['yes'] : [],
    noticeDays: pricing.noticeDays ? `${pricing.noticeDays}` : 'month',
    insuranceOffered: insurance ? ['yes'] : [],
    insuranceRate: minorToMoney(insurance?.rate, currency),
    insuranceDgRate: minorToMoney(insurance?.dgRate, currency),
    insuranceMaxValue: minorToMoney(insurance?.maxValue, currency),
    insuranceExclusions: insurance?.exclusions || '',
    rateKeys: rateCard.map(r => r.key),
    ...rateCard.reduce((acc, r) => {
      acc[`ratePrice_${r.key}`] = minorToMoney(r.price, currency);
      return acc;
    }, {}),
    model: pricing.model || pricingModelFor(listingType, getSpaceCategory(publicData)),
    rate: minorToMoney(pricing.rate, currency),
    cycle: pricing.cycle === 'day' ? 'month' : pricing.cycle || 'month',
    stayType: pricing.cycle === 'day' ? 'daily' : 'monthly',
    dailyRate: minorToMoney(pricing.dailyRate, currency),
    minTermMonths: pricing.minTermMonths ?? '',
    minMonthlySpend: minorToMoney(pricing.minMonthlySpend, currency),
    indicativeMax: minorToMoney(pricing.indicativeMax, currency),
    addOnKeys: addOns.map(a => a.key),
    ...addOns.reduce((acc, a) => {
      acc[`addOnPrice_${a.key}`] = minorToMoney(a.price, currency);
      return acc;
    }, {}),
  };
};

/**
 * Convert form values into listing update values.
 * The listing price becomes the daily equivalent rate (Sharetribe's booking unit).
 *
 * @param {Object} values - form values
 * @param {string} currency
 * @param {string} [spaceCategory] - space category key; limits what the listing can offer
 * @returns {Object} { price, publicData }
 */
export const spaceLinqPricingToUpdateValues = (values, currency, spaceCategory) => {
  const { model, cycle: rawCycle, minTermMonths, addOnKeys = [], rateKeys = [] } = values;
  const category = getSpaceCategoryConfig(spaceCategory);
  // Short stays only: the rate is per day and there is no monthly price
  const isDailyOnly =
    model !== 'quote' && category?.dailyOnly === true && values.stayType === 'daily';
  const rateCard =
    category && !category.services
      ? []
      : rateKeys
          .map(key => ({ key, price: moneyToMinor(values[`ratePrice_${key}`]) }))
          .filter(r => Number.isInteger(r.price) && r.price > 0);
  const cycle = isDailyOnly ? 'day' : model === 'per-pallet' ? rawCycle || 'week' : 'month';
  const rate = moneyToMinor(values.rate);
  const offeredAddOnKeys = addOnsForSpaceCategory(spaceCategory).map(a => a.key);
  // Optional services are monthly prices, so a daily-only listing has none
  const addOns = isDailyOnly
    ? []
    : addOnKeys
        .filter(key => offeredAddOnKeys.includes(key))
        .map(key => ({ key, price: moneyToMinor(values[`addOnPrice_${key}`]) }))
        .filter(a => Number.isInteger(a.price) && a.price > 0);
  // A separate price for stays under a month. Left empty, short stays use the
  // monthly (or weekly) price divided into days.
  const dailyRateMinor = moneyToMinor(values.dailyRate);
  const dailyRate = !isDailyOnly && model !== 'quote' && dailyRateMinor > 0 ? dailyRateMinor : null;

  // Goods insurance: a rate per $1,000 of goods per month, and the most the provider will cover
  const insuranceRate = moneyToMinor(values.insuranceRate);
  const insuranceMaxValue = moneyToMinor(values.insuranceMaxValue);
  const insuranceDgRate = moneyToMinor(values.insuranceDgRate);
  const insurance =
    (!category || category.goodsInsurance) &&
    (values.insuranceOffered || []).includes('yes') &&
    insuranceRate > 0 &&
    insuranceMaxValue > 0
      ? {
          rate: insuranceRate,
          dgRate: insuranceDgRate > 0 ? insuranceDgRate : null,
          maxValue: insuranceMaxValue,
          exclusions: `${values.insuranceExclusions || ''}`.trim().slice(0, 300),
        }
      : null;

  const pricing = {
    model,
    rate,
    cycle,
    dailyRate,
    currency,
    minTermMonths: !isDailyOnly && minTermMonths ? Number(minTermMonths) : null,
    minMonthlySpend: isDailyOnly ? null : moneyToMinor(values.minMonthlySpend),
    indicativeMax: model === 'quote' ? moneyToMinor(values.indicativeMax) : null,
    addOns,
    rateCard,
    insurance,
    instantBooking: (values.instantBooking || []).includes('yes'),
    noticeDays:
      !isDailyOnly && ['7', '14'].includes(values.noticeDays) ? Number(values.noticeDays) : null,
  };

  // Quotes show an indicative monthly "from" price; bookable models use the daily rate.
  const priceMinor = model === 'quote' ? rate : toDailyRate(rate, cycle);

  return {
    price: new Money(priceMinor, currency),
    publicData: { pricing, priceVariationsEnabled: false },
  };
};

const required = message => value =>
  value instanceof Money && value.amount > 0 ? undefined : message;

/**
 * SpaceLinq pricing form: per pallet (weekly/monthly), per m² (monthly),
 * fixed monthly or quote, with optional add-ons and minimum commitment.
 *
 * @component
 */
const SpaceLinqPricingForm = props => {
  const intl = useIntl();
  const { marketplaceCurrency, spaceCategory } = props;
  const category = getSpaceCategoryConfig(spaceCategory);
  const addOnOptions = addOnsForSpaceCategory(spaceCategory);
  const showRateCard = !category || category.services;
  const showInsurance = !category || category.goodsInsurance;
  const currencyConfig = appSettings.getCurrencyFormatting(marketplaceCurrency);

  return (
    <FinalForm
      {...props}
      render={formRenderProps => {
        const {
          formId = 'SpaceLinqPricingForm',
          className,
          disabled,
          ready,
          handleSubmit,
          invalid,
          pristine,
          saveActionMsg,
          updated,
          updateInProgress,
          fetchErrors,
          values,
        } = formRenderProps;
        const modelConfig = pricingModels[values.model] || {};
        const isQuote = values.model === 'quote';
        const isPallet = values.model === 'per-pallet';
        const canBeDailyOnly = !isQuote && category?.dailyOnly === true;
        const isDailyOnly = canBeDailyOnly && values.stayType === 'daily';
        const cycle = isDailyOnly ? 'day' : isPallet ? values.cycle || 'week' : 'month';
        const rateMinor = moneyToMinor(values.rate);
        const { updateListingError, showListingsError } = fetchErrors || {};
        const submitDisabled = invalid || disabled || updateInProgress;

        const monthlyHint =
          isPallet && cycle === 'week' && rateMinor
            ? formatMoney(intl, new Money(toMonthlyRate(rateMinor, 'week'), marketplaceCurrency))
            : null;

        return (
          <Form onSubmit={handleSubmit} className={classNames(css.root, className)}>
            <p className={css.modelLabel}>
              <FormattedMessage
                id="SpaceLinqPricingForm.modelIntro"
                values={{ model: modelConfig.label }}
              />
            </p>

            {canBeDailyOnly ? (
              <fieldset className={css.stayType}>
                <legend className={css.cycleLegend}>
                  <FormattedMessage id="SpaceLinqPricingForm.stayTypeLabel" />
                </legend>
                {['monthly', 'daily'].map(t => (
                  <label key={t} className={css.cycleOption}>
                    <Field name="stayType" component="input" type="radio" value={t} />
                    <span>
                      <FormattedMessage id={`SpaceLinqPricingForm.stayType.${t}`} />
                    </span>
                  </label>
                ))}
              </fieldset>
            ) : null}

            <div className={css.row}>
              <FieldCurrencyInput
                placeholder="0.00"
                id={`${formId}.rate`}
                name="rate"
                className={css.field}
                label={modelConfig.rateLabel}
                currencyConfig={currencyConfig}
                validate={required(intl.formatMessage({ id: 'SpaceLinqPricingForm.rateRequired' }))}
              />
              {isPallet ? (
                <fieldset className={css.cycle}>
                  <legend className={css.cycleLegend}>
                    <FormattedMessage id="SpaceLinqPricingForm.cycleLabel" />
                  </legend>
                  {['week', 'month'].map(c => (
                    <label key={c} className={css.cycleOption}>
                      <Field name="cycle" component="input" type="radio" value={c} />
                      <span>
                        <FormattedMessage id={`SpaceLinqPricingForm.cycle.${c}`} />
                      </span>
                    </label>
                  ))}
                </fieldset>
              ) : (
                <p className={css.perText}>
                  <FormattedMessage
                    id={
                      isQuote
                        ? 'SpaceLinqPricingForm.perMonthFrom'
                        : isDailyOnly
                        ? 'SpaceLinqPricingForm.perDay'
                        : 'SpaceLinqPricingForm.perMonth'
                    }
                  />
                </p>
              )}
            </div>
            {monthlyHint ? (
              <p className={css.hint}>
                <FormattedMessage
                  id="SpaceLinqPricingForm.monthlyHint"
                  values={{ amount: monthlyHint }}
                />
              </p>
            ) : null}

            {isQuote || isDailyOnly ? null : (
              <>
                <FieldCurrencyInput
                  placeholder="0.00"
                  id={`${formId}.dailyRate`}
                  name="dailyRate"
                  className={css.field}
                  label={intl.formatMessage({ id: 'SpaceLinqPricingForm.dailyRate' })}
                  currencyConfig={currencyConfig}
                />
                <p className={css.hint}>
                  <FormattedMessage id="SpaceLinqPricingForm.dailyRateHelp" />
                </p>
              </>
            )}

            {isDailyOnly ? null : isQuote ? (
              <FieldCurrencyInput
                placeholder="0.00"
                id={`${formId}.indicativeMax`}
                name="indicativeMax"
                className={css.field}
                label={intl.formatMessage({ id: 'SpaceLinqPricingForm.indicativeMax' })}
                currencyConfig={currencyConfig}
              />
            ) : (
              <>
                <h3 className={css.sectionHeading}>
                  <FormattedMessage id="SpaceLinqPricingForm.commitmentHeading" />
                </h3>
                <div className={css.row}>
                  <FieldTextInput
                    id={`${formId}.minTermMonths`}
                    name="minTermMonths"
                    type="number"
                    min="0"
                    className={css.field}
                    label={intl.formatMessage({ id: 'SpaceLinqPricingForm.minTermMonths' })}
                  />
                  <FieldCurrencyInput
                    placeholder="0.00"
                    id={`${formId}.minMonthlySpend`}
                    name="minMonthlySpend"
                    className={css.field}
                    label={intl.formatMessage({ id: 'SpaceLinqPricingForm.minMonthlySpend' })}
                    currencyConfig={currencyConfig}
                  />
                </div>
              </>
            )}

            {isQuote ? null : (
              <>
                <h3 className={css.sectionHeading}>
                  <FormattedMessage id="SpaceLinqPricingForm.bookingRulesHeading" />
                </h3>
                <div className={css.insurance}>
                  <FieldCheckbox
                    id={`${formId}.instantBooking`}
                    name="instantBooking"
                    value="yes"
                    label={intl.formatMessage({ id: 'SpaceLinqPricingForm.instantBooking' })}
                  />
                  <p className={css.hint}>
                    <FormattedMessage id="SpaceLinqPricingForm.instantBookingHelp" />
                  </p>
                  {isDailyOnly ? null : (
                    <FieldSelect
                      id={`${formId}.noticeDays`}
                      name="noticeDays"
                      className={css.field}
                      label={intl.formatMessage({ id: 'SpaceLinqPricingForm.noticeDays' })}
                    >
                      <option value="month">
                        {intl.formatMessage({ id: 'SpaceLinqPricingForm.notice.month' })}
                      </option>
                      <option value="14">
                        {intl.formatMessage({ id: 'SpaceLinqPricingForm.notice.14' })}
                      </option>
                      <option value="7">
                        {intl.formatMessage({ id: 'SpaceLinqPricingForm.notice.7' })}
                      </option>
                    </FieldSelect>
                  )}
                </div>
              </>
            )}

            {isDailyOnly || addOnOptions.length === 0 ? null : (
              <>
                <h3 className={css.sectionHeading}>
                  <FormattedMessage id="SpaceLinqPricingForm.addOnsHeading" />
                </h3>
                <p className={css.hint}>
                  <FormattedMessage id="SpaceLinqPricingForm.addOnsHelp" />
                </p>
                {addOnOptions.map(a => {
                  const enabled = (values.addOnKeys || []).includes(a.key);
                  return (
                    <div key={a.key} className={css.addOn}>
                      <FieldCheckbox
                        id={`${formId}.addOn.${a.key}`}
                        name="addOnKeys"
                        value={a.key}
                        label={a.label}
                      />
                      {enabled ? (
                        <FieldCurrencyInput
                          placeholder="0.00"
                          id={`${formId}.addOnPrice_${a.key}`}
                          name={`addOnPrice_${a.key}`}
                          className={css.addOnPrice}
                          label={intl.formatMessage({ id: 'SpaceLinqPricingForm.addOnPrice' })}
                          currencyConfig={currencyConfig}
                          validate={required(
                            intl.formatMessage({ id: 'SpaceLinqPricingForm.rateRequired' })
                          )}
                        />
                      ) : null}
                    </div>
                  );
                })}
              </>
            )}

            {showInsurance ? (
              <>
                <h3 className={css.sectionHeading}>
                  <FormattedMessage id="SpaceLinqPricingForm.insuranceHeading" />
                </h3>
                <p className={css.hint}>
                  <FormattedMessage id="SpaceLinqPricingForm.insuranceHelp" />
                </p>
                <div className={css.insurance}>
                  <FieldCheckbox
                    id={`${formId}.insuranceOffered`}
                    name="insuranceOffered"
                    value="yes"
                    label={intl.formatMessage({ id: 'SpaceLinqPricingForm.insuranceOffered' })}
                  />
                  {(values.insuranceOffered || []).includes('yes') ? (
                    <div className={css.insuranceFields}>
                      <FieldCurrencyInput
                        placeholder="0.00"
                        id={`${formId}.insuranceRate`}
                        name="insuranceRate"
                        className={css.insuranceField}
                        label={intl.formatMessage({ id: 'SpaceLinqPricingForm.insuranceRate' })}
                        currencyConfig={currencyConfig}
                        validate={required(
                          intl.formatMessage({ id: 'SpaceLinqPricingForm.rateRequired' })
                        )}
                      />
                      <FieldCurrencyInput
                        placeholder="0.00"
                        id={`${formId}.insuranceDgRate`}
                        name="insuranceDgRate"
                        className={css.insuranceField}
                        label={intl.formatMessage({ id: 'SpaceLinqPricingForm.insuranceDgRate' })}
                        currencyConfig={currencyConfig}
                      />
                      <FieldCurrencyInput
                        placeholder="0.00"
                        id={`${formId}.insuranceMaxValue`}
                        name="insuranceMaxValue"
                        className={css.insuranceField}
                        label={intl.formatMessage({ id: 'SpaceLinqPricingForm.insuranceMaxValue' })}
                        currencyConfig={currencyConfig}
                        validate={required(
                          intl.formatMessage({ id: 'SpaceLinqPricingForm.rateRequired' })
                        )}
                      />
                      <FieldTextInput
                        type="text"
                        id={`${formId}.insuranceExclusions`}
                        name="insuranceExclusions"
                        className={css.insuranceField}
                        maxLength={300}
                        label={intl.formatMessage({
                          id: 'SpaceLinqPricingForm.insuranceExclusions',
                        })}
                      />
                    </div>
                  ) : null}
                </div>
              </>
            ) : null}

            {showRateCard ? (
              <>
                <h3 className={css.sectionHeading}>
                  <FormattedMessage id="SpaceLinqPricingForm.rateCardHeading" />
                </h3>
                <p className={css.hint}>
                  <FormattedMessage id="SpaceLinqPricingForm.rateCardHelp" />
                </p>
                {serviceRateOptions.map(r => {
                  const enabled = (values.rateKeys || []).includes(r.key);
                  return (
                    <div key={r.key} className={css.addOn}>
                      <FieldCheckbox
                        id={`${formId}.rate.${r.key}`}
                        name="rateKeys"
                        value={r.key}
                        label={r.label}
                      />
                      {enabled ? (
                        <FieldCurrencyInput
                          placeholder="0.00"
                          id={`${formId}.ratePrice_${r.key}`}
                          name={`ratePrice_${r.key}`}
                          className={css.addOnPrice}
                          label={intl.formatMessage(
                            { id: 'SpaceLinqPricingForm.ratePrice' },
                            { unit: r.unit }
                          )}
                          currencyConfig={currencyConfig}
                          validate={required(
                            intl.formatMessage({ id: 'SpaceLinqPricingForm.rateRequired' })
                          )}
                        />
                      ) : null}
                    </div>
                  );
                })}
              </>
            ) : null}

            {updateListingError ? (
              <p className={css.error}>
                <FormattedMessage id="EditListingPricingForm.updateFailed" />
              </p>
            ) : null}
            {showListingsError ? (
              <p className={css.error}>
                <FormattedMessage id="EditListingPricingForm.showListingFailed" />
              </p>
            ) : null}

            <Button
              className={css.submitButton}
              type="submit"
              inProgress={updateInProgress}
              disabled={submitDisabled}
              ready={updated || ready}
            >
              {saveActionMsg}
            </Button>
          </Form>
        );
      }}
    />
  );
};

export default SpaceLinqPricingForm;
