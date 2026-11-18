import { initiatePrivileged } from '../../util/api';
import * as log from '../../util/log';
import { splitIntoBillingPeriods, MONTHLY_PROCESS_ALIAS } from '../../util/spaceLinqBilling';
import { instalmentTransitions } from '../../util/spaceLinqInstalments';

/**
 * SpaceLinq: after the first month of an ongoing booking has been paid,
 * schedule the later months. Each one is its own transaction that holds the
 * space and is charged to the saved card shortly before the month starts.
 *
 * Months are scheduled in order and scheduling stops at the first month that
 * cannot be booked (for example when the space is not available that far ahead).
 * This never rejects: the first month is already paid, so checkout must finish.
 *
 * @param {Object} params
 * @param {UUID} params.orderId id of the first-month transaction
 * @param {Object} params.pageData checkout page data (listing, orderData)
 * @returns {Promise<{scheduled: number, total: number}>}
 */
export const scheduleMonthlyInstalments = ({ orderId, pageData }) => {
  const { listing, orderData } = pageData || {};
  const { agreement, seats, addOns, insurance } = orderData || {};
  if (!agreement?.start || !agreement?.end || !listing?.id || !orderId) {
    return Promise.resolve({ scheduled: 0, total: 0 });
  }

  const laterPeriods = splitIntoBillingPeriods(
    new Date(agreement.start),
    new Date(agreement.end),
    agreement.timeZone
  ).slice(1);
  const addOnsMaybe = Array.isArray(addOns) && addOns.length ? { addOns } : {};
  const insuranceMaybe = insurance ? { insurance } : {};
  const seatsMaybe = seats ? { seats } : {};

  // With instant booking the later months are accepted straight away, like the first one.
  const isInstantBooking = listing.attributes?.publicData?.pricing?.instantBooking === true;
  const scheduleTransition = isInstantBooking
    ? instalmentTransitions.SCHEDULE_EXTENSION
    : instalmentTransitions.SCHEDULE;

  const scheduleOne = (period, index) =>
    initiatePrivileged({
      isSpeculative: false,
      orderData: {
        ...addOnsMaybe,
        ...insuranceMaybe,
        agreement: { start: agreement.start, end: agreement.end },
      },
      bodyParams: {
        processAlias: MONTHLY_PROCESS_ALIAS,
        transition: scheduleTransition,
        params: {
          listingId: listing.id,
          bookingStart: period.start,
          bookingEnd: period.end,
          ...seatsMaybe,
          protectedData: {
            agreementId: orderId.uuid,
            // The first month is period 1
            period: index + 2,
            unitType: 'day',
            ...addOnsMaybe,
            ...insuranceMaybe,
          },
        },
      },
      queryParams: { expand: false },
    });

  return laterPeriods
    .reduce(
      (chain, period, index) =>
        chain.then(result =>
          result.failed
            ? result
            : scheduleOne(period, index)
                .then(() => ({ ...result, scheduled: result.scheduled + 1 }))
                .catch(e => {
                  log.error(e, 'spacelinq-schedule-instalment-failed', {
                    agreementId: orderId.uuid,
                    period: index + 2,
                  });
                  return { ...result, failed: true };
                })
        ),
      Promise.resolve({ scheduled: 0, failed: false })
    )
    .then(result => ({ scheduled: result.scheduled, total: laterPeriods.length }));
};
