import type { Request, Response } from 'express';
import {
  dispatchOrderSchema,
  gateAcceptSchema,
  verifyQrSchema,
  requestOtpSchema,
  verifyOtpSchema,
} from './delivery.schema';
import * as svc from './delivery.service';

export async function dispatchOrder(req: Request, res: Response): Promise<void> {
  const data = dispatchOrderSchema.parse(req.body);
  const result = await svc.dispatchOrder(
    req.params.orderId,
    req.user!.userId,
    req.user!.societyId,
    data,
  );
  res.status(201).json({ message: 'Order dispatched and passes generated', ...result });
}

export async function getDeliveryManifest(req: Request, res: Response): Promise<void> {
  const result = await svc.getDeliveryManifest(req.params.orderId, req.user!.societyId);
  res.json(result);
}

export async function acceptGateManifest(req: Request, res: Response): Promise<void> {
  const data = gateAcceptSchema.parse(req.body);
  const manifest = await svc.acceptGateManifest(
    req.params.orderId,
    req.user!.userId,
    req.user!.societyId,
    data,
  );
  res.json({ message: 'Manifest accepted at gate', manifest });
}

export async function getGatePickups(req: Request, res: Response): Promise<void> {
  const result = await svc.getGatePickups(req.params.orderId, req.user!.societyId);
  res.json(result);
}

export async function getMyDeliveryPass(req: Request, res: Response): Promise<void> {
  const pass = await svc.getMyDeliveryPass(req.params.orderId, req.user!.userId);
  res.json({ pass: pass ?? null });
}

export async function verifyDeliveryQr(req: Request, res: Response): Promise<void> {
  const data = verifyQrSchema.parse(req.body);
  const result = await svc.verifyDeliveryQr(
    req.params.orderId,
    data.qrToken,
    req.user!.userId,
    req.user!.societyId,
  );
  res.json({ message: 'Delivery verified successfully', pass: result.pass, allDelivered: result.allDelivered });
}

export async function requestOtpFallback(req: Request, res: Response): Promise<void> {
  const result = await svc.requestOtpFallback(
    req.params.orderId,
    req.user!.userId,
    req.user!.societyId,
  );
  res.json(result);
}

export async function verifyOtpFallback(req: Request, res: Response): Promise<void> {
  const data = verifyOtpSchema.parse(req.body);
  const result = await svc.verifyOtpFallback(
    req.params.orderId,
    data.flatId,
    data.otp,
    req.user!.userId,
    req.user!.societyId,
  );
  res.json({ message: 'Delivery verified via OTP override', pass: result.pass, allDelivered: result.allDelivered });
}
