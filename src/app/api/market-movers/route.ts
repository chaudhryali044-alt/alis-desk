import { NextResponse } from 'next/server';
import Groq from 'groq-sdk';

export const dynamic = 'force-dynamic';

const YF_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept': 'application/json',
};

// Representative S&P 500 basket — fallback if screener is unavailable
const WATCHLIST = [
  'AAPL', 'MSFT', 'NVDA', 'META', 'GOOGL', 'AMZN', 'TSLA', 'AVGO', 'AMD', 'INTC',
  'ORCL', 'CRM', 'ADBE', 'QCOM', 'TXN', 'JPM', 'BAC', 'WFC', 'GS', 'MS',
  'V', 'MA', 'AXP', 'C', 'BLK', 'JNJ', 'UNH', 'LLY', 'ABBV', 'MRK',
  'PFE', 'TMO', 'ABT', 'AMGN', 'BMY', 'XOM', 'CVX', 'COP', 'SLB', 'OXY',
  'WMT', 'COST', 'HD', 'PG', 'KO', 'PEP', 'MCD', 'NKE', 'SBUX', 'LOW',
  'CAT', 'BA', 'GE', 'HON', 'UNP', 'RTX', 'LMT', 'DE', 'FDX',
  'NFLX', 'DIS', 'CMCSA', 'T', 'VZ', 'NEE', 'DUK', 'LIN', 'SHW', 'AMT',
];

interface RawMover {
  symbol:    string;
  name:      string;
  price:     number;
  changePct: number;
  sector:    string;
}

// Try Yahoo Finance predefined screener (requires no crumb for some deployments)
async function fetchScreener(scrId: string): Promise<RawMover[]> {
  try {
    const url = `https://query1.finance.yahoo.com/v1/finance/screener/predefined/saved?scrIds=${scrId}&count=6`;
    const r = await fetch(url, { headers: YF_HEADERS });
    if (!r.ok) return [];
    const data = await r.json();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const quotes: any[] = data?.finance?.result?.[0]?.quotes ?? [];
    return quotes.slice(0, 5).map(q => ({
      symbol:    q.symbol ?? '',
      name:      q.shortName ?? q.longName ?? q.symbol ?? '',
      price:     q.regularMarketPrice ?? 0,
      changePct: q.regularMarketChangePercent ?? 0,
      sector:    q.sector ?? 'Unknown',
    })).filter(q => q.symbol && q.price > 0);
  } catch {
    return [];
  }
}

// Fallback: fetch basket of stocks via v8/chart and sort by % change
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function fetchChart(symbol: string): Promise<any> {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1d`;
    const r = await fetch(url, { headers: YF_HEADERS });
    if (!r.ok) return null;
    const data = await r.json();
    return data?.chart?.result?.[0]?.meta ?? null;
  } catch {
    return null;
  }
}

async function fetchBasketMovers(): Promise<{ gainers: RawMover[]; losers: RawMover[] }> {
  const results = await Promise.allSettled(WATCHLIST.map(sym => fetchChart(sym)));

  const quotes: RawMover[] = results
    .map((r, i) => {
      if (r.status !== 'fulfilled' || !r.value) return null;
      const meta = r.value;
      if (!meta?.regularMarketPrice) return null;
      const price     = meta.regularMarketPrice as number;
      const prevClose = meta.chartPreviousClose ?? meta.previousClose ?? price;
      const changePct = prevClose !== 0 ? ((price - prevClose) / prevClose) * 100 : 0;
      return {
        symbol:    WATCHLIST[i],
        name:      meta.longName ?? meta.shortName ?? WATCHLIST[i],
        price,
        changePct,
        sector:    'Unknown',
      };
    })
    .filter((q): q is RawMover => q !== null);

  if (!quotes.length) return { gainers: [], losers: [] };

  const sorted  = [...quotes].sort((a, b) => b.changePct - a.changePct);
  return {
    gainers: sorted.slice(0, 5),
    losers:  sorted.slice(-5).reverse(),
  };
}

async function generateReasons(movers: RawMover[]): Promise<string[]> {
  if (!movers.length) return [];
  try {
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
    const lines = movers.map((m, i) =>
      `${i + 1}. ${m.name} (${m.symbol}): ${m.changePct >= 0 ? '+' : ''}${m.changePct.toFixed(2)}%`
      + (m.sector !== 'Unknown' ? ` | Sector: ${m.sector}` : '')
    ).join('\n');
    const completion = await groq.chat.completions.create({
      model: 'llama-3.1-8b-instant',
      max_tokens: 300,
      temperature: 0.3,
      response_format: { type: 'json_object' },
      messages: [{
        role: 'user',
        content:
          `For each stock below, write ONE sharp sentence (max 15 words) explaining today's likely move driver. ` +
          `Return JSON: { "reasons": ["reason1", "reason2", ...] } in the same order.\n\n${lines}`,
      }],
    });
    const parsed = JSON.parse(completion.choices[0]?.message?.content ?? '{}');
    const reasons: string[] = parsed.reasons ?? [];
    return movers.map((_, i) => reasons[i] ?? '');
  } catch {
    return movers.map(() => '');
  }
}

export async function GET() {
  // Try screener first; fall back to basket if screener returns < 3 results
  let [gainers, losers] = await Promise.all([
    fetchScreener('day_gainers'),
    fetchScreener('day_losers'),
  ]);

  if (gainers.length < 3 || losers.length < 3) {
    const basket = await fetchBasketMovers();
    if (gainers.length < 3) gainers = basket.gainers;
    if (losers.length  < 3) losers  = basket.losers;
  }

  if (gainers.length === 0 && losers.length === 0) {
    return NextResponse.json(
      { gainers: [], losers: [], error: 'Live market data unavailable' },
      { headers: { 'Cache-Control': 's-maxage=60, stale-while-revalidate=120' } }
    );
  }

  const [gainerReasons, loserReasons] = await Promise.all([
    generateReasons(gainers),
    generateReasons(losers),
  ]);

  return NextResponse.json({
    gainers: gainers.map((m, i) => ({ ...m, reason: gainerReasons[i] ?? '' })),
    losers:  losers.map((m, i)  => ({ ...m, reason: loserReasons[i]  ?? '' })),
  }, {
    headers: { 'Cache-Control': 's-maxage=60, stale-while-revalidate=120' },
  });
}
