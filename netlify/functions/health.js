// ============================================================
//  KIKI — Health Check
//  GET /api/health
//  Returns system status for monitoring / uptime checks
// ============================================================

const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders(), body: '' };
  }

  const status = {
    status:    'ok',
    service:   'KIKI API',
    version:   '2.0.0',
    timestamp: new Date().toISOString(),
    uptime:    process.uptime ? `${Math.round(process.uptime())}s` : 'n/a',
    env:       process.env.NODE_ENV || 'development',
    functions: [
      { name: 'contact',    endpoint: '/.netlify/functions/contact',    method: 'POST' },
      { name: 'newsletter', endpoint: '/.netlify/functions/newsletter', method: 'POST' },
      { name: 'auth',       endpoint: '/.netlify/functions/auth',       method: 'POST' },
      { name: 'waitlist',   endpoint: '/.netlify/functions/waitlist',   method: 'POST' },
      { name: 'health',     endpoint: '/.netlify/functions/health',     method: 'GET'  },
    ],
  };

  return {
    statusCode: 200,
    headers: {
      'Content-Type':  'application/json',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      ...corsHeaders(),
    },
    body: JSON.stringify(status, null, 2),
  };
};

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin':  '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

module.exports = { handler };
