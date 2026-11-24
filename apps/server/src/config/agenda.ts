import { registerAllJobs } from '../shared/jobs/registry';

export interface Job {
  attrs: { data: any };
}

type JobHandler = (job: Job) => Promise<void>;

class InfluxScheduler {
  private handlers = new Map<string, JobHandler>();
  private timers = new Set<NodeJS.Timeout>();

  define(name: string, handler: JobHandler): void {
    this.handlers.set(name, handler);
  }

  every(interval: string, name: string, ...args: any[]): any {
    return this;
  }

  async schedule(when: string | Date, name: string, data: Record<string, unknown>): Promise<void> {
    const handler = this.handlers.get(name);
    if (!handler) {
      console.warn(`[SCHEDULER] No handler registered for job "${name}"`);
      return;
    }
    const targetTime = typeof when === 'string' ? new Date(when).getTime() : when.getTime();
    const delay = Math.max(0, targetTime - Date.now());
    const timer = setTimeout(async () => {
      this.timers.delete(timer);
      try {
        await handler({ attrs: { data } });
      } catch (err) {
        console.error(`[SCHEDULER] Error executing job "${name}":`, err);
      }
    }, delay);
    this.timers.add(timer);
  }

  async stop(): Promise<void> {
    for (const timer of this.timers) {
      clearTimeout(timer);
    }
    this.timers.clear();
  }
}

export const agenda = new InfluxScheduler();

export async function startAgenda(): Promise<void> {
  try {
    const { registerAllJobs } = await import('../shared/jobs/registry');
    registerAllJobs();
    console.info('[SCHEDULER] Background job scheduler started');
  } catch (err) {
    console.warn('[SCHEDULER] Background scheduler notice:', (err as any)?.message);
  }
}

export function defineJob(
  name: string,
  handler: (job: any) => Promise<void>,
): void {
  agenda.define(name, handler);
}


export async function scheduleJob(
  name: string,
  when: string | Date,
  data: Record<string, unknown>,
): Promise<void> {
  await agenda.schedule(when, name, data);
}
