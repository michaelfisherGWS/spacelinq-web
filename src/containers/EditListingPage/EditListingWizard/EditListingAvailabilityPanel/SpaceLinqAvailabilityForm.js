import React from 'react';
import { Form as FinalForm } from 'react-final-form';
import classNames from 'classnames';

import { FormattedMessage, useIntl } from '../../../../util/reactIntl';
import {
  pricingModels,
  defaultPricingModelForListingType,
} from '../../../../config/configSpaceLinq';
import { Button, Form, FieldTextInput } from '../../../../components';

import css from './SpaceLinqAvailabilityForm.module.css';

const WEEKDAYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
export const SPACELINQ_DEFAULT_TIMEZONE = 'Pacific/Auckland';

/**
 * Build a full-day, every-day availability plan with the given capacity.
 * Storage is continuous, so every day must be bookable; access hours are
 * stored separately as information for customers.
 *
 * @param {number} capacity - pallet positions / m² / 1 for a whole space
 * @param {string} timezone
 * @returns {Object} availabilityPlan
 */
export const createSpaceLinqAvailabilityPlan = (capacity, timezone) => ({
  type: 'availability-plan/time',
  timezone: timezone || SPACELINQ_DEFAULT_TIMEZONE,
  entries: WEEKDAYS.map(dayOfWeek => ({
    dayOfWeek,
    startTime: '00:00',
    endTime: '00:00',
    seats: Math.max(1, Math.floor(capacity || 1)),
  })),
});

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
  const { listingType, pricingModel } = props;
  const model = pricingModel || defaultPricingModelForListingType[listingType];
  const capacityLabel = pricingModels[model]?.capacityLabel;
  const isWholeSpace = !capacityLabel;

  return (
    <FinalForm
      {...props}
      render={({ handleSubmit, className, inProgress, invalid, saved }) => (
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
          <p className={css.info}>
            <FormattedMessage id="SpaceLinqAvailabilityForm.everyDayInfo" />
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
