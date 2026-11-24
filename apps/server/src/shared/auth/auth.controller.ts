import { Request, Response } from 'express';
import * as authService from './auth.service';
import {
  LoginSchema,
  RefreshSchema,
  ChangePasswordSchema,
  CreateAccountSchema,
  FcmTokenSchema,
} from './auth.schema';

const REFRESH_COOKIE_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days in ms

export async function loginHandler(req: Request, res: Response): Promise<void> {
  const body = LoginSchema.parse(req.body);
  const result = await authService.login(body.username, body.password);

  res.cookie('refreshToken', result.refreshToken, {
    httpOnly: true,
    sameSite: 'strict',
    maxAge: REFRESH_COOKIE_MAX_AGE,
  });

  res.json({
    accessToken: result.accessToken,
    refreshToken: result.refreshToken, // also in body for mobile clients
    mustChangePassword: result.mustChangePassword,
    role: result.role,
    user: {
      userId: result.user.id,
      role: result.user.role,
      societyId: result.user.society_id,
      mustChangePassword: result.user.must_change_password || false,
      fullName: result.user.full_name,
      username: result.user.username,
    },
  });
}

export async function refreshHandler(req: Request, res: Response): Promise<void> {
  // Accept token from body OR cookie
  const tokenFromBody = req.body?.refreshToken as string | undefined;
  const tokenFromCookie = req.cookies?.refreshToken as string | undefined;

  const { refreshToken } = RefreshSchema.parse({
    refreshToken: tokenFromBody ?? tokenFromCookie ?? '',
  });

  const result = await authService.refreshAccessToken(refreshToken);
  res.json(result);
}

export async function logoutHandler(req: Request, res: Response): Promise<void> {
  await authService.logout(req.user!.userId);
  res.clearCookie('refreshToken');
  res.json({ message: 'Logged out' });
}

export async function changePasswordHandler(req: Request, res: Response): Promise<void> {
  const body = ChangePasswordSchema.parse(req.body);
  await authService.changePassword(req.user!.userId, body.currentPassword, body.newPassword);
  res.json({ message: 'Password changed' });
}

export async function createAccountHandler(req: Request, res: Response): Promise<void> {
  const body = CreateAccountSchema.parse(req.body);
  const user = await authService.createAccount(body, req.user!.societyId);
  res.status(201).json({ user });
}

export async function updateFcmTokenHandler(req: Request, res: Response): Promise<void> {
  const body = FcmTokenSchema.parse(req.body);
  await authService.updateFcmToken(req.user!.userId, body.fcmToken);
  res.json({ message: 'FCM token updated' });
}
