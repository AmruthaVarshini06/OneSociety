import { query } from '../../../config/supabase';

export interface SuggestedVendor {
  source: 'SERVICE_HUB' | 'LOCAL';
  id: string;
  name: string;
  phone: string;
  trade: string;
  rating: number;
  jobsCompleted: number;
  availability: string;
  openJobsCount: number;
}

export interface BatchingTradeSuggestion {
  trade: string;
  count: number;
  clusterIds: string[];
  titles: string[];
  suggestedVendorNames: string[];
}

const CATEGORY_TO_TRADE_MAP: Record<string, string[]> = {
  'Electricity in common areas': ['Electrician', 'AC and appliance repair'],
  'Drainage and plumbing in common areas': ['Plumber'],
  'Water supply': ['Plumber', 'Electrician'],
  'Lift': ['Lift maintenance', 'Electrician'],
  'Structural issues in common areas': ['Carpenter', 'Masonry', 'Plumber'],
  'Clubhouse, gym, pool, and play area': ['AC and appliance repair', 'Electrician', 'Plumber'],
  'Cleanliness and garbage': ['Cleaning', 'Housekeeping'],
  'Security': ['CCTV Technician', 'Electrician', 'Security'],
  'Garden and landscaping': ['Gardener'],
  'Fire safety': ['Fire safety technician'],
  'Parking': ['Maintenance'],
  'Other': ['General repair'],
};

export async function getSuggestedVendors(societyId: string, category: string): Promise<SuggestedVendor[]> {
  const suggested: SuggestedVendor[] = [];
  const trades = CATEGORY_TO_TRADE_MAP[category] || ['General repair', 'Electrician', 'Plumber'];

  // 1. Fetch verified ServiceHub providers
  try {
    const spRes = await query(
      `SELECT * FROM service_providers WHERE society_id = $1 AND status = 'VERIFIED'`,
      [societyId]
    );

    for (const p of spRes.rows) {
      suggested.push({
        source: 'SERVICE_HUB',
        id: p.id,
        name: p.name,
        phone: p.phone || '',
        trade: p.category || 'Service Provider',
        rating: 4.8,
        jobsCompleted: 12,
        availability: 'Mon-Sat',
        openJobsCount: 0,
      });
    }
  } catch (err) {
    console.warn('[VENDORS] ServiceHub query fallback:', err);
  }

  // 2. Fetch registered Local Vendors
  try {
    const vRes = await query(
      `SELECT * FROM vendors WHERE society_id = $1`,
      [societyId]
    );

    for (const lv of vRes.rows) {
      suggested.push({
        source: 'LOCAL',
        id: lv.id,
        name: lv.name,
        phone: lv.phone || '',
        trade: lv.service_type,
        rating: Number(lv.rating) || 4.5,
        jobsCompleted: 8,
        availability: 'On-call',
        openJobsCount: 0,
      });
    }
  } catch (err) {
    console.warn('[VENDORS] Local vendors query fallback:', err);
  }

  return suggested.sort((a, b) => b.rating - a.rating);
}

export async function checkVendorScheduleClash(
  societyId: string,
  vendorPhone: string,
  visitDate: Date,
  currentClusterId?: string
): Promise<{ hasClash: boolean; clashingIssues: Array<{ title: string; clusterNumber: string; visitDate: Date }> }> {
  return {
    hasClash: false,
    clashingIssues: [],
  };
}

export async function detectBatchingOpportunities(societyId: string): Promise<BatchingTradeSuggestion[]> {
  return [];
}
