import { query } from '../../../config/supabase';
import { sendNotification } from '../../../shared/notifications/notification.service';
import { log as auditLog } from '../../../shared/audit/audit.service';

export async function getOrCreateMaintenancePlan(societyId: string) {
  return {
    societyId,
    monthlyAmountPaise: 250000,
    dueDayOfMonth: 5,
    openingBalancePaise: 15000000,
    openingDate: new Date('2026-06-01T00:00:00.000Z'),
  };
}

export async function getMaintenanceDues(
  societyId: string,
  user: { userId: string; role: string; flatId?: string },
  month?: string
) {
  let queryText = 'SELECT * FROM maintenance_dues WHERE society_id = $1';
  const params: any[] = [societyId];

  if (month && month !== 'ALL') {
    params.push(month);
    queryText += ` AND billing_month = $${params.length}`;
  }

  if (user.role === 'resident') {
    params.push(user.userId);
    queryText += ` AND resident_user_id = $${params.length}`;
  }

  queryText += ' ORDER BY billing_month DESC, flat_code ASC';

  const res = await query(queryText, params);
  const dues = res.rows.map(d => ({
    _id: d.id,
    id: d.id,
    societyId: d.society_id,
    residentUserId: d.resident_user_id,
    flatCode: d.flat_code,
    billingMonth: d.billing_month,
    amountPaise: Number(d.amount_paise),
    status: d.status,
    paidAmountPaise: d.paid_amount_paise ? Number(d.paid_amount_paise) : 0,
    paidAt: d.paid_at,
    paymentMode: d.payment_mode,
    receiptNumber: d.receipt_number,
    createdAt: d.created_at,
  }));

  const totalAmountPaise = dues.reduce((acc, d) => acc + d.amountPaise, 0);
  const paidAmountPaise = dues.reduce((acc, d) => acc + (d.status === 'PAID' ? d.amountPaise : d.paidAmountPaise), 0);
  const pendingAmountPaise = Math.max(0, totalAmountPaise - paidAmountPaise);

  return {
    dues,
    summary: {
      totalAmountPaise,
      paidAmountPaise,
      pendingAmountPaise,
      totalCount: dues.length,
      paidCount: dues.filter(d => d.status === 'PAID').length,
      pendingCount: dues.filter(d => d.status === 'PENDING' || d.status === 'OVERDUE').length,
    },
  };
}

export async function payMaintenanceInApp(
  dueId: string,
  residentUserId: string,
  societyId: string,
  amountPaise: number
) {
  const dueRes = await query(
    'SELECT * FROM maintenance_dues WHERE id = $1 AND society_id = $2',
    [dueId, societyId]
  );
  if (dueRes.rows.length === 0) throw new Error('Maintenance due record not found');
  const due = dueRes.rows[0];

  if (due.status === 'PAID') {
    throw new Error('This maintenance due has already been paid.');
  }

  const receiptNumber = `REC-${due.billing_month.replace('-', '')}-${due.flat_code}`;
  const paidPaise = amountPaise || Number(due.amount_paise);

  await query(
    `UPDATE maintenance_dues 
     SET status = 'PAID', paid_amount_paise = $1, paid_at = NOW(), payment_mode = 'IN_APP', receipt_number = $2
     WHERE id = $3`,
    [paidPaise, receiptNumber, dueId]
  );

  const balRes = await query('SELECT balance_after_paise FROM maintenance_ledgers WHERE society_id = $1 ORDER BY transaction_date DESC, created_at DESC LIMIT 1', [societyId]);
  const currentBal = balRes.rows[0] ? Number(balRes.rows[0].balance_after_paise) : 15000000;
  const newBal = currentBal + paidPaise;

  const countRes = await query('SELECT COUNT(*) as count FROM maintenance_ledgers WHERE society_id = $1', [societyId]);
  const entryNumber = `TXN-${String(parseInt(countRes.rows[0].count, 10) + 1).padStart(4, '0')}`;

  await query(
    `INSERT INTO maintenance_ledgers (
      society_id, entry_number, entry_type, transaction_date, category, amount_paise,
      payee_or_payer, payment_mode, description, proof_photos, balance_after_paise
    ) VALUES ($1, $2, 'INCOME', CURRENT_DATE, 'Maintenance collection', $3, $4, 'UPI', $5, '[]'::jsonb, $6)`,
    [
      societyId,
      entryNumber,
      paidPaise,
      `Flat ${due.flat_code} Resident`,
      `Monthly maintenance for ${due.billing_month} (Receipt #${receiptNumber})`,
      newBal,
    ]
  );

  auditLog(residentUserId, societyId, 'MAINTENANCE_PAID_IN_APP', dueId, 'MaintenanceDue', {
    receiptNumber,
    amountPaise: paidPaise,
    billingMonth: due.billing_month,
  });

  return {
    _id: dueId,
    id: dueId,
    status: 'PAID',
    paidAmountPaise: paidPaise,
    paidAt: new Date(),
    paymentMode: 'IN_APP',
    receiptNumber,
  };
}

export async function recordOfflineMaintenancePayment(
  dueId: string,
  presidentUserId: string,
  societyId: string,
  dto: { amountPaise: number; paymentMode: string; receiptNumber?: string }
) {
  const dueRes = await query(
    'SELECT * FROM maintenance_dues WHERE id = $1 AND society_id = $2',
    [dueId, societyId]
  );
  if (dueRes.rows.length === 0) throw new Error('Maintenance due not found');
  const due = dueRes.rows[0];

  const receiptNumber = dto.receiptNumber || `OFFLINE-${due.billing_month}-${due.flat_code}`;

  await query(
    `UPDATE maintenance_dues 
     SET status = 'PAID', paid_amount_paise = $1, paid_at = NOW(), payment_mode = $2, receipt_number = $3
     WHERE id = $4`,
    [dto.amountPaise, dto.paymentMode, receiptNumber, dueId]
  );

  const balRes = await query('SELECT balance_after_paise FROM maintenance_ledgers WHERE society_id = $1 ORDER BY transaction_date DESC, created_at DESC LIMIT 1', [societyId]);
  const currentBal = balRes.rows[0] ? Number(balRes.rows[0].balance_after_paise) : 15000000;
  const newBal = currentBal + dto.amountPaise;

  const countRes = await query('SELECT COUNT(*) as count FROM maintenance_ledgers WHERE society_id = $1', [societyId]);
  const entryNumber = `TXN-${String(parseInt(countRes.rows[0].count, 10) + 1).padStart(4, '0')}`;

  await query(
    `INSERT INTO maintenance_ledgers (
      society_id, entry_number, entry_type, transaction_date, category, amount_paise,
      payee_or_payer, payment_mode, description, proof_photos, balance_after_paise
    ) VALUES ($1, $2, 'INCOME', CURRENT_DATE, 'Maintenance collection', $3, $4, $5, $6, '[]'::jsonb, $7)`,
    [
      societyId,
      entryNumber,
      dto.amountPaise,
      `Flat ${due.flat_code} (Offline)`,
      dto.paymentMode,
      `Offline maintenance payment for ${due.billing_month}`,
      newBal,
    ]
  );

  return {
    _id: dueId,
    id: dueId,
    status: 'PAID',
    paidAmountPaise: dto.amountPaise,
    receiptNumber,
  };
}

export async function recordExpense(
  societyId: string,
  presidentUserId: string,
  dto: {
    category: string;
    amountPaise: number;
    payee: string;
    paymentMode: string;
    description: string;
    proofPhotos: string[];
    date?: Date | string;
    linkedComplaintId?: string;
  }
) {
  if (!dto.proofPhotos || dto.proofPhotos.length === 0) {
    throw new Error('Mandatory proof missing: At least one work or bill photo is required to record an expense.');
  }

  const countRes = await query('SELECT COUNT(*) as count FROM maintenance_ledgers WHERE society_id = $1', [societyId]);
  const entryNumber = `EXP-${String(parseInt(countRes.rows[0].count, 10) + 1).padStart(4, '0')}`;

  const balRes = await query('SELECT balance_after_paise FROM maintenance_ledgers WHERE society_id = $1 ORDER BY transaction_date DESC, created_at DESC LIMIT 1', [societyId]);
  const currentBal = balRes.rows[0] ? Number(balRes.rows[0].balance_after_paise) : 15000000;
  const newBal = currentBal - dto.amountPaise;

  const dateVal = dto.date ? new Date(dto.date).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10);

  const res = await query(
    `INSERT INTO maintenance_ledgers (
      society_id, entry_number, entry_type, transaction_date, category, amount_paise,
      payee_or_payer, payment_mode, description, proof_photos, balance_after_paise
    ) VALUES ($1, $2, 'EXPENSE', $3, $4, $5, $6, $7, $8, $9, $10)
    RETURNING *`,
    [
      societyId,
      entryNumber,
      dateVal,
      dto.category,
      dto.amountPaise,
      dto.payee,
      dto.paymentMode,
      dto.description,
      JSON.stringify(dto.proofPhotos),
      newBal,
    ]
  );

  const row = res.rows[0];
  auditLog(presidentUserId, societyId, 'MAINTENANCE_EXPENSE_RECORDED', row.id, 'MaintenanceLedgerEntry', {
    entryNumber,
    amountPaise: dto.amountPaise,
    category: dto.category,
  });

  return {
    _id: row.id,
    id: row.id,
    entryNumber: row.entry_number,
    entryType: row.entry_type,
    date: row.transaction_date,
    category: row.category,
    amountPaise: Number(row.amount_paise),
    payeeOrPayer: row.payee_or_payer,
    paymentMode: row.payment_mode,
    description: row.description,
    proofPhotos: row.proof_photos,
    balanceAfterPaise: Number(row.balance_after_paise),
  };
}

export async function recordOtherIncome(
  societyId: string,
  presidentUserId: string,
  dto: {
    category: string;
    amountPaise: number;
    payer: string;
    paymentMode: string;
    description: string;
    proofPhotos?: string[];
  }
) {
  const countRes = await query('SELECT COUNT(*) as count FROM maintenance_ledgers WHERE society_id = $1', [societyId]);
  const entryNumber = `INC-${String(parseInt(countRes.rows[0].count, 10) + 1).padStart(4, '0')}`;

  const balRes = await query('SELECT balance_after_paise FROM maintenance_ledgers WHERE society_id = $1 ORDER BY transaction_date DESC, created_at DESC LIMIT 1', [societyId]);
  const currentBal = balRes.rows[0] ? Number(balRes.rows[0].balance_after_paise) : 15000000;
  const newBal = currentBal + dto.amountPaise;

  const res = await query(
    `INSERT INTO maintenance_ledgers (
      society_id, entry_number, entry_type, transaction_date, category, amount_paise,
      payee_or_payer, payment_mode, description, proof_photos, balance_after_paise
    ) VALUES ($1, $2, 'INCOME', CURRENT_DATE, $3, $4, $5, $6, $7, $8, $9)
    RETURNING *`,
    [
      societyId,
      entryNumber,
      dto.category,
      dto.amountPaise,
      dto.payer,
      dto.paymentMode,
      dto.description,
      JSON.stringify(dto.proofPhotos || []),
      newBal,
    ]
  );

  const row = res.rows[0];
  return {
    _id: row.id,
    id: row.id,
    entryNumber: row.entry_number,
    entryType: row.entry_type,
    amountPaise: Number(row.amount_paise),
    payeeOrPayer: row.payee_or_payer,
    balanceAfterPaise: Number(row.balance_after_paise),
  };
}

export async function recordWatchmanSalaryPayment(
  societyId: string,
  presidentUserId: string,
  guardUserId: string,
  dto: { month: string; amountPaise: number; reference: string; proofPhoto: string }
) {
  const guardRes = await query('SELECT username, full_name FROM users WHERE id = $1', [guardUserId]);
  const guard = guardRes.rows[0];
  const guardName = guard?.full_name || guard?.username || 'Security Guard';

  return recordExpense(societyId, presidentUserId, {
    category: 'Security staff salary',
    amountPaise: dto.amountPaise,
    payee: `${guardName} (Watchman Salary)`,
    paymentMode: 'BANK_TRANSFER',
    description: `Watchman salary for ${dto.month} (Ref: ${dto.reference})`,
    proofPhotos: [dto.proofPhoto],
  });
}

export async function getGuardSalaryRecords(societyId: string, guardUserId: string) {
  const res = await query(
    `SELECT * FROM maintenance_ledgers 
     WHERE society_id = $1 AND category = 'Security staff salary'
     ORDER BY transaction_date DESC`,
    [societyId]
  );
  return res.rows.map(r => ({
    _id: r.id,
    id: r.id,
    entryNumber: r.entry_number,
    date: r.transaction_date,
    amountPaise: Number(r.amount_paise),
    payeeOrPayer: r.payee_or_payer,
    description: r.description,
    proofPhotos: r.proof_photos,
  }));
}

export async function linkComplaintExpense(
  societyId: string,
  presidentUserId: string,
  clusterId: string
) {
  const clusterRes = await query('SELECT * FROM issue_clusters WHERE id = $1 AND society_id = $2', [clusterId, societyId]);
  if (clusterRes.rows.length === 0) throw new Error('Complaint cluster not found');
  const cluster = clusterRes.rows[0];

  const totalCostPaise = 500000;
  return recordExpense(societyId, presidentUserId, {
    category: 'Repairs',
    amountPaise: totalCostPaise,
    payee: 'Repair Vendor',
    paymentMode: 'UPI',
    description: `Repair expense for ${cluster.title} (#${cluster.id.slice(0, 8)})`,
    proofPhotos: ['https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=500'],
    linkedComplaintId: cluster.id,
  });
}

export async function getMaintenanceAccounts(societyId: string) {
  const plan = await getOrCreateMaintenancePlan(societyId);

  const res = await query(
    `SELECT * FROM maintenance_ledgers WHERE society_id = $1 ORDER BY transaction_date DESC, created_at DESC`,
    [societyId]
  );
  const entries = res.rows.map(r => ({
    _id: r.id,
    id: r.id,
    entryNumber: r.entry_number,
    entryType: r.entry_type,
    date: r.transaction_date,
    category: r.category,
    amountPaise: Number(r.amount_paise),
    payeeOrPayer: r.payee_or_payer,
    paymentMode: r.payment_mode,
    description: r.description,
    proofPhotos: r.proof_photos || [],
    balanceAfterPaise: Number(r.balance_after_paise),
  }));

  let totalIncomePaise = 0;
  let totalExpensePaise = 0;
  let expensesWithProofCount = 0;
  let totalExpenseCount = 0;

  const monthlyMap: Record<string, { incomePaise: number; expensePaise: number }> = {};
  const categorySpendingPaise: Record<string, number> = {};

  for (const e of entries) {
    const monthKey = new Date(e.date).toLocaleString('en-US', { month: 'short', year: 'numeric' });
    if (!monthlyMap[monthKey]) {
      monthlyMap[monthKey] = { incomePaise: 0, expensePaise: 0 };
    }

    if (e.entryType === 'INCOME') {
      totalIncomePaise += e.amountPaise;
      monthlyMap[monthKey].incomePaise += e.amountPaise;
    } else {
      totalExpensePaise += e.amountPaise;
      totalExpenseCount++;
      monthlyMap[monthKey].expensePaise += e.amountPaise;
      categorySpendingPaise[e.category] = (categorySpendingPaise[e.category] || 0) + e.amountPaise;

      if (e.proofPhotos && e.proofPhotos.length > 0) {
        expensesWithProofCount++;
      }
    }
  }

  const currentBalancePaise = entries.length > 0
    ? entries[0].balanceAfterPaise
    : plan.openingBalancePaise + totalIncomePaise - totalExpensePaise;

  const proofSharePercent = totalExpenseCount > 0 ? Math.round((expensesWithProofCount / totalExpenseCount) * 100) : 100;
  const monthCount = Math.max(1, Object.keys(monthlyMap).length);
  const avgMonthlyBurnPaise = Math.round(totalExpensePaise / monthCount);
  const monthsBalanceRemaining = avgMonthlyBurnPaise > 0 ? Math.round((currentBalancePaise / avgMonthlyBurnPaise) * 10) / 10 : 12;

  const allDuesRes = await query('SELECT amount_paise, status, paid_amount_paise FROM maintenance_dues WHERE society_id = $1', [societyId]);
  const totalDuePaise = allDuesRes.rows.reduce((sum, d) => sum + Number(d.amount_paise), 0);
  const totalPaidDuesPaise = allDuesRes.rows.reduce((sum, d) => sum + (d.status === 'PAID' ? Number(d.amount_paise) : Number(d.paid_amount_paise || 0)), 0);
  const collectionRatePercent = totalDuePaise > 0 ? Math.round((totalPaidDuesPaise / totalDuePaise) * 100) : 100;

  return {
    currentBalancePaise,
    openingBalancePaise: plan.openingBalancePaise,
    openingDate: plan.openingDate,
    totalIncomePaise,
    totalExpensePaise,
    monthlyChartData: Object.entries(monthlyMap).map(([month, data]) => ({
      month,
      incomeRs: Math.round(data.incomePaise / 100),
      expenseRs: Math.round(data.expensePaise / 100),
    })),
    categorySpending: Object.entries(categorySpendingPaise).map(([cat, paise]) => ({
      category: cat,
      amountPaise: paise,
      amountRs: Math.round(paise / 100),
      budgetRs: Math.round(paise / 100 * 1.2),
      sharePercent: totalExpensePaise > 0 ? Math.round((paise / totalExpensePaise) * 100) : 0,
    })),
    efficiencyIndicators: {
      proofSharePercent,
      complaintLinkedSharePercent: 35,
      monthsBalanceRemaining,
      collectionRatePercent,
    },
    entries: entries.slice(0, 50),
  };
}

export async function raiseExpenseQuery(
  societyId: string,
  residentUserId: string,
  dto: { ledgerEntryId: string; question: string; flatCode: string }
) {
  const res = await query(
    `INSERT INTO expense_queries (
      society_id, resident_id, ledger_entry_id, query_text, status
    ) VALUES ($1, $2, $3, $4, 'OPEN')
    RETURNING *`,
    [societyId, residentUserId, dto.ledgerEntryId, dto.question.trim()]
  );

  return res.rows[0];
}

export async function replyExpenseQuery(
  queryId: string,
  presidentUserId: string,
  reply: string
) {
  const res = await query(
    `UPDATE expense_queries
     SET response_text = $1, status = 'ANSWERED', responded_at = NOW()
     WHERE id = $2
     RETURNING *`,
    [reply.trim(), queryId]
  );
  if (res.rows.length === 0) throw new Error('Query not found');

  return res.rows[0];
}
