import { spaceLinqScheduleMonths } from '../../util/api';
import * as log from '../../util/log';

/**
 * SpaceLinq: after the first month of an ongoing booking has been paid,
 * schedule the later months. Each one is its own transaction that holds the
 * space and is charged to the saved card shortly before the month starts.
 *
 * The server works the months out from the first-month transaction and creates
 * them in one request (see server/api/spacelinq-schedule.js).
 * This never rejects: the first month is already paid, so checkout must finish.
 *
 * @param {Object} params
 * @param {UUID} params.orderId id of the first-month transaction
 * @returns {Promise<{scheduled: number, total: number}>}
 */
export const scheduleMonthlyInstalments = ({ orderId }) => {
  if (!orderId?.uuid) {
    return Promise.resolve({ scheduled: 0, total: 0 });
  }
  return spaceLinqScheduleMonths({ agreementId: orderId.uuid }).catch(e => {
    log.error(e, 'spacelinq-schedule-months-failed', { agreementId: orderId.uuid });
    return { scheduled: 0, total: 0 };
  });
};
