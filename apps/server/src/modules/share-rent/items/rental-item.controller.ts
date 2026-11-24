import type { Request, Response } from 'express';
import * as rentalItemService from './rental-item.service';
import {
  verifyPriceSchema,
  createRentalItemSchema,
  updateRentalItemSchema,
  listRentalItemsQuerySchema,
  presidentReviewSchema,
} from './rental-item.schema';

export async function getCatalog(req: Request, res: Response): Promise<void> {
  const societyId = req.user!.societyId;
  const catalog = await rentalItemService.getCatalogWithCounts(societyId);
  res.json({ success: true, data: catalog });
}

export async function verifyPrice(req: Request, res: Response): Promise<void> {
  const validated = verifyPriceSchema.parse(req.body);
  const result = await rentalItemService.verifyPrice(validated);
  res.json({ success: true, data: result });
}

export async function createItem(req: Request, res: Response): Promise<void> {
  const validated = createRentalItemSchema.parse(req.body);
  const item = await rentalItemService.createItem(
    validated,
    req.user!.userId,
    req.user!.societyId,
  );
  res.status(201).json({ success: true, data: item });
}

export async function listItems(req: Request, res: Response): Promise<void> {
  const query = listRentalItemsQuerySchema.parse(req.query);
  const result = await rentalItemService.listItems(req.user!.societyId, query);
  res.json({ success: true, data: result });
}

export async function getMyItems(req: Request, res: Response): Promise<void> {
  const items = await rentalItemService.getMyItems(req.user!.userId);
  res.json({ success: true, data: items });
}

export async function getItemById(req: Request, res: Response): Promise<void> {
  const item = await rentalItemService.getItemById(req.params.id, req.user!.societyId);
  if (!item) {
    res.status(404).json({ success: false, message: 'Item not found' });
    return;
  }
  res.json({ success: true, data: item });
}

export async function updateItem(req: Request, res: Response): Promise<void> {
  const validated = updateRentalItemSchema.parse(req.body);
  const item = await rentalItemService.updateItem(
    req.params.id,
    req.user!.userId,
    validated,
  );
  res.json({ success: true, data: item });
}

export async function toggleAvailability(req: Request, res: Response): Promise<void> {
  const isAvailable =
    typeof req.body.isAvailable === 'boolean' ? req.body.isAvailable : undefined;
  const item = await rentalItemService.toggleAvailability(
    req.params.id,
    req.user!.userId,
    isAvailable,
  );
  res.json({ success: true, data: item });
}

export async function deleteItem(req: Request, res: Response): Promise<void> {
  await rentalItemService.deleteItem(req.params.id, req.user!.userId);
  res.json({ success: true, message: 'Item deleted successfully' });
}

export async function escalateItem(req: Request, res: Response): Promise<void> {
  const reason = (req.body.reason || 'Price dispute with AI recommendation').trim();
  const item = await rentalItemService.escalateToPresident(
    req.params.id,
    req.user!.userId,
    reason,
  );
  res.json({ success: true, data: item });
}

export async function listPendingReviews(req: Request, res: Response): Promise<void> {
  const items = await rentalItemService.listPendingReviews(req.user!.societyId);
  res.json({ success: true, data: items });
}

export async function presidentReviewItem(req: Request, res: Response): Promise<void> {
  const { decision, reason } = presidentReviewSchema.parse(req.body);
  const item = await rentalItemService.presidentReviewItem(
    req.params.id,
    req.user!.userId,
    req.user!.societyId,
    decision,
    reason,
  );
  res.json({ success: true, data: item });
}
