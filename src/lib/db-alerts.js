import nodemailer from 'nodemailer';

async function sendWebhook(url, payload) {
  try {
    await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return true;
  } catch (e) {
    console.error('[db-alert] webhook send failed', e);
    return false;
  }
}

async function sendEmail(payload) {
  const host = process.env.DB_ALERT_SMTP_HOST;
  const port = Number(process.env.DB_ALERT_SMTP_PORT || 587);
  const user = process.env.DB_ALERT_SMTP_USER;
  const pass = process.env.DB_ALERT_SMTP_PASS;
  const to = process.env.DB_ALERT_EMAIL_TO;
  if (!host || !to) return false;
  try {
    const transporter = nodemailer.createTransport({ host, port, auth: user && pass ? { user, pass } : undefined, secure: port === 465 });
    await transporter.sendMail({ from: process.env.DB_ALERT_EMAIL_FROM || `asrs@localhost`, to, subject: `ASRS DB Alert: ${payload.level || 'critical'}`, text: JSON.stringify(payload, null, 2) });
    return true;
  } catch (e) {
    console.error('[db-alert] email send failed', e);
    return false;
  }
}

export async function alertDb(error, context = {}) {
  const payload = {
    level: context.level || 'critical',
    service: 'asrs',
    message: error && error.message ? error.message : String(error),
    stack: error && error.stack ? error.stack : null,
    context,
    ts: new Date().toISOString(),
  };

  const webhook = process.env.DB_ALERT_WEBHOOK_URL;
  if (webhook) {
    const ok = await sendWebhook(webhook, payload);
    if (ok) return;
  }

  const emailed = await sendEmail(payload);
  if (emailed) return;

  console.error('[db-alert] no alerting configured or all channels failed:', payload);
}

export default { alertDb };
