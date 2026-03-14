/** PATCH /api/password — update admin password (requires current token) */
export interface Env {
  DB: KVNamespace;
}

const headers = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers });
}

export async function onRequestPost(context: { env: Env; request: Request }) {
  const adminToken = await context.env.DB.get('admin_token');
  const auth = context.request.headers.get('Authorization');
  if (!adminToken || auth !== `Bearer ${adminToken}`) {
    return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), {
      status: 401, headers,
    });
  }
  try {
    const { newPassword } = await context.request.json() as { newPassword: string };
    if (!newPassword || newPassword.length < 6) {
      return new Response(JSON.stringify({ success: false, error: 'Password too short (min 6)' }), {
        status: 400, headers,
      });
    }
    await context.env.DB.put('admin_password', newPassword);
    // Invalidate current token so user must re-login
    await context.env.DB.delete('admin_token');
    return new Response(JSON.stringify({ success: true }), { headers });
  } catch {
    return new Response(JSON.stringify({ success: false, error: 'Failed to update password' }), {
      status: 500, headers,
    });
  }
}
