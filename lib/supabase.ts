import { SUPABASE_URL, SUPABASE_ANON_KEY } from './constants';

export interface OracleTick {
  recorded_at: string;
  gpu_hourly_rate: number;
  joule_price_usd: number;
}

/**
 * Fetch oracle ticks from Supabase REST API (public read via RLS)
 */
export async function fetchOracleTicks(since?: string): Promise<OracleTick[]> {
  const params = new URLSearchParams({
    select: 'recorded_at,gpu_hourly_rate,joule_price_usd',
    order: 'recorded_at.asc',
  });

  if (since) {
    params.set('recorded_at', `gte.${since}`);
  }

  const res = await fetch(`${SUPABASE_URL}/rest/v1/oracle_ticks?${params}`, {
    headers: {
      apikey: SUPABASE_ANON_KEY,
    },
    next: { revalidate: 60 }, // Cache for 1 minute
  });

  if (!res.ok) {
    console.error('Failed to fetch oracle ticks:', res.status);
    return [];
  }

  return res.json();
}

/**
 * Get the latest oracle tick
 */
export async function fetchLatestTick(): Promise<OracleTick | null> {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/oracle_ticks?select=recorded_at,gpu_hourly_rate,joule_price_usd&order=recorded_at.desc&limit=1`,
    {
      headers: {
        apikey: SUPABASE_ANON_KEY,
      },
      cache: 'no-store',
    }
  );

  if (!res.ok) return null;

  const data = await res.json();
  return data[0] || null;
}

/**
 * Get time range string for filtering
 */
export function getTimeRangeSince(range: '24h' | '7d' | '30d' | 'all'): string | undefined {
  if (range === 'all') return undefined;

  const now = new Date();
  switch (range) {
    case '24h':
      now.setHours(now.getHours() - 24);
      break;
    case '7d':
      now.setDate(now.getDate() - 7);
      break;
    case '30d':
      now.setDate(now.getDate() - 30);
      break;
  }
  return now.toISOString();
}
