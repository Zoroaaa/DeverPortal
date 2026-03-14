import { useState, useEffect } from 'react';
import type { GithubStats, RepoStats } from '../types';

const CACHE_KEY = 'zoro_github_stats';
const REPO_CACHE_PREFIX = 'zoro_repo_';
const LOCAL_TTL = 3600_000; // 1h in ms

interface CacheEntry<T> {
  data: T;
  ts: number;
}

function readCache<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const entry = JSON.parse(raw) as CacheEntry<T>;
    if (Date.now() - entry.ts > LOCAL_TTL) return null;
    return entry.data;
  } catch { return null; }
}

function writeCache<T>(key: string, data: T) {
  try { localStorage.setItem(key, JSON.stringify({ data, ts: Date.now() })); } catch {}
}

export function useGithubStats(username: string | undefined) {
  const [stats, setStats] = useState<GithubStats | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!username) return;

    const cached = readCache<GithubStats>(CACHE_KEY + '_' + username);
    if (cached) { setStats(cached); return; }

    setLoading(true);
    fetch(`/api/github?username=${encodeURIComponent(username)}`)
      .then(r => r.json())
      .then((json: { success: boolean; data?: GithubStats }) => {
        if (json.success && json.data) {
          setStats(json.data);
          writeCache(CACHE_KEY + '_' + username, json.data);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [username]);

  return { stats, loading };
}

export function useRepoStats(repoPath: string | undefined) {
  // repoPath: "owner/repo" extracted from GitHub URL
  const [stats, setStats] = useState<RepoStats | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!repoPath) return;

    const cacheKey = REPO_CACHE_PREFIX + repoPath.replace('/', '_');
    const cached = readCache<RepoStats>(cacheKey);
    if (cached) { setStats(cached); return; }

    setLoading(true);
    fetch(`/api/github?repo=${encodeURIComponent(repoPath)}`)
      .then(r => r.json())
      .then((json: { success: boolean; data?: RepoStats }) => {
        if (json.success && json.data) {
          setStats(json.data);
          writeCache(cacheKey, json.data);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [repoPath]);

  return { stats, loading };
}

/** Extract "owner/repo" from a GitHub URL */
export function parseRepoPath(url: string | undefined): string | undefined {
  if (!url) return undefined;
  const m = url.match(/github\.com\/([^/]+\/[^/]+?)(?:\.git)?(?:\/.*)?$/);
  return m ? m[1] : undefined;
}
