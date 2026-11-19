import React from 'react';
import { FormattedMessage, intlShape } from '../../util/reactIntl';
import { formatMoney } from '../../util/currency';
import {
  LINE_ITEM_DAY,
  LINE_ITEM_FILE,
  LINE_ITEM_FIXED,
  LINE_ITEM_HOUR,
  LINE_ITEM_NIGHT,
  LINE_ITEM_OFFER,
  LINE_ITEM_REQUEST,
  propTypes,
} from '../../util/types';

import css from './OrderBreakdown.module.css';

/**
 * A component that renders the base price as a line item.
 *
 * @component
 * @param {Object} props
 * @param {Array<propTypes.lineItem>} props.lineItems - The line items to render
 * @param {propTypes.lineItemUnitType} props.code - The code of the line item
 * @param {intlShape} props.intl - The intl object
 * @returns {JSX.Element}
 */
const LineItemBasePriceMaybe = props => {
  const { lineItems, code, intl, unitKind = 'unit', isShortStay = false } = props;
  const isDigitalItem = code === LINE_ITEM_FILE;
  const isNightly = code === LINE_ITEM_NIGHT;
  const isDaily = code === LINE_ITEM_DAY;
  const isHourly = code === LINE_ITEM_HOUR;
  const isFixed = code === LINE_ITEM_FIXED;
  const isRequest = code === LINE_ITEM_REQUEST;
  const isOffer = code === LINE_ITEM_OFFER;
  const translationKey = isDigitalItem
    ? 'OrderBreakdown.baseUnitDigitalItem'
    : isNightly
    ? 'OrderBreakdown.baseUnitNight'
    : isDaily
    ? 'OrderBreakdown.baseUnitDay'
    : isHourly
    ? 'OrderBreakdown.baseUnitHour'
    : isFixed
    ? 'OrderBreakdown.baseUnitFixedBooking'
    : isRequest
    ? 'OrderBreakdown.baseUnitRequest'
    : isOffer
    ? 'OrderBreakdown.baseUnitOffer'
    : 'OrderBreakdown.baseUnitQuantity';

  // Find correct line-item for given code prop.
  // It should be one of the following: 'line-item/night, 'line-item/day', 'line-item/hour', 'line-item/fixed', 'line-item/item', 'line-item/offer', 'line-item/request' or 'line-item/file
  // These are defined in '../../util/types';
  const unitPurchase = lineItems.find(item => item.code === code && !item.reversal);

  const quantity = unitPurchase?.units
    ? unitPurchase.units.toString()
    : unitPurchase?.quantity
    ? unitPurchase.quantity.toString()
    : null;
  const unitPrice = unitPurchase ? formatMoney(intl, unitPurchase.unitPrice) : null;
  const total = unitPurchase ? formatMoney(intl, unitPurchase.lineTotal) : null;

  // SpaceLinq: whole months at the flat monthly price, e.g. "$180.00 × 1 month"
  const isMonthly = code === 'line-item/month';
  const message = isMonthly ? (
    <FormattedMessage
      id={
        // A stay under a month charged the monthly price, because the daily rate came to more
        isShortStay
          ? unitPurchase?.seats > 1
            ? 'OrderBreakdown.spaceLinqMonthCapUnits'
            : 'OrderBreakdown.spaceLinqMonthCap'
          : unitPurchase?.seats > 1
          ? 'OrderBreakdown.spaceLinqMonthUnits'
          : 'OrderBreakdown.spaceLinqMonth'
      }
      values={{ unitPrice, quantity, seats: unitPurchase?.seats, unitKind }}
    />
  ) : unitPurchase?.seats ? (
    <FormattedMessage
      // SpaceLinq: bookings count storage units (pallets, m², spaces), not seats
      id={
        isDaily
          ? 'OrderBreakdown.spaceLinqDayUnits'
          : isHourly
          ? 'OrderBreakdown.spaceLinqHourUnits'
          : `${translationKey}Seats`
      }
      values={{ unitPrice, quantity, seats: unitPurchase.seats, unitKind }}
    />
  ) : (
    <FormattedMessage id={translationKey} values={{ unitPrice, quantity }} />
  );

  return quantity && total ? (
    <div className={css.lineItem}>
      <span className={css.itemLabel}>{message}</span>
      <span className={css.itemValue}>{total}</span>
    </div>
  ) : null;
};

export default LineItemBasePriceMaybe;
