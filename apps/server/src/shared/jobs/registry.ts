import { agenda } from '../../config/agenda';
import { exampleJob } from './example.job';
import { groupBuyDemandCloseJob } from './group-buy-demand-close.job';
import { groupBuyPaymentCloseJob } from './group-buy-payment-close.job';
import { registerServiceHubJobs } from '../../modules/service-hub/scheduler/service-hub-jobs';
import { registerComplaintsJobs } from '../../modules/complaints/scheduler/complaints-jobs';
import { registerSocietyHelpJobs } from '../../modules/society-help/scheduler/society-help-jobs';

/**
 * Register all Agenda job definitions here.
 * Called once at server startup via startAgenda().
 * To add a new job: define its handler and add agenda.define() below.
 */
export function registerAllJobs(): void {
  agenda.define('welcome-notification', exampleJob);
  agenda.define('group-buy-demand-close', groupBuyDemandCloseJob);
  agenda.define('group-buy-payment-close', groupBuyPaymentCloseJob);
  registerServiceHubJobs();
  registerComplaintsJobs();
  registerSocietyHelpJobs();
}
