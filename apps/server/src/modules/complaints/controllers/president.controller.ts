import type { Request, Response } from 'express';
import {
  markIssueContacted,
  startWorkInProgress,
  addProgressUpdate,
  markIssueSolved,
  recordIssueCost,
  recordIssuePayment,
  markIssueOutOfScope,
  overrideIssuePriority,
  mergeClusters,
  splitCluster,
  getPresidentDashboardMetrics,
  getPresidentReports,
  ConcurrencyConflictError,
} from '../services/president-action.service';
import { hideSpamComplaint } from '../services/complaint.service';

export async function getDashboardMetricsHandler(req: Request, res: Response) {
  const societyId = req.user!.societyId;
  const metrics = await getPresidentDashboardMetrics(societyId);
  res.json(metrics);
}

export async function getReportsHandler(req: Request, res: Response) {
  const societyId = req.user!.societyId;
  const reports = await getPresidentReports(societyId);
  res.json(reports);
}

export async function markContactedHandler(req: Request, res: Response) {
  const societyId = req.user!.societyId;
  const presidentId = req.user!.userId;
  const clusterId = req.params.id;

  const { vendorType, vendorId, vendorName, vendorPhone, trade, visitDate, expectedCompletion, notes, allowAdditionalVendor, clientVersion } = req.body;

  if (!vendorType || !vendorName || !vendorPhone || !trade) {
    res.status(400).json({ error: 'Vendor type, name, phone, and trade are required.' });
    return;
  }

  try {
    const result = await markIssueContacted(clusterId, presidentId, societyId, {
      vendorType,
      vendorId,
      vendorName,
      vendorPhone,
      trade,
      visitDate,
      expectedCompletion,
      notes,
      allowAdditionalVendor,
      clientVersion,
    });
    res.json(result);
  } catch (err: any) {
    if (err instanceof ConcurrencyConflictError) {
      res.status(409).json({ error: err.message, isConflict: true });
      return;
    }
    res.status(400).json({ error: err.message || 'Failed to update issue status' });
  }
}

export async function startWorkInProgressHandler(req: Request, res: Response) {
  const societyId = req.user!.societyId;
  const presidentId = req.user!.userId;
  const clusterId = req.params.id;
  const { note, photos, clientVersion } = req.body;

  try {
    const cluster = await startWorkInProgress(clusterId, presidentId, societyId, {
      note: note || 'Work started on site',
      photos,
      clientVersion,
    });
    res.json({ cluster });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to update status' });
  }
}

export async function addProgressUpdateHandler(req: Request, res: Response) {
  const societyId = req.user!.societyId;
  const presidentId = req.user!.userId;
  const clusterId = req.params.id;
  const { note, photos, clientVersion } = req.body;

  if (!note) {
    res.status(400).json({ error: 'Progress note is required.' });
    return;
  }

  try {
    const cluster = await addProgressUpdate(clusterId, presidentId, societyId, {
      note,
      photos,
      clientVersion,
    });
    res.json({ cluster });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to add progress update' });
  }
}

export async function markSolvedHandler(req: Request, res: Response) {
  const societyId = req.user!.societyId;
  const presidentId = req.user!.userId;
  const clusterId = req.params.id;
  const { note, photos, clientVersion } = req.body;

  if (!photos || photos.length === 0) {
    res.status(400).json({ error: 'Mandatory resolution photo is required to mark issue solved.' });
    return;
  }

  try {
    const cluster = await markIssueSolved(clusterId, presidentId, societyId, {
      note: note || 'Issue resolved',
      photos,
      clientVersion,
    });
    res.json({ cluster });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to mark issue as solved' });
  }
}

export async function recordCostHandler(req: Request, res: Response) {
  const societyId = req.user!.societyId;
  const presidentId = req.user!.userId;
  const clusterId = req.params.id;
  const { items, clientVersion } = req.body;

  if (!items || !Array.isArray(items) || items.length === 0) {
    res.status(400).json({ error: 'Cost items are required.' });
    return;
  }

  try {
    const cluster = await recordIssueCost(clusterId, presidentId, societyId, {
      items,
      clientVersion,
    });
    res.json({ cluster });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to record cost breakdown' });
  }
}

export async function recordPaymentHandler(req: Request, res: Response) {
  const societyId = req.user!.societyId;
  const presidentId = req.user!.userId;
  const clusterId = req.params.id;
  const { paymentMode, paidToVendor, receiptPhotoUrl, clientVersion } = req.body;

  if (!paymentMode || !paidToVendor) {
    res.status(400).json({ error: 'Payment mode and paid-to vendor name are required.' });
    return;
  }

  try {
    const cluster = await recordIssuePayment(clusterId, presidentId, societyId, {
      paymentMode,
      paidToVendor,
      receiptPhotoUrl,
      clientVersion,
    });
    res.json({ cluster });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to record payment' });
  }
}

export async function markOutOfScopeHandler(req: Request, res: Response) {
  const societyId = req.user!.societyId;
  const presidentId = req.user!.userId;
  const clusterId = req.params.id;
  const { reason, clientVersion } = req.body;

  if (!reason) {
    res.status(400).json({ error: 'A clear reason is required to mark an issue out of scope.' });
    return;
  }

  try {
    const cluster = await markIssueOutOfScope(clusterId, presidentId, societyId, {
      reason,
      clientVersion,
    });
    res.json({ cluster });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to mark out of scope' });
  }
}

export async function overridePriorityHandler(req: Request, res: Response) {
  const societyId = req.user!.societyId;
  const presidentId = req.user!.userId;
  const clusterId = req.params.id;
  const { priorityLevel, reason, clientVersion } = req.body;

  if (!priorityLevel || !reason) {
    res.status(400).json({ error: 'Priority level and reason are required.' });
    return;
  }

  try {
    const cluster = await overrideIssuePriority(clusterId, presidentId, societyId, {
      priorityLevel,
      reason,
      clientVersion,
    });
    res.json({ cluster });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to override priority' });
  }
}

export async function mergeClustersHandler(req: Request, res: Response) {
  const societyId = req.user!.societyId;
  const presidentId = req.user!.userId;
  const { sourceClusterId, targetClusterId } = req.body;

  if (!sourceClusterId || !targetClusterId) {
    res.status(400).json({ error: 'sourceClusterId and targetClusterId are required.' });
    return;
  }

  const result = await mergeClusters(sourceClusterId, targetClusterId, presidentId, societyId);
  res.json(result);
}

export async function splitClusterHandler(req: Request, res: Response) {
  const societyId = req.user!.societyId;
  const presidentId = req.user!.userId;
  const { clusterId, complaintIdToSplit } = req.body;

  if (!clusterId || !complaintIdToSplit) {
    res.status(400).json({ error: 'clusterId and complaintIdToSplit are required.' });
    return;
  }

  const result = await splitCluster(clusterId, complaintIdToSplit, presidentId, societyId);
  res.json(result);
}

export async function hideSpamHandler(req: Request, res: Response) {
  const societyId = req.user!.societyId;
  const presidentId = req.user!.userId;
  const complaintId = req.params.id;
  const { reason } = req.body;

  if (!reason) {
    res.status(400).json({ error: 'Reason is required to hide post as spam.' });
    return;
  }

  const complaint = await hideSpamComplaint(complaintId, presidentId, societyId, reason);
  res.json({ message: 'Post hidden as spam', complaint });
}
