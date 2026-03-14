export interface Env {
  DB: KVNamespace;
}

export async function onRequestPost(context: { env: Env; request: Request }) {
  try {
    const { password } = await context.request.json();
    const adminPassword = await context.env.DB.get('admin_password');
    
    if (password === adminPassword) {
      return new Response(JSON.stringify({ success: true }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }
    
    return new Response(JSON.stringify({ success: false, error: 'Invalid password' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Authentication failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
