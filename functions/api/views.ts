/** POST /api/views { projectId } — increment view count in KV */
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
    const { projectId } = await context.request.json() as { projectId: string };
    if (!projectId) {
      return new Response(JSON.stringify({ success: false, error: 'projectId required' }), {
        status: 400, headers,
      });
    }

    // Load projects, increment, save back
    const projects = await context.env.DB.get('projects', 'json') as Array<{ id: string; viewCount: number }> | null;
    if (!projects) {
      return new Response(JSON.stringify({ success: false, error: 'No projects' }), {
        status: 404, headers,
      });
    }
    const updated = projects.map(p =>
      p.id === projectId ? { ...p, viewCount: (p.viewCount || 0) + 1 } : p,
    );
    await context.env.DB.put('projects', JSON.stringify(updated));
    const newCount = updated.find(p => p.id === projectId)?.viewCount ?? 0;
    return new Response(JSON.stringify({ success: true, viewCount: newCount }), { headers });
  } catch {
    return new Response(JSON.stringify({ success: false, error: 'Failed' }), {
      status: 500, headers,
    });
  }
}
