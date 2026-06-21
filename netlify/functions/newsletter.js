// ============================================================
//  KIKI — Newsletter Subscription Handler
//  POST /api/newsletter
//  Body: { email, firstName? }
//
//  Supports: Mailchimp (MAILCHIMP_API_KEY + MAILCHIMP_LIST_ID)
//            ConvertKit (CONVERTKIT_API_KEY + CONVERTKIT_FORM_ID)
//            Or local log-only mode (no keys needed for dev/test)
// ============================================================

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

  const { email, firstName = '' } = body;

  if (!email || !isValidEmail(email)) {
    return respond(422, { error: 'A valid email address is required' });
  }

  const cleanEmail     = email.trim().toLowerCase();
  const cleanFirstName = firstName.trim().slice(0, 50);

  console.log(`[newsletter] subscribe email=${cleanEmail} name="${cleanFirstName}"`);

  // ── 1. Try Mailchimp ─────────────────────────────────────
  if (process.env.MAILCHIMP_API_KEY && process.env.MAILCHIMP_LIST_ID) {
    const result = await subscribeMailchimp(cleanEmail, cleanFirstName);
    if (result.error) {
      // Already subscribed is not an error from user's perspective
      if (result.code === 'MEMBER_EXISTS') {
        return respond(200, { success: true, message: 'You\'re already subscribed — welcome back!' });
      }
      console.error('[newsletter] Mailchimp error:', result.error);
      return respond(500, { error: 'Subscription service temporarily unavailable. Please try again.' });
    }
    return respond(200, { success: true, message: 'You\'re in! 🎉 Check your inbox for a confirmation email.' });
  }

  // ── 2. Try ConvertKit ────────────────────────────────────
  if (process.env.CONVERTKIT_API_KEY && process.env.CONVERTKIT_FORM_ID) {
    const result = await subscribeConvertKit(cleanEmail, cleanFirstName);
    if (result.error) {
      console.error('[newsletter] ConvertKit error:', result.error);
      return respond(500, { error: 'Subscription service temporarily unavailable. Please try again.' });
    }
    return respond(200, { success: true, message: 'You\'re in! 🎉 Check your inbox for a confirmation email.' });
  }

  // ── 3. Dev / log-only mode ───────────────────────────────
  console.log(`[newsletter] DEV MODE — no provider configured. Would subscribe: ${cleanEmail}`);
  return respond(200, {
    success: true,
    message: 'Thanks for subscribing! We\'ll keep you updated.',
    dev: true,
  });
};

// ── Mailchimp integration ─────────────────────────────────────
async function subscribeMailchimp(email, firstName) {
  try {
    const apiKey    = process.env.MAILCHIMP_API_KEY;
    const listId    = process.env.MAILCHIMP_LIST_ID;
    const dc        = apiKey.split('-').pop(); // e.g. "us21"
    const url       = `https://${dc}.api.mailchimp.com/3.0/lists/${listId}/members`;

    const response = await fetch(url, {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `apikey ${apiKey}`,
      },
      body: JSON.stringify({
        email_address: email,
        status:        'subscribed',
        merge_fields:  { FNAME: firstName },
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      if (data.title === 'Member Exists') return { error: true, code: 'MEMBER_EXISTS' };
      return { error: data.detail || 'Mailchimp error' };
    }

    return { success: true, id: data.id };
  } catch (err) {
    return { error: err.message };
  }
}

// ── ConvertKit integration ────────────────────────────────────
async function subscribeConvertKit(email, firstName) {
  try {
    const apiKey  = process.env.CONVERTKIT_API_KEY;
    const formId  = process.env.CONVERTKIT_FORM_ID;
    const url     = `https://api.convertkit.com/v3/forms/${formId}/subscribe`;

    const response = await fetch(url, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ api_key: apiKey, email, first_name: firstName }),
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      return { error: data.message || 'ConvertKit error' };
    }

    return { success: true };
  } catch (err) {
    return { error: err.message };
  }
}

// ── Helpers ───────────────────────────────────────────────────
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
