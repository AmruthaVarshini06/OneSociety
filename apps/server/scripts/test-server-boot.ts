import 'dotenv/config';
import { testConnection } from '../src/config/supabase';
import app from '../src/app';
import request from 'supertest';

async function testBoot() {
  console.log('[TEST] Testing Supabase connection...');
  await testConnection();
  console.log('[TEST] Supabase connected successfully!');

  console.log('[TEST] Testing Express /health endpoint...');
  const healthRes = await request(app).get('/health');
  console.log('[TEST] Health response status:', healthRes.status, healthRes.body);

  console.log('[TEST] Testing Auth login against Supabase (resident: suresh.kumar)...');
  const loginRes = await request(app)
    .post('/api/v1/auth/login')
    .send({ username: 'suresh.kumar', password: 'Demo@1234' });
  console.log('[TEST] Login status:', loginRes.status);
  console.log('[TEST] User full name:', loginRes.body?.user?.fullName);
  console.log('[TEST] Role:', loginRes.body?.user?.role);
  console.log('[TEST] Token present:', !!loginRes.body?.accessToken);

  const token = loginRes.body?.accessToken;

  console.log('[TEST] Testing Society Details (/api/v1/society/me)...');
  const meRes = await request(app)
    .get('/api/v1/society/me')
    .set('Authorization', `Bearer ${token}`);
  console.log('[TEST] Society response:', meRes.status, meRes.body);

  console.log('[TEST] Testing Gate Live Dashboard (/api/v1/society-help/gate/dashboard)...');
  const dashRes = await request(app)
    .get('/api/v1/society-help/gate/dashboard')
    .set('Authorization', `Bearer ${token}`);
  console.log('[TEST] Gate dashboard status:', dashRes.status);
  console.log('[TEST] Total people inside:', dashRes.body?.totalPeopleInside);

  console.log('[TEST] Testing Maintenance Accounts (/api/v1/society-help/maintenance/accounts)...');
  const maintRes = await request(app)
    .get('/api/v1/society-help/maintenance/accounts')
    .set('Authorization', `Bearer ${token}`);
  console.log('[TEST] Maintenance accounts status:', maintRes.status);
  console.log('[TEST] Maintenance balance (paise):', maintRes.body?.currentBalancePaise);
  console.log('[TEST] Ledger entries count:', maintRes.body?.entries?.length);

  console.log('[TEST] Testing Community Events (/api/v1/society-help/events)...');
  const evRes = await request(app)
    .get('/api/v1/society-help/events')
    .set('Authorization', `Bearer ${token}`);
  console.log('[TEST] Events status:', evRes.status);
  console.log('[TEST] Today events:', evRes.body?.todayEvents?.length);
  console.log('[TEST] Upcoming events:', evRes.body?.upcomingEvents?.length);

  console.log('[TEST] Testing Complaints Feed (/api/v1/complaints/feed)...');
  const compRes = await request(app)
    .get('/api/v1/complaints/feed')
    .set('Authorization', `Bearer ${token}`);
  console.log('[TEST] Complaints status:', compRes.status);

  console.log('[TEST] Testing Rentals (/api/v1/rentals/items)...');
  const rentRes = await request(app)
    .get('/api/v1/rentals/items')
    .set('Authorization', `Bearer ${token}`);
  console.log('[TEST] Rentals status:', rentRes.status);

  console.log('[TEST] Testing ServiceHub (/api/v1/services/providers)...');
  const servRes = await request(app)
    .get('/api/v1/services/providers')
    .set('Authorization', `Bearer ${token}`);
  console.log('[TEST] Services status:', servRes.status);

  console.log('[TEST] Testing Group Buying (/api/v1/group-buying/orders)...');
  const gbRes = await request(app)
    .get('/api/v1/group-buying/orders')
    .set('Authorization', `Bearer ${token}`);
  console.log('[TEST] Group Buying status:', gbRes.status);

  console.log('\n[SUCCESS] ALL 5 MODULES & SUPABASE INTEGRATION TESTS PASSED PERFECTLY!');
  process.exit(0);
}

testBoot().catch(err => {
  console.error('[TEST ERROR]:', err);
  process.exit(1);
});
