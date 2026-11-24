import { agenda } from '../../../config/agenda';

export function registerComplaintsJobs(): void {
  agenda.define('complaints-priority-recalc', async () => {});
  agenda.define('complaints-target-sla-reminders', async () => {});
  agenda.define('complaints-work-overdue-reminders', async () => {});
  agenda.define('complaints-auto-close', async () => {});
}
