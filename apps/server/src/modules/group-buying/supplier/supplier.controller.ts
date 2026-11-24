import type { Request, Response } from 'express';
import {
  createSupplierSchema,
  updateSupplierProfileSchema,
  verifySupplierSchema,
  listSuppliersQuerySchema,
} from './supplier.schema';
import * as supplierService from './supplier.service';

// ── POST /suppliers/register ──────────────────────────────────────────────
export async function registerSupplier(req: Request, res: Response): Promise<void> {
  const data = createSupplierSchema.parse(req.body);
  const { supplier, gstWarning } = await supplierService.createSupplier(
    data,
    req.user!.userId,
    req.user!.societyId,
  );
  res.status(201).json({
    message: 'Supplier account created',
    supplier: sanitize(supplier),
    ...(gstWarning ? { gstWarning } : {}),
  });
}

// ── GET /suppliers ────────────────────────────────────────────────────────
export async function listSuppliers(req: Request, res: Response): Promise<void> {
  const query = listSuppliersQuerySchema.parse(req.query);
  const { suppliers, total } = await supplierService.listSuppliers(req.user!.societyId, query);
  res.json({
    suppliers: suppliers.map(sanitize),
    total,
    page: query.page,
    limit: query.limit,
  });
}

// ── GET /suppliers/me ─────────────────────────────────────────────────────
export async function getMyProfile(req: Request, res: Response): Promise<void> {
  const supplier = await supplierService.getMySupplierProfile(req.user!.userId);
  res.json({ supplier: sanitize(supplier) });
}

// ── GET /suppliers/:id ────────────────────────────────────────────────────
export async function getSupplierById(req: Request, res: Response): Promise<void> {
  const supplier = await supplierService.getSupplierById(
    req.params.id,
    req.user!.userId,
    req.user!.societyId,
    req.user!.role,
  );
  res.json({ supplier: sanitize(supplier) });
}

// ── PUT /suppliers/me/profile ─────────────────────────────────────────────
export async function updateMyProfile(req: Request, res: Response): Promise<void> {
  const data = updateSupplierProfileSchema.parse(req.body);
  const { supplier, gstWarning } = await supplierService.updateMyProfile(req.user!.userId, data);
  res.json({
    message: 'Profile updated',
    supplier: sanitize(supplier),
    ...(gstWarning ? { gstWarning } : {}),
  });
}

// ── PATCH /suppliers/:id/verify ───────────────────────────────────────────
export async function verifySupplier(req: Request, res: Response): Promise<void> {
  const data = verifySupplierSchema.parse(req.body);
  const supplier = await supplierService.verifySupplier(
    req.params.id,
    req.user!.userId,
    req.user!.societyId,
    data,
  );
  res.json({
    message: `Supplier ${data.action === 'approve' ? 'approved' : 'rejected'}`,
    supplier: sanitize(supplier),
  });
}

// ── Sanitize helper (strip internal fields, return plain object) ──────────
function sanitize(doc: unknown): unknown {
  if (doc && typeof (doc as { toObject?: () => unknown }).toObject === 'function') {
    return (doc as { toObject: () => unknown }).toObject();
  }
  return doc;
}
