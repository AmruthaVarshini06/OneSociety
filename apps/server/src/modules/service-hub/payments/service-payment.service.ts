import { query } from '../../../config/supabase';
import { sendNotification } from '../../../shared/notifications/notification.service';

export interface ServicePaymentDocument {
  id: string;
  _id: string;
  agreementId: string;
  requestId: string;
  seekerId: string;
  providerUserId: string;
  societyId: string;
  cycleMonth?: string;
  dueDate: Date;
  windowStart: Date;
  windowEnd: Date;
  amountPaise: number;
  mode?: string;
  status: string;
  paidAt?: Date;
  confirmedAt?: Date;
  confirmedBy?: string;
  offlineReference?: string;
  overdueEscalatedToPresident: boolean;
  createdAt: Date;
}

function mapPayment(row: any): ServicePaymentDocument {
  return {
    id: row.id,
    _id: row.id,
    agreementId: row.agreement_id,
    requestId: row.request_id,
    seekerId: row.seeker_id,
    providerUserId: row.provider_user_id,
    societyId: row.society_id,
    cycleMonth: row.cycle_month,
    dueDate: new Date(row.due_date),
    windowStart: new Date(row.window_start),
    windowEnd: new Date(row.window_end),
    amountPaise: Number(row.amount_paise),
    mode: row.mode,
    status: row.status,
    paidAt: row.paid_at ? new Date(row.paid_at) : undefined,
    confirmedAt: row.confirmed_at ? new Date(row.confirmed_at) : undefined,
    confirmedBy: row.confirmed_by,
    offlineReference: row.offline_reference,
    overdueEscalatedToPresident: !!row.overdue_escalated_to_president,
    createdAt: new Date(row.created_at),
  };
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function getMonthBoundaries(year: number, month: number, fromDay: number, toDay: number): { start: Date; end: Date } {
  const start = new Date(year, month - 1, fromDay, 0, 0, 0, 0);
  const end = new Date(year, month - 1, toDay, 23, 59, 59, 999);
  return { start, end };
}

export async function generatePaymentWindow(
  agreementId: string,
  cycleMonth?: string,
): Promise<ServicePaymentDocument> {
  const agRes = await query('SELECT * FROM service_agreements WHERE id = $1', [agreementId]);
  const ag = agRes.rows[0];
  if (!ag) throw Object.assign(new Error('Agreement not found'), { statusCode: 404 });

  const pw = ag.schedule?.paymentWindow || {};
  let windowStart: Date;
  let windowEnd: Date;
  let dueDate: Date;

  if (pw.type === 'SAME_DAY_HOURS' && pw.sameDayHours) {
    const baseDate = ag.schedule?.startDate ? new Date(ag.schedule.startDate) : new Date();
    const [fromH, fromM] = (pw.sameDayHours.from || '12:00').split(':').map(Number);
    const [toH, toM] = (pw.sameDayHours.to || '13:00').split(':').map(Number);
    windowStart = new Date(baseDate);
    windowStart.setHours(fromH, fromM, 0, 0);
    windowEnd = new Date(baseDate);
    windowEnd.setHours(toH, toM, 0, 0);
    dueDate = windowEnd;
  } else if (pw.type === 'DAYS_AFTER_JOB' && pw.daysAfterJob != null) {
    const baseDate = ag.schedule?.endDate ? new Date(ag.schedule.endDate) : new Date();
    windowStart = addDays(baseDate, 1);
    windowEnd = addDays(baseDate, pw.daysAfterJob);
    dueDate = windowEnd;
  } else if (pw.type === 'MONTHLY_DATE_RANGE' && pw.monthlyDateRange) {
    const target = cycleMonth ?? new Date().toISOString().slice(0, 7);
    const [yyyy, mm] = target.split('-').map(Number);
    const { start, end } = getMonthBoundaries(yyyy, mm, pw.monthlyDateRange.fromDay || 1, pw.monthlyDateRange.toDay || 5);
    windowStart = start;
    windowEnd = end;
    dueDate = end;
    cycleMonth = target;
  } else {
    windowStart = new Date();
    windowEnd = addDays(windowStart, 7);
    dueDate = windowEnd;
  }

  const res = await query(
    `INSERT INTO service_payments (
      agreement_id, request_id, seeker_id, provider_user_id, society_id,
      cycle_month, due_date, window_start, window_end, amount_paise, status
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'PENDING')
    RETURNING *`,
    [
      ag.id,
      ag.request_id || ag.id,
      ag.seeker_id,
      ag.provider_user_id,
      ag.society_id,
      cycleMonth || null,
      dueDate.toISOString(),
      windowStart.toISOString(),
      windowEnd.toISOString(),
      ag.rate_paise || 0,
    ]
  );

  return mapPayment(res.rows[0]);
}

export async function generateRecurringMonthlyWindows(agreementId: string, forMonth: string): Promise<void> {
  const existing = await query(
    'SELECT id FROM service_payments WHERE agreement_id = $1 AND cycle_month = $2',
    [agreementId, forMonth]
  );
  if (existing.rows.length > 0) return;
  await generatePaymentWindow(agreementId, forMonth);
}

export async function recordPayment(
  paymentId: string,
  seekerId: string,
  amountPaise: number,
  mode: 'IN_APP' | 'CASH' | 'UPI_OFFLINE',
  offlineReference?: string,
): Promise<ServicePaymentDocument> {
  const check = await query('SELECT * FROM service_payments WHERE id = $1', [paymentId]);
  const payment = check.rows[0];
  if (!payment) throw Object.assign(new Error('Payment not found'), { statusCode: 404 });
  if (payment.seeker_id.toString() !== seekerId) throw Object.assign(new Error('Forbidden'), { statusCode: 403 });
  if (payment.status === 'CONFIRMED') throw Object.assign(new Error('Already paid'), { statusCode: 400 });

  const isConfirmed = mode === 'IN_APP';
  const newStatus = isConfirmed ? 'CONFIRMED' : 'PAID_PENDING_CONFIRMATION';
  const confirmedAt = isConfirmed ? new Date().toISOString() : null;
  const confirmedBy = isConfirmed ? seekerId : null;

  const res = await query(
    `UPDATE service_payments
     SET amount_paise = $1, mode = $2, paid_at = NOW(), offline_reference = $3,
         status = $4, confirmed_at = $5, confirmed_by = $6
     WHERE id = $7
     RETURNING *`,
    [amountPaise, mode, offlineReference || null, newStatus, confirmedAt, confirmedBy, paymentId]
  );

  if (!isConfirmed) {
    await sendNotification(
      payment.provider_user_id.toString(),
      'Payment received — confirm',
      `Seeker marked ₹${(amountPaise / 100).toFixed(2)} as paid via ${mode}. Please confirm receipt.`,
      'SERVICE_PAYMENT_CONFIRM_REQUEST',
      paymentId,
      { paymentId },
    );
  }

  return mapPayment(res.rows[0]);
}

export async function confirmReceipt(
  paymentId: string,
  providerUserId: string,
): Promise<ServicePaymentDocument> {
  const check = await query('SELECT * FROM service_payments WHERE id = $1', [paymentId]);
  const payment = check.rows[0];
  if (!payment) throw Object.assign(new Error('Payment not found'), { statusCode: 404 });
  if (payment.provider_user_id.toString() !== providerUserId) throw Object.assign(new Error('Forbidden'), { statusCode: 403 });
  if (payment.status !== 'PAID_PENDING_CONFIRMATION') throw Object.assign(new Error('Payment not in correct state'), { statusCode: 400 });

  const res = await query(
    `UPDATE service_payments
     SET status = 'CONFIRMED', confirmed_at = NOW(), confirmed_by = $1
     WHERE id = $2
     RETURNING *`,
    [providerUserId, paymentId]
  );

  await sendNotification(
    payment.seeker_id.toString(),
    'Payment confirmed',
    `Your payment of ₹${(Number(payment.amount_paise) / 100).toFixed(2)} was confirmed by the provider.`,
    'SERVICE_PAYMENT_CONFIRMED',
    paymentId,
    { paymentId },
  );

  return mapPayment(res.rows[0]);
}

export async function markOverdue(paymentId: string): Promise<ServicePaymentDocument> {
  const check = await query('SELECT * FROM service_payments WHERE id = $1', [paymentId]);
  const payment = check.rows[0];
  if (!payment) throw Object.assign(new Error('Payment not found'), { statusCode: 404 });

  const res = await query(
    `UPDATE service_payments SET status = 'OVERDUE' WHERE id = $1 RETURNING *`,
    [paymentId]
  );
  const updated = res.rows[0];

  const amountRs = (Number(updated.amount_paise) / 100).toFixed(2);
  await sendNotification(updated.seeker_id.toString(), 'Payment overdue!', `Your payment of ₹${amountRs} is overdue.`, 'SERVICE_PAYMENT_OVERDUE', paymentId, { paymentId });
  await sendNotification(updated.provider_user_id.toString(), 'Payment overdue', `Payment of ₹${amountRs} from seeker is overdue.`, 'SERVICE_PAYMENT_OVERDUE', paymentId, { paymentId });

  const daysOverdue = Math.floor((Date.now() - new Date(updated.window_end).getTime()) / 86400000);
  if (daysOverdue >= 7 && !updated.overdue_escalated_to_president) {
    await query(`UPDATE service_payments SET overdue_escalated_to_president = TRUE WHERE id = $1`, [paymentId]);
    const presRes = await query('SELECT id FROM users WHERE society_id = $1 AND role = $2 LIMIT 1', [updated.society_id, 'president']);
    const president = presRes.rows[0];
    if (president) {
      await sendNotification(president.id.toString(), 'Overdue payment escalated', `Payment of ₹${amountRs} has been overdue for ${daysOverdue} days.`, 'SERVICE_PAYMENT_ESCALATED', paymentId, { paymentId });
    }
  }

  return mapPayment(updated);
}

export async function getProviderEarnings(providerUserId: string): Promise<{ totalReceived: number; pending: number; overdue: number }> {
  const res = await query('SELECT amount_paise, status FROM service_payments WHERE provider_user_id = $1', [providerUserId]);
  const rows = res.rows;
  return {
    totalReceived: rows.filter((p: any) => p.status === 'CONFIRMED').reduce((s: number, p: any) => s + Number(p.amount_paise), 0),
    pending: rows.filter((p: any) => ['PENDING', 'PAID_PENDING_CONFIRMATION'].includes(p.status)).reduce((s: number, p: any) => s + Number(p.amount_paise), 0),
    overdue: rows.filter((p: any) => p.status === 'OVERDUE').reduce((s: number, p: any) => s + Number(p.amount_paise), 0),
  };
}

export async function getSeekerPayments(seekerId: string): Promise<ServicePaymentDocument[]> {
  const res = await query(
    'SELECT * FROM service_payments WHERE seeker_id = $1 ORDER BY window_start DESC',
    [seekerId]
  );
  return res.rows.map(mapPayment);
}
