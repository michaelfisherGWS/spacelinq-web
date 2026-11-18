import React from 'react';
import { Form as FinalForm, Field } from 'react-final-form';
import classNames from 'classnames';

import { FormattedMessage, useIntl } from '../../../../util/reactIntl';
import {
  pricingModels,
  defaultPricingModelForListingType,
} from '../../../../config/configSpaceLinq';
import { Button, Form, FieldSelect, FieldTextInput } from '../../../../components';

import css from './SpaceLinqAvailabilityForm.module.css';

const WEEKDAYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
export const SPACELINQ_DEFAULT_TIMEZONE = 'Pacific/Auckland';

// Hours a regular block can start (00:00-23:00) and end (01:00-24:00)
const pad = n => `${n}`.padStart(2, '0');
export const BLOCK_FROM_HOURS = Array.from({ length: 24 }, (_, i) => `${pad(i)}:00`);
export const BLOCK_TO_HOURS = Array.from({ length: 24 }, (_, i) => `${pad(i + 1)}:00`);
// Weekdays in the order they are shown to the provider
export const BLOCK_DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

/**
 * A provider's regular blocked hours, checked and tidied: the same hours on
 * each chosen weekday when the space cannot be booked (for example while the
 * provider uses it themselves).
 *
 * @param {Object} [block] - { days: ['mon', ...], from: '08:00', to: '17:00' }
 * @returns {Object|null} the valid block, or null when there is none
 */
export const validBlockedHours = block => {
  const days = BLOCK_DAYS.filter(d => (block?.days || []).includes(d));
  const isValid =
    days.length > 0 &&
    BLOCK_FROM_HOURS.includes(block?.from) &&
    BLOCK_TO_HOURS.includes(block?.to) &&
    block.from < block.to;
  return isValid ? { days, from: block.from, to: block.to } : null;
};

/**
 * Build an every-day availability plan with the given capacity.
 * Storage is continuous, so every day is bookable all day; access hours are
 * stored separately as information for customers. Space booked by the hour
 * can leave out regular blocked hours on chosen weekdays.
 *
 * @param {number} capacity - pallet positions / m² / spaces / 1 for a whole space
 * @param {string} timezone
 * @param {Object} [blockedHours] - { days, from, to }, for hourly listings only
 * @returns {Object} availabilityPlan
 */
export const createSpaceLinqAvailabilityPlan = (capacity, timezone, blockedHours) => {
  const seats = Math.max(1, Math.floor(capacity || 1));
  const block = validBlockedHours(blockedHours);
  const entriesForDay = dayOfWeek => {
    if (!block || !block.days.includes(dayOfWeek)) {
      return [{ dayOfWeek, startTime: '00:00', endTime: '00:00', seats }];
    }
    // Bookable before the block starts and after it ends. An end time of 00:00 is midnight.
    const before =
      block.from !== '00:00' ? [{ dayOfWeek, startTime: '00:00', endTime: block.from, seats }] : [];
    const after =
      block.to !== '24:00' ? [{ dayOfWeek, startTime: block.to, endTime: '00:00', seats }] : [];
    return [...before, ...after];
  };
  return {
    type: 'availability-plan/time',
    timezone: timezone || SPACELINQ_DEFAULT_TIMEZONE,
    entries: WEEKDAYS.flatMap(entriesForDay),
  };
};

/**
 * Form values for the blocked-hours fields from saved listing data.
 *
 * @param {Object} [blockedHours] - publicData.blockedHours
 * @returns {Object} { blockMode, blockDays, blockFrom, blockTo }
 */
export const blockedHoursToFormValues = blockedHours => {
  const block = validBlockedHours(blockedHours);
  return {
    blockMode: block ? 'block' : 'any',
    blockDays: block ? block.days : ['mon', 'tue', 'wed', 'thu', 'fri'],
    blockFrom: block ? block.from : '08:00',
    blockTo: block ? block.to : '17:00',
  };
};

/**
 * Blocked hours to save, from form values.
 *
 * @param {Object} values - form values
 * @param {boolean} [wholeDays] - block the chosen days entirely
 * @returns {Object|null}
 */
export const blockedHoursFromFormValues = (values, wholeDays = false) =>
  values?.blockMode === 'block'
    ? validBlockedHours({
        days: values.blockDays,
        // Space booked by the day is blocked for the whole day
        from: wholeDays ? '00:00' : values.blockFrom,
        to: wholeDays ? '24:00' : values.blockTo,
      })
    : null;

/**
 * Current capacity from an existing plan (largest seat count).
 *
 * @param {Object} availabilityPlan
 * @returns {number|null}
 */
export const capacityFromPlan = availabilityPlan => {
  const seats = (availabilityPlan?.entries || []).map(e => e.seats || 0);
  return seats.length ? Math.max(...seats) : null;
};

/**
 * Simple availability setup for SpaceLinq listings: capacity, time zone and
 * access hours. Generates the Sharetribe availability plan automatically.
 *
 * @component
 */
const SpaceLinqAvailabilityForm = props => {
  const intl = useIntl();
  // blockKind: 'hours' for space booked by the hour, 'days' for space booked by the day only
  const { listingType, pricingModel, blockKind } = props;
  const isHourly = blockKind === 'hours';
  const canBlock = ['hours', 'days'].includes(blockKind);
  const model = pricingModel || defaultPricingModelForListingType[listingType];
  const capacityLabel = pricingModels[model]?.capacityLabel;
  const isWholeSpace = !capacityLabel;

  return (
    <FinalForm
      {...props}
      // The parent builds initial values on each render; compare them by content
      initialValuesEqual={(a, b) => JSON.stringify(a) === JSON.stringify(b)}
      validate={values =>
        canBlock && values.blockMode === 'block' && !blockedHoursFromFormValues(values, !isHourly)
          ? { blockMode: intl.formatMessage({ id: 'SpaceLinqAvailabilityForm.blockInvalid' }) }
          : {}
      }
      render={({ handleSubmit, className, inProgress, invalid, saved, values, errors }) => (
        <Form className={classNames(css.root, className)} onSubmit={handleSubmit}>
          {isWholeSpace ? (
            <p className={css.info}>
              <FormattedMessage id="SpaceLinqAvailabilityForm.wholeSpaceInfo" />
            </p>
          ) : (
            <FieldTextInput
              id="SpaceLinqAvailabilityForm.capacity"
              name="capacity"
              type="number"
              min="1"
              className={css.field}
              label={capacityLabel}
              validate={value =>
                Number(value) >= 1
                  ? undefined
                  : intl.formatMessage({ id: 'SpaceLinqAvailabilityForm.capacityRequired' })
              }
            />
          )}
          <FieldTextInput
            id="SpaceLinqAvailabilityForm.accessHours"
            name="accessHours"
            type="text"
            className={css.field}
            label={intl.formatMessage({ id: 'SpaceLinqAvailabilityForm.accessHours' })}
            placeholder={intl.formatMessage({
              id: 'SpaceLinqAvailabilityForm.accessHoursPlaceholder',
            })}
          />
          {canBlock ? (
            <>
              <FieldSelect
                id="SpaceLinqAvailabilityForm.blockMode"
                name="blockMode"
                className={css.field}
                label={intl.formatMessage({ id: 'SpaceLinqAvailabilityForm.blockMode' })}
              >
                <option value="any">
                  {intl.formatMessage({
                    id: isHourly
                      ? 'SpaceLinqAvailabilityForm.blockMode.any'
                      : 'SpaceLinqAvailabilityForm.blockMode.anyDay',
                  })}
                </option>
                <option value="block">
                  {intl.formatMessage({
                    id: isHourly
                      ? 'SpaceLinqAvailabilityForm.blockMode.block'
                      : 'SpaceLinqAvailabilityForm.blockMode.blockDays',
                  })}
                </option>
              </FieldSelect>
              {values.blockMode === 'block' ? (
                <fieldset className={css.block}>
                  <legend className={css.blockLegend}>
                    <FormattedMessage id="SpaceLinqAvailabilityForm.blockDays" />
                  </legend>
                  <div className={css.days}>
                    {BLOCK_DAYS.map(day => (
                      <label key={day} className={css.day}>
                        <Field
                          name="blockDays"
                          component="input"
                          type="checkbox"
                          value={day}
                          className={css.checkbox}
                        />
                        <span>
                          <FormattedMessage id={`SpaceLinqAvailabilityForm.day.${day}`} />
                        </span>
                      </label>
                    ))}
                  </div>
                  {isHourly ? (
                    <div className={css.hours}>
                      <FieldSelect
                        id="SpaceLinqAvailabilityForm.blockFrom"
                        name="blockFrom"
                        className={css.hour}
                        label={intl.formatMessage({ id: 'SpaceLinqAvailabilityForm.blockFrom' })}
                      >
                        {BLOCK_FROM_HOURS.map(h => (
                          <option key={h} value={h}>
                            {h}
                          </option>
                        ))}
                      </FieldSelect>
                      <FieldSelect
                        id="SpaceLinqAvailabilityForm.blockTo"
                        name="blockTo"
                        className={css.hour}
                        label={intl.formatMessage({ id: 'SpaceLinqAvailabilityForm.blockTo' })}
                      >
                        {BLOCK_TO_HOURS.map(h => (
                          <option key={h} value={h}>
                            {h}
                          </option>
                        ))}
                      </FieldSelect>
                    </div>
                  ) : null}
                  {errors?.blockMode ? <p className={css.error}>{errors.blockMode}</p> : null}
                </fieldset>
              ) : null}
            </>
          ) : null}
          <p className={css.info}>
            <FormattedMessage
              id={
                isHourly
                  ? 'SpaceLinqAvailabilityForm.hourlyInfo'
                  : 'SpaceLinqAvailabilityForm.everyDayInfo'
              }
            />
          </p>
          <Button
            className={css.submitButton}
            type="submit"
            inProgress={inProgress}
            disabled={invalid || inProgress}
            ready={saved}
          >
            <FormattedMessage id="SpaceLinqAvailabilityForm.save" />
          </Button>
        </Form>
      )}
    />
  );
};

export default SpaceLinqAvailabilityForm;
