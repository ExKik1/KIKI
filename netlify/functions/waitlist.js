// ============================================================
//  KIKI — Waitlist / Early Access Handler
//  POST /api/waitlist
//  Body: { email, name?, referral? }
// ============================================================

const crypto = require('crypto');

// Dev in-memory waitlist (replace with DB in production)
const WAITLIST = new Map();

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

  const { email, name = '', referral = '' } = body;

  if (!email || !isValidEmail(email)) {
    return respond(422, { error: 'A valid email address is required' });
  }

  const cleanEmail = email.trim().toLowerCase();

  if (WAITLIST.has(cleanEmail)) {
    const entry = WAITLIST.get(cleanEmail);
    return respond(200, {
      success:  true,
      message:  'You\'re already on the waitlist!',
      position: entry.position,
      already:  true,
    });
  }

  const position   = WAITLIST.size + 1;
  const referralCode = crypto.randomBytes(5).toString('hex');

  WAITLIST.set(cleanEmail, {
    email:     cleanEmail,
    name:      name.trim().slice(0, 80),
    referral:  referral.trim().slice(0, 20),
    position,
    referralCode,
    joinedAt:  new Date().toISOString(),
  });

  console.log(`[waitlist] #${position} email=${cleanEmail} ref="${referral}"`);

  return respond(201, {
    success:      true,
    message:      `You're #${position} on the waitlist! Share your referral link to move up.`,
    position,
    referralCode,
    referralUrl:  `https://kiki.app/get-started?ref=${referralCode}`,
    totalWaiting: WAITLIST.size,
  });
};

function isValidEmail(str) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(str.trim());
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
