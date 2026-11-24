import { query } from '../../../config/supabase';
import { verifyPriceWithAi, type AiPriceVerification, type PriceRange } from '../pricing/price-verifier';
import type {
  VerifyPriceInput,
  CreateRentalItemInput,
  UpdateRentalItemInput,
  ListRentalItemsQuery,
} from './rental-item.schema';
import * as auditService from '../../../shared/audit/audit.service';
import { sendNotification } from '../../../shared/notifications/notification.service';

export interface RentalItemDocument {
  id: string;
  _id: string;
  societyId: string;
  ownerId: any;
  flatId: any;
  name: string;
  category: string;
  description: string;
  photos: string[];
  ageYears: number;
  condition: string;
  estimatedPurchasePricePaise?: number;
  pickupLocation: string;
  chargeHourlyPaise?: number;
  chargeDailyPaise?: number;
  safeDepositPaise: number;
  usageRules: string[];
  aiPriceVerification: AiPriceVerification;
  status: string;
  isAvailable: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const INITIAL_CATALOG_CATEGORIES = [
  {
    name: 'Drill',
    slug: 'drill',
    icon: 'hammer-wrench',
    description: 'Power drills, hammer drills, impact drivers and bit sets',
    suggestedHourlyRangePaise: { min: 3000, max: 7000 },
    suggestedDailyRangePaise: { min: 15000, max: 30000 },
    suggestedDepositRangePaise: { min: 100000, max: 200000 },
    order: 1,
    isActive: true,
  },
  {
    name: 'Ladder',
    slug: 'ladder',
    icon: 'stairs',
    description: 'Step ladders, telescopic and folding ladders',
    suggestedHourlyRangePaise: { min: 2500, max: 6000 },
    suggestedDailyRangePaise: { min: 12000, max: 25000 },
    suggestedDepositRangePaise: { min: 100000, max: 200000 },
    order: 2,
    isActive: true,
  },
  {
    name: 'Party Vessels',
    slug: 'party vessels',
    icon: 'pot-steam',
    description: 'Large cooking vessels, biryani pots, catering bowls and warmers',
    suggestedHourlyRangePaise: { min: 3000, max: 8000 },
    suggestedDailyRangePaise: { min: 15000, max: 35000 },
    suggestedDepositRangePaise: { min: 150000, max: 300000 },
    order: 3,
    isActive: true,
  },
  {
    name: 'Suitcase',
    slug: 'suitcase',
    icon: 'bag-suitcase',
    description: 'Large travel trolleys, cabin luggage, and international duffels',
    suggestedHourlyRangePaise: { min: 2000, max: 5000 },
    suggestedDailyRangePaise: { min: 10000, max: 25000 },
    suggestedDepositRangePaise: { min: 80000, max: 150000 },
    order: 4,
    isActive: true,
  },
  {
    name: 'Pressure Cooker',
    slug: 'pressure cooker',
    icon: 'pot',
    description: 'Large capacity 10L+ pressure cookers for festive cooking',
    suggestedHourlyRangePaise: { min: 1500, max: 4000 },
    suggestedDailyRangePaise: { min: 8000, max: 20000 },
    suggestedDepositRangePaise: { min: 60000, max: 120000 },
    order: 5,
    isActive: true,
  },
  {
    name: 'Extension Board',
    slug: 'extension board',
    icon: 'power-plug',
    description: 'Heavy-duty 15A/16A extension reels (10m - 30m cords)',
    suggestedHourlyRangePaise: { min: 1000, max: 2500 },
    suggestedDailyRangePaise: { min: 4000, max: 10000 },
    suggestedDepositRangePaise: { min: 30000, max: 60000 },
    order: 6,
    isActive: true,
  },
  {
    name: 'Camping Gear',
    slug: 'camping gear',
    icon: 'tent',
    description: 'Tents, sleeping bags, picnic mats, folding chairs and stoves',
    suggestedHourlyRangePaise: { min: 5000, max: 12000 },
    suggestedDailyRangePaise: { min: 25000, max: 60000 },
    suggestedDepositRangePaise: { min: 200000, max: 400000 },
    order: 7,
    isActive: true,
  },
  {
    name: 'Kids Cycles',
    slug: 'kids cycles',
    icon: 'bicycle',
    description: 'Balance bikes, tricycles, and 14-20 inch bicycles',
    suggestedHourlyRangePaise: { min: 3000, max: 8000 },
    suggestedDailyRangePaise: { min: 15000, max: 40000 },
    suggestedDepositRangePaise: { min: 150000, max: 300000 },
    order: 8,
    isActive: true,
  },
];

function mapItem(row: any): RentalItemDocument {
  const photos = Array.isArray(row.photos) ? row.photos : typeof row.photos === 'string' ? JSON.parse(row.photos) : [];
  return {
    id: row.id,
    _id: row.id,
    societyId: row.society_id,
    ownerId: row.owner_username ? { id: row.owner_id, _id: row.owner_id, username: row.owner_username } : row.owner_id,
    flatId: row.flat_number ? { id: row.flat_id, _id: row.flat_id, number: row.flat_number } : row.flat_id,
    name: row.name,
    category: row.category,
    description: row.description || '',
    photos,
    ageYears: Number(row.age_years || 0),
    condition: row.condition || 'GOOD',
    estimatedPurchasePricePaise: row.estimated_purchase_price_paise != null ? Number(row.estimated_purchase_price_paise) : undefined,
    pickupLocation: row.pickup_location || '',
    chargeHourlyPaise: row.hourly_rate_paise != null ? Number(row.hourly_rate_paise) : undefined,
    chargeDailyPaise: row.daily_rate_paise != null ? Number(row.daily_rate_paise) : undefined,
    safeDepositPaise: Number(row.safe_deposit_paise || 0),
    usageRules: Array.isArray(row.usage_rules) ? row.usage_rules : [],
    aiPriceVerification: row.ai_price_verification || { verdict: row.ai_verified ? 'FAIR' : 'PENDING', reason: '', verifiedAt: new Date() },
    status: row.status || 'PUBLISHED',
    isAvailable: row.is_available ?? true,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.created_at),
  };
}

export async function seedCatalogCategories(): Promise<void> {
  // Static in-memory catalog
}

export async function getCatalogWithCounts(
  societyId: string,
): Promise<Array<any & { availableCount: number }>> {
  const countsRes = await query(
    `SELECT LOWER(category) as category, COUNT(*)::int as count
     FROM rental_items
     WHERE society_id = $1 AND status = 'PUBLISHED' AND is_available = true
     GROUP BY LOWER(category)`,
    [societyId]
  );
  const countMap = new Map<string, number>();
  countsRes.rows.forEach((r: any) => countMap.set(r.category, r.count));

  return INITIAL_CATALOG_CATEGORIES.map((cat) => ({
    ...cat,
    availableCount: countMap.get(cat.slug.toLowerCase()) || 0,
  }));
}

export async function verifyPrice(data: VerifyPriceInput) {
  return verifyPriceWithAi({
    name: data.name,
    category: data.category,
    ageYears: data.ageYears ?? 0,
    condition: data.condition ?? 'GOOD',
    estimatedPurchasePricePaise: data.estimatedPurchasePricePaise,
    chargeHourlyPaise: data.chargeHourlyPaise,
    chargeDailyPaise: data.chargeDailyPaise,
    safeDepositPaise: data.safeDepositPaise,
  });
}

export async function createItem(
  data: CreateRentalItemInput,
  userId: string,
  societyId: string,
): Promise<RentalItemDocument> {
  const userRes = await query('SELECT flat_id FROM users WHERE id = $1', [userId]);
  let flatId = userRes.rows[0]?.flat_id;

  if (!flatId) {
    const flatRes = await query('SELECT id FROM flats WHERE society_id = $1 LIMIT 1', [societyId]);
    flatId = flatRes.rows[0]?.id;
    if (!flatId) {
      throw new Error('User flat is not associated with this society.');
    }
  }

  const verification = await verifyPriceWithAi({
    name: data.name,
    category: data.category,
    ageYears: data.ageYears ?? 0,
    condition: data.condition ?? 'GOOD',
    estimatedPurchasePricePaise: data.estimatedPurchasePricePaise,
    chargeHourlyPaise: data.chargeHourlyPaise,
    chargeDailyPaise: data.chargeDailyPaise,
    safeDepositPaise: data.safeDepositPaise,
  });

  const status = verification.verdict === 'FAIR' ? 'PUBLISHED' : 'DRAFT';

  const res = await query(
    `INSERT INTO rental_items (
      society_id, owner_id, flat_id, name, category, description,
      photos, age_years, condition, hourly_rate_paise, daily_rate_paise,
      safe_deposit_paise, ai_verified, is_available, status
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, TRUE, $14)
    RETURNING *`,
    [
      societyId,
      userId,
      flatId,
      data.name.trim(),
      data.category.toLowerCase().trim(),
      data.description.trim(),
      JSON.stringify(data.photos || []),
      data.ageYears ?? 0,
      data.condition ?? 'GOOD',
      data.chargeHourlyPaise || 0,
      data.chargeDailyPaise || 0,
      data.safeDepositPaise,
      verification.verdict === 'FAIR',
      status,
    ]
  );

  const item = mapItem(res.rows[0]);

  auditService.log(userId, societyId, 'RENTAL_ITEM_CREATED', item.id, 'RentalItem', {
    name: item.name,
    verdict: verification.verdict,
    status,
  });

  return item;
}

export async function listItems(
  societyId: string,
  filterQuery: ListRentalItemsQuery,
) {
  let whereClauses = [`ri.society_id = $1`, `ri.status = 'PUBLISHED'`];
  const params: any[] = [societyId];
  let pIdx = 2;

  if (filterQuery.category) {
    whereClauses.push(`LOWER(ri.category) = $${pIdx}`);
    params.push(filterQuery.category.toLowerCase().trim());
    pIdx++;
  }

  if (filterQuery.isAvailable !== undefined) {
    whereClauses.push(`ri.is_available = $${pIdx}`);
    params.push(filterQuery.isAvailable);
    pIdx++;
  }

  if (filterQuery.search) {
    whereClauses.push(`(ri.name ILIKE $${pIdx} OR ri.description ILIKE $${pIdx})`);
    params.push(`%${filterQuery.search.trim()}%`);
    pIdx++;
  }

  const whereStr = whereClauses.join(' AND ');

  const page = filterQuery.page || 1;
  const limit = filterQuery.limit || 20;
  const offset = (page - 1) * limit;

  const countRes = await query(`SELECT COUNT(*)::int as total FROM rental_items ri WHERE ${whereStr}`, params);
  const total = countRes.rows[0]?.total || 0;

  const itemsRes = await query(
    `SELECT ri.*, u.username as owner_username, f.number as flat_number
     FROM rental_items ri
     LEFT JOIN users u ON u.id = ri.owner_id
     LEFT JOIN flats f ON f.id = ri.flat_id
     WHERE ${whereStr}
     ORDER BY ri.created_at DESC
     LIMIT $${pIdx} OFFSET $${pIdx + 1}`,
    [...params, limit, offset]
  );

  return {
    items: itemsRes.rows.map(mapItem),
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

export async function getMyItems(userId: string): Promise<RentalItemDocument[]> {
  const res = await query(
    `SELECT ri.*, u.username as owner_username, f.number as flat_number
     FROM rental_items ri
     LEFT JOIN users u ON u.id = ri.owner_id
     LEFT JOIN flats f ON f.id = ri.flat_id
     WHERE ri.owner_id = $1
     ORDER BY ri.created_at DESC`,
    [userId]
  );
  return res.rows.map(mapItem);
}

export async function getItemById(
  id: string,
  societyId?: string,
): Promise<RentalItemDocument | null> {
  let sql = `
    SELECT ri.*, u.username as owner_username, f.number as flat_number
    FROM rental_items ri
    LEFT JOIN users u ON u.id = ri.owner_id
    LEFT JOIN flats f ON f.id = ri.flat_id
    WHERE ri.id = $1
  `;
  const params: any[] = [id];
  if (societyId) {
    sql += ` AND ri.society_id = $2`;
    params.push(societyId);
  }

  const res = await query(sql, params);
  if (!res.rows[0]) return null;
  return mapItem(res.rows[0]);
}

export async function updateItem(
  id: string,
  userId: string,
  data: UpdateRentalItemInput,
): Promise<RentalItemDocument> {
  const existing = await getItemById(id);
  if (!existing) throw new Error('Rental item not found');
  if (existing.ownerId?.id?.toString() !== userId && existing.ownerId?.toString() !== userId) {
    throw new Error('Not authorized to update this item');
  }

  let status = existing.status;
  let aiPriceVerification = existing.aiPriceVerification;

  const priceFieldsModified =
    data.chargeHourlyPaise !== undefined ||
    data.chargeDailyPaise !== undefined ||
    data.safeDepositPaise !== undefined ||
    data.condition !== undefined ||
    data.ageYears !== undefined ||
    data.estimatedPurchasePricePaise !== undefined;

  if (priceFieldsModified) {
    aiPriceVerification = await verifyPriceWithAi({
      name: data.name ?? existing.name,
      category: data.category ?? existing.category,
      ageYears: data.ageYears ?? existing.ageYears,
      condition: (data.condition as any) ?? existing.condition,
      estimatedPurchasePricePaise: data.estimatedPurchasePricePaise ?? existing.estimatedPurchasePricePaise,
      chargeHourlyPaise: data.chargeHourlyPaise ?? existing.chargeHourlyPaise,
      chargeDailyPaise: data.chargeDailyPaise ?? existing.chargeDailyPaise,
      safeDepositPaise: data.safeDepositPaise ?? existing.safeDepositPaise,
    });
    status = aiPriceVerification.verdict === 'FAIR' ? 'PUBLISHED' : 'DRAFT';
  }

  const res = await query(
    `UPDATE rental_items
     SET name = COALESCE($1, name),
         category = COALESCE($2, category),
         description = COALESCE($3, description),
         photos = COALESCE($4, photos),
         age_years = COALESCE($5, age_years),
         condition = COALESCE($6, condition),
         hourly_rate_paise = COALESCE($7, hourly_rate_paise),
         daily_rate_paise = COALESCE($8, daily_rate_paise),
         safe_deposit_paise = COALESCE($9, safe_deposit_paise),
         is_available = COALESCE($10, is_available),
         status = $11
     WHERE id = $12
     RETURNING *`,
    [
      data.name?.trim() || null,
      data.category?.toLowerCase().trim() || null,
      data.description?.trim() || null,
      data.photos ? JSON.stringify(data.photos) : null,
      data.ageYears,
      data.condition,
      data.chargeHourlyPaise,
      data.chargeDailyPaise,
      data.safeDepositPaise,
      data.isAvailable,
      status,
      id,
    ]
  );

  const updated = mapItem(res.rows[0]);
  auditService.log(userId, updated.societyId, 'RENTAL_ITEM_UPDATED', updated.id, 'RentalItem', {
    name: updated.name,
    status: updated.status,
  });

  return updated;
}

export async function toggleAvailability(
  id: string,
  userId: string,
  isAvailable?: boolean,
): Promise<RentalItemDocument> {
  const existing = await getItemById(id);
  if (!existing) throw new Error('Rental item not found');
  if (existing.ownerId?.id?.toString() !== userId && existing.ownerId?.toString() !== userId) {
    throw new Error('Not authorized to update this item');
  }

  const nextVal = isAvailable !== undefined ? isAvailable : !existing.isAvailable;
  const res = await query(`UPDATE rental_items SET is_available = $1 WHERE id = $2 RETURNING *`, [nextVal, id]);
  return mapItem(res.rows[0]);
}

export async function deleteItem(id: string, userId: string): Promise<void> {
  const existing = await getItemById(id);
  if (!existing) throw new Error('Rental item not found');
  if (existing.ownerId?.id?.toString() !== userId && existing.ownerId?.toString() !== userId) {
    throw new Error('Not authorized to delete this item');
  }

  await query('DELETE FROM rental_items WHERE id = $1', [id]);
  auditService.log(userId, existing.societyId, 'RENTAL_ITEM_DELETED', id, 'RentalItem', {
    name: existing.name,
  });
}

export async function escalateToPresident(
  id: string,
  userId: string,
  reason: string,
): Promise<RentalItemDocument> {
  const existing = await getItemById(id);
  if (!existing) throw new Error('Rental item not found');
  if (existing.ownerId?.id?.toString() !== userId && existing.ownerId?.toString() !== userId) {
    throw new Error('Not authorized to escalate this item');
  }

  const res = await query(
    `UPDATE rental_items SET status = 'PENDING_APPROVAL' WHERE id = $1 RETURNING *`,
    [id]
  );
  const updated = mapItem(res.rows[0]);

  const presRes = await query('SELECT id FROM users WHERE society_id = $1 AND role = $2', [updated.societyId, 'president']);
  for (const pres of presRes.rows) {
    await sendNotification(
      pres.id.toString(),
      'Rental Price Review Requested',
      `Resident requested review for "${updated.name}": ${reason}`,
      'RENTAL_REVIEW_REQUESTED',
      updated.id,
    );
  }

  auditService.log(userId, updated.societyId, 'RENTAL_PRICE_ESCALATED', updated.id, 'RentalItem', { reason });
  return updated;
}

export async function listPendingReviews(societyId: string): Promise<RentalItemDocument[]> {
  const res = await query(
    `SELECT ri.*, u.username as owner_username, f.number as flat_number
     FROM rental_items ri
     LEFT JOIN users u ON u.id = ri.owner_id
     LEFT JOIN flats f ON f.id = ri.flat_id
     WHERE ri.society_id = $1 AND ri.status = 'PENDING_APPROVAL'
     ORDER BY ri.created_at DESC`,
    [societyId]
  );
  return res.rows.map(mapItem);
}

export async function presidentReviewItem(
  id: string,
  presidentId: string,
  societyId: string,
  decision: 'APPROVE' | 'REJECT',
  reason: string,
): Promise<RentalItemDocument> {
  const newStatus = decision === 'APPROVE' ? 'PUBLISHED' : 'REJECTED';
  const res = await query(
    `UPDATE rental_items
     SET status = $1, ai_verified = $2
     WHERE id = $3 AND society_id = $4 AND status = 'PENDING_APPROVAL'
     RETURNING *`,
    [newStatus, decision === 'APPROVE', id, societyId]
  );

  if (!res.rows[0]) throw new Error('Rental item pending review not found');
  const item = mapItem(res.rows[0]);

  await sendNotification(
    item.ownerId?.id?.toString() || item.ownerId?.toString(),
    `Listing ${decision === 'APPROVE' ? 'Approved' : 'Rejected'}`,
    `President ${decision === 'APPROVE' ? 'approved' : 'rejected'} "${item.name}": ${reason}`,
    'RENTAL_REVIEW_DECIDED',
    item.id,
  );

  auditService.log(presidentId, societyId, 'RENTAL_REVIEW_DECISION', item.id, 'RentalItem', {
    decision,
    reason,
  });

  return item;
}
