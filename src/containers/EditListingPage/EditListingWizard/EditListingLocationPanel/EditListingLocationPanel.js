import React, { useState } from 'react';
import classNames from 'classnames';

// Import configs and util modules
import { FormattedMessage } from '../../../../util/reactIntl';
import { LISTING_STATE_DRAFT } from '../../../../util/types';
import { types as sdkTypes } from '../../../../util/sdkLoader';
import { approximateCoordinates, publicAreaFromAddress } from '../../../../util/locationPrivacy';

// Import shared components
import { H3, ListingLink } from '../../../../components';

// Import modules from this directory
import EditListingLocationForm from './EditListingLocationForm';
import css from './EditListingLocationPanel.module.css';

const getInitialValues = props => {
  const { listing } = props;
  const { geolocation, publicData, privateData } = listing?.attributes || {};

  // SpaceLinq: the provider edits their exact, private location. Fall back to
  // public data for listings created before location privacy was added.
  const exactLocation = privateData?.exactLocation;
  const address = exactLocation?.address || publicData?.location?.address;
  const building = exactLocation?.building || publicData?.location?.building;
  const origin = exactLocation?.lat
    ? new sdkTypes.LatLng(exactLocation.lat, exactLocation.lng)
    : geolocation;

  // Only render current search if full place object is available in the URL params
  // TODO bounds are missing - those need to be queried directly from Google Places
  const locationFieldsPresent = address && origin;

  return {
    building,
    siteNotes: exactLocation?.siteNotes,
    location: locationFieldsPresent
      ? {
          search: address,
          selectedPlace: { address, origin },
        }
      : null,
  };
};

/**
 * The EditListingLocationPanel component.
 *
 * @component
 * @param {Object} props
 * @param {string} [props.className] - Custom class that extends the default class for the root element
 * @param {string} [props.rootClassName] - Custom class that overrides the default class for the root element
 * @param {propTypes.ownListing} props.listing - The listing object
 * @param {boolean} props.disabled - Whether the form is disabled
 * @param {boolean} props.ready - Whether the form is ready
 * @param {Function} props.onSubmit - The submit function
 * @param {string} props.submitButtonText - The submit button text
 * @param {boolean} props.panelUpdated - Whether the panel is updated
 * @param {boolean} props.updateInProgress - Whether the update is in progress
 * @param {Object} props.errors - The errors object
 * @returns {JSX.Element}
 */
const EditListingLocationPanel = props => {
  // State is needed since LocationAutocompleteInput doesn't have internal state
  // and therefore re-rendering would overwrite the values during XHR call.
  const [state, setState] = useState({ initialValues: getInitialValues(props) });
  const {
    className,
    rootClassName,
    listing,
    disabled,
    ready,
    onSubmit,
    submitButtonText,
    panelUpdated,
    updateInProgress,
    errors,
    updatePageTitle: UpdatePageTitle,
    intl,
  } = props;

  const classes = classNames(rootClassName || css.root, className);
  const isPublished = listing?.id && listing?.attributes.state !== LISTING_STATE_DRAFT;

  const panelHeadingProps = isPublished
    ? {
        id: 'EditListingLocationPanel.title',
        values: { listingTitle: <ListingLink listing={listing} />, lineBreak: <br /> },
        messageProps: { listingTitle: listing.attributes.title },
      }
    : {
        id: 'EditListingLocationPanel.createListingTitle',
        values: { lineBreak: <br /> },
        messageProps: {},
      };

  return (
    <main className={classes}>
      <UpdatePageTitle
        panelHeading={intl.formatMessage(
          { id: panelHeadingProps.id },
          { ...panelHeadingProps.messageProps }
        )}
      />
      <H3 as="h1">
        <FormattedMessage id={panelHeadingProps.id} values={{ ...panelHeadingProps.values }} />
      </H3>
      <EditListingLocationForm
        className={css.form}
        initialValues={state.initialValues}
        onSubmit={values => {
          const { building = '', siteNotes = '', location } = values;
          const {
            selectedPlace: { address, origin },
          } = location;

          // SpaceLinq unlock model: only the area and an approximate pin are public.
          // The exact address, unit and site notes are private to the provider and
          // are shared with the customer once a booking is accepted.
          const approx = approximateCoordinates(origin);
          const publicGeolocation = approx
            ? new sdkTypes.LatLng(approx.lat, approx.lng)
            : origin;

          // New values for listing attributes
          const updateValues = {
            geolocation: publicGeolocation,
            publicData: {
              location: { address: publicAreaFromAddress(address) },
            },
            privateData: {
              exactLocation: {
                address,
                building,
                siteNotes,
                lat: origin?.lat,
                lng: origin?.lng,
              },
            },
          };
          // Save the initialValues to state
          // LocationAutocompleteInput doesn't have internal state
          // and therefore re-rendering would overwrite the values during XHR call.
          setState({
            initialValues: {
              building,
              siteNotes,
              location: { search: address, selectedPlace: { address, origin } },
            },
          });
          onSubmit(updateValues);
        }}
        saveActionMsg={submitButtonText}
        disabled={disabled}
        ready={ready}
        updated={panelUpdated}
        updateInProgress={updateInProgress}
        fetchErrors={errors}
        autoFocus
      />
    </main>
  );
};

export default EditListingLocationPanel;
