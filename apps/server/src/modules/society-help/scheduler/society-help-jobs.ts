import { agenda } from '../../../config/agenda';
import { query } from '../../../config/supabase';
import { sendNotification } from '../../../shared/notifications/notification.service';

export function registerSocietyHelpJobs(): void {
  agenda.define('society-help-maintenance-reminders', async () => {
    try {
      const now = new Date();
      const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      const dayOfMonth = now.getDate();

      const unpaidDues = await query(
        `SELECT * FROM maintenance_dues WHERE billing_month = $1 AND status IN ('PENDING', 'OVERDUE')`,
        [currentMonthStr]
      );

      for (const due of unpaidDues.rows) {
        if (dayOfMonth <= 5) {
          await sendNotification(
            due.resident_user_id.toString(),
            'Maintenance Due Reminder',
            `Maintenance fee of ₹${Number(due.amount_paise) / 100} for ${due.billing_month} is due by the 5th. Please pay in the app.`,
            'MAINTENANCE_REMINDER',
            due.id
          );
        } else {
          await query(`UPDATE maintenance_dues SET status = 'OVERDUE' WHERE id = $1`, [due.id]);
          await sendNotification(
            due.resident_user_id.toString(),
            'Maintenance Fee Overdue',
            `Your maintenance fee of ₹${Number(due.amount_paise) / 100} for ${due.billing_month} is now overdue. Please clear it today.`,
            'MAINTENANCE_OVERDUE',
            due.id
          );
        }
      }
    } catch (err) {
      console.error('[SCHEDULER] Maintenance reminder job error:', err);
    }
  });

  agenda.define('society-help-expired-pass-alert', async () => {
    try {
      const expiredWithInside = await query(
        `SELECT * FROM qr_passes
         WHERE pass_type IN ('VISITOR', 'EVENT_GUEST')
           AND valid_until < NOW()
           AND people_currently_inside > 0
           AND status = 'ACTIVE'`
      );

      for (const pass of expiredWithInside.rows) {
        const guards = await query(
          `SELECT id FROM users WHERE society_id = $1 AND role = 'guard'`,
          [pass.society_id]
        );

        for (const guard of guards.rows) {
          await sendNotification(
            guard.id.toString(),
            '⚠️ Expired Pass - Person Still Inside',
            `Pass ${pass.pass_code} for Flat ${pass.flat_code} expired, but ${pass.people_currently_inside} visitor(s) are still recorded inside!`,
            'GATE_EXPIRED_PASS',
            pass.id
          );
        }
      }
    } catch (err) {
      console.error('[SCHEDULER] Expired pass alert error:', err);
    }
  });

  agenda.define('society-help-presence-sync', async () => {
    try {
      await query(
        `UPDATE flats
         SET is_at_home = true, at_home_updated_at = NOW(), away_until = NULL
         WHERE is_at_home = false AND away_until IS NOT NULL AND away_until < NOW()`
      );
    } catch (err) {
      console.error('[SCHEDULER] Presence sync job error:', err);
    }
  });
}
