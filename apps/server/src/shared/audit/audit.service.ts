/**
 * Write an audit log entry.
 * Fire-and-forget — does NOT throw. Logs to stdout/stderr.
 */
export function log(
  actorId: string | any,
  societyId: string | any,
  action: string,
  targetId?: string | any,
  targetCollection?: string,
  metadata?: Record<string, unknown>,
): void {
  try {
    const actId = actorId ? actorId.toString() : '';
    const socId = societyId ? societyId.toString() : '';
    const tgtId = targetId ? targetId.toString() : 'none';
    console.info(`[AUDIT] action="${action}" actor="${actId}" society="${socId}" target="${targetCollection || 'item'}:${tgtId}"`);
  } catch (err) {
    console.error('[AUDIT] Failed to log audit event:', err);
  }
}
