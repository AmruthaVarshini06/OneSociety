import { agenda } from '../../config/agenda';
import { exampleJob } from './example.job';
import { groupBuyDemandCloseJob } from './group-buy-demand-close.job';
import { groupBuyPaymentCloseJob } from './group-buy-payment-close.job';
import { registerServiceHubJobs } from '../../modules/service-hub/scheduler/service-hub-jobs';
import { registerComplaintsJobs } from '../../modules/complaints/scheduler/complaints-jobs';
import { registerSocietyHelpJobs } from '../../modules/society-help/scheduler/society-help-jobs';

export function registerAllJobs(): void {
  agenda.define('welcome-notification', exampleJob);
  agenda.define('group-buy-demand-close', groupBuyDemandCloseJob);
  agenda.define('group-buy-payment-close', groupBuyPaymentCloseJob);
  registerServiceHubJobs();
  registerComplaintsJobs();
  registerSocietyHelpJobs();
}
