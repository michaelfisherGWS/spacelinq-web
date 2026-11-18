import React from 'react';
import { Form as FinalForm, Field } from 'react-final-form';
import classNames from 'classnames';

// Import configs and util modules
import { FormattedMessage, useIntl } from '../../../../util/reactIntl';
import { storageUnitsForListingType, getStorageUnit } from '../../../../config/configSpaceLinq';
import { required } from '../../../../util/validators';
import { maskContactDetails } from '../../../../util/contactMasking';

// Import shared components
import {
  Button,
  Form,
  FieldTextInput,
  ListingCardThumbnail,
  H5,
  NamedLink,
  StorageUnitIcon,
} from '../../../../components';

// Import modules from this directory
import css from './EditListingStorageUnitForm.module.css';

const DIMENSION_FIELDS = ['length', 'width', 'height', 'maxWeight'];

const numberOrNull = value => {
  const n = Number(value);
  return value === '' || value === undefined || value === null || Number.isNaN(n) ? null : n;
};

/**
 * Turn form values into the publicData saved on the listing.
 *
 * @param {Object} values - form values
 * @returns {Object} publicData update
 */
export const storageUnitFormValuesToPublicData = values => {
  const { storageUnit, customSpaceType, ...rest } = values;
  const isCustom = getStorageUnit(storageUnit)?.custom === true;
  // The provider's own name for a space that fits no standard option
  const customName = isCustom ? maskContactDetails(`${customSpaceType || ''}`.trim()).text : '';
  const dimensions = DIMENSION_FIELDS.reduce((acc, key) => {
    acc[key] = numberOrNull(rest[key]);
    return acc;
  }, {});
  return {
    storageUnit,
    storageUnitDimensions: dimensions,
    customSpaceType: customName ? customName.slice(0, 40) : null,
    cardStyle: 'grey',
  };
};

/**
 * Initial values from the listing (or the option's defaults).
 *
 * @param {Object} publicData - listing publicData
 * @returns {Object}
 */
export const storageUnitInitialValues = publicData => {
  const { storageUnit, storageUnitDimensions, customSpaceType } = publicData || {};
  const unit = getStorageUnit(storageUnit);
  const dims = storageUnitDimensions || unit?.dimensions || {};
  return {
    storageUnit,
    customSpaceType: customSpaceType || '',
    ...DIMENSION_FIELDS.reduce((acc, key) => {
      acc[key] = dims[key] ?? '';
      return acc;
    }, {}),
  };
};

const StorageUnitOption = props => {
  const { unit, formId, input } = props;
  const id = `${formId}.storageUnit.${unit.key}`;
  const checked = input.value === unit.key;
  return (
    <label htmlFor={id} className={classNames(css.option, { [css.optionSelected]: checked })}>
      <input
        id={id}
        type="radio"
        className={css.optionInput}
        name={input.name}
        value={unit.key}
        checked={checked}
        onChange={() => input.onChange(unit.key)}
      />
      <StorageUnitIcon icon={unit.icon} className={css.optionIcon} />
      <span className={css.optionLabel}>{unit.label}</span>
      <span className={css.optionDescription}>{unit.description}</span>
    </label>
  );
};

/**
 * Form where providers pick a standard storage option (icon, dimensions, description)
 * instead of uploading photos.
 *
 * @component
 * @param {Object} props
 * @param {string} props.listingType - SpaceLinq listing type id
 * @param {string} [props.spaceCategory] - space category key, limits the options offered
 * @param {string} props.listingTitle - listing title for the preview
 * @returns {JSX.Element}
 */
const EditListingStorageUnitForm = props => {
  const intl = useIntl();
  const { listingType, spaceCategory, listingTitle } = props;
  const units = storageUnitsForListingType(listingType, spaceCategory);

  return (
    <FinalForm
      {...props}
      render={formRenderProps => {
        const {
          formId = 'EditListingStorageUnitForm',
          form,
          className,
          disabled,
          fetchErrors,
          handleSubmit,
          ready,
          saveActionMsg,
          updated,
          updateInProgress,
          values,
          invalid,
          allFilesUploadedAndVerified,
          filesTabParams,
          filesRequired,
        } = formRenderProps;
        const { publishListingError, updateListingError } = fetchErrors || {};
        const submitDisabled = disabled || updateInProgress || invalid;

        const onSelectUnit = key => {
          // Pre-fill the standard dimensions when an option is chosen
          const unit = getStorageUnit(key);
          form.batch(() => {
            form.change('storageUnit', key);
            DIMENSION_FIELDS.forEach(field => form.change(field, unit?.dimensions?.[field] ?? ''));
          });
        };

        return (
          <Form className={classNames(css.root, className)} onSubmit={handleSubmit}>
            <Field
              name="storageUnit"
              validate={required(
                intl.formatMessage({ id: 'EditListingStorageUnitForm.storageUnitRequired' })
              )}
            >
              {({ input, meta }) => (
                <fieldset className={css.options}>
                  <legend className={css.legend}>
                    <FormattedMessage id="EditListingStorageUnitForm.chooseOption" />
                  </legend>
                  {units.map(unit => (
                    <StorageUnitOption
                      key={unit.key}
                      unit={unit}
                      formId={formId}
                      input={{ ...input, onChange: onSelectUnit }}
                    />
                  ))}
                  {meta.touched && meta.error ? <p className={css.error}>{meta.error}</p> : null}
                </fieldset>
              )}
            </Field>

            {getStorageUnit(values.storageUnit)?.custom ? (
              <FieldTextInput
                className={css.customSpaceType}
                type="text"
                name="customSpaceType"
                id={`${formId}.customSpaceType`}
                maxLength={40}
                label={intl.formatMessage({ id: 'EditListingStorageUnitForm.customSpaceType' })}
                placeholder={intl.formatMessage({
                  id: 'EditListingStorageUnitForm.customSpaceTypePlaceholder',
                })}
                validate={required(
                  intl.formatMessage({ id: 'EditListingStorageUnitForm.customSpaceTypeRequired' })
                )}
              />
            ) : null}

            {values.storageUnit ? (
              <>
                <H5 as="h2" className={css.dimensionsHeading}>
                  <FormattedMessage id="EditListingStorageUnitForm.dimensionsHeading" />
                </H5>
                <p className={css.help}>
                  <FormattedMessage id="EditListingStorageUnitForm.dimensionsHelp" />
                </p>
                <div className={css.dimensions}>
                  {DIMENSION_FIELDS.map(field => (
                    <FieldTextInput
                      key={field}
                      className={css.dimensionField}
                      type="number"
                      min="0"
                      name={field}
                      id={`${formId}.${field}`}
                      label={intl.formatMessage({
                        id: `EditListingStorageUnitForm.${field}`,
                      })}
                    />
                  ))}
                </div>

                <H5 as="h2" className={css.previewHeading}>
                  <FormattedMessage id="EditListingStyleForm.preview" />
                </H5>
                <ListingCardThumbnail
                  width={366}
                  height={275}
                  style="grey"
                  storageUnit={values.storageUnit}
                  listingTitle={listingTitle}
                  className={css.preview}
                />
              </>
            ) : null}

            <div className={css.submitSection}>
              {publishListingError ? (
                <p className={css.error}>
                  <FormattedMessage id="EditListingStyleForm.publishListingFailed" />
                </p>
              ) : null}
              {updateListingError ? (
                <p className={css.error}>
                  <FormattedMessage id="EditListingStyleForm.updateFailed" />
                </p>
              ) : null}
              {filesRequired && !allFilesUploadedAndVerified ? (
                <p className={css.error}>
                  <FormattedMessage
                    id="EditListingStyleForm.filesNotReady"
                    values={{
                      filesTabLink: (
                        <NamedLink name="EditListingPage" params={filesTabParams}>
                          <FormattedMessage id="EditListingStyleForm.filesTabLinkText" />
                        </NamedLink>
                      ),
                    }}
                  />
                </p>
              ) : null}
              <Button
                className={css.submitButton}
                inProgress={updateInProgress}
                ready={updated || ready}
                disabled={submitDisabled}
                type="submit"
              >
                {saveActionMsg}
              </Button>
            </div>
          </Form>
        );
      }}
    />
  );
};

export default EditListingStorageUnitForm;
