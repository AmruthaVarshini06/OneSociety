import type { Request, Response } from 'express';
import {
  createGroupOrderSchema,
  listGroupOrdersQuerySchema,
  cancelGroupOrderSchema,
} from './group-order.schema';
import * as svc from './group-order.service';

export async function createGroupOrder(req: Request, res: Response): Promise<void> {
  const data = createGroupOrderSchema.parse(req.body);
  const order = await svc.createGroupOrder(data, req.user!.userId, req.user!.societyId);
  res.status(201).json({ message: 'Group order created', order });
}

export async function listGroupOrders(req: Request, res: Response): Promise<void> {
  const query = listGroupOrdersQuerySchema.parse(req.query);
  const { orders, total } = await svc.listGroupOrders(req.user!.societyId, query);
  res.json({ orders, total, page: query.page, limit: query.limit });
}

export async function getGroupOrder(req: Request, res: Response): Promise<void> {
  const order = await svc.getGroupOrderById(req.params.id, req.user!.societyId);
  res.json({ order });
}

export async function cancelGroupOrder(req: Request, res: Response): Promise<void> {
  const data = cancelGroupOrderSchema.parse(req.body);
  const order = await svc.cancelGroupOrder(
    req.params.id,
    req.user!.userId,
    req.user!.societyId,
    data,
  );
  res.json({ message: 'Group order cancelled', order });
}

export async function getDemandSummary(req: Request, res: Response): Promise<void> {
  const { items, total } = await svc.getDemandSummary(req.params.id, req.user!.societyId);
  res.json({ items, total });
}
