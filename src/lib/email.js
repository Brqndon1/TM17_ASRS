/**
 * ============================================================================
 * EMAIL UTILITY — src/lib/email.js
 * ============================================================================
 * Sends transactional emails via Nodemailer (Mailtrap for dev/testing).
 *
 * Setup:
 *   1. npm install nodemailer
 *   2. Create a free account at https://mailtrap.io
 *   3. Go to Email Testing → Inboxes → your inbox → SMTP Settings
 *   4. Copy the credentials into your .env.local:
 *
 *      MAILTRAP_HOST=sandbox.smtp.mailtrap.io
 *      MAILTRAP_PORT=2525
 *      MAILTRAP_USER=your_mailtrap_username
 *      MAILTRAP_PASS=your_mailtrap_password
 *      APP_URL=http://localhost:3000
 *
 * When you're ready for production, swap the transporter config for
 * Gmail, SES, SendGrid, etc. — nothing else changes.
 * ============================================================================
 */

import nodemailer from 'nodemailer';

// ── Mailtrap SMTP transporter ────────────────────────────────────────────────
const transporter = nodemailer.createTransport({
  host: process.env.MAILTRAP_HOST || 'sandbox.smtp.mailtrap.io',
  port: Number(process.env.MAILTRAP_PORT) || 2525,
  auth: {
    user: process.env.MAILTRAP_USER,
    pass: process.env.MAILTRAP_PASS,
  },
});

const APP_URL = process.env.APP_URL || 'http://localhost:3000';
const FROM_ADDRESS = '"ASRS System" <noreply@asrssuccess.org>';

// ── Send verification email (self-signup flow) ───────────────────────────────
// User signed up themselves. Email asks them to verify their address.
export async function sendSignupVerificationEmail({ to, firstName, token }) {
  const verifyUrl = `${APP_URL}/verify?token=${token}`;

  await transporter.sendMail({
    from: FROM_ADDRESS,
    to,
    subject: 'Verify your ASRS account',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 520px; margin: 0 auto; color: #333;">
        <h2 style="color: #1a4a8a;">Welcome to ASRS, ${firstName}!</h2>
        <p>Thanks for signing up. Before you can log in, please verify your email address by clicking the button below.</p>
        <p style="text-align: center; margin: 32px 0;">
          <a href="${verifyUrl}"
             style="background: #1a4a8a; color: white; padding: 12px 28px; border-radius: 6px;
                    text-decoration: none; font-weight: bold; display: inline-block;">
            Verify Email &amp; Set Password
          </a>
        </p>
        <p style="color: #666; font-size: 0.9rem;">
          Or copy this link into your browser:<br/>
          <a href="${verifyUrl}" style="color: #1a4a8a;">${verifyUrl}</a>
        </p>
        <p style="color: #666; font-size: 0.9rem;">This link expires in 24 hours. If you didn't sign up for ASRS, you can safely ignore this email.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;"/>
        <p style="color: #aaa; font-size: 0.8rem;">ASRS Initiatives Reporting System</p>
      </div>
    `,
    text: `Welcome to ASRS, ${firstName}!\n\nVerify your email and set your password here:\n${verifyUrl}\n\nThis link expires in 24 hours.`,
  });
}

// ── Send admin-created user invitation email ─────────────────────────────────
// Admin created an account for this person. Email invites them to set a password.
export async function sendAdminInviteEmail({ to, firstName, role, token }) {
  const verifyUrl = `${APP_URL}/verify?token=${token}`;
  const roleLabel = role === 'admin' ? 'Administrator' : 'Staff';

  await transporter.sendMail({
    from: FROM_ADDRESS,
    to,
    subject: 'You\'ve been added to ASRS — set up your account',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 520px; margin: 0 auto; color: #333;">
        <h2 style="color: #1a4a8a;">You've been added to ASRS</h2>
        <p>Hi ${firstName},</p>
        <p>An administrator has created an account for you on the ASRS Initiatives Reporting System with the <strong>${roleLabel}</strong> role.</p>
        <p>Click the button below to verify this is your email and set your password.</p>
        <p style="text-align: center; margin: 32px 0;">
          <a href="${verifyUrl}"
             style="background: #1a4a8a; color: white; padding: 12px 28px; border-radius: 6px;
                    text-decoration: none; font-weight: bold; display: inline-block;">
            Set Up My Account
          </a>
        </p>
        <p style="color: #666; font-size: 0.9rem;">
          Or copy this link into your browser:<br/>
          <a href="${verifyUrl}" style="color: #1a4a8a;">${verifyUrl}</a>
        </p>
        <p style="color: #666; font-size: 0.9rem;">This link expires in 24 hours. If you weren't expecting this, please ignore this email or contact your ASRS administrator.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;"/>
        <p style="color: #aaa; font-size: 0.8rem;">ASRS Initiatives Reporting System</p>
      </div>
    `,
    text: `Hi ${firstName},\n\nAn administrator has created a ${roleLabel} account for you on ASRS.\n\nSet up your account here:\n${verifyUrl}\n\nThis link expires in 24 hours.`,
  });
}
