import { NextResponse } from 'next/server';
import type { EarningsItem } from '@/lib/types';

export const dynamic = 'force-dynamic';

const YF_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept': 'application/json',
};

// Curated large-cap earnings watchlist
const WATCHLIST = [
  'AAPL', 'MSFT', 'NVDA', 'AMZN', 'GOOGL', 'META', 'TSLA', 'JPM', 'V', 'JNJ',
  'UNH', 'XOM', 'WMT', 'MA', 'HD', 'PG', 'LLY', 'BAC', 'AVGO', 'MRK',
  'ABBV', 'COST', 'CVX', 'ORCL', 'NFLX', 'AMD', 'INTC', 'GS', 'MS', 'CAT',
];

async function fetchTrending(): Promise<string[]> {
  try {
    const r = await fetch(
      'https://query1.finance.yahoo.com/v1/finance/trending/US?count=20',
      { headers: YF_HEADERS }
    );
    if (!r.ok) return [];
    const data = await r.json();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (data?.finance?.result?.[0]?.quotes ?? []).map((q: any) => q.symbol as string);
  } catch {
    return [];
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function fetchQuoteSummary(symbol: string): Promise<any> {
  try {
    const url = `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(symbol)}?modules=earnings%2Cprice`;
    const r = await fetch(url, { headers: YF_HEADERS });
    if (!r.ok) return null;
    const data = await r.json();
    return data?.quoteSummary?.result?.[0] ?? null;
  } catch {
    return null;
  }
}

export async function GET() {
  // Merge trending + watchlist, deduplicate
  const trending = await fetchTrending();
  const seen = new Set<string>();
  const symbols: string[] = [];
  for (const s of [...trending, ...WATCHLIST]) {
    if (!seen.has(s)) { seen.add(s); symbols.push(s); }
    if (symbols.length >= 40) break;
  }

  const results = await Promise.allSettled(symbols.map(sym => fetchQuoteSummary(sym)));

  const items: EarningsItem[] = [];

  results.forEach((r, i) => {
    if (r.status !== 'fulfilled' || !r.value) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const s: any = r.value;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const quarterly: any[] = s?.earnings?.earningsChart?.quarterly ?? [];
    const latest = quarterly[quarterly.length - 1] ?? null;

    const epsActual:   number | null = latest?.actual?.raw   ?? null;
    const epsEstimate: number | null = latest?.estimate?.raw ?? null;

    // Only include stocks that have actual reported EPS data
    if (epsActual === null) return;

    const name      = s?.price?.shortName ?? s?.price?.longName ?? symbols[i];
    const marketCap = s?.price?.marketCap?.raw ?? 0;

    let epsBeat: EarningsItem['epsBeat'] = null;
    if (epsEstimate !== null) {
      const diff = epsActual - epsEstimate;
      if (diff > 0.01)       epsBeat = 'beat';
      else if (diff < -0.01) epsBeat = 'miss';
      else                   epsBeat = 'inline';
    }

    // Derive the quarter label from the date string (e.g. "1Q2025")
    const quarter    = latest?.date ?? '';
    const reportDate = new Date().toISOString(); // placeholder — we don't have exact date

    items.push({
      symbol:        symbols[i],
      name,
      marketCap,
      reportDate,
      reportDateFmt: quarter,
      epsEstimate,
      epsActual,
      epsBeat,
      status: 'reported',
    });
  });

  // Sort by market cap descending, take top 10
  items.sort((a, b) => b.marketCap - a.marketCap);
  const top10 = items.slice(0, 10);

  return NextResponse.json({ earnings: top10 }, {
    headers: { 'Cache-Control': 's-maxage=900, stale-while-revalidate=1800' },
  });
}
