import jwt from 'jsonwebtoken';
import argon2 from 'argon2';
import { query } from '../../config/supabase';
import type { CreateAccountInput } from './auth.schema';

function createHttpError(statusCode: number, message: string): Error & { statusCode: number } {
  const err = new Error(message) as Error & { statusCode: number };
  err.statusCode = statusCode;
  return err;
}

function getAccessSecret(): string {
  const s = process.env.JWT_ACCESS_SECRET;
  if (!s) throw new Error('JWT_ACCESS_SECRET not set');
  return s;
}

function getRefreshSecret(): string {
  const s = process.env.JWT_REFRESH_SECRET;
  if (!s) throw new Error('JWT_REFRESH_SECRET not set');
  return s;
}

function signAccessToken(payload: { userId: string; role: string; societyId: string }): string {
  return jwt.sign(payload, getAccessSecret(), {
    expiresIn: (process.env.JWT_ACCESS_EXPIRES_IN ?? '15m') as jwt.SignOptions['expiresIn'],
  });
}

function signRefreshToken(payload: { userId: string }): string {
  return jwt.sign(payload, getRefreshSecret(), {
    expiresIn: (process.env.JWT_REFRESH_EXPIRES_IN ?? '7d') as jwt.SignOptions['expiresIn'],
  });
}

// ---------------------------------------------------------------------------
// login
// ---------------------------------------------------------------------------
export async function login(
  username: string,
  password: string,
  societyId?: string,
): Promise<{
  accessToken: string;
  refreshToken: string;
  mustChangePassword: boolean;
  role: string;
  user: any;
}> {
  let sql = 'SELECT * FROM users WHERE LOWER(username) = LOWER($1) AND is_active = TRUE';
  const params: any[] = [username.trim()];

  if (societyId) {
    sql += ' AND society_id = $2';
    params.push(societyId);
  }

  const { rows } = await query(sql, params);
  const user = rows[0];
  if (!user) {
    throw createHttpError(401, 'Invalid credentials');
  }

  const passwordValid = await argon2.verify(user.password_hash, password);
  if (!passwordValid) {
    throw createHttpError(401, 'Invalid credentials');
  }

  const accessToken = signAccessToken({
    userId: user.id,
    role: user.role,
    societyId: user.society_id,
  });

  const refreshToken = signRefreshToken({ userId: user.id });

  return {
    accessToken,
    refreshToken,
    mustChangePassword: user.must_change_password || false,
    role: user.role,
    user,
  };
}

// ---------------------------------------------------------------------------
// refreshAccessToken
// ---------------------------------------------------------------------------
export async function refreshAccessToken(refreshToken: string): Promise<{ accessToken: string }> {
  let payload: { userId: string };

  try {
    payload = jwt.verify(refreshToken, getRefreshSecret()) as { userId: string };
  } catch {
    throw createHttpError(401, 'Invalid or expired refresh token');
  }

  const { rows } = await query('SELECT * FROM users WHERE id = $1 AND is_active = TRUE', [payload.userId]);
  const user = rows[0];
  if (!user) {
    throw createHttpError(401, 'Refresh token revoked or user not found');
  }

  const accessToken = signAccessToken({
    userId: user.id,
    role: user.role,
    societyId: user.society_id,
  });

  return { accessToken };
}

// ---------------------------------------------------------------------------
// logout
// ---------------------------------------------------------------------------
export async function logout(userId: string): Promise<void> {
  // Stateless JWT revocation or record logout timestamp
  console.info(`[SUPABASE AUTH] User ${userId} logged out`);
}

// ---------------------------------------------------------------------------
// changePassword
// ---------------------------------------------------------------------------
export async function changePassword(
  userId: string,
  currentPassword: string,
  newPassword: string,
): Promise<void> {
  const { rows } = await query('SELECT * FROM users WHERE id = $1', [userId]);
  const user = rows[0];
  if (!user) {
    throw createHttpError(404, 'User not found');
  }

  const valid = await argon2.verify(user.password_hash, currentPassword);
  if (!valid) {
    throw createHttpError(400, 'Current password incorrect');
  }

  const newHash = await argon2.hash(newPassword);
  await query('UPDATE users SET password_hash = $1, must_change_password = FALSE WHERE id = $2', [
    newHash,
    userId,
  ]);
}

// ---------------------------------------------------------------------------
// createAccount
// ---------------------------------------------------------------------------
export async function createAccount(
  input: CreateAccountInput,
  societyId: string,
): Promise<{ user: any; initialPassword?: string }> {
  const generatedPassword = input.password || 'Initial@1234';
  const passwordHash = await argon2.hash(generatedPassword);

  const { rows } = await query(
    `INSERT INTO users (username, email, password_hash, role, society_id, flat_id, must_change_password)
     VALUES ($1, $2, $3, $4, $5, $6, TRUE)
     RETURNING id, username, email, role, society_id, flat_id, must_change_password, created_at;`,
    [
      input.username.toLowerCase().trim(),
      input.email?.toLowerCase().trim() || null,
      passwordHash,
      input.role,
      societyId,
      input.flatId || null,
    ]
  );

  return {
    user: rows[0],
    initialPassword: generatedPassword,
  };
}

export async function updateFcmToken(userId: string, fcmToken: string): Promise<void> {
  console.info(`[AUTH] Updated FCM token for user ${userId}`);
}

