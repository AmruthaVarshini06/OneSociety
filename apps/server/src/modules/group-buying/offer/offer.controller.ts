import type { Request, Response } from 'express';
import { submitOfferSchema, selectOfferSchema } from './offer.schema';
import * as svc from './offer.service';

export async function submitOffer(req: Request, res: Response): Promise<void> {
  const data = submitOfferSchema.parse(req.body);
  const offer = await svc.submitOffer(
    req.params.orderId,
    req.user!.societyId,
    req.user!.userId,
    data,
  );
  res.status(201).json({ message: 'Offer submitted', offer });
}

export async function listOffers(req: Request, res: Response): Promise<void> {
  const offers = await svc.listOffers(req.params.orderId, req.user!.societyId);
  res.json({ offers });
}

export async function getMyOffer(req: Request, res: Response): Promise<void> {
  const offer = await svc.getMyOffer(req.params.orderId, req.user!.userId);
  res.json({ offer: offer ?? null });
}

export async function selectOffer(req: Request, res: Response): Promise<void> {
  const data = selectOfferSchema.parse(req.body);
  const { order, offer } = await svc.selectOffer(
    req.params.orderId,
    req.params.offerId,
    req.user!.societyId,
    req.user!.userId,
    data,
  );
  res.json({ message: 'Supplier selected', order, offer });
}
