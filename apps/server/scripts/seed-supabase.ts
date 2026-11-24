import 'dotenv/config';
import argon2 from 'argon2';
import { query } from '../src/config/supabase';

async function seedSupabase() {
  console.info('[SUPABASE SEED] Starting full society seed into Supabase...');

  // 1. Clean existing data in reverse dependency order
  console.info('[SUPABASE SEED] Cleaning existing tables...');
  await query('TRUNCATE TABLE emergency_alerts, community_events, expense_queries, maintenance_ledgers, maintenance_dues, manual_visitor_logs, gate_events, qr_passes, vendors, complaints, issue_clusters, service_visits, service_agreements, service_providers, rental_bookings, rental_items, delivery_passes, commitments, demand_items, suppliers, group_orders, escrow_entries, notifications, users, flats, blocks, societies CASCADE;');

  // 2. Society
  console.info('[SUPABASE SEED] Creating society: Green Valley Apartments...');
  const socRes = await query(`
    INSERT INTO societies (name, address, city, pincode)
    VALUES ('Green Valley Apartments', 'Plot 42, Hitech City Main Road, Madhapur', 'Hyderabad', '500081')
    RETURNING id;
  `);
  const societyId = socRes.rows[0].id;

  // 3. Blocks A, B, C, D
  console.info('[SUPABASE SEED] Creating blocks A, B, C, D...');
  const blockIds: Record<string, string> = {};
  for (const b of ['A', 'B', 'C', 'D']) {
    const bRes = await query(`INSERT INTO blocks (society_id, name) VALUES ($1, $2) RETURNING id;`, [societyId, b]);
    blockIds[b] = bRes.rows[0].id;
  }

  // 4. Flats (6 flats per block: 101, 102, 201, 202, 301, 302)
  console.info('[SUPABASE SEED] Creating 24 flats across 4 blocks...');
  const flatNumbers = ['101', '102', '201', '202', '301', '302'];
  const nobodyHomeFlats = new Set(['A-102', 'A-302', 'B-201', 'C-101', 'C-302', 'D-202']);
  const flatIds: Record<string, string> = {};

  for (const b of ['A', 'B', 'C', 'D']) {
    for (const num of flatNumbers) {
      const code = `${b}-${num}`;
      const isHome = !nobodyHomeFlats.has(code);
      const floor = parseInt(num[0], 10);
      const fRes = await query(`
        INSERT INTO flats (society_id, block_id, number, floor, is_at_home)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id;
      `, [societyId, blockIds[b], num, floor, isHome]);
      flatIds[code] = fRes.rows[0].id;
    }
  }

  // 5. Users
  console.info('[SUPABASE SEED] Hashing passwords and creating users...');
  const residentHash = await argon2.hash('Demo@1234');
  const guardHash = await argon2.hash('Guard@1234');
  const providerHash = await argon2.hash('Provider#123');
  const deliveryHash = await argon2.hash('Delivery@1');
  const supplierHash = await argon2.hash('Supplier@1234');

  const userIds: Record<string, string> = {};

  // President (Ramesh Naidu - Flat A-101)
  const presRes = await query(`
    INSERT INTO users (username, email, password_hash, role, society_id, flat_id)
    VALUES ('ramesh.naidu', 'ramesh@greenvalley.local', $1, 'president', $2, $3)
    RETURNING id;
  `, [residentHash, societyId, flatIds['A-101']]);
  userIds['ramesh.naidu'] = presRes.rows[0].id;

  // Residents
  const residentsList = [
    { u: 'suresh.kumar', f: 'A-102', e: 'suresh@greenvalley.local' },
    { u: 'vijay.reddy', f: 'A-201', e: 'vijay@greenvalley.local' },
    { u: 'ananya.rao', f: 'A-202', e: 'ananya@greenvalley.local' },
    { u: 'srinivas.rao', f: 'A-301', e: 'srinivas@greenvalley.local' },
    { u: 'lakshmi.devi', f: 'A-302', e: 'lakshmi@greenvalley.local' },
    { u: 'rajan.pillai', f: 'B-101', e: 'rajan@greenvalley.local' },
    { u: 'nandini.shah', f: 'B-102', e: 'nandini@greenvalley.local' },
    { u: 'meena.iyer', f: 'B-201', e: 'meena@greenvalley.local' },
    { u: 'priya.sharma', f: 'B-202', e: 'priya@greenvalley.local' },
    { u: 'arun.nair', f: 'B-301', e: 'arun@greenvalley.local' },
    { u: 'deepa.menon', f: 'B-302', e: 'deepa@greenvalley.local' },
    { u: 'gopal.krishna', f: 'C-101', e: 'gopal@greenvalley.local' },
    { u: 'divya.menon', f: 'C-102', e: 'divya@greenvalley.local' },
    { u: 'rohit.verma', f: 'C-201', e: 'rohit@greenvalley.local' },
    { u: 'sunita.bai', f: 'C-202', e: 'sunita@greenvalley.local' },
    { u: 'harish.goud', f: 'C-301', e: 'harish@greenvalley.local' },
    { u: 'kavitha.rao', f: 'C-302', e: 'kavitha@greenvalley.local' },
    { u: 'prasad.babu', f: 'D-101', e: 'prasad@greenvalley.local' },
    { u: 'fatima.begum', f: 'D-102', e: 'fatima@greenvalley.local' },
    { u: 'karthik.reddy', f: 'D-201', e: 'karthik@greenvalley.local' },
    { u: 'pooja.nair', f: 'D-202', e: 'pooja@greenvalley.local' },
    { u: 'sunil.khanna', f: 'D-301', e: 'sunil@greenvalley.local' },
    { u: 'rekha.joshi', f: 'D-302', e: 'rekha@greenvalley.local' },
  ];

  for (const r of residentsList) {
    const res = await query(`
      INSERT INTO users (username, email, password_hash, role, society_id, flat_id)
      VALUES ($1, $2, $3, 'resident', $4, $5)
      RETURNING id;
    `, [r.u, r.e, residentHash, societyId, flatIds[r.f]]);
    userIds[r.u] = res.rows[0].id;
  }

  // Guards
  for (const g of ['guard.gate1', 'guard.gate2']) {
    const res = await query(`
      INSERT INTO users (username, password_hash, role, society_id)
      VALUES ($1, $2, 'guard', $3)
      RETURNING id;
    `, [g, guardHash, societyId]);
    userIds[g] = res.rows[0].id;
  }

  // Delivery
  for (const d of ['delivery.1', 'delivery.2']) {
    const res = await query(`
      INSERT INTO users (username, password_hash, role, society_id)
      VALUES ($1, $2, 'delivery_partner', $3)
      RETURNING id;
    `, [d, deliveryHash, societyId]);
    userIds[d] = res.rows[0].id;
  }

  // Service Providers
  const providers = [
    { u: 'sunita_maid', role: 'provider_external', cat: 'Domestic Help (Permanent)' },
    { u: 'lakshmi_maid', role: 'provider_external', cat: 'Domestic Help (Temporary)' },
    { u: 'suresh_repair', role: 'provider_external', cat: 'Home Repair & Electrician' },
    { u: 'priya_a202', role: 'provider_internal', cat: 'School Tuition (Classes 1-10)' },
  ];

  for (const p of providers) {
    const res = await query(`
      INSERT INTO users (username, password_hash, role, society_id)
      VALUES ($1, $2, $3, $4)
      RETURNING id;
    `, [p.u, providerHash, p.role, societyId]);
    userIds[p.u] = res.rows[0].id;

    await query(`
      INSERT INTO service_providers (society_id, user_id, name, category, hourly_rate_paise, daily_rate_paise, monthly_rate_paise)
      VALUES ($1, $2, $3, $4, 25000, 150000, 350000);
    `, [societyId, userIds[p.u], p.u.replace('_', ' ').toUpperCase(), p.cat]);
  }

  // 6. QR Passes & Gate Events
  console.info('[SUPABASE SEED] Seeding QR Passes and Gate Logs...');
  // Family pass for Flat A-102
  const passA102 = await query(`
    INSERT INTO qr_passes (society_id, pass_type, pass_code, owner_name, flat_code, expected_people, people_currently_inside, people_entered_total)
    VALUES ($1, 'FAMILY', 'PASS-FAM-A102', 'Suresh Kumar Family', 'A-102', 4, 2, 4)
    RETURNING id;
  `, [societyId]);

  // Provider pass
  await query(`
    INSERT INTO qr_passes (society_id, pass_type, pass_code, owner_name, service_category, expected_people, people_currently_inside)
    VALUES ($1, 'SERVICE_PROVIDER', 'PASS-PRV-SUNITA', 'Sunita Bai', 'Domestic Help', 1, 1);
  `, [societyId]);

  // Gate Events
  await query(`
    INSERT INTO gate_events (society_id, pass_id, pass_code, pass_type, direction, count, guard_name, flat_code, owner_name)
    VALUES ($1, $2, 'PASS-FAM-A102', 'FAMILY', 'ENTRY', 2, 'Ramu Guard', 'A-102', 'Suresh Kumar Family');
  `, [societyId, passA102.rows[0].id]);

  // Manual Visitor Logs
  await query(`
    INSERT INTO manual_visitor_logs (society_id, visitor_type, visitor_name, flat_code, purpose, guard_name, status, accepted_parcel_at_gate)
    VALUES 
    ($1, 'DELIVERY', 'Amazon Logistics', 'A-102', 'Parcel Delivery', 'Ramu Guard', 'DENIED', TRUE),
    ($1, 'VISITOR', 'Vikram Malhotra', 'B-101', 'Friend Visit', 'Ramu Guard', 'ALLOWED', FALSE);
  `, [societyId]);

  // 7. Maintenance Dues (6 Months)
  console.info('[SUPABASE SEED] Seeding 6 Months of Maintenance Dues & Ledger...');
  const months = ['2026-06', '2026-07', '2026-08', '2026-09', '2026-10', '2026-11'];
  for (const m of months) {
    for (const [code, fId] of Object.entries(flatIds)) {
      const isNovA102 = m === '2026-11' && code === 'A-102';
      const status = isNovA102 ? 'PENDING' : 'PAID';
      const paidAmount = isNovA102 ? null : 250000;
      const receiptNo = isNovA102 ? null : `REC-${m.replace('-', '')}-${code.replace('-', '')}`;
      const resUser = userIds['suresh.kumar'];

      await query(`
        INSERT INTO maintenance_dues (society_id, resident_user_id, flat_code, billing_month, amount_paise, status, paid_amount_paise, receipt_number)
        VALUES ($1, $2, $3, $4, 250000, $5, $6, $7)
        ON CONFLICT (flat_code, billing_month) DO NOTHING;
      `, [societyId, resUser, code, m, status, paidAmount, receiptNo]);
    }
  }

  // 8. Maintenance Ledger Entries
  await query(`
    INSERT INTO maintenance_ledgers (society_id, entry_number, entry_type, transaction_date, category, amount_paise, payee_or_payer, description, proof_photos, balance_after_paise)
    VALUES
    ($1, 'TXN-202611-001', 'INCOME', '2026-11-01', 'MAINTENANCE_DUES', 6000000, 'Society Residents', 'Monthly Maintenance Collection for 24 flats', '["https://res.cloudinary.com/demo/image/upload/sample.jpg"]'::jsonb, 16000000),
    ($1, 'TXN-202611-002', 'EXPENSE', '2026-11-03', 'SECURITY', 3200000, 'Security Agency (Ramu & Shyam)', 'Watchman Monthly Payroll with Slips', '["https://res.cloudinary.com/demo/image/upload/sample.jpg"]'::jsonb, 12800000),
    ($1, 'TXN-202611-003', 'EXPENSE', '2026-11-05', 'ELECTRICITY', 1850000, 'TSSPDCL Common Area Power', 'Common Corridor, Gate & Lift Power Bill', '["https://res.cloudinary.com/demo/image/upload/sample.jpg"]'::jsonb, 10950000),
    ($1, 'TXN-202611-004', 'EXPENSE', '2026-11-10', 'LIFT_AMC', 1200000, 'Schindler Elevators AMC', 'Quarterly Preventive Lift Inspection & Lubrication', '["https://res.cloudinary.com/demo/image/upload/sample.jpg"]'::jsonb, 9750000);
  `, [societyId]);

  // 9. Issue Clusters & Complaints
  console.info('[SUPABASE SEED] Seeding Complaints & Issue Clusters...');
  const liftCluster = await query(`
    INSERT INTO issue_clusters (society_id, title, category, location, priority, status)
    VALUES ($1, 'Lift 2 Jerking and Stopping between 2nd & 3rd Floor', 'LIFT', 'Block B, Lift 2', 'HIGH', 'IN_PROGRESS')
    RETURNING id;
  `, [societyId]);

  await query(`
    INSERT INTO complaints (society_id, cluster_id, resident_id, flat_code, category, location, description, photos)
    VALUES ($1, $2, $3, 'B-202', 'LIFT', 'Block B, Lift 2', 'Lift 2 made grinding noise and stopped with lights flickering.', '["https://res.cloudinary.com/demo/image/upload/sample.jpg"]'::jsonb);
  `, [societyId, liftCluster.rows[0].id, userIds['priya.sharma']]);

  // 10. Community Events
  console.info('[SUPABASE SEED] Seeding Community Events...');
  await query(`
    INSERT INTO community_events (society_id, title, event_type, start_date, end_date, daily_time_from, daily_time_to, host_flat_code, estimated_visitors, has_loud_sound, is_quiet_hours_flagged, guest_pass_code)
    VALUES ($1, 'Aarav 5th Birthday Celebration', 'BIRTHDAY', CURRENT_DATE, CURRENT_DATE, '17:00', '22:30', 'D-101', 35, TRUE, TRUE, 'EVT-D101-BDAY');
  `, [societyId]);

  // 11. Emergency SOS Alert
  console.info('[SUPABASE SEED] Seeding Emergency Alert...');
  await query(`
    INSERT INTO emergency_alerts (society_id, flat_code, resident_user_id, status, notes, acknowledged_by_guard_id, acknowledged_at)
    VALUES ($1, 'A-102', $2, 'ACKNOWLEDGED', 'Immediate security response required at Flat A-102', $3, NOW());
  `, [societyId, userIds['suresh.kumar'], userIds['guard.gate1']]);

  console.info('========================================================');
  console.info('[SUPABASE SEED] Full society successfully seeded in Supabase!');
  console.info('All 24 flats, residents, complaints, dues, and gate passes are live in Supabase PostgreSQL.');
  console.info('========================================================');
  process.exit(0);
}

seedSupabase().catch((err) => {
  console.error('[SUPABASE SEED] Error seeding Supabase:', err);
  process.exit(1);
});
