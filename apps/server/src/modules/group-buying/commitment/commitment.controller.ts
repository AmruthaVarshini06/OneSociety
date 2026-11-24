import type { Request, Response } from 'express';
import { confirmPaymentSchema } from './commitment.schema';
import { openPaymentWindowSchema } from '../group-order/group-order.schema';
import * as svc from './commitment.service';

export async function openOrder(req: Request, res: Response): Promise<void> {
  const result = await svc.openOrder(req.params.orderId, req.user!.societyId, req.user!.userId);
  res.json({ message: 'Group order opened', ...result });
}

export async function openPaymentWindow(req: Request, res: Response): Promise<void> {
  const data = openPaymentWindowSchema.parse(req.body);
  const order = await svc.openPaymentWindow(
    req.params.orderId,
    req.user!.societyId,
    req.user!.userId,
    data.paymentDeadlineHours,
  );
  res.json({ message: 'Payment window opened', order });
}

export async function closePaymentWindow(req: Request, res: Response): Promise<void> {
  const order = await svc.closePaymentWindow(
    req.params.orderId,
    req.user!.societyId,
    req.user!.userId,
  );
  res.json({ message: 'Payment window closed', order });
}

export async function initiatePayment(req: Request, res: Response): Promise<void> {
  const paymentDetails = await svc.initiatePayment(
    req.params.orderId,
    req.user!.userId,
    req.user!.societyId,
  );
  res.json({ message: 'Payment initiated', ...paymentDetails });
}

export async function confirmPayment(req: Request, res: Response): Promise<void> {
  const data = confirmPaymentSchema.parse(req.body);
  const commitment = await svc.confirmPayment(
    req.params.orderId,
    req.user!.userId,
    req.user!.societyId,
    data,
  );
  res.json({ message: 'Payment confirmed and escrow hold recorded', commitment });
}

export async function getCommitmentSummary(req: Request, res: Response): Promise<void> {
  const summary = await svc.getCommitmentSummary(req.params.orderId, req.user!.societyId);
  res.json(summary);
}

export async function getMyCommitment(req: Request, res: Response): Promise<void> {
  const commitment = await svc.getMyCommitment(req.params.orderId, req.user!.userId);
  res.json({ commitment: commitment ?? null });
}
