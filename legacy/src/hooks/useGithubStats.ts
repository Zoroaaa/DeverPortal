import { useState, useEffect, useMemo } from 'react';
import type { GithubStats, RepoStats } from '../types';

const CACHE_KEY = 'zoro_github_stats';
const REPO_CACHE_PREFIX = 'zoro_repo_';
const LOCAL_TTL = 3600_000;

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
  } catch {
    return null;
  }
}

function writeCache<T>(key: string, data: T): void {
  try {
    localStorage.setItem(key, JSON.stringify({ data, ts: Date.now() }));
  } catch {
    // localStorage not available
  }
}

export function useGithubStats(username: string | undefined) {
  const [stats, setStats] = useState<GithubStats | null>(null);
  const [loading, setLoading] = useState(false);

  const cachedStats = useMemo(() => {
    if (!username) return null;
    return readCache<GithubStats>(CACHE_KEY + '_' + username);
  }, [username]);

  useEffect(() => {
    if (!username) return;

    if (cachedStats) {
      queueMicrotask(() => setStats(cachedStats));
      return;
    }

    queueMicrotask(() => setLoading(true));
    fetch(`/api/github?username=${encodeURIComponent(username)}`)
      .then(r => r.json())
      .then((json: { success: boolean; data?: GithubStats }) => {
        if (json.success && json.data) {
          setStats(json.data);
          writeCache(CACHE_KEY + '_' + username, json.data);
        }
      })
      .catch(() => {
        // Network error, ignore
      })
      .finally(() => setLoading(false));
  }, [username, cachedStats]);

  return { stats, loading };
}

export function useRepoStats(repoPath: string | undefined) {
  const [stats, setStats] = useState<RepoStats | null>(null);
  const [loading, setLoading] = useState(false);

  const cacheKey = useMemo(() => {
    return repoPath ? REPO_CACHE_PREFIX + repoPath.replace('/', '_') : null;
  }, [repoPath]);

  const cachedStats = useMemo(() => {
    if (!cacheKey) return null;
    return readCache<RepoStats>(cacheKey);
  }, [cacheKey]);

  useEffect(() => {
    if (!repoPath) return;

    if (cachedStats) {
      queueMicrotask(() => setStats(cachedStats));
      return;
    }

    queueMicrotask(() => setLoading(true));
    fetch(`/api/github?repo=${encodeURIComponent(repoPath)}`)
      .then(r => r.json())
      .then((json: { success: boolean; data?: RepoStats }) => {
        if (json.success && json.data) {
          setStats(json.data);
          if (cacheKey) writeCache(cacheKey, json.data);
        }
      })
      .catch(() => {
        // Network error, ignore
      })
      .finally(() => setLoading(false));
  }, [repoPath, cacheKey, cachedStats]);

  return { stats, loading };
}

export function parseRepoPath(url: string | undefined): string | undefined {
  if (!url) return undefined;
  const m = url.match(/github\.com\/([^/]+\/[^/]+?)(?:\.git)?(?:\/.*)?$/);
  return m ? m[1] : undefined;
}
