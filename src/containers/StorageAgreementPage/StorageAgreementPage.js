import React from 'react';
import { useSelector } from 'react-redux';

import { FormattedMessage, useIntl } from '../../util/reactIntl';
import { isScrollingDisabled } from '../../ducks/ui.duck';
import { storageAgreement } from '../../config/configSpaceLinq';
import { Heading, Page, LayoutSingleColumn } from '../../components';

import TopbarContainer from '../../containers/TopbarContainer/TopbarContainer';
import FooterContainer from '../../containers/FooterContainer/FooterContainer';

import css from './StorageAgreementPage.module.css';

/**
 * SpaceLinq: the standard storage agreement between a customer and a provider.
 * Customers accept it at checkout; the accepted version is recorded on the booking.
 *
 * @component
 * @returns {JSX.Element}
 */
const StorageAgreementPage = () => {
  const intl = useIntl();
  const scrollingDisabled = useSelector(state => isScrollingDisabled(state));
  const { title, intro, sections, version, isDraft } = storageAgreement;

  return (
    <Page title={title} scrollingDisabled={scrollingDisabled}>
      <LayoutSingleColumn topbar={<TopbarContainer />} footer={<FooterContainer />}>
        <div className={css.root}>
          <Heading as="h1" rootClassName={css.title}>
            {title}
          </Heading>
          <p className={css.version}>
            {intl.formatMessage({ id: 'StorageAgreementPage.version' }, { version })}
          </p>
          {isDraft ? (
            <p className={css.draft}>
              <FormattedMessage id="StorageAgreementPage.draft" />
            </p>
          ) : null}
          <p className={css.intro}>{intro}</p>
          {sections.map(section => (
            <section key={section.title}>
              <Heading as="h2" rootClassName={css.sectionTitle}>
                {section.title}
              </Heading>
              <p className={css.body}>{section.body}</p>
            </section>
          ))}
        </div>
      </LayoutSingleColumn>
    </Page>
  );
};

export default StorageAgreementPage;
