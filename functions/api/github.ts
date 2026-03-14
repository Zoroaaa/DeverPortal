/**
 * GitHub stats proxy — caches in KV for 1 hour to avoid rate limits.
 * GET /api/github?username=xxx          → aggregate stats + language breakdown
 * GET /api/github?repo=owner/repo       → single repo stats
 */
export interface Env {
  DB: KVNamespace;
  GITHUB_TOKEN?: string; // optional PAT for higher rate limit (set in wrangler.toml vars)
}

const CACHE_TTL = 3600; // 1 hour

const headers = (extra?: Record<string, string>) => ({
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  ...extra,
});

async function ghFetch(url: string, token?: string) {
  const res = await fetch(url, {
    headers: {
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      'User-Agent': 'zoro-portfolio',
    },
  });
  if (!res.ok) throw new Error(`GitHub API ${res.status}: ${url}`);
  return res.json();
}

// Language color map (top languages)
const LANG_COLORS: Record<string, string> = {
  TypeScript: '#3178c6', JavaScript: '#f1e05a', Python: '#3572A5',
  Go: '#00ADD8', Rust: '#dea584', Vue: '#41b883', React: '#61dafb',
  CSS: '#563d7c', HTML: '#e34c26', Shell: '#89e051', Java: '#b07219',
  'C++': '#f34b7d', C: '#555555', Kotlin: '#A97BFF', Swift: '#F05138',
};

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: headers() });
}

export async function onRequestGet(context: { env: Env; request: Request }) {
  const url = new URL(context.request.url);
  const username = url.searchParams.get('username');
  const repo = url.searchParams.get('repo');
  const token = context.env.GITHUB_TOKEN;

  // ── Single repo stats ──────────────────────────────────────────────────────
  if (repo) {
    const cacheKey = `github_repo_${repo.replace('/', '_')}`;
    const cached = await context.env.DB.get(cacheKey, 'json') as unknown;
    if (cached) {
      return new Response(JSON.stringify({ success: true, data: cached, cached: true }), { headers: headers() });
    }
    try {
      const data = await ghFetch(`https://api.github.com/repos/${repo}`, token) as {
        stargazers_count: number;
        forks_count: number;
        language: string | null;
        open_issues_count: number;
        updated_at: string;
      };
      const result = {
        stars: data.stargazers_count,
        forks: data.forks_count,
        language: data.language,
        openIssues: data.open_issues_count,
        updatedAt: data.updated_at,
      };
      await context.env.DB.put(cacheKey, JSON.stringify(result), { expirationTtl: CACHE_TTL });
      return new Response(JSON.stringify({ success: true, data: result }), { headers: headers() });
    } catch (e) {
      return new Response(JSON.stringify({ success: false, error: String(e) }), {
        status: 502, headers: headers(),
      });
    }
  }

  // ── Aggregate user stats ──────────────────────────────────────────────────
  if (!username) {
    return new Response(JSON.stringify({ success: false, error: 'username or repo required' }), {
      status: 400, headers: headers(),
    });
  }

  const cacheKey = `github_user_${username}`;
  const cached = await context.env.DB.get(cacheKey, 'json') as unknown;
  if (cached) {
    return new Response(JSON.stringify({ success: true, data: cached, cached: true }), { headers: headers() });
  }

  try {
    // User profile
    const user = await ghFetch(`https://api.github.com/users/${username}`, token) as {
      public_repos: number;
      followers: number;
    };

    // All repos (up to 100)
    const repos = await ghFetch(
      `https://api.github.com/users/${username}/repos?per_page=100&sort=updated`,
      token,
    ) as { stargazers_count: number; forks_count: number; language: string | null; size: number }[];

    const totalStars = repos.reduce((s, r) => s + r.stargazers_count, 0);
    const totalForks = repos.reduce((s, r) => s + r.forks_count, 0);

    // Language aggregation by repo count
    const langCount: Record<string, number> = {};
    for (const r of repos) {
      if (r.language) langCount[r.language] = (langCount[r.language] || 0) + 1;
    }
    const languages = Object.entries(langCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([name, count]) => ({
        name,
        bytes: count, // using count as proxy weight
        color: LANG_COLORS[name] || '#8b8b8b',
      }));

    const result = {
      totalStars,
      totalForks,
      totalRepos: user.public_repos,
      followers: user.followers,
      languages,
      updatedAt: new Date().toISOString(),
    };

    await context.env.DB.put(cacheKey, JSON.stringify(result), { expirationTtl: CACHE_TTL });
    return new Response(JSON.stringify({ success: true, data: result }), { headers: headers() });
  } catch (e) {
    return new Response(JSON.stringify({ success: false, error: String(e) }), {
      status: 502, headers: headers(),
    });
  }
}
