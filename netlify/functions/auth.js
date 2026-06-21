// ============================================================
//  KIKI — Auth Handler (Register + Login)
//  POST /api/auth  { action: 'register'|'login', ...fields }
//
//  Uses JWT (jsonwebtoken) for tokens.
//  In production set: JWT_SECRET, KV_STORE_URL (or any DB)
//  Dev/test: works without any env vars (in-memory store).
// ============================================================

const crypto = require('crypto');

// ── In-memory store (dev only — resets on redeploy) ──────────
// In production replace with Netlify KV, FaunaDB, Supabase, etc.
const DEV_STORE = new Map();

// ── Simple JWT (no external dep) ─────────────────────────────
function base64url(str) {
  return Buffer.from(str)
    .toString('base64')
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

function createJWT(payload, secret, expiresInSec = 86400) {
  const header  = base64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const exp     = Math.floor(Date.now() / 1000) + expiresInSec;
  const claims  = base64url(JSON.stringify({ ...payload, exp, iat: Math.floor(Date.now() / 1000) }));
  const sig     = base64url(
    crypto.createHmac('sha256', secret).update(`${header}.${claims}`).digest()
  );
  return `${header}.${claims}.${sig}`;
}

function verifyJWT(token, secret) {
  try {
    const [header, claims, sig] = token.split('.');
    const expected = base64url(
      crypto.createHmac('sha256', secret).update(`${header}.${claims}`).digest()
    );
    if (sig !== expected) throw new Error('Invalid signature');
    const payload = JSON.parse(Buffer.from(claims, 'base64').toString());
    if (payload.exp < Math.floor(Date.now() / 1000)) throw new Error('Token expired');
    return { valid: true, payload };
  } catch (err) {
    return { valid: false, error: err.message };
  }
}

function hashPassword(password, salt) {
  const s = salt || crypto.randomBytes(16).toString('hex');
  const h = crypto.createHmac('sha256', s).update(password).digest('hex');
  return { hash: `${s}:${h}`, salt: s };
}

function verifyPassword(password, storedHash) {
  const [salt] = storedHash.split(':');
  const { hash } = hashPassword(password, salt);
  return hash === storedHash;
}

// ── Main handler ──────────────────────────────────────────────
const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders(), body: '' };
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

  const JWT_SECRET = process.env.JWT_SECRET || 'kiki-dev-secret-change-in-production';
  const { action } = body;

  // ── REGISTER ─────────────────────────────────────────────
  if (action === 'register') {
    const { firstName, lastName, email, password, useCase } = body;

    const errors = [];
    if (!firstName || firstName.trim().length < 2) errors.push('First name is required');
    if (!email || !isValidEmail(email))              errors.push('Valid email is required');
    if (!password || password.length < 8)            errors.push('Password must be at least 8 characters');

    if (errors.length > 0) return respond(422, { error: 'Validation failed', details: errors });

    const cleanEmail = email.trim().toLowerCase();

    // Check duplicate
    if (DEV_STORE.has(cleanEmail)) {
      return respond(409, { error: 'An account with this email already exists' });
    }

    // Store user
    const { hash } = hashPassword(password);
    const user = {
      id:        crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(16).toString('hex'),
      firstName: firstName.trim(),
      lastName:  (lastName || '').trim(),
      email:     cleanEmail,
      password:  hash,
      useCase:   useCase || '',
      plan:      'free',
      createdAt: new Date().toISOString(),
    };
    DEV_STORE.set(cleanEmail, user);

    console.log(`[auth] register email=${cleanEmail}`);

    // Issue token (exclude password)
    const { password: _, ...safeUser } = user;
    const token = createJWT({ sub: user.id, email: cleanEmail, plan: 'free' }, JWT_SECRET);

    return respond(201, {
      success: true,
      message: 'Account created successfully!',
      token,
      user: safeUser,
    });
  }

  // ── LOGIN ─────────────────────────────────────────────────
  if (action === 'login') {
    const { email, password } = body;

    if (!email || !password) {
      return respond(422, { error: 'Email and password are required' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const user = DEV_STORE.get(cleanEmail);

    // Constant-time response to prevent user enumeration
    if (!user || !verifyPassword(password, user.password)) {
      await delay(200); // prevent timing attacks
      return respond(401, { error: 'Invalid email or password' });
    }

    console.log(`[auth] login email=${cleanEmail}`);

    const { password: _, ...safeUser } = user;
    const token = createJWT({ sub: user.id, email: cleanEmail, plan: user.plan }, JWT_SECRET);

    return respond(200, {
      success: true,
      message: 'Logged in successfully!',
      token,
      user: safeUser,
    });
  }

  // ── VERIFY TOKEN ──────────────────────────────────────────
  if (action === 'verify') {
    const authHeader = event.headers['authorization'] || '';
    const token = authHeader.replace(/^Bearer\s+/i, '');
    if (!token) return respond(401, { error: 'No token provided' });

    const result = verifyJWT(token, JWT_SECRET);
    if (!result.valid) return respond(401, { error: result.error });

    return respond(200, { success: true, payload: result.payload });
  }

  // ── ME (get current user) ─────────────────────────────────
  if (action === 'me') {
    const authHeader = event.headers['authorization'] || '';
    const token = authHeader.replace(/^Bearer\s+/i, '');
    if (!token) return respond(401, { error: 'No token provided' });

    const result = verifyJWT(token, JWT_SECRET);
    if (!result.valid) return respond(401, { error: 'Invalid or expired token' });

    const user = DEV_STORE.get(result.payload.email);
    if (!user) return respond(404, { error: 'User not found' });

    const { password: _, ...safeUser } = user;
    return respond(200, { success: true, user: safeUser });
  }

  return respond(400, { error: `Unknown action: "${action}". Use register, login, verify, or me.` });
};

// ── Helpers ───────────────────────────────────────────────────
function isValidEmail(str) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(str.trim());
}
function delay(ms) {
  return new Promise(r => setTimeout(r, ms));
}
function corsHeaders() {
  return {
    'Access-Control-Allow-Origin':  '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
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
