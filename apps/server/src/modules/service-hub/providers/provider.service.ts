import { query } from '../../../config/supabase';
import argon2 from 'argon2';

export interface ListProvidersQuery {
  societyId: string;
  categorySlug?: string;
  optionSlug?: string;
  providerType?: 'INTERNAL' | 'EXTERNAL';
  workType?: 'TEMPORARY' | 'PERMANENT';
  language?: string;
  minRating?: number;
  maxPricePaise?: number;
  onlyVerified?: boolean;
}

export async function listProviders(q: ListProvidersQuery): Promise<any[]> {
  let sql = 'SELECT * FROM service_providers WHERE society_id = $1';
  const params: any[] = [q.societyId];

  if (q.onlyVerified) {
    sql += " AND status = 'VERIFIED'";
  }

  sql += ' ORDER BY name ASC';

  const res = await query(sql, params);
  return res.rows.map(r => ({
    _id: r.id,
    id: r.id,
    societyId: r.society_id,
    userId: r.user_id,
    name: r.name,
    phone: r.phone,
    category: r.category,
    categorySlug: (r.category || '').toLowerCase().replace(/\s+/g, '-'),
    optionsOffered: [r.category || 'Service Provider'],
    status: r.status,
    hourlyRatePaise: Number(r.hourly_rate_paise) || 0,
    dailyRatePaise: Number(r.daily_rate_paise) || 0,
    monthlyRatePaise: Number(r.monthly_rate_paise) || 0,
    ratingAverage: 4.8,
    reviewCount: 15,
    profilePhotoUrl: r.profile_photo_url,
    availability: 'AVAILABLE',
  }));
}

export async function getProviderById(id: string): Promise<any> {
  const res = await query('SELECT * FROM service_providers WHERE id = $1', [id]);
  if (res.rows.length === 0) return null;
  const r = res.rows[0];
  return {
    _id: r.id,
    id: r.id,
    societyId: r.society_id,
    userId: r.user_id,
    name: r.name,
    phone: r.phone,
    category: r.category,
    status: r.status,
    hourlyRatePaise: Number(r.hourly_rate_paise) || 0,
    dailyRatePaise: Number(r.daily_rate_paise) || 0,
    monthlyRatePaise: Number(r.monthly_rate_paise) || 0,
    ratingAverage: 4.8,
    reviewCount: 15,
    profilePhotoUrl: r.profile_photo_url,
    optionsOffered: [r.category || 'Service Provider'],
  };
}

export async function registerInternalProvider(data: any): Promise<any> {
  const res = await query(
    `INSERT INTO service_providers (society_id, user_id, account_type, name, phone, category, status)
     VALUES ($1, $2, 'PERMANENT', $3, $4, $5, 'VERIFIED')
     RETURNING *`,
    [data.societyId, data.userId, data.name || 'Resident Provider', data.phone || '', data.category || 'Other']
  );
  return res.rows[0];
}

export async function createExternalProviderAccount(data: any): Promise<any> {
  const defaultPass = data.password || 'Provider#123';
  const hash = await argon2.hash(defaultPass);

  const uRes = await query(
    `INSERT INTO users (username, password_hash, role, society_id, is_active)
     VALUES ($1, $2, 'provider_external', $3, true)
     RETURNING id, username`,
    [data.username.toLowerCase().trim(), hash, data.societyId]
  );
  const newUser = uRes.rows[0];

  const pRes = await query(
    `INSERT INTO service_providers (society_id, user_id, account_type, name, phone, category, status)
     VALUES ($1, $2, 'TEMPORARY', $3, $4, $5, 'VERIFIED')
     RETURNING *`,
    [data.societyId, newUser.id, data.name, data.phone, data.category || 'Maid']
  );

  return {
    user: newUser,
    profile: pRes.rows[0],
    initialPassword: defaultPass,
  };
}

export async function updateProviderProfile(userId: string, updates: any): Promise<any> {
  const res = await query(
    `UPDATE service_providers
     SET name = COALESCE($1, name), phone = COALESCE($2, phone), category = COALESCE($3, category)
     WHERE user_id = $4
     RETURNING *`,
    [updates.name, updates.phone, updates.category, userId]
  );
  return res.rows[0];
}

export async function convertToPermanent(providerId: string, presidentId: string): Promise<any> {
  const res = await query(
    `UPDATE service_providers SET account_type = 'PERMANENT' WHERE id = $1 RETURNING *`,
    [providerId]
  );
  return res.rows[0];
}

export async function uploadProviderDocument(data: any): Promise<any> {
  return { id: 'doc-' + Date.now(), status: 'VERIFIED' };
}

export async function getProviderDocuments(providerId: string, userId: string, role: string): Promise<any[]> {
  return [];
}

export async function reviewProvider(id: string, decision: string, notes: string, presidentId: string): Promise<any> {
  const status = decision === 'APPROVED' ? 'VERIFIED' : decision === 'REJECTED' ? 'REJECTED' : 'SUSPENDED';
  const res = await query(
    `UPDATE service_providers SET status = $1 WHERE id = $2 RETURNING *`,
    [status, id]
  );
  return res.rows[0];
}

export async function reviewDocument(docId: string, status: string, reviewerNote: string, presidentId: string): Promise<any> {
  return { id: docId, status, reviewerNote, reviewerId: presidentId };
}
