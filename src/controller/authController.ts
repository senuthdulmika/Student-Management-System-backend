import crypto from 'crypto';
import { CookieOptions, Request, Response } from 'express';
import { z } from 'zod';
import { env } from '../config/env';
import { IUser, User } from '../models/user';
import { AppError } from '../utils/AppError';
import { asyncHandler } from '../utils/asyncHandler';
import { resetEmail, sendEmail, welcomeEmail } from '../utils/email';
import { sha256, signAccessToken, signRefreshToken, verifyRefreshToken } from '../utils/token';

/* ---------- validation schemas ---------- */
const passwordRule = z
  .string()
  .min(6, 'Password must be at least 6 characters')
  .regex(/[A-Za-z]/, 'Password must contain a letter')
  .regex(/\d/, 'Password must contain a number');

export const registerSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(60),
  email: z.string().trim().toLowerCase().email('Please provide a valid email'),
  password: passwordRule,
});
export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('Please provide a valid email'),
  password: z.string().min(1, 'Password is required'),
});
export const forgotSchema = z.object({ email: z.string().trim().toLowerCase().email('Please provide a valid email') });
export const resetSchema = z.object({ password: passwordRule });

/* ---------- helpers ---------- */
const COOKIE_NAME = 'refreshToken';
const cookieOptions = (): CookieOptions => ({
  httpOnly: true,
  secure: env.isProd,
  sameSite: env.isProd ? 'none' : 'lax',
  maxAge: env.REFRESH_EXPIRES_DAYS * 24 * 60 * 60 * 1000,
  path: '/api/auth',
});

const publicUser = (u: IUser) => ({ id: u.id, name: u.name, email: u.email, role: u.role });

const issueTokens = async (user: IUser, res: Response): Promise<string> => {
  const payload = { id: user.id, role: user.role };
  const accessToken = signAccessToken(payload);
  const refreshToken = signRefreshToken(payload);
  user.refreshTokenHash = sha256(refreshToken);
  await user.save({ validateBeforeSave: false });
  res.cookie(COOKIE_NAME, refreshToken, cookieOptions());
  return accessToken;
};

/* ---------- controllers ---------- */
export const register = asyncHandler(async (req: Request, res: Response) => {
  const { name, email, password } = req.body;
  if (await User.findOne({ email })) throw new AppError(409, 'An account with this email already exists');

  const user = await User.create({ name, email, password, role: 'student' });
  const token = await issueTokens(user, res);
  sendEmail(user.email, 'Welcome to Student Task Manager', welcomeEmail(user.name)).catch(() => undefined);
  res.status(201).json({ success: true, token, user: publicUser(user) });
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email }).select('+password');
  if (!user || !(await user.comparePassword(password))) throw new AppError(401, 'Invalid email or password');

  const token = await issueTokens(user, res);
  res.json({ success: true, token, user: publicUser(user) });
});

export const refresh = asyncHandler(async (req: Request, res: Response) => {
  const incoming: string | undefined = req.cookies?.[COOKIE_NAME];
  if (!incoming) throw new AppError(401, 'No refresh token');

  let payload;
  try {
    payload = verifyRefreshToken(incoming);
  } catch {
    throw new AppError(401, 'Refresh token expired. Please log in again.');
  }

  const user = await User.findById(payload.id).select('+refreshTokenHash');
  if (!user || user.refreshTokenHash !== sha256(incoming)) {
    throw new AppError(401, 'Refresh token is no longer valid');
  }
  const token = await issueTokens(user, res); // rotation: a new refresh token is issued each time
  res.json({ success: true, token, user: publicUser(user) });
});

export const logout = asyncHandler(async (req: Request, res: Response) => {
  const incoming: string | undefined = req.cookies?.[COOKIE_NAME];
  if (incoming) {
    try {
      const payload = verifyRefreshToken(incoming);
      await User.findByIdAndUpdate(payload.id, { $unset: { refreshTokenHash: 1 } });
    } catch {
      /* ignore invalid token on logout */
    }
  }
  res.clearCookie(COOKIE_NAME, { ...cookieOptions(), maxAge: undefined });
  res.json({ success: true, message: 'Logged out' });
});

export const getMe = asyncHandler(async (req: Request, res: Response) => {
  res.json({ success: true, user: publicUser(req.user!) });
});

export const forgotPassword = asyncHandler(async (req: Request, res: Response) => {
  const generic = { success: true, message: 'If an account exists for that email, a reset link has been sent.' };
  const user = await User.findOne({ email: req.body.email });
  if (!user) return void res.json(generic); // do not reveal whether the email exists

  const rawToken = crypto.randomBytes(32).toString('hex');
  user.resetPasswordToken = sha256(rawToken);
  user.resetPasswordExpire = new Date(Date.now() + 15 * 60 * 1000);
  await user.save({ validateBeforeSave: false });

  const link = `${env.CLIENT_URL}/reset-password/${rawToken}`;
  try {
    await sendEmail(user.email, 'Reset your password', resetEmail(user.name, link));
  } catch (err) {
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save({ validateBeforeSave: false });
    console.error('Email error:', err);
    throw new AppError(500, 'Could not send the reset email. Please try again later.');
  }
  res.json(generic);
});

export const resetPassword = asyncHandler(async (req: Request, res: Response) => {
  const user = await User.findOne({
    resetPasswordToken: sha256(String(req.params.token)),
    resetPasswordExpire: { $gt: new Date() },
  }).select('+resetPasswordToken +resetPasswordExpire +refreshTokenHash');
  if (!user) throw new AppError(400, 'Reset link is invalid or has expired');

  user.password = req.body.password; // hashed by the pre-save hook (bcryptjs)
  user.resetPasswordToken = undefined;
  user.resetPasswordExpire = undefined;
  user.refreshTokenHash = undefined; // log out of every device
  await user.save();
  res.json({ success: true, message: 'Password updated successfully. You can now log in.' });
});
