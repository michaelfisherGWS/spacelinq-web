import React from 'react';
import { intlShape } from '../../util/reactIntl';
import { formatMoney } from '../../util/currency';
import { humanizeLineItemCode } from '../../util/data';
import { LINE_ITEMS, propTypes } from '../../util/types';
import {
  addOns as spaceLinqAddOns,
  serviceRates as spaceLinqServiceRates,
} from '../../config/configSpaceLinq';

import css from './OrderBreakdown.module.css';

/**
 * Renders non-reversal line items that are not listed in the
 * `LINE_ITEMS` array in util/types.js
 *
 * The line items are rendered so that the line item code is formatted to human
 * readable form and the line total is printed as price.
 *
 * If you require another kind of presentation for your line items, add them to
 * the `LINE_ITEMS` array in util/types.js and create a specific line item
 * component for them that can be used in the `OrderBreakdown` component.
 *
 * @component
 * @param {Object} props
 * @param {Array<propTypes.lineItem>} props.lineItems - The line items to render
 * @param {boolean} props.isProvider - Whether the provider is the one receiving the commission
 * @param {intlShape} props.intl - The intl object
 * @returns {JSX.Element}
 */
// SpaceLinq: show optional services by their own name, e.g. "WMS / inventory management"
const ADDON_CODE_PREFIX = 'line-item/addon-';
const SERVICE_CODE_PREFIX = 'line-item/service-';
const SERVICE_LABELS = {
  'line-item/service-other': 'Other service charge',
  'line-item/service-commission': 'SpaceLinq fee on services',
};
const lineItemLabel = code => {
  if (SERVICE_LABELS[code]) {
    return SERVICE_LABELS[code];
  }
  if (code && code.startsWith(SERVICE_CODE_PREFIX)) {
    const rate = spaceLinqServiceRates.find(r => r.key === code.slice(SERVICE_CODE_PREFIX.length));
    if (rate) {
      return rate.label;
    }
  }
  if (code && code.startsWith(ADDON_CODE_PREFIX)) {
    const key = code.slice(ADDON_CODE_PREFIX.length);
    const addOn = spaceLinqAddOns.find(a => a.key === key);
    if (addOn) {
      return addOn.label;
    }
  }
  return humanizeLineItemCode(code);
};

const LineItemUnknownItemsMaybe = props => {
  const { lineItems, isProvider, intl } = props;

  // resolve unknown non-reversal line items
  const allItems = lineItems.filter(item => LINE_ITEMS.indexOf(item.code) === -1 && !item.reversal);

  const items = isProvider
    ? allItems.filter(item => item.includeFor.includes('provider'))
    : allItems.filter(item => item.includeFor.includes('customer'));

  return items.length > 0 ? (
    <React.Fragment>
      {items.map((item, i) => {
        const quantity = item.quantity;

        const label =
          quantity && quantity > 1
            ? `${lineItemLabel(item.code)} x ${quantity}`
            : lineItemLabel(item.code);

        const formattedTotal = formatMoney(intl, item.lineTotal);
        return (
          <div key={`${i}-item.code`} className={css.lineItem}>
            <span className={css.itemLabel}>{label}</span>
            <span className={css.itemValue}>{formattedTotal}</span>
          </div>
        );
      })}
    </React.Fragment>
  ) : null;
};

export default LineItemUnknownItemsMaybe;
