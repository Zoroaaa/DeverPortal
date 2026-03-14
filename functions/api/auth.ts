export interface Env {
  DB: KVNamespace;
}

const headers = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers });
}

export async function onRequestPost(context: { env: Env; request: Request }) {
  try {
    const { password } = await context.request.json() as { password: string };
    const adminPassword = await context.env.DB.get('admin_password');

    // If no password set yet, use env fallback or default
    const correctPassword = adminPassword || 'zoro2024';

    if (password === correctPassword) {
      // Return a simple session token (stored in KV for validation)
      const token = crypto.randomUUID();
      await context.env.DB.put('admin_token', token, { expirationTtl: 86400 }); // 24h
      return new Response(JSON.stringify({ success: true, token }), { headers });
    }

    return new Response(JSON.stringify({ success: false, error: 'Invalid password' }), {
      status: 401, headers,
    });
  } catch {
    return new Response(JSON.stringify({ success: false, error: 'Auth failed' }), {
      status: 500, headers,
    });
  }
}
