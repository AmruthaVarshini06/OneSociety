import type { Request, Response } from 'express';
import { query } from '../../../config/supabase';
import {
  submitComplaint,
  getSimilarComplaints,
  getComplaintsFeed,
  getClusterDetails,
  editOwnComplaint,
  withdrawOwnComplaint,
  reopenIssue,
  confirmIssueFixed,
  ComplaintScopeError,
} from '../services/complaint.service';
import { checkComplaintScope } from '../ai/scope-checker';

async function resolveFlatCode(userId: string): Promise<string> {
  const uRes = await query(
    `SELECT u.username, f.flat_number, b.name as block_name 
     FROM users u
     LEFT JOIN flats f ON u.flat_id = f.id
     LEFT JOIN blocks b ON f.block_id = b.id
     WHERE u.id = $1`,
    [userId]
  );
  const u = uRes.rows[0];
  if (u?.flat_number) return `${u.block_name}-${u.flat_number}`;
  return u?.username || 'Resident';
}

export async function checkScopeHandler(req: Request, res: Response) {
  const { description, specificArea, category } = req.body;
  if (!description || !specificArea) {
    res.status(400).json({ error: 'Description and specific area are required.' });
    return;
  }
  const result = checkComplaintScope(description, specificArea, category || 'Other');
  res.json(result);
}

export async function getSimilarHandler(req: Request, res: Response) {
  const societyId = req.user!.societyId;
  const { category, block, specificArea, description } = req.body;
  if (!category || !specificArea || !description) {
    res.status(400).json({ error: 'Category, specific area, and description are required.' });
    return;
  }
  const matches = await getSimilarComplaints(societyId, category, block, specificArea, description);
  res.json({ matches });
}

export async function submitComplaintHandler(req: Request, res: Response) {
  const user = req.user!;
  const { category, location, description, photos, scopeLevel, linkToClusterId } = req.body;

  if (!category || !location?.specificArea || !description) {
    res.status(400).json({ error: 'Category, location with specific area, and description are required.' });
    return;
  }

  const residentFlatCode = await resolveFlatCode(user.userId);

  try {
    const result = await submitComplaint({
      societyId: user.societyId,
      residentId: user.userId,
      residentFlatCode,
      category,
      location,
      description,
      photos: photos || [],
      scopeLevel,
      linkToClusterId,
    });
    res.status(201).json(result);
  } catch (err: any) {
    if (err instanceof ComplaintScopeError) {
      res.status(400).json({
        error: err.message,
        isScopeError: true,
        suggestServiceHub: err.suggestServiceHub,
        serviceHubCategorySlug: err.serviceHubCategorySlug,
      });
      return;
    }
    throw err;
  }
}

export async function getFeedHandler(req: Request, res: Response) {
  const societyId = req.user!.societyId;
  const { status, category, priorityLevel, block, myComplaintsOnly, search } = req.query;

  const feed = await getComplaintsFeed(societyId, {
    status: status as string,
    category: category as string,
    priorityLevel: priorityLevel as string,
    block: block as string,
    myComplaintsOnly: myComplaintsOnly === 'true',
    residentId: req.user!.userId,
    search: search as string,
  });

  res.json({ feed });
}

export async function getClusterDetailsHandler(req: Request, res: Response) {
  const societyId = req.user!.societyId;
  const clusterId = req.params.id;
  const isPresident = req.user!.role === 'president';

  const details = await getClusterDetails(clusterId, societyId, isPresident);
  res.json(details);
}

export async function editComplaintHandler(req: Request, res: Response) {
  const societyId = req.user!.societyId;
  const residentId = req.user!.userId;
  const complaintId = req.params.id;
  const { description, photos, specificArea } = req.body;

  const updated = await editOwnComplaint(complaintId, residentId, societyId, {
    description,
    photos,
    specificArea,
  });

  res.json({ complaint: updated });
}

export async function withdrawComplaintHandler(req: Request, res: Response) {
  const societyId = req.user!.societyId;
  const residentId = req.user!.userId;
  const complaintId = req.params.id;
  const { reason } = req.body;

  const withdrawn = await withdrawOwnComplaint(complaintId, residentId, societyId, reason);
  res.json({ complaint: withdrawn });
}

export async function reopenIssueHandler(req: Request, res: Response) {
  const societyId = req.user!.societyId;
  const residentId = req.user!.userId;
  const clusterId = req.params.id;
  const { reason, photos } = req.body;

  const residentFlatCode = await resolveFlatCode(user_id(req));

  const reopened = await reopenIssue(clusterId, residentId, societyId, residentFlatCode, reason, photos);
  res.json({ cluster: reopened });
}

export async function confirmFixedHandler(req: Request, res: Response) {
  const societyId = req.user!.societyId;
  const residentId = req.user!.userId;
  const clusterId = req.params.id;

  const residentFlatCode = await resolveFlatCode(user_id(req));

  const confirmed = await confirmIssueFixed(clusterId, residentId, societyId, residentFlatCode);
  res.json({ cluster: confirmed });
}

function user_id(req: Request): string {
  return req.user!.userId;
}
