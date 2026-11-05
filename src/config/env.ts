import dotenv from 'dotenv';
dotenv.config();

const required = (key: string, fallback?: string): string => {
  const value = process.env[key] ?? fallback;
  if (value === undefined || value === '') throw new Error(`Missing environment variable: ${key}`);
  return value;
};

export const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  isProd: process.env.NODE_ENV === 'production',
  PORT: Number(process.env.PORT || 5000),
  MONGO_URI: required('MONGO_URI'),
  JWT_ACCESS_SECRET: required('JWT_ACCESS_SECRET'),
  JWT_REFRESH_SECRET: required('JWT_REFRESH_SECRET'),
  ACCESS_EXPIRES: process.env.ACCESS_EXPIRES || '15m',
  REFRESH_EXPIRES_DAYS: Number(process.env.REFRESH_EXPIRES_DAYS || 7),
  CLIENT_URL: required('CLIENT_URL', 'http://localhost:5173'),
  SMTP_HOST: process.env.SMTP_HOST || '',
  SMTP_PORT: Number(process.env.SMTP_PORT || 587),
  SMTP_USER: process.env.SMTP_USER || '',
  SMTP_PASS: process.env.SMTP_PASS || '',
  MAIL_FROM: process.env.MAIL_FROM || 'Student Task Manager <no-reply@stms.app>',
};
