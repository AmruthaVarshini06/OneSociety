import type { Request, Response } from 'express';
import * as disputeService from './rental-dispute.service';
import {
  createDisputeSchema,
  respondDisputeSchema,
  resolvePresidentSchema,
} from './rental-dispute.schema';

export async function createDispute(req: Request, res: Response): Promise<void> {
  const validated = createDisputeSchema.parse(req.body);
  const dispute = await disputeService.createDispute(
    req.params.bookingId,
    req.user!.userId,
    req.user!.societyId,
    validated,
  );
  res.status(201).json({ success: true, data: dispute });
}

export async function respondToDispute(req: Request, res: Response): Promise<void> {
  const validated = respondDisputeSchema.parse(req.body);
  const dispute = await disputeService.respondToDispute(
    req.params.bookingId,
    req.user!.userId,
    req.user!.societyId,
    validated,
  );
  res.json({ success: true, data: dispute });
}

export async function escalateDispute(req: Request, res: Response): Promise<void> {
  const dispute = await disputeService.escalateDispute(
    req.params.bookingId,
    req.user!.userId,
    req.user!.societyId,
  );
  res.json({ success: true, data: dispute });
}

export async function resolveDisputeByPresident(req: Request, res: Response): Promise<void> {
  const validated = resolvePresidentSchema.parse(req.body);
  const dispute = await disputeService.resolveDisputeByPresident(
    req.params.bookingId,
    req.user!.userId,
    req.user!.societyId,
    validated,
  );
  res.json({ success: true, data: dispute });
}

export async function getDisputeByBookingId(req: Request, res: Response): Promise<void> {
  const dispute = await disputeService.getDisputeByBookingId(
    req.params.bookingId,
    req.user!.userId,
    req.user!.role,
    req.user!.societyId,
  );
  res.json({ success: true, data: dispute });
}

export async function listPendingDisputes(req: Request, res: Response): Promise<void> {
  const disputes = await disputeService.listPendingDisputes(req.user!.societyId);
  res.json({ success: true, data: disputes });
}
