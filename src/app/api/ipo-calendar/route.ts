import { NextResponse } from 'next/server';
import type { IPOItem } from '@/lib/types';

export const revalidate = 21600;

function fmtDate(d: Date, offsetDays = 0): string {
  const dd = new Date(d);
  dd.setDate(dd.getDate() + offsetDays);
  return dd.toISOString().slice(0, 10);
}

interface FMPIPOItem {
  date?: string;
  company?: string;
  symbol?: string;
  exchange?: string;
  priceRange?: string;
  marketCap?: number;
}

async function fetchIPOs(from: string, to: string, apiKey: string): Promise<FMPIPOItem[]> {
  const res = await fetch(
    `https://financialmodelingprep.com/api/v3/ipo_calendar?from=${from}&to=${to}&apikey=${apiKey}`,
    { next: { revalidate: 21600 } }
  );
  if (!res.ok) return [];
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

function fmtMarketCap(mc?: number): string | undefined {
  if (!mc) return undefined;
  if (mc >= 1e9) return `$${(mc / 1e9).toFixed(1)}B`;
  if (mc >= 1e6) return `$${(mc / 1e6).toFixed(0)}M`;
  return `$${mc.toLocaleString()}`;
}

export async function GET() {
  const apiKey = process.env.FMP_API_KEY || 'demo';
  const today = new Date();
  const upcomingFrom = fmtDate(today);
  const upcomingTo = fmtDate(today, 45);
  const recentFrom = fmtDate(today, -45);
  const recentTo = fmtDate(today, -1);

  let upcoming: IPOItem[] = [];
  let recent: IPOItem[] = [];

  try {
    const [upcomingRaw, recentRaw] = await Promise.all([
      fetchIPOs(upcomingFrom, upcomingTo, apiKey),
      fetchIPOs(recentFrom, recentTo, apiKey),
    ]);

    upcoming = upcomingRaw.slice(0, 5).map(i => ({
      symbol: i.symbol ?? '—',
      company: i.company ?? 'Unknown',
      date: i.date ?? '',
      exchange: i.exchange,
      priceRange: i.priceRange,
      marketCap: fmtMarketCap(i.marketCap),
      status: 'upcoming' as const,
    }));

    recent = recentRaw.slice(0, 5).map(i => ({
      symbol: i.symbol ?? '—',
      company: i.company ?? 'Unknown',
      date: i.date ?? '',
      exchange: i.exchange,
      priceRange: i.priceRange,
      marketCap: fmtMarketCap(i.marketCap),
      // FMP doesn't reliably provide firstDayReturn; leave undefined
      status: 'recent' as const,
    }));
  } catch {
    // Fall through to empty
  }

  return NextResponse.json({ upcoming, recent });
}
