export interface Env {
  DB: KVNamespace;
}

export async function onRequestGet(context: { env: Env }) {
  try {
    const projects = await context.env.DB.get('projects', 'json');
    return new Response(JSON.stringify(projects || []), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Failed to fetch projects' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

export async function onRequestPost(context: { env: Env; request: Request }) {
  try {
    const projects = await context.request.json();
    await context.env.DB.put('projects', JSON.stringify(projects));
    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Failed to save projects' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
