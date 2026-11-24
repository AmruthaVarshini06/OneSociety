import type { Request, Response } from 'express';
import { query } from '../../../config/supabase';
import {
  getOrCreateMaintenancePlan,
  getMaintenanceDues,
  payMaintenanceInApp,
  recordOfflineMaintenancePayment,
  recordExpense,
  recordOtherIncome,
  recordWatchmanSalaryPayment,
  getGuardSalaryRecords,
  linkComplaintExpense,
  getMaintenanceAccounts,
  raiseExpenseQuery,
  replyExpenseQuery,
} from '../services/maintenance.service';

export async function getPlanHandler(req: Request, res: Response) {
  try {
    const user = req.user!;
    const plan = await getOrCreateMaintenancePlan(user.societyId);
    res.json(plan);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch maintenance plan.' });
  }
}

export async function getDuesHandler(req: Request, res: Response) {
  try {
    const user = req.user!;
    const { month } = req.query;

    const dues = await getMaintenanceDues(
      user.societyId,
      {
        userId: user.userId,
        role: user.role,
      },
      month as string | undefined
    );
    res.json(dues);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch dues.' });
  }
}

export async function payDueInAppHandler(req: Request, res: Response) {
  try {
    const user = req.user!;
    const { dueId } = req.params;
    const { amountPaise } = req.body;

    const dueRecordRes = await query('SELECT amount_paise FROM maintenance_dues WHERE id = $1', [dueId]);
    if (dueRecordRes.rows.length === 0) {
      res.status(404).json({ error: 'Due not found.' });
      return;
    }

    const due = await payMaintenanceInApp(
      dueId,
      user.userId,
      user.societyId,
      amountPaise ? Number(amountPaise) : Number(dueRecordRes.rows[0].amount_paise)
    );
    res.json(due);
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Payment failed.' });
  }
}

export async function recordOfflineDuePaymentHandler(req: Request, res: Response) {
  try {
    const user = req.user!;
    if (user.role !== 'president') {
      res.status(403).json({ error: 'Only the president can record offline dues payments.' });
      return;
    }

    const { dueId } = req.params;
    const { amountPaise, paymentMode, receiptNumber } = req.body;

    const dueRecordRes = await query('SELECT amount_paise FROM maintenance_dues WHERE id = $1', [dueId]);
    if (dueRecordRes.rows.length === 0) {
      res.status(404).json({ error: 'Due not found.' });
      return;
    }

    const due = await recordOfflineMaintenancePayment(
      dueId,
      user.userId,
      user.societyId,
      {
        amountPaise: amountPaise ? Number(amountPaise) : Number(dueRecordRes.rows[0].amount_paise),
        paymentMode: paymentMode || 'CASH',
        receiptNumber,
      }
    );
    res.json(due);
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to record offline payment.' });
  }
}

export async function recordExpenseHandler(req: Request, res: Response) {
  try {
    const user = req.user!;
    if (user.role !== 'president') {
      res.status(403).json({ error: 'Only the president can record society expenses.' });
      return;
    }

    const {
      category,
      amountPaise,
      payee,
      paymentMode,
      description,
      proofPhotos,
      date,
      linkedComplaintId,
    } = req.body;

    if (!category || !amountPaise || !payee) {
      res.status(400).json({ error: 'category, amountPaise, and payee are required.' });
      return;
    }

    const entry = await recordExpense(
      user.societyId,
      user.userId,
      {
        category,
        amountPaise: Number(amountPaise),
        payee,
        paymentMode: paymentMode || 'UPI',
        description: description || `${category} expense`,
        proofPhotos: proofPhotos || [],
        date: date ? new Date(date) : undefined,
        linkedComplaintId: linkedComplaintId ? String(linkedComplaintId) : undefined,
      }
    );

    res.status(201).json(entry);
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to record expense.' });
  }
}

export async function recordOtherIncomeHandler(req: Request, res: Response) {
  try {
    const user = req.user!;
    if (user.role !== 'president') {
      res.status(403).json({ error: 'Only the president can record other income.' });
      return;
    }

    const { category, amountPaise, payer, paymentMode, description, proofPhotos } = req.body;

    if (!category || !amountPaise || !payer) {
      res.status(400).json({ error: 'category, amountPaise, and payer are required.' });
      return;
    }

    const entry = await recordOtherIncome(
      user.societyId,
      user.userId,
      {
        category,
        amountPaise: Number(amountPaise),
        payer,
        paymentMode: paymentMode || 'UPI',
        description: description || `${category} income`,
        proofPhotos: proofPhotos || [],
      }
    );

    res.status(201).json(entry);
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to record income.' });
  }
}

export async function recordWatchmanSalaryHandler(req: Request, res: Response) {
  try {
    const user = req.user!;
    if (user.role !== 'president') {
      res.status(403).json({ error: 'Only the president can disburse security salaries.' });
      return;
    }

    const { guardUserId, month, amountPaise, reference, proofPhoto } = req.body;

    if (!guardUserId || !month || !amountPaise) {
      res.status(400).json({ error: 'guardUserId, month, and amountPaise are required.' });
      return;
    }

    const entry = await recordWatchmanSalaryPayment(
      user.societyId,
      user.userId,
      guardUserId,
      {
        month,
        amountPaise: Number(amountPaise),
        reference: reference || 'NEFT-SALARY',
        proofPhoto: proofPhoto || 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=400',
      }
    );

    res.status(201).json(entry);
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to record watchman salary.' });
  }
}

export async function getGuardSalaryRecordsHandler(req: Request, res: Response) {
  try {
    const user = req.user!;
    const records = await getGuardSalaryRecords(user.societyId, user.userId);
    res.json(records);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch guard salary records.' });
  }
}

export async function linkComplaintExpenseHandler(req: Request, res: Response) {
  try {
    const user = req.user!;
    if (user.role !== 'president') {
      res.status(403).json({ error: 'Only the president can link complaint expenses.' });
      return;
    }

    const { complaintClusterId } = req.body;
    if (!complaintClusterId) {
      res.status(400).json({ error: 'complaintClusterId is required.' });
      return;
    }

    const entry = await linkComplaintExpense(user.societyId, user.userId, complaintClusterId);
    res.status(201).json(entry);
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to link complaint expense.' });
  }
}

export async function getAccountsDashboardHandler(req: Request, res: Response) {
  try {
    const user = req.user!;
    const data = await getMaintenanceAccounts(user.societyId);
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to load maintenance accounts.' });
  }
}

export async function raiseExpenseQueryHandler(req: Request, res: Response) {
  try {
    const user = req.user!;
    const { ledgerEntryId } = req.params;
    const { question } = req.body;

    if (!question) {
      res.status(400).json({ error: 'question text is required.' });
      return;
    }

    const uRes = await query(
      `SELECT f.flat_number, b.name as block_name 
       FROM users u
       LEFT JOIN flats f ON u.flat_id = f.id
       LEFT JOIN blocks b ON f.block_id = b.id
       WHERE u.id = $1`,
      [user.userId]
    );
    const dbUser = uRes.rows[0];
    const flatCode = dbUser?.flat_number ? `${dbUser.block_name}-${dbUser.flat_number}` : 'Resident';

    const q = await raiseExpenseQuery(
      user.societyId,
      user.userId,
      {
        ledgerEntryId,
        question,
        flatCode,
      }
    );

    res.status(201).json(q);
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to post query.' });
  }
}

export async function replyExpenseQueryHandler(req: Request, res: Response) {
  try {
    const user = req.user!;
    if (user.role !== 'president') {
      res.status(403).json({ error: 'Only the president can reply to expense queries.' });
      return;
    }

    const { queryId } = req.params;
    const { answer } = req.body;

    if (!answer) {
      res.status(400).json({ error: 'answer text is required.' });
      return;
    }

    const q = await replyExpenseQuery(queryId, user.userId, answer);
    res.json(q);
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to reply to query.' });
  }
}

export async function getQueriesForEntryHandler(req: Request, res: Response) {
  try {
    const { ledgerEntryId } = req.params;
    const qRes = await query(
      `SELECT eq.*, u.full_name as resident_name 
       FROM expense_queries eq
       LEFT JOIN users u ON eq.resident_id = u.id
       WHERE eq.ledger_entry_id = $1 
       ORDER BY eq.created_at ASC`,
      [ledgerEntryId]
    );

    res.json(qRes.rows.map(r => ({
      _id: r.id,
      id: r.id,
      ledgerEntryId: r.ledger_entry_id,
      residentUserId: r.resident_id,
      residentName: r.resident_name,
      question: r.query_text,
      presidentReply: r.response_text,
      status: r.status,
      createdAt: r.created_at,
      repliedAt: r.responded_at,
    })));
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch queries.' });
  }
}
