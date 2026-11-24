import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import app from '../src/app';
import { seedSection1 } from '../scripts/seed/section1-foundation';
import { seedSection4 } from '../scripts/seed/section4-servicehub';
import { seedSection5 } from '../scripts/seed/section5-complaints';
import { seedSection6 } from '../scripts/seed/section6-societyhelp';
import { QrPass } from '../src/modules/society-help/models/qr-pass.model';
import { MaintenanceDue } from '../src/modules/society-help/models/maintenance-due.model';
import { MaintenanceLedgerEntry } from '../src/modules/society-help/models/maintenance-ledger.model';
import { EmergencyAlert } from '../src/modules/society-help/models/emergency-alert.model';
import { Flat } from '../src/models/Flat';

let replSet: MongoMemoryReplSet;
let foundation: any;
let presidentToken: string;
let residentToken: string;
let guardToken: string;

beforeAll(async () => {
  replSet = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  const uri = replSet.getUri();
  await mongoose.connect(uri);

  foundation = await seedSection1();
  await seedSection4(foundation);
  await seedSection5(foundation);
  await seedSection6(foundation);

  // Login President
  const presRes = await request(app).post('/api/v1/auth/login').send({
    username: 'ramesh.naidu',
    password: 'Demo@1234',
  });
  presidentToken = presRes.body.accessToken;

  // Login Resident (suresh.kumar - A-102)
  const resRes = await request(app).post('/api/v1/auth/login').send({
    username: 'suresh.kumar',
    password: 'Demo@1234',
  });
  residentToken = resRes.body.accessToken;

  // Login Guard (guard.gate1)
  const guardRes = await request(app).post('/api/v1/auth/login').send({
    username: 'guard.gate1',
    password: 'Guard@1234',
  });
  guardToken = guardRes.body.accessToken;
}, 60000);

afterAll(async () => {
  await mongoose.disconnect();
  await replSet.stop();
});

describe('Module 5: Society Help - Integration Test Suite', () => {
  // Test 1: Guard CANNOT create visitor pass
  it('strictly forbids security guard from creating visitor passes', async () => {
    const res = await request(app)
      .post('/api/v1/society-help/gate/passes/visitor')
      .set('Authorization', `Bearer ${guardToken}`)
      .send({
        visitorName: 'Sneha Roy',
        purpose: 'Friend',
        expectedPeople: 1,
      });

    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/guard/i);
  });

  // Test 2: Resident creates visitor pass and gets shareable pass
  let createdVisitorPassCode = '';
  let createdVisitorPassId = '';
  it('allows resident to create a visitor pass with QR code and shareable link', async () => {
    const res = await request(app)
      .post('/api/v1/society-help/gate/passes/visitor')
      .set('Authorization', `Bearer ${residentToken}`)
      .send({
        visitorName: 'Vikas Khanna',
        visitorPhone: '9849012345',
        purpose: 'Dinner Party',
        expectedPeople: 3,
      });

    expect(res.status).toBe(201);
    expect(res.body.passCode).toMatch(/^PASS-/);
    expect(res.body.visitorName).toBe('Vikas Khanna');
    expect(res.body.expectedPeople).toBe(3);
    expect(res.body.status).toBe('ACTIVE');

    createdVisitorPassCode = res.body.passCode;
    createdVisitorPassId = res.body._id;
  });

  // Test 3: Public pass lookup without authentication
  it('allows external visitors to view pass link without login', async () => {
    const res = await request(app).get(
      `/api/v1/society-help/gate/passes/code/${createdVisitorPassCode}`
    );

    expect(res.status).toBe(200);
    expect(res.body.passCode).toBe(createdVisitorPassCode);
    expect(res.body.visitorName).toBe('Vikas Khanna');
    expect(res.body.status).toBe('ACTIVE');
  });

  // Test 4: Guard scan & smart direction suggestion
  it('guard scans pass: suggests ENTRY when 0 inside, EXIT when inside > 0', async () => {
    // Ensure Flat A-102 is marked at home for this scan test
    await Flat.updateOne({ number: 'A-102' }, { $set: { isAtHome: true } });

    // Scan newly created pass (currently 0 inside)
    const scan1 = await request(app)
      .post('/api/v1/society-help/gate/scan')
      .set('Authorization', `Bearer ${guardToken}`)
      .send({ passCode: createdVisitorPassCode });

    expect(scan1.status).toBe(200);
    expect(scan1.body.suggestedDirection).toBe('ENTRY');

    // Confirm Entry of 2 people
    const confirmEntry = await request(app)
      .post('/api/v1/society-help/gate/scan/confirm')
      .set('Authorization', `Bearer ${guardToken}`)
      .send({
        passId: createdVisitorPassId,
        direction: 'ENTRY',
        count: 2,
      });

    expect(confirmEntry.status).toBe(200);
    expect(confirmEntry.body.pass.peopleCurrentlyInside).toBe(2);
    expect(confirmEntry.body.pass.peopleEnteredTotal).toBe(2);

    // Scan again -> should now smartly suggest EXIT!
    const scan2 = await request(app)
      .post('/api/v1/society-help/gate/scan')
      .set('Authorization', `Bearer ${guardToken}`)
      .send({ passCode: createdVisitorPassCode });

    expect(scan2.status).toBe(200);
    expect(scan2.body.suggestedDirection).toBe('EXIT');
  });

  // Test 5: Exit count CANNOT exceed number currently inside
  it('rejects guard exit confirmation when exit count exceeds people inside', async () => {
    const res = await request(app)
      .post('/api/v1/society-help/gate/scan/confirm')
      .set('Authorization', `Bearer ${guardToken}`)
      .send({
        passId: createdVisitorPassId,
        direction: 'EXIT',
        count: 5, // Only 2 are currently inside!
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/(cannot exceed|cannot be more than)/i);
  });

  // Test 6: Guard flat search privacy check
  it('guard flat search returns ONLY flatCode, status, and timestamp (NO personal info)', async () => {
    const res = await request(app)
      .get('/api/v1/society-help/gate/presence/search?flatCode=A-102')
      .set('Authorization', `Bearer ${guardToken}`);

    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThan(0);
    const item = res.body[0];
    expect(item).toHaveProperty('flatCode');
    expect(item).toHaveProperty('status');
    expect(item).toHaveProperty('lastUpdated');
    // Strictest Privacy Invariant: NEVER leak name or phone numbers!
    expect(item).not.toHaveProperty('residentName');
    expect(item).not.toHaveProperty('phone');
    expect(item).not.toHaveProperty('username');
  });

  // Test 7: Nobody at home rule enforcement
  it('nobody at home rule: denies visitor entry, allows delivery parcel accepted at gate', async () => {
    // Mark flat C-101 as not at home
    const flat = await Flat.findOne({ number: 'C-101' });
    if (flat) {
      flat.isAtHome = false;
      await flat.save();
    }

    // Attempt visitor log to C-101
    const visRes = await request(app)
      .post('/api/v1/society-help/gate/manual-visitor')
      .set('Authorization', `Bearer ${guardToken}`)
      .send({
        visitorType: 'VISITOR',
        visitorName: 'Anil Gupta',
        flatCode: 'C-101',
        purpose: 'Personal visit',
      });

    expect(visRes.status).toBe(201);
    expect(visRes.body.status).toBe('DENIED');
    expect(visRes.body.deniedReason).toMatch(/nobody is at home/i);

    // Delivery agent to C-101 with parcel drop at gate
    const delRes = await request(app)
      .post('/api/v1/society-help/gate/manual-visitor')
      .set('Authorization', `Bearer ${guardToken}`)
      .send({
        visitorType: 'DELIVERY',
        visitorName: 'Sunil (Zomato)',
        flatCode: 'C-101',
        purpose: 'Food delivery',
        acceptedParcelAtGate: true,
      });

    expect(delRes.status).toBe(201);
    expect(delRes.body.acceptedParcelAtGate).toBe(true);
  });

  // Test 8: Expense recording requires MANDATORY proof photos
  it('rejects recording expense without proof photo', async () => {
    const res = await request(app)
      .post('/api/v1/society-help/maintenance/expenses')
      .set('Authorization', `Bearer ${presidentToken}`)
      .send({
        category: 'Repairs and emergency work',
        amountPaise: 500000,
        payee: 'Local Plumber',
        description: 'Fixed common tank leak',
        proofPhotos: [], // Missing mandatory proof!
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/mandatory proof/i);
  });

  // Test 9: Resident in-app maintenance dues payment
  it('allows resident to pay maintenance in-app and generates official receipt', async () => {
    // Find resident user
    const resUser = await mongoose.model('User').findOne({ username: 'suresh.kumar' });
    const targetDue = await MaintenanceDue.create({
      societyId: foundation.societyId,
      residentUserId: resUser!._id,
      flatId: resUser!.flatId || new mongoose.Types.ObjectId(),
      flatCode: 'A-102',
      billingMonth: '2026-12',
      amountPaise: 250000,
      status: 'PENDING',
      dueDate: new Date('2026-12-05'),
    });

    const payRes = await request(app)
      .post(`/api/v1/society-help/maintenance/dues/${targetDue._id}/pay`)
      .set('Authorization', `Bearer ${residentToken}`)
      .send({});

    expect(payRes.status).toBe(200);
    expect(payRes.body.status).toBe('PAID');
    expect(payRes.body.receiptNumber).toMatch(/^REC-/);
  });

  // Test 10: Event quiet hours check
  it('flags community event when loud sound runs past 22:00', async () => {
    const res = await request(app)
      .post('/api/v1/society-help/events')
      .set('Authorization', `Bearer ${residentToken}`)
      .send({
        title: 'Late Night Rooftop Party',
        eventType: 'Other',
        startDate: new Date(Date.now() + 86400000).toISOString(),
        endDate: new Date(Date.now() + 86400000).toISOString(),
        dailyTimeFrom: '20:00',
        dailyTimeTo: '23:30', // past 22:00
        estimatedVisitors: 30,
        hasLoudSound: true,
        loudSoundEndTime: '23:00',
      });

    expect(res.status).toBe(201);
    expect(res.body.isQuietHoursFlagged).toBe(true);
    expect(res.body.quietHoursWarning).toMatch(/quiet hours/i);
  });

  // Test 11: Emergency SOS Trigger and Guard Acknowledgement
  it('triggers emergency SOS and allows guard to acknowledge with resident notification', async () => {
    // 1. Resident triggers SOS
    const triggerRes = await request(app)
      .post('/api/v1/society-help/emergency/trigger')
      .set('Authorization', `Bearer ${residentToken}`)
      .send({ notes: 'Smoke detected in corridor' });

    expect(triggerRes.status).toBe(201);
    expect(triggerRes.body.status).toBe('TRIGGERED');
    const alertId = triggerRes.body._id;

    // 2. Guard acknowledges alert
    const ackRes = await request(app)
      .post(`/api/v1/society-help/emergency/${alertId}/ack`)
      .set('Authorization', `Bearer ${guardToken}`)
      .send({ notes: 'Guard proceeding to flat with fire extinguisher' });

    expect(ackRes.status).toBe(200);
    expect(ackRes.body.status).toBe('ACKNOWLEDGED');
    expect(ackRes.body.acknowledgedByGuardName).toBeTruthy();
  });
});
