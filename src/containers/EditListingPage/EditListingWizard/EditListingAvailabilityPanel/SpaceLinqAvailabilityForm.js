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

// A listing can have a few regular blocked periods, e.g. working hours and Saturday mornings
export const MAX_BLOCKED_PERIODS = 3;
const DEFAULT_BLOCK = { days: ['mon', 'tue', 'wed', 'thu', 'fri'], from: '08:00', to: '17:00' };

/**
 * All of a listing's regular blocked periods, checked and tidied.
 * Accepts the single period saved by earlier versions.
 *
 * @param {Array<Object>|Object} [blocked] - publicData.blockedHours
 * @returns {Array<Object>} valid periods, at most MAX_BLOCKED_PERIODS
 */
export const validBlockedPeriods = blocked =>
  (Array.isArray(blocked) ? blocked : blocked ? [blocked] : [])
    .map(validBlockedHours)
    .filter(Boolean)
    .slice(0, MAX_BLOCKED_PERIODS);

const hourOf = time => Number(time.slice(0, 2));

/**
 * Build an every-day availability plan with the given capacity.
 * Storage is continuous, so every day is bookable all day; access hours are
 * stored separately as information for customers. Space booked by the hour
 * can leave out regular blocked periods on chosen weekdays.
 *
 * @param {number} capacity - pallet positions / m² / spaces / 1 for a whole space
 * @param {string} timezone
 * @param {Array<Object>|Object} [blockedHours] - blocked periods ({ days, from, to })
 * @returns {Object} availabilityPlan
 */
export const createSpaceLinqAvailabilityPlan = (capacity, timezone, blockedHours) => {
  const seats = Math.max(1, Math.floor(capacity || 1));
  const blocks = validBlockedPeriods(blockedHours);
  const entriesForDay = dayOfWeek => {
    const dayBlocks = blocks.filter(b => b.days.includes(dayOfWeek));
    // Which of the day's 24 hours can be booked
    const open = Array.from(
      { length: 24 },
      (_, h) => !dayBlocks.some(b => hourOf(b.from) <= h && h < hourOf(b.to))
    );
    // Runs of open hours become plan entries. An end time of 00:00 is midnight.
    return open.reduce((entries, isOpen, h) => {
      if (!isOpen) {
        return entries;
      }
      const last = entries[entries.length - 1];
      const endTime = h === 23 ? '00:00' : `${pad(h + 1)}:00`;
      return last && last.endHour === h
        ? [...entries.slice(0, -1), { ...last, endTime, endHour: h + 1 }]
        : [...entries, { dayOfWeek, startTime: `${pad(h)}:00`, endTime, seats, endHour: h + 1 }];
    }, []);
  };
  return {
    type: 'availability-plan/time',
    timezone: timezone || SPACELINQ_DEFAULT_TIMEZONE,
    entries: WEEKDAYS.flatMap(entriesForDay).map(({ endHour, ...entry }) => entry),
  };
};

/**
 * Form values for the blocked-period fields from saved listing data.
 *
 * @param {Array<Object>|Object} [blockedHours] - publicData.blockedHours
 * @returns {Object} { blockMode, blocks }
 */
export const blockedHoursToFormValues = blockedHours => {
  const blocks = validBlockedPeriods(blockedHours);
  return {
    blockMode: blocks.length ? 'block' : 'any',
    blocks: blocks.length ? blocks : [DEFAULT_BLOCK],
  };
};

// Space booked by the day is blocked for the whole day, in a single period
const blocksInForm = (values, wholeDays) =>
  wholeDays
    ? (values?.blocks || []).slice(0, 1).map(b => ({ ...b, from: '00:00', to: '24:00' }))
    : values?.blocks || [];

/**
 * Whether every blocked period on the form is complete.
 *
 * @param {Object} values - form values
 * @param {boolean} [wholeDays] - block the chosen days entirely
 * @returns {boolean}
 */
export const areBlockedPeriodsValid = (values, wholeDays = false) => {
  const blocks = blocksInForm(values, wholeDays);
  return blocks.length > 0 && blocks.every(b => !!validBlockedHours(b));
};

/**
 * Blocked periods to save, from form values.
 *
 * @param {Object} values - form values
 * @param {boolean} [wholeDays] - block the chosen days entirely
 * @returns {Array<Object>|null}
 */
export const blockedHoursFromFormValues = (values, wholeDays = false) => {
  if (values?.blockMode !== 'block') {
    return null;
  }
  const blocks = validBlockedPeriods(blocksInForm(values, wholeDays));
  return blocks.length ? blocks : null;
};

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
        canBlock && values.blockMode === 'block' && !areBlockedPeriodsValid(values, !isHourly)
          ? { blockMode: intl.formatMessage({ id: 'SpaceLinqAvailabilityForm.blockInvalid' }) }
          : {}
      }
      render={({ handleSubmit, className, inProgress, invalid, saved, values, errors, form }) => (
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
          {['per-unit', 'per-space'].includes(model) ? (
            <p className={css.info}>
              <FormattedMessage id="SpaceLinqAvailabilityForm.capacityHelp" />
            </p>
          ) : null}
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
              {values.blockMode === 'block'
                ? (isHourly ? values.blocks || [] : (values.blocks || []).slice(0, 1)).map(
                    (block, i, shown) => (
                      <fieldset key={i} className={css.block}>
                        <legend className={css.blockLegend}>
                          <FormattedMessage id="SpaceLinqAvailabilityForm.blockDays" />
                        </legend>
                        <div className={css.days}>
                          {BLOCK_DAYS.map(day => (
                            <label key={day} className={css.day}>
                              <Field
                                name={`blocks[${i}].days`}
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
                              id={`SpaceLinqAvailabilityForm.blockFrom${i}`}
                              name={`blocks[${i}].from`}
                              className={css.hour}
                              label={intl.formatMessage({
                                id: 'SpaceLinqAvailabilityForm.blockFrom',
                              })}
                            >
                              {BLOCK_FROM_HOURS.map(h => (
                                <option key={h} value={h}>
                                  {h}
                                </option>
                              ))}
                            </FieldSelect>
                            <FieldSelect
                              id={`SpaceLinqAvailabilityForm.blockTo${i}`}
                              name={`blocks[${i}].to`}
                              className={css.hour}
                              label={intl.formatMessage({
                                id: 'SpaceLinqAvailabilityForm.blockTo',
                              })}
                            >
                              {BLOCK_TO_HOURS.map(h => (
                                <option key={h} value={h}>
                                  {h}
                                </option>
                              ))}
                            </FieldSelect>
                          </div>
                        ) : null}
                        {isHourly && shown.length > 1 ? (
                          <button
                            type="button"
                            className={css.blockAction}
                            onClick={() =>
                              form.change('blocks', shown.filter((_, index) => index !== i))
                            }
                          >
                            <FormattedMessage id="SpaceLinqAvailabilityForm.removeBlock" />
                          </button>
                        ) : null}
                      </fieldset>
                    )
                  )
                : null}
              {values.blockMode === 'block' &&
              isHourly &&
              (values.blocks || []).length < MAX_BLOCKED_PERIODS ? (
                <button
                  type="button"
                  className={css.blockAction}
                  onClick={() =>
                    form.change('blocks', [
                      ...(values.blocks || []),
                      { days: ['sat'], from: '08:00', to: '12:00' },
                    ])
                  }
                >
                  <FormattedMessage id="SpaceLinqAvailabilityForm.addBlock" />
                </button>
              ) : null}
              {values.blockMode === 'block' && errors?.blockMode ? (
                <p className={css.error}>{errors.blockMode}</p>
              ) : null}
            </>
          ) : null}
          <p className={css.info}>
            <FormattedMessage
              id={
                isHourly
                  ? 'SpaceLinqAvailabilityForm.hourlyInfo'
                  : canBlock
                  ? 'SpaceLinqAvailabilityForm.dayOnlyInfo'
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
