import type { Request, Response } from 'express';
import * as itemRequestService from './item-request.service';
import {
  createItemRequestSchema,
  createItemOfferSchema,
  listItemRequestsQuerySchema,
} from './item-request.schema';

export async function createRequest(req: Request, res: Response): Promise<void> {
  const validated = createItemRequestSchema.parse(req.body);
  const request = await itemRequestService.createRequest(
    validated,
    req.user!.userId,
    req.user!.societyId,
  );
  res.status(201).json({ success: true, data: request });
}

export async function listRequests(req: Request, res: Response): Promise<void> {
  const query = listItemRequestsQuerySchema.parse(req.query);
  const result = await itemRequestService.listRequests(
    req.user!.societyId,
    req.user!.userId,
    query,
  );
  res.json({ success: true, data: result });
}

export async function getMyRequests(req: Request, res: Response): Promise<void> {
  const requests = await itemRequestService.getMyRequests(req.user!.userId);
  res.json({ success: true, data: requests });
}

export async function getRequestById(req: Request, res: Response): Promise<void> {
  const result = await itemRequestService.getRequestById(
    req.params.id,
    req.user!.userId,
    req.user!.societyId,
  );
  res.json({ success: true, data: result });
}

export async function dismissRequest(req: Request, res: Response): Promise<void> {
  await itemRequestService.dismissRequest(req.params.id, req.user!.userId);
  res.json({ success: true, message: 'Request dismissed' });
}

export async function cancelRequest(req: Request, res: Response): Promise<void> {
  await itemRequestService.cancelRequest(req.params.id, req.user!.userId);
  res.json({ success: true, message: 'Request cancelled' });
}

export async function makeOffer(req: Request, res: Response): Promise<void> {
  const validated = createItemOfferSchema.parse(req.body);
  const offer = await itemRequestService.makeOffer(
    req.params.id,
    req.user!.userId,
    req.user!.societyId,
    validated,
  );
  res.status(201).json({ success: true, data: offer });
}

export async function acceptOffer(req: Request, res: Response): Promise<void> {
  const result = await itemRequestService.acceptOffer(
    req.params.id,
    req.params.offerId,
    req.user!.userId,
    req.user!.societyId,
  );
  res.json({ success: true, data: result });
}

export async function withdrawOffer(req: Request, res: Response): Promise<void> {
  await itemRequestService.withdrawOffer(req.params.offerId, req.user!.userId);
  res.json({ success: true, message: 'Offer withdrawn' });
}
