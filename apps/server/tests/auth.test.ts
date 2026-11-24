import request from 'supertest';
import mongoose from 'mongoose';
import argon2 from 'argon2';
import app from '../src/app';
import { User } from '../src/models/User';
import { Society } from '../src/models/Society';

// ─── Test fixtures ─────────────────────────────────────────────────────────

let societyId: string;
let presidentId: string;
let residentId: string;

const PRESIDENT_CREDS = { username: 'testpresident', password: 'password123' };
const RESIDENT_CREDS = { username: 'testresident', password: 'password456' };

beforeAll(async () => {
  // globalSetup sets MONGO_URI in env but does NOT share the mongoose connection
  // across the process boundary — each test file must connect itself.
  await mongoose.connect(process.env.MONGO_URI!);

  // Clear collections
  await Promise.all([User.deleteMany({}), Society.deleteMany({})]);

  // Create a society
  const society = await Society.create({
    name: 'Test Society',
    address: '1 Main St',
    city: 'Hyderabad',
    pincode: '500001',
    presidentId: new mongoose.Types.ObjectId(), // placeholder, updated below
  });
  societyId = society._id.toString();

  // Create president
  const presidentHash = await argon2.hash(PRESIDENT_CREDS.password);
  const president = await User.create({
    username: PRESIDENT_CREDS.username,
    passwordHash: presidentHash,
    role: 'president',
    societyId: society._id,
    mustChangePassword: false,
  });
  presidentId = president._id.toString();

  // Update society.presidentId
  await Society.findByIdAndUpdate(societyId, { presidentId: president._id });

  // Create resident
  const residentHash = await argon2.hash(RESIDENT_CREDS.password);
  const resident = await User.create({
    username: RESIDENT_CREDS.username,
    passwordHash: residentHash,
    role: 'resident',
    societyId: society._id,
    mustChangePassword: false,
  });
  residentId = resident._id.toString();
});

afterAll(async () => {
  await Promise.all([User.deleteMany({}), Society.deleteMany({})]);
  await mongoose.disconnect();
});

// ─── Helper ────────────────────────────────────────────────────────────────

async function loginAs(creds: { username: string; password: string }) {
  const res = await request(app).post('/api/v1/auth/login').send(creds);
  return res.body as { accessToken: string; refreshToken: string; role: string };
}

// ─── Tests ─────────────────────────────────────────────────────────────────

describe('POST /api/v1/auth/login', () => {
  it('returns tokens on valid credentials', async () => {
    const res = await request(app).post('/api/v1/auth/login').send(PRESIDENT_CREDS);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('accessToken');
    expect(res.body).toHaveProperty('refreshToken');
    expect(res.body.role).toBe('president');
  });

  it('returns 401 for wrong password', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ username: PRESIDENT_CREDS.username, password: 'wrongpassword' });
    expect(res.status).toBe(401);
  });

  it('returns 401 for unknown user', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ username: 'nobody', password: 'anypassword' });
    expect(res.status).toBe(401);
  });

  it('returns 400 for missing fields (zod validation)', async () => {
    const res = await request(app).post('/api/v1/auth/login').send({ username: 'ab' }); // too short + no password
    expect(res.status).toBe(400);
  });
});

describe('POST /api/v1/auth/refresh', () => {
  it('returns new access token with valid refresh token', async () => {
    const { refreshToken } = await loginAs(PRESIDENT_CREDS);
    const res = await request(app).post('/api/v1/auth/refresh').send({ refreshToken });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('accessToken');
  });

  it('returns 401 for invalid refresh token', async () => {
    const res = await request(app)
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: 'not.a.valid.token' });
    expect(res.status).toBe(401);
  });
});

describe('POST /api/v1/auth/logout', () => {
  it('logs out and invalidates the refresh token', async () => {
    const { accessToken, refreshToken } = await loginAs(PRESIDENT_CREDS);

    const logoutRes = await request(app)
      .post('/api/v1/auth/logout')
      .set('Authorization', `Bearer ${accessToken}`);
    expect(logoutRes.status).toBe(200);

    // Refresh token should now be rejected
    const refreshRes = await request(app)
      .post('/api/v1/auth/refresh')
      .send({ refreshToken });
    expect(refreshRes.status).toBe(401);
  });
});

describe('POST /api/v1/auth/change-password', () => {
  const tempUser = { username: 'tempuser_cp', password: 'OldPass!1' };

  beforeEach(async () => {
    const hash = await argon2.hash(tempUser.password);
    await User.create({
      username: tempUser.username,
      passwordHash: hash,
      role: 'resident',
      societyId: new mongoose.Types.ObjectId(societyId),
      mustChangePassword: true,
    });
  });

  afterEach(async () => {
    await User.deleteOne({ username: tempUser.username });
  });

  it('changes password and sets mustChangePassword=false', async () => {
    const { accessToken } = await loginAs(tempUser);

    const res = await request(app)
      .post('/api/v1/auth/change-password')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ currentPassword: tempUser.password, newPassword: 'NewPass!99' });

    expect(res.status).toBe(200);

    // Old password no longer works
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ username: tempUser.username, password: tempUser.password });
    expect(loginRes.status).toBe(401);

    // New password works
    const newLoginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ username: tempUser.username, password: 'NewPass!99' });
    expect(newLoginRes.status).toBe(200);
  });

  it('returns 401 if current password is wrong', async () => {
    const { accessToken } = await loginAs(tempUser);
    const res = await request(app)
      .post('/api/v1/auth/change-password')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ currentPassword: 'WrongPass', newPassword: 'NewPass!99' });
    expect(res.status).toBe(401);
  });
});

describe('POST /api/v1/auth/create-account (president only)', () => {
  it('president can create a new account', async () => {
    const { accessToken } = await loginAs(PRESIDENT_CREDS);
    const res = await request(app)
      .post('/api/v1/auth/create-account')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        username: 'newguard_01',
        password: 'GuardPass1!',
        role: 'guard',
      });
    expect(res.status).toBe(201);
    expect(res.body.user.username).toBe('newguard_01');
    expect(res.body.user.role).toBe('guard');
    // Password hash must NOT be in the response
    expect(res.body.user.passwordHash).toBeUndefined();

    await User.deleteOne({ username: 'newguard_01' });
  });

  it('returns 403 if a resident tries to create an account', async () => {
    const { accessToken } = await loginAs(RESIDENT_CREDS);
    const res = await request(app)
      .post('/api/v1/auth/create-account')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ username: 'hacker_01', password: 'HackPass1!', role: 'guard' });
    expect(res.status).toBe(403);
  });

  it('returns 400 for invalid role (zod validation)', async () => {
    const { accessToken } = await loginAs(PRESIDENT_CREDS);
    const res = await request(app)
      .post('/api/v1/auth/create-account')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ username: 'baduser', password: 'Pass12345', role: 'superadmin' });
    expect(res.status).toBe(400);
  });
});

describe('Role middleware', () => {
  it('returns 401 when no token is provided on a protected route', async () => {
    const res = await request(app).post('/api/v1/auth/logout');
    expect(res.status).toBe(401);
  });

  it('returns 401 for a malformed token', async () => {
    const res = await request(app)
      .post('/api/v1/auth/logout')
      .set('Authorization', 'Bearer not.a.real.jwt');
    expect(res.status).toBe(401);
  });
});

describe('Unused vars — make linter happy', () => {
  // Satisfy TS unused variable warnings from fixture setup
  it('fixture IDs are set', () => {
    expect(presidentId).toBeTruthy();
    expect(residentId).toBeTruthy();
  });
});
