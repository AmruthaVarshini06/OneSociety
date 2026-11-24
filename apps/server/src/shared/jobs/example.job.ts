import type { Job } from '../../config/agenda';

export async function exampleJob(job: Job): Promise<void> {
  const { userId } = job.attrs.data as { userId: string };
  console.info(`[JOB] welcome-notification executing for userId=${userId}`);
}
