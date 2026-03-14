export interface Env {
  DB: KVNamespace;
}

const headers = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

function verifyAdmin(request: Request, adminToken: string | null): boolean {
  const auth = request.headers.get('Authorization');
  return !!adminToken && auth === `Bearer ${adminToken}`;
}

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers });
}

export async function onRequestGet(context: { env: Env }) {
  try {
    const config = await context.env.DB.get('site_config', 'json');
    return new Response(JSON.stringify({ success: true, data: config }), { headers });
  } catch {
    return new Response(JSON.stringify({ success: false, error: 'Failed to fetch config' }), {
      status: 500, headers,
    });
  }
}

export async function onRequestPost(context: { env: Env; request: Request }) {
  const adminToken = await context.env.DB.get('admin_token');
  if (!verifyAdmin(context.request, adminToken)) {
    return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), {
      status: 401, headers,
    });
  }
  try {
    const config = await context.request.json();
    await context.env.DB.put('site_config', JSON.stringify(config));
    return new Response(JSON.stringify({ success: true }), { headers });
  } catch {
    return new Response(JSON.stringify({ success: false, error: 'Failed to save config' }), {
      status: 500, headers,
    });
  }
}
