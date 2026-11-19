import React from 'react';
import { FieldArray } from 'react-final-form-arrays';

import { FormattedMessage, useIntl } from '../../../../util/reactIntl';
import {
  CERTIFICATE_EXPIRED,
  CERTIFICATE_VERIFIED,
  MAX_CERTIFICATES,
  certificateStatus,
  certificateTypes,
  getCertificateType,
  hazardClasses,
} from '../../../../config/configSpaceLinq';
import {
  FieldCheckboxGroup,
  FieldSelect,
  FieldTextInput,
  Heading,
  InlineTextButton,
} from '../../../../components';

import css from './SpaceLinqCertificatesFields.module.css';

export const CERTIFICATES_FIELD = 'certificates';

/**
 * SpaceLinq: certificates and registrations a provider holds for the space
 * (for example a dangerous goods location compliance certificate and the
 * classes it covers). Each one shows on the listing until its expiry date, and
 * carries a "Verified" badge once SpaceLinq has checked it.
 *
 * @component
 * @param {Object} props
 * @param {string} props.formId
 * @param {Object} props.form - final-form API (needs array mutators)
 * @param {Array<Object>} [props.verified] - listing metadata.verifiedCertificates
 * @returns {JSX.Element}
 */
const SpaceLinqCertificatesFields = props => {
  const { formId, form, verified } = props;
  const intl = useIntl();
  const t = (id, values) => intl.formatMessage({ id: `SpaceLinqCertificates.${id}` }, values);

  return (
    <div className={css.root}>
      <Heading as="h3" rootClassName={css.heading}>
        <FormattedMessage id="SpaceLinqCertificates.title" />
      </Heading>
      <p className={css.help}>
        <FormattedMessage id="SpaceLinqCertificates.help" />
      </p>
      <FieldArray name={CERTIFICATES_FIELD}>
        {({ fields }) => (
          <>
            {fields.map((name, index) => {
              const row = fields.value?.[index] || {};
              const type = getCertificateType(row.type);
              const isComplete = !!type && !!row.number && !!row.expiry;
              const status = isComplete ? certificateStatus(row, verified) : null;
              return (
                <div key={name} className={css.certificate}>
                  <div className={css.certificateHeader}>
                    <span className={css.certificateTitle}>
                      {t('certificateNumber', { number: index + 1 })}
                      {status === CERTIFICATE_VERIFIED ? (
                        <span className={css.verified}>{t('verified')}</span>
                      ) : status === CERTIFICATE_EXPIRED ? (
                        <span className={css.expired}>{t('expired')}</span>
                      ) : status ? (
                        <span className={css.declared}>{t('awaitingCheck')}</span>
                      ) : null}
                    </span>
                    <InlineTextButton
                      type="button"
                      className={css.remove}
                      onClick={() => fields.remove(index)}
                    >
                      {t('remove')}
                    </InlineTextButton>
                  </div>
                  <FieldSelect
                    id={`${formId}${name}.type`}
                    name={`${name}.type`}
                    className={css.field}
                    label={t('typeLabel')}
                  >
                    <option disabled value="">
                      {t('typePlaceholder')}
                    </option>
                    {certificateTypes.map(option => (
                      <option key={option.key} value={option.key}>
                        {option.label}
                      </option>
                    ))}
                  </FieldSelect>
                  {type?.custom ? (
                    <FieldTextInput
                      id={`${formId}${name}.name`}
                      name={`${name}.name`}
                      className={css.field}
                      type="text"
                      label={t('nameLabel')}
                      placeholder={t('namePlaceholder')}
                      maxLength={60}
                    />
                  ) : null}
                  {type?.hasClasses ? (
                    <FieldCheckboxGroup
                      id={`${formId}${name}.classes`}
                      name={`${name}.classes`}
                      className={css.field}
                      label={t('classesLabel')}
                      options={hazardClasses}
                      twoColumns
                    />
                  ) : null}
                  <div className={css.row}>
                    <FieldTextInput
                      id={`${formId}${name}.number`}
                      name={`${name}.number`}
                      className={css.field}
                      type="text"
                      label={t('numberLabel')}
                      maxLength={60}
                    />
                    <FieldTextInput
                      id={`${formId}${name}.expiry`}
                      name={`${name}.expiry`}
                      className={css.field}
                      type="date"
                      label={t('expiryLabel')}
                    />
                  </div>
                  <FieldTextInput
                    id={`${formId}${name}.issuer`}
                    name={`${name}.issuer`}
                    className={css.field}
                    type="text"
                    label={t('issuerLabel')}
                    placeholder={t('issuerPlaceholder')}
                    maxLength={80}
                  />
                  {type && !isComplete ? <p className={css.incomplete}>{t('incomplete')}</p> : null}
                </div>
              );
            })}
            {(fields.length || 0) < MAX_CERTIFICATES ? (
              <InlineTextButton
                type="button"
                className={css.add}
                onClick={() => form.mutators.push(CERTIFICATES_FIELD, {})}
              >
                {t(fields.length ? 'addAnother' : 'add')}
              </InlineTextButton>
            ) : null}
          </>
        )}
      </FieldArray>
    </div>
  );
};

export default SpaceLinqCertificatesFields;
