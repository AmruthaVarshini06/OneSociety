import type { Request, Response } from 'express';
import {
  createIssueSchema,
  supplierResponseSchema,
  presidentResolutionSchema,
  submitRatingSchema,
} from './dispute.schema';
import * as svc from './dispute.service';

export async function reportIssue(req: Request, res: Response): Promise<void> {
  const data = createIssueSchema.parse(req.body);
  const issue = await svc.reportIssue(
    req.params.orderId,
    req.user!.userId,
    req.user!.societyId,
    data,
  );
  res.status(201).json({ message: 'Issue reported', issue });
}

export async function listIssues(req: Request, res: Response): Promise<void> {
  const issues = await svc.listIssues(
    req.params.orderId,
    req.user!.societyId,
    req.user!.role,
    req.user!.userId,
  );
  res.json({ issues });
}

export async function supplierRespondIssue(req: Request, res: Response): Promise<void> {
  const data = supplierResponseSchema.parse(req.body);
  const issue = await svc.supplierRespondIssue(
    req.params.issueId,
    req.user!.userId,
    req.user!.societyId,
    data,
  );
  res.json({ message: 'Supplier responded to issue', issue });
}

export async function escalateIssue(req: Request, res: Response): Promise<void> {
  const issue = await svc.escalateIssue(
    req.params.issueId,
    req.user!.userId,
    req.user!.societyId,
  );
  res.json({ message: 'Issue escalated to President', issue });
}

export async function presidentResolveIssue(req: Request, res: Response): Promise<void> {
  const data = presidentResolutionSchema.parse(req.body);
  const issue = await svc.presidentResolveIssue(
    req.params.issueId,
    req.user!.userId,
    req.user!.societyId,
    data,
  );
  res.json({ message: 'President resolved issue', issue });
}

export async function submitRating(req: Request, res: Response): Promise<void> {
  const data = submitRatingSchema.parse(req.body);
  const rating = await svc.submitRating(
    req.params.orderId,
    req.user!.userId,
    req.user!.societyId,
    data,
  );
  res.status(201).json({ message: 'Rating submitted', rating });
}

export async function getMyRating(req: Request, res: Response): Promise<void> {
  const rating = await svc.getMyRating(req.params.orderId, req.user!.userId);
  res.json({ rating: rating ?? null });
}

export async function settleOrderEscrow(req: Request, res: Response): Promise<void> {
  const summary = await svc.settleOrderEscrow(
    req.params.orderId,
    req.user!.userId,
    req.user!.societyId,
  );
  res.json({ message: 'Escrow settlement completed and order marked COMPLETED', ...summary });
}
