import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import app from '../src/app';
import { seedSection1 } from '../scripts/seed/section1-foundation';
import { seedSection5 } from '../scripts/seed/section5-complaints';
import { IssueCluster } from '../src/modules/complaints/models/issue-cluster.model';
import { Complaint } from '../src/modules/complaints/models/complaint.model';

let replSet: MongoMemoryReplSet;
let foundation: any;
let presidentToken: string;
let residentToken: string;
let resident2Token: string;

beforeAll(async () => {
  replSet = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  const uri = replSet.getUri();
  await mongoose.connect(uri);

  foundation = await seedSection1();
  await seedSection5(foundation);

  // Login President (ramesh.naidu)
  const presRes = await request(app).post('/api/v1/auth/login').send({
    username: 'ramesh.naidu',
    password: 'Demo@1234',
  });
  presidentToken = presRes.body.accessToken;

  // Login Resident 1 (suresh.kumar - A-102)
  const res1 = await request(app).post('/api/v1/auth/login').send({
    username: 'suresh.kumar',
    password: 'Demo@1234',
  });
  residentToken = res1.body.accessToken;

  // Login Resident 2 (nandini.shah - B-102)
  const res2 = await request(app).post('/api/v1/auth/login').send({
    username: 'nandini.shah',
    password: 'Demo@1234',
  });
  resident2Token = res2.body.accessToken;
});

afterAll(async () => {
  await mongoose.disconnect();
  await replSet.stop();
});

describe('Smart Complaint Handling Module End-to-End', () => {
  test('1. Scope check blocks flat-internal issues with ServiceHub recommendation', async () => {
    const res = await request(app)
      .post('/api/v1/complaints/scope-check')
      .set('Authorization', `Bearer ${residentToken}`)
      .send({
        description: 'My kitchen tap is leaking water inside my flat.',
        specificArea: 'Flat A-102 kitchen sink',
        category: 'Drainage and plumbing in common areas',
      });

    expect(res.status).toBe(200);
    expect(res.body.scopeStatus).toBe('INTERNAL_FLAT_BLOCKED');
    expect(res.body.suggestServiceHub).toBe(true);
    expect(res.body.message).toContain('ServiceHub');

    // Attempting to submit this flat issue directly should fail with 400
    const submitRes = await request(app)
      .post('/api/v1/complaints')
      .set('Authorization', `Bearer ${residentToken}`)
      .send({
        category: 'Drainage and plumbing in common areas',
        location: { block: 'A', floor: '1st', specificArea: 'Flat A-102 kitchen' },
        description: 'My kitchen tap is leaking water inside my flat.',
        photos: ['https://example.com/photo.jpg'],
      });

    expect(submitRes.status).toBe(400);
    expect(submitRes.body.isScopeError).toBe(true);
  });

  test('2. Multiple reports of same issue cluster together without blocking duplicates', async () => {
    // Resident 1 reports water motor issue
    const rep1 = await request(app)
      .post('/api/v1/complaints')
      .set('Authorization', `Bearer ${residentToken}`)
      .send({
        category: 'Water supply',
        location: { block: 'C', specificArea: 'Rooftop water tank motor' },
        description: 'Water pump tripped in Block C. Overhead tank dry.',
        photos: ['https://example.com/pump1.jpg'],
      });

    expect(rep1.status).toBe(201);
    const clusterId = rep1.body.cluster._id;
    const initialScore = rep1.body.cluster.priorityScore;

    // Resident 2 reports the same issue independently
    const rep2 = await request(app)
      .post('/api/v1/complaints')
      .set('Authorization', `Bearer ${resident2Token}`)
      .send({
        category: 'Water supply',
        location: { block: 'C', specificArea: 'Rooftop water tank motor' },
        description: 'No water in Block C flats. Please inspect the main pump.',
        photos: ['https://example.com/pump2.jpg'],
        linkToClusterId: clusterId,
      });

    expect(rep2.status).toBe(201);
    expect(rep2.body.cluster._id).toBe(clusterId);
    expect(rep2.body.cluster.reportCount).toBe(2);
    // Priority score increased due to logarithmic count curve
    expect(rep2.body.cluster.priorityScore).toBeGreaterThanOrEqual(initialScore);

    // Verify both complaints are stored separately
    const complaints = await Complaint.find({ clusterId });
    expect(complaints.length).toBe(2);
  });

  test('3. Safety Override sets priority to CRITICAL (score 100) on life hazard', async () => {
    const res = await request(app)
      .post('/api/v1/complaints')
      .set('Authorization', `Bearer ${residentToken}`)
      .send({
        category: 'Electricity in common areas',
        location: { block: 'A', floor: 'Ground', specificArea: 'Meter box room' },
        description: 'Exposed wiring with open sparking next to meter box. Child hazard!',
        photos: ['https://example.com/sparks.jpg'],
      });

    expect(res.status).toBe(201);
    expect(res.body.cluster.isSafetyOverride).toBe(true);
    expect(res.body.cluster.priorityScore).toBe(100);
    expect(res.body.cluster.priorityLevel).toBe('CRITICAL');
    expect(res.body.cluster.targetResponseHours).toBe(4);
  });

  test('4. Resident can edit/withdraw only before CONTACTED, blocked after', async () => {
    // Submit a fresh issue
    const sub = await request(app)
      .post('/api/v1/complaints')
      .set('Authorization', `Bearer ${residentToken}`)
      .send({
        category: 'Cleanliness and garbage',
        location: { block: 'A', specificArea: 'Stairwell lobby' },
        description: 'Dust and dry leaves accumulated near lobby.',
        photos: ['https://example.com/leaves.jpg'],
      });

    const complaintId = sub.body.complaint._id;
    const clusterId = sub.body.cluster._id;

    // Edit while NEW -> succeeds
    const editRes = await request(app)
      .put(`/api/v1/complaints/${complaintId}/edit`)
      .set('Authorization', `Bearer ${residentToken}`)
      .send({
        description: 'Heavy dust and construction debris accumulated near lobby.',
      });

    expect(editRes.status).toBe(200);

    // President contacts vendor
    await request(app)
      .post(`/api/v1/complaints/admin/cluster/${clusterId}/contacted`)
      .set('Authorization', `Bearer ${presidentToken}`)
      .send({
        vendorType: 'LOCAL',
        vendorName: 'CleanHome Staff',
        vendorPhone: '98490 99887',
        trade: 'Housekeeping',
        visitDate: '2026-11-25',
      });

    // Resident tries to edit after CONTACTED -> blocked with error
    const blockedEdit = await request(app)
      .put(`/api/v1/complaints/${complaintId}/edit`)
      .set('Authorization', `Bearer ${residentToken}`)
      .send({
        description: 'Attempting to change after contacted.',
      });

    expect(blockedEdit.status).toBe(500); // throws error
  });

  test('5. Non-president is blocked from president-only endpoints', async () => {
    const res = await request(app)
      .get('/api/v1/complaints/admin/dashboard')
      .set('Authorization', `Bearer ${residentToken}`);

    expect(res.status).toBe(403);
  });

  test('6. Complete lifecycle: CONTACTED -> IN_PROGRESS -> SOLVED -> Cost & Payment -> Reopen', async () => {
    // 1. Submit issue
    const sub = await request(app)
      .post('/api/v1/complaints')
      .set('Authorization', `Bearer ${residentToken}`)
      .send({
        category: 'Lift',
        location: { block: 'C', specificArea: 'Lift 1' },
        description: 'Lift 1 jerk on starting and floor alignment off by 2 inches.',
        photos: ['https://example.com/lift-jerk.jpg'],
      });

    const clusterId = sub.body.cluster._id;
    let version = sub.body.cluster.version;

    // 2. President contacts vendor
    const contactedRes = await request(app)
      .post(`/api/v1/complaints/admin/cluster/${clusterId}/contacted`)
      .set('Authorization', `Bearer ${presidentToken}`)
      .send({
        vendorType: 'LOCAL',
        vendorName: 'Metro Lift Services',
        vendorPhone: '98490 11223',
        trade: 'Lift maintenance',
        visitDate: '2026-11-25',
        expectedCompletion: '2026-11-26',
        clientVersion: version,
      });

    expect(contactedRes.status).toBe(200);
    expect(contactedRes.body.cluster.status).toBe('CONTACTED');
    version = contactedRes.body.cluster.version;

    // 3. Start Work In Progress
    const wipRes = await request(app)
      .post(`/api/v1/complaints/admin/cluster/${clusterId}/work-in-progress`)
      .set('Authorization', `Bearer ${presidentToken}`)
      .send({
        note: 'Technician re-calibrated leveling sensors and lubricated guide rails.',
        photos: ['https://example.com/rails.jpg'],
        clientVersion: version,
      });

    expect(wipRes.status).toBe(200);
    expect(wipRes.body.cluster.status).toBe('IN_PROGRESS');
    version = wipRes.body.cluster.version;

    // 4. Mark Solved (Requires after photo)
    const solvedRes = await request(app)
      .post(`/api/v1/complaints/admin/cluster/${clusterId}/solved`)
      .set('Authorization', `Bearer ${presidentToken}`)
      .send({
        afterPhotos: ['https://example.com/lift-fixed.jpg'],
        completionNote: 'Leveling calibrated. Tested 10 round trips, zero jerk.',
        clientVersion: version,
      });

    expect(solvedRes.status).toBe(200);
    expect(solvedRes.body.cluster.status).toBe('SOLVED');
    version = solvedRes.body.cluster.version;

    // 5. Record Cost and Payment
    const costRes = await request(app)
      .post(`/api/v1/complaints/admin/cluster/${clusterId}/cost`)
      .set('Authorization', `Bearer ${presidentToken}`)
      .send({
        breakdown: [
          { itemType: 'VENDOR_SERVICE', description: 'Technician alignment fee', amountPaise: 80000 },
          { itemType: 'GOODS_PARTS', description: 'Sensor replacement', amountPaise: 40000 },
        ],
        clientVersion: version,
      });

    expect(costRes.status).toBe(200);
    expect(costRes.body.cluster.costs.totalAmountPaise).toBe(120000); // Rs 1,200
    version = costRes.body.cluster.version;

    const payRes = await request(app)
      .post(`/api/v1/complaints/admin/cluster/${clusterId}/payment`)
      .set('Authorization', `Bearer ${presidentToken}`)
      .send({
        paidToVendor: 'Metro Lift Services',
        amountPaise: 120000,
        paymentMode: 'UPI',
        referenceNumber: 'UPI-METRO-112233',
        clientVersion: version,
      });

    expect(payRes.status).toBe(200);
    expect(payRes.body.cluster.payment.isPaid).toBe(true);

    // 6. Resident reopens issue with reason & photo
    const reopenRes = await request(app)
      .post(`/api/v1/complaints/cluster/${clusterId}/reopen`)
      .set('Authorization', `Bearer ${residentToken}`)
      .send({
        reason: 'Lift stopped again this evening on floor 3. Door not opening.',
        photos: ['https://example.com/lift-stopped-again.jpg'],
      });

    expect(reopenRes.status).toBe(200);
    expect(reopenRes.body.cluster.status).toBe('REOPENED');
    expect(reopenRes.body.cluster.reopenCount).toBe(1);
  });

  test('7. Optimistic concurrency detects edit conflicts across devices', async () => {
    const cluster = await IssueCluster.findOne({ status: 'NEW' });
    expect(cluster).toBeTruthy();

    const staleVersion = cluster!.version - 1; // outdated version

    const conflictRes = await request(app)
      .post(`/api/v1/complaints/admin/cluster/${cluster!._id}/work-in-progress`)
      .set('Authorization', `Bearer ${presidentToken}`)
      .send({
        note: 'Attempting update with stale version',
        clientVersion: staleVersion,
      });

    expect(conflictRes.status).toBe(409);
    expect(conflictRes.body.isConflict).toBe(true);
    expect(conflictRes.body.error).toContain('This issue was updated from another device');
  });
});
