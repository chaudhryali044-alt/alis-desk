import { NextResponse } from 'next/server';
import yahooFinance from 'yahoo-finance2';
import type { EarningsItem } from '@/lib/types';

export const dynamic = 'force-dynamic';

// Top companies by market cap — curated watchlist
const WATCHLIST = [
  'AAPL', 'MSFT', 'NVDA', 'AMZN', 'GOOGL', 'META', 'TSLA', 'BRK-B',
  'JPM', 'V', 'JNJ', 'UNH', 'XOM', 'WMT', 'MA', 'HD', 'PG', 'LLY',
  'BAC', 'AVGO', 'MRK', 'ABBV', 'COST', 'CVX', 'ORCL',
];

const MS_IN_DAY = 86_400_000;

export async function GET() {
  const now = Date.now();
  const windowBack = 7  * MS_IN_DAY;   // reported up to 7 days ago
  const windowFwd  = 14 * MS_IN_DAY;   // upcoming up to 14 days ahead

  // Phase 1: quick quotes to find which symbols have earnings in window
  const quoteResults = await Promise.allSettled(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    WATCHLIST.map(sym => yahooFinance.quote(sym) as Promise<any>)
  );

  const inWindow: { symbol: string; marketCap: number; earningsTs: number }[] = [];

  quoteResults.forEach((r, i) => {
    if (r.status !== 'fulfilled' || !r.value) return;
    const q = r.value;
    const ts: number | null = q.earningsTimestamp ?? null;
    if (!ts) return;
    const ms = ts * 1000;
    if (ms >= now - windowBack && ms <= now + windowFwd) {
      inWindow.push({
        symbol:    WATCHLIST[i],
        marketCap: q.marketCap ?? 0,
        earningsTs: ms,
      });
    }
  });

  // Sort by market cap desc, take top 10
  inWindow.sort((a, b) => b.marketCap - a.marketCap);
  const top10 = inWindow.slice(0, 10);

  if (!top10.length) {
    return NextResponse.json({ earnings: [] }, {
      headers: { 'Cache-Control': 's-maxage=3600, stale-while-revalidate=7200' },
    });
  }

  // Phase 2: quoteSummary for EPS details on filtered set
  const summaryResults = await Promise.allSettled(
    top10.map(({ symbol }) =>
      yahooFinance.quoteSummary(symbol, {
        modules: ['calendarEvents', 'earnings', 'price'],
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      }) as Promise<any>
    )
  );

  const items: EarningsItem[] = top10.map(({ symbol, marketCap, earningsTs }, i) => {
    const r = summaryResults[i];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const s: any = r.status === 'fulfilled' ? r.value : null;

    const reportDate    = new Date(earningsTs);
    const reportDateFmt = reportDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const status: EarningsItem['status'] = earningsTs < now ? 'reported' : 'upcoming';

    const name = s?.price?.shortName ?? s?.price?.longName ?? symbol;

    // EPS from most recent quarterly earnings
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const quarterly: any[] = s?.earnings?.earningsChart?.quarterly ?? [];
    const latest = quarterly[quarterly.length - 1] ?? null;
    const epsActual:   number | null = latest?.actual   ?? null;
    const epsEstimate: number | null = latest?.estimate ?? null;

    let epsBeat: EarningsItem['epsBeat'] = null;
    if (epsActual !== null && epsEstimate !== null) {
      const diff = epsActual - epsEstimate;
      if (diff > 0.01)       epsBeat = 'beat';
      else if (diff < -0.01) epsBeat = 'miss';
      else                   epsBeat = 'inline';
    }

    return { symbol, name, marketCap, reportDate: reportDate.toISOString(), reportDateFmt, epsEstimate, epsActual, epsBeat, status };
  });

  return NextResponse.json({ earnings: items }, {
    headers: { 'Cache-Control': 's-maxage=3600, stale-while-revalidate=7200' },
  });
}
