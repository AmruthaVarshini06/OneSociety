import type { Job } from '../../config/agenda';
import { closeDemandWindow } from '../../modules/group-buying/group-order/group-order.service';

/**
 * Closes the demand window for a group order when the deadline arrives.
 * Transitions status: DEMAND_OPEN → OFFERS_OPEN.
 */
export async function groupBuyDemandCloseJob(job: Job): Promise<void> {
  const { groupOrderId } = job.attrs.data as { groupOrderId: string };
  if (!groupOrderId) {
    console.error('[JOB] group-buy-demand-close: missing groupOrderId');
    return;
  }
  console.info(`[JOB] group-buy-demand-close: closing demand for order ${groupOrderId}`);
  await closeDemandWindow(groupOrderId);
}
