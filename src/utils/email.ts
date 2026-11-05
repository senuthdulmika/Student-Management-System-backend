import nodemailer from 'nodemailer';
import { env } from '../config/env';

const transporter = env.SMTP_HOST
  ? nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_PORT === 465,
      auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
    })
  : null;

export const sendEmail = async (to: string, subject: string, html: string): Promise<void> => {
  if (!transporter) {
    // Development fallback: no SMTP configured -> print the email to the console
    console.log(`\n[DEV EMAIL] To: ${to}\nSubject: ${subject}\n${html.replace(/<[^>]+>/g, ' ')}\n`);
    return;
  }
  await transporter.sendMail({ from: env.MAIL_FROM, to, subject, html });
};

const wrap = (title: string, body: string): string => `
  <div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;padding:24px;border:1px solid #e2e8f0;border-radius:12px">
    <h2 style="color:#4f46e5;margin-top:0">${title}</h2>${body}
    <p style="color:#94a3b8;font-size:12px;margin-top:24px">Student Task Management System</p>
  </div>`;

export const welcomeEmail = (name: string): string =>
  wrap('Welcome aboard 🎉', `<p>Hi ${name}, your account is ready. Start adding your subjects and tasks, and never miss a deadline again.</p>`);

export const resetEmail = (name: string, link: string): string =>
  wrap(
    'Reset your password',
    `<p>Hi ${name}, we received a request to reset your password. This link is valid for 15 minutes.</p>
     <p><a href="${link}" style="background:#4f46e5;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none;display:inline-block">Reset Password</a></p>
     <p style="font-size:13px;color:#64748b">If the button doesn't work, copy this link:<br>${link}</p>
     <p style="font-size:13px;color:#64748b">If you didn't request this, you can safely ignore this email.</p>`
  );
