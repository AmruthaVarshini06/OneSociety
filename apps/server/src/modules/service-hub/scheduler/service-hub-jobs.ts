import { agenda } from '../../../config/agenda';
import { query } from '../../../config/supabase';
import { sendNotification } from '../../../shared/notifications/notification.service';
import { markOverdue } from '../payments/service-payment.service';

export function registerServiceHubJobs(): void {
  agenda.define('sh-expire-stale-requests', async () => {
    try {
      const res = await query(
        `UPDATE service_requests
         SET status = 'EXPIRED'
         WHERE status = 'REQUESTED' AND expires_at < NOW()
         RETURNING *`
      );
      for (const req of res.rows) {
        if (req.seeker_id) {
          await sendNotification(req.seeker_id.toString(), 'Request expired', 'Your service request expired with no response.', 'SERVICE_REQUEST_EXPIRED', req.id.toString(), {});
        }
        if (req.provider_user_id) {
          await sendNotification(req.provider_user_id.toString(), 'Request expired', 'A service request you received expired.', 'SERVICE_REQUEST_EXPIRED', req.id.toString(), {});
        }
      }
      if (res.rows.length) console.info(`[SH] Expired ${res.rows.length} stale requests`);
    } catch (err) {
      console.error('[SH] Error expiring stale requests:', err);
    }
  });

  agenda.define('sh-schedule-reminders', async () => {
    try {
      const tomorrowVisits = await query(
        `SELECT * FROM service_visits
         WHERE scheduled_date = CURRENT_DATE + INTERVAL '1 day' AND status = 'SCHEDULED'`
      );

      for (const visit of tomorrowVisits.rows) {
        if (visit.provider_user_id) {
          await sendNotification(visit.provider_user_id.toString(), 'Tomorrow\'s visit reminder', `You have a visit at Flat ${visit.flat_code} tomorrow.`, 'SERVICE_REMINDER_EVENING', visit.id.toString(), {});
        }
        if (visit.seeker_id) {
          await sendNotification(visit.seeker_id.toString(), 'Visit tomorrow', `Your service provider is coming tomorrow.`, 'SERVICE_REMINDER_EVENING', visit.id.toString(), {});
        }
      }
    } catch (err) {
      console.error('[SH] Error sending visit reminders:', err);
    }
  });

  agenda.define('sh-auto-complete-one-time', async () => {
    try {
      await query(
        `UPDATE service_visits
         SET status = 'COMPLETED', completed_at = NOW()
         WHERE status = 'IN_PROGRESS' AND scheduled_date < CURRENT_DATE`
      );
    } catch (err) {
      console.error('[SH] Error auto-completing visits:', err);
    }
  });

  agenda.define('sh-process-overdue-payments', async () => {
    try {
      const overdue = await query(
        `SELECT id FROM service_payments
         WHERE status = 'PENDING' AND window_end < NOW()`
      );
      for (const row of overdue.rows) {
        await markOverdue(row.id).catch(() => {});
      }
    } catch (err) {
      console.error('[SH] Error processing overdue payments:', err);
    }
  });

  console.info('[SH] ServiceHub background jobs registered successfully');
}
