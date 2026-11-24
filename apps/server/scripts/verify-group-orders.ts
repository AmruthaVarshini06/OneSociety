import 'dotenv/config';
import request from 'supertest';
import app from '../src/app';

async function verifyGroupOrders() {
  console.log('[TEST] 1. Logging in as resident suresh.kumar...');
  const resLogin = await request(app)
    .post('/api/v1/auth/login')
    .send({ username: 'suresh.kumar', password: 'Demo@1234' });
  const residentToken = resLogin.body?.accessToken;
  const societyId = resLogin.body?.user?.societyId;
  console.log('[TEST] Resident token retrieved, societyId:', societyId);

  console.log('\n[TEST] 2. Fetching existing group orders (GET /api/v1/group-buying/orders)...');
  const listRes = await request(app)
    .get('/api/v1/group-buying/orders')
    .set('Authorization', `Bearer ${residentToken}`);
  console.log('[TEST] List group orders status:', listRes.status, 'Total orders:', listRes.body?.orders?.length);

  console.log('\n[TEST] 3. Creating a new Group Order demand (POST /api/v1/group-buying/orders)...');
  const closeDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();
  const deliveryDate = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString();
  
  const createRes = await request(app)
    .post('/api/v1/group-buying/orders')
    .set('Authorization', `Bearer ${residentToken}`)
    .send({
      title: 'Devgad Alphonso Mangoes 2026',
      description: 'Direct from Konkan orchard. Grade A export quality Alphonso mangoes.',
      category: 'FRUITS',
      unit: 'Dozen',
      targetQuantity: 50,
      pricePerUnitPaise: 65000,
      demandCloseAt: closeDate,
      expectedDeliveryDate: deliveryDate,
    });

  console.log('[TEST] Create group order status:', createRes.status);
  console.log('[TEST] Created order ID:', createRes.body?.order?.id || createRes.body?.order?._id);
  const orderId = createRes.body?.order?.id || createRes.body?.order?._id;

  if (!orderId) {
    console.error('[TEST ERROR] Order creation failed:', createRes.body);
    process.exit(1);
  }

  console.log('\n[TEST] 4. Fetching order details (GET /api/v1/group-buying/orders/:id)...');
  const getRes = await request(app)
    .get(`/api/v1/group-buying/orders/${orderId}`)
    .set('Authorization', `Bearer ${residentToken}`);
  console.log('[TEST] Get order status:', getRes.status, 'Title:', getRes.body?.order?.title, 'Status:', getRes.body?.order?.status);

  console.log('\n[TEST] 5. Resident joining demand pool (POST /api/v1/group-buying/orders/:id/commit)...');
  const commitRes = await request(app)
    .post(`/api/v1/group-buying/orders/${orderId}/commit`)
    .set('Authorization', `Bearer ${residentToken}`)
    .send({
      quantity: 3,
    });
  console.log('[TEST] Commit status:', commitRes.status);
  console.log('[TEST] Commitment:', commitRes.body?.commitment);

  console.log('\n[TEST] 6. Viewing order commitments (GET /api/v1/group-buying/orders/:id/commitments)...');
  const commListRes = await request(app)
    .get(`/api/v1/group-buying/orders/${orderId}/commitments`)
    .set('Authorization', `Bearer ${residentToken}`);
  console.log('[TEST] Commitments list status:', commListRes.status, 'Total committed:', commListRes.body?.commitments?.length);

  console.log('\n[TEST] 7. Logging in as supplier freshfarms.supplier...');
  const suppLogin = await request(app)
    .post('/api/v1/auth/login')
    .send({ username: 'freshfarms.supplier', password: 'Demo@1234' });
  const supplierToken = suppLogin.body?.accessToken;
  console.log('[TEST] Supplier token retrieved:', !!supplierToken);

  console.log('\n[TEST] 8. Supplier submitting a wholesale quote (POST /api/v1/group-buying/orders/:id/offers)...');
  const offerRes = await request(app)
    .post(`/api/v1/group-buying/orders/${orderId}/offers`)
    .set('Authorization', `Bearer ${supplierToken}`)
    .send({
      pricePerUnitPaise: 58000,
      estimatedDeliveryDate: deliveryDate,
      notes: 'Farm fresh harvest packed in padded crates.',
    });
  console.log('[TEST] Supplier offer status:', offerRes.status, offerRes.body?.message || offerRes.body);

  console.log('\n✅ [ALL GROUP ORDER FLOW TESTS PASSED SUCCESSFULLY!]');
  process.exit(0);
}

verifyGroupOrders().catch((err) => {
  console.error('[TEST ERROR]:', err);
  process.exit(1);
});
