import React from 'react';

import { FormattedMessage, useIntl } from '../../util/reactIntl';
import { CERTIFICATE_VERIFIED, currentCertificates } from '../../config/configSpaceLinq';
import { Heading } from '../../components';

import css from './SectionCertificatesMaybe.module.css';

/**
 * SpaceLinq: certificates and registrations held for the space. Only current
 * ones are shown. "Verified" means SpaceLinq has checked the certificate;
 * otherwise it is the provider's own statement.
 *
 * @component
 * @param {Object} props
 * @param {Object} props.publicData - listing public data
 * @param {Object} [props.metadata] - listing metadata
 * @returns {JSX.Element|null}
 */
const SectionCertificatesMaybe = props => {
  const { publicData, metadata } = props;
  const intl = useIntl();
  const certificates = currentCertificates(publicData, metadata);
  if (certificates.length === 0) {
    return null;
  }
  const formatDate = iso =>
    intl.formatDate(new Date(`${iso}T00:00:00Z`), {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      timeZone: 'UTC',
    });

  return (
    <section className={css.root}>
      <Heading as="h2" rootClassName={css.heading}>
        <FormattedMessage id="ListingPage.certificatesTitle" />
      </Heading>
      <ul className={css.list}>
        {certificates.map(c => (
          <li key={`${c.type}-${c.number}`} className={css.item}>
            <p className={css.label}>
              {c.label}
              {c.status === CERTIFICATE_VERIFIED ? (
                <span className={css.verified}>
                  <FormattedMessage id="ListingPage.certificateVerified" />
                </span>
              ) : (
                <span className={css.declared}>
                  <FormattedMessage id="ListingPage.certificateDeclared" />
                </span>
              )}
            </p>
            {c.classLabels.length > 0 ? (
              <p className={css.detail}>{c.classLabels.join(', ')}</p>
            ) : null}
            <p className={css.detail}>
              <FormattedMessage
                id="ListingPage.certificateDetail"
                values={{
                  number: c.number,
                  expiry: formatDate(c.expiry),
                  hasIssuer: c.issuer ? 'yes' : 'no',
                  issuer: c.issuer || '',
                }}
              />
            </p>
          </li>
        ))}
      </ul>
      <p className={css.note}>
        <FormattedMessage id="ListingPage.certificatesNote" />
      </p>
    </section>
  );
};

export default SectionCertificatesMaybe;
