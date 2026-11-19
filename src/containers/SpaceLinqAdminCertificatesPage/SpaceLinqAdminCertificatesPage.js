import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';

import { FormattedMessage, useIntl } from '../../util/reactIntl';
import { isScrollingDisabled } from '../../ducks/ui.duck';
import { spaceLinqAdminCertificates } from '../../util/api';
import { createSlug } from '../../util/urlHelpers';
import {
  CERTIFICATE_EXPIRED,
  CERTIFICATE_VERIFIED,
  certificateStatus,
  getCertificateType,
  hazardClasses,
} from '../../config/configSpaceLinq';
import { Heading, NamedLink, Page, LayoutSingleColumn, PrimaryButton } from '../../components';

import TopbarContainer from '../../containers/TopbarContainer/TopbarContainer';
import FooterContainer from '../../containers/FooterContainer/FooterContainer';

import css from './SpaceLinqAdminCertificatesPage.module.css';

const CONSOLE_URL = 'https://console.sharetribe.com/';

/**
 * Certificates on all listings, those still to check first.
 *
 * @param {Array<Object>} listings - rows from the admin endpoint
 * @param {Date} [now]
 * @returns {Array<Object>} one entry per certificate
 */
export const certificateEntries = (listings, now = new Date()) => {
  const order = status =>
    status === CERTIFICATE_VERIFIED ? 1 : status === CERTIFICATE_EXPIRED ? 2 : 0;
  return (listings || [])
    .flatMap(listing =>
      listing.certificates.map(certificate => ({
        listing,
        certificate,
        status: certificateStatus(certificate, listing.verified, now),
      }))
    )
    .sort((a, b) => order(a.status) - order(b.status));
};

/**
 * SpaceLinq: where the operator verifies the certificates providers have added
 * to their listings. One click records the verification on the listing, which
 * turns the listing's badge to "Verified by SpaceLinq".
 *
 * Only operators get data from the server; everyone else sees a "not available" note.
 *
 * @component
 * @returns {JSX.Element}
 */
const SpaceLinqAdminCertificatesPage = () => {
  const intl = useIntl();
  const scrollingDisabled = useSelector(state => isScrollingDisabled(state));
  const [state, setState] = useState({ loading: true });
  const [busy, setBusy] = useState(null);
  const t = (id, values) => intl.formatMessage({ id: `SpaceLinqAdminCertificates.${id}` }, values);

  const handleResponse = response =>
    setState({ loading: false, configured: response.configured, listings: response.listings });
  const handleError = e =>
    setState({ loading: false, notOperator: e?.error === 'not-operator', failed: true });

  useEffect(() => {
    spaceLinqAdminCertificates({ action: 'list' })
      .then(handleResponse)
      .catch(handleError);
  }, []);

  const change = (entry, action) => {
    const key = `${entry.listing.id}-${entry.certificate.type}-${entry.certificate.number}`;
    setBusy(key);
    return spaceLinqAdminCertificates({
      action,
      listingId: entry.listing.id,
      type: entry.certificate.type,
      number: entry.certificate.number,
    })
      .then(handleResponse)
      .catch(() => setState(s => ({ ...s, actionFailed: true })))
      .then(() => setBusy(null));
  };

  const entries = certificateEntries(state.listings);
  const formatDate = iso =>
    /^\d{4}-\d{2}-\d{2}$/.test(iso || '')
      ? intl.formatDate(new Date(`${iso}T00:00:00Z`), {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
          timeZone: 'UTC',
        })
      : iso;

  return (
    <Page title={t('title')} scrollingDisabled={scrollingDisabled}>
      <LayoutSingleColumn topbar={<TopbarContainer />} footer={<FooterContainer />}>
        <div className={css.root}>
          <Heading as="h1" rootClassName={css.title}>
            {t('title')}
          </Heading>
          {state.loading ? (
            <p>{t('loading')}</p>
          ) : state.notOperator ? (
            <p>{t('notOperator')}</p>
          ) : state.failed ? (
            <p className={css.error}>{t('failed')}</p>
          ) : !state.configured ? (
            <p className={css.notice}>{t('notConfigured')}</p>
          ) : (
            <>
              <p className={css.help}>
                <FormattedMessage
                  id="SpaceLinqAdminCertificates.help"
                  values={{
                    console: (
                      <a href={CONSOLE_URL} target="_blank" rel="noopener noreferrer">
                        Sharetribe Console
                      </a>
                    ),
                  }}
                />
              </p>
              {state.actionFailed ? <p className={css.error}>{t('actionFailed')}</p> : null}
              {entries.length === 0 ? <p>{t('none')}</p> : null}
              <ul className={css.list}>
                {entries.map(entry => {
                  const { listing, certificate, status } = entry;
                  const type = getCertificateType(certificate.type);
                  const key = `${listing.id}-${certificate.type}-${certificate.number}`;
                  const classes = hazardClasses
                    .filter(c => (certificate.classes || []).includes(c.key))
                    .map(c => c.label);
                  const isVerified = status === CERTIFICATE_VERIFIED;
                  const isExpired = status === CERTIFICATE_EXPIRED;
                  return (
                    <li key={key} className={css.item}>
                      <div className={css.details}>
                        <p className={css.label}>
                          {type?.custom && certificate.name
                            ? certificate.name
                            : type?.label || certificate.type}
                          <span
                            className={
                              isVerified ? css.verified : isExpired ? css.expired : css.toCheck
                            }
                          >
                            {t(isVerified ? 'verified' : isExpired ? 'expired' : 'toCheck')}
                          </span>
                        </p>
                        {classes.length > 0 ? (
                          <p className={css.detail}>{classes.join(', ')}</p>
                        ) : null}
                        <p className={css.detail}>
                          {t('detail', {
                            number: certificate.number,
                            expiry: formatDate(certificate.expiry),
                            hasIssuer: certificate.issuer ? 'yes' : 'no',
                            issuer: certificate.issuer || '',
                          })}
                        </p>
                        <p className={css.detail}>
                          <NamedLink
                            name="ListingPage"
                            params={{ id: listing.id, slug: createSlug(listing.title || '') }}
                          >
                            {listing.title}
                          </NamedLink>
                          {listing.provider ? ` · ${listing.provider}` : ''}
                        </p>
                      </div>
                      <div className={css.action}>
                        {isExpired ? null : isVerified ? (
                          <button
                            type="button"
                            className={css.remove}
                            disabled={!!busy}
                            onClick={() => change(entry, 'unverify')}
                          >
                            {t('unverify')}
                          </button>
                        ) : (
                          <PrimaryButton
                            type="button"
                            className={css.verify}
                            inProgress={busy === key}
                            disabled={!!busy}
                            onClick={() => change(entry, 'verify')}
                          >
                            {t('verify')}
                          </PrimaryButton>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </div>
      </LayoutSingleColumn>
    </Page>
  );
};

export default SpaceLinqAdminCertificatesPage;
