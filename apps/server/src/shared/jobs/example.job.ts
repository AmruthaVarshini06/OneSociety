import type { Job } from '../../config/agenda';

/**
 * Example job: welcome-notification
 * Scheduled when a new user account is created.
 * Full notification sending wired in P3.
 */
export async function exampleJob(job: Job): Promise<void> {
  const { userId } = job.attrs.data as { userId: string };
  console.info(`[JOB] welcome-notification executing for userId=${userId}`);
  // P3: will call notificationService.sendNotification(userId, 'Welcome!', '...')
}
