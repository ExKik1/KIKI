// ============================================================
//  KIKI — Contact Form Handler
//  POST /api/contact
//  Body: { name, email, subject, message }
// ============================================================

const handler = async (event) => {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: corsHeaders(),
      body: '',
    };
  }

  if (event.httpMethod !== 'POST') {
    return respond(405, { error: 'Method not allowed' });
  }

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return respond(400, { error: 'Invalid JSON body' });
  }

  const { name, email, subject, message } = body;

  // ── Validation ──────────────────────────────────────────
  const errors = [];
  if (!name  || name.trim().length < 2)    errors.push('Name must be at least 2 characters');
  if (!email || !isValidEmail(email))       errors.push('Valid email address is required');
  if (!message || message.trim().length < 10) errors.push('Message must be at least 10 characters');

  if (errors.length > 0) {
    return respond(422, { error: 'Validation failed', details: errors });
  }

  // ── Rate-limit hint (simple) ─────────────────────────────
  const ip = event.headers['x-forwarded-for'] || event.headers['client-ip'] || 'unknown';
  console.log(`[contact] from=${email} ip=${ip} subject="${subject || '(none)'}"`);

  // ── Send email via Netlify environment ───────────────────
  // In production set env vars: SMTP_HOST, SMTP_PORT, SMTP_USER,
  // SMTP_PASS, CONTACT_TO_EMAIL in Netlify UI → Site settings → Env vars
  // Here we log + return success so the form works even without SMTP.

  const payload = {
    to:      process.env.CONTACT_TO_EMAIL || 'hello@kiki.app',
    from:    `${sanitize(name)} <${email}>`,
    subject: `[KIKI Contact] ${sanitize(subject) || 'New message'}`,
    text: [
      `Name:    ${sanitize(name)}`,
      `Email:   ${email}`,
      `Subject: ${sanitize(subject) || '—'}`,
      '',
      sanitize(message),
    ].join('\n'),
  };

  // Attempt real send if nodemailer is available & SMTP configured
  let sent = false;
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    try {
      const nodemailer = require('nodemailer');
      const transporter = nodemailer.createTransport({
        host:   process.env.SMTP_HOST,
        port:   parseInt(process.env.SMTP_PORT || '587', 10),
        secure: process.env.SMTP_PORT === '465',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });
      await transporter.sendMail(payload);
      sent = true;
    } catch (err) {
      console.error('[contact] SMTP error:', err.message);
      // Don't expose SMTP errors to client — just log
    }
  }

  return respond(200, {
    success: true,
    message: 'Thanks! Your message has been received. We\'ll get back to you soon.',
    delivered: sent,
  });
};

// ── Helpers ──────────────────────────────────────────────────
function isValidEmail(str) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(str.trim());
}

function sanitize(str) {
  if (typeof str !== 'string') return '';
  return str.trim().replace(/[<>]/g, '');
}

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin':  '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

function respond(statusCode, data) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json', ...corsHeaders() },
    body: JSON.stringify(data),
  };
}

module.exports = { handler };
