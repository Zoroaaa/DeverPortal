export interface Env {
  DB: KVNamespace;
}

function corsHeaders() {
  return {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };
}

function verifyAdmin(request: Request, adminToken: string | null): boolean {
  const auth = request.headers.get('Authorization');
  return !!adminToken && auth === `Bearer ${adminToken}`;
}

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: corsHeaders() });
}

export async function onRequestGet(context: { env: Env }) {
  try {
    const projects = await context.env.DB.get('projects', 'json');
    return new Response(JSON.stringify({ success: true, data: projects || [] }), {
      headers: corsHeaders(),
    });
  } catch {
    return new Response(JSON.stringify({ success: false, error: 'Failed to fetch projects' }), {
      status: 500, headers: corsHeaders(),
    });
  }
}

export async function onRequestPost(context: { env: Env; request: Request }) {
  const adminToken = await context.env.DB.get('admin_token');
  if (!verifyAdmin(context.request, adminToken)) {
    return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), {
      status: 401, headers: corsHeaders(),
    });
  }
  try {
    const projects = await context.request.json();
    await context.env.DB.put('projects', JSON.stringify(projects));
    return new Response(JSON.stringify({ success: true }), { headers: corsHeaders() });
  } catch {
    return new Response(JSON.stringify({ success: false, error: 'Failed to save projects' }), {
      status: 500, headers: corsHeaders(),
    });
  }
}
