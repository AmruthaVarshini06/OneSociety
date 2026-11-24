import type { Job } from '../../config/agenda';
import { closePaymentWindow } from '../../modules/group-buying/commitment/commitment.service';

export async function groupBuyPaymentCloseJob(job: Job): Promise<void> {
  const { groupOrderId, societyId } = job.attrs.data as { groupOrderId: string; societyId: string };
  if (!groupOrderId || !societyId) {
    console.error('[JOB] group-buy-payment-close: missing groupOrderId or societyId');
    return;
  }
  console.info(`[JOB] group-buy-payment-close: closing payment window for order ${groupOrderId}`);
  await closePaymentWindow(groupOrderId, societyId);
}
