import { NextResponse } from 'next/server';
import yahooFinance from 'yahoo-finance2';
import Groq from 'groq-sdk';

export const dynamic = 'force-dynamic';

// Representative S&P 500 basket across all sectors — real quotes, sorted by % change
const WATCHLIST = [
  // Technology
  'AAPL', 'MSFT', 'NVDA', 'META', 'GOOGL', 'AMZN', 'TSLA', 'AVGO', 'AMD', 'INTC',
  'ORCL', 'CRM', 'ADBE', 'QCOM', 'TXN',
  // Financials
  'JPM', 'BAC', 'WFC', 'GS', 'MS', 'V', 'MA', 'AXP', 'C', 'BLK',
  // Healthcare
  'JNJ', 'UNH', 'LLY', 'ABBV', 'MRK', 'PFE', 'TMO', 'ABT', 'AMGN', 'BMY',
  // Energy
  'XOM', 'CVX', 'COP', 'SLB', 'OXY',
  // Consumer Discretionary / Staples
  'WMT', 'COST', 'HD', 'PG', 'KO', 'PEP', 'MCD', 'NKE', 'SBUX', 'LOW',
  // Industrials
  'CAT', 'BA', 'GE', 'HON', 'UNP', 'RTX', 'LMT', 'DE', 'FDX',
  // Communication / Media
  'NFLX', 'DIS', 'CMCSA', 'T', 'VZ',
  // Utilities / Materials / REITs
  'NEE', 'DUK', 'LIN', 'SHW', 'AMT',
];

interface Mover {
  symbol:    string;
  name:      string;
  price:     number;
  changePct: number;
  sector:    string;
  reason:    string;
}

async function generateReasons(movers: Omit<Mover, 'reason'>[]): Promise<string[]> {
  if (!movers.length) return [];
  try {
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
    const lines = movers.map((m, i) =>
      `${i + 1}. ${m.name} (${m.symbol}): ${m.changePct >= 0 ? '+' : ''}${m.changePct.toFixed(2)}% | Sector: ${m.sector}`
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
  // Fetch all quotes in parallel — quote() doesn't need crumb auth
  const results = await Promise.allSettled(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    WATCHLIST.map(sym => yahooFinance.quote(sym) as Promise<any>)
  );

  const quotes = results
    .map((r, i) => {
      if (r.status !== 'fulfilled' || !r.value) return null;
      const q = r.value;
      if (q.regularMarketPrice == null || q.regularMarketChangePercent == null) return null;
      return {
        symbol:    WATCHLIST[i],
        name:      q.shortName ?? q.longName ?? WATCHLIST[i],
        price:     q.regularMarketPrice as number,
        changePct: q.regularMarketChangePercent as number,
        sector:    (q.sector as string) ?? 'Unknown',
      };
    })
    .filter((q): q is NonNullable<typeof q> => q !== null);

  if (quotes.length === 0) {
    return NextResponse.json(
      { gainers: [], losers: [], error: 'Live market data unavailable' },
      { headers: { 'Cache-Control': 's-maxage=60, stale-while-revalidate=120' } }
    );
  }

  const sorted = [...quotes].sort((a, b) => b.changePct - a.changePct);
  const gainers = sorted.slice(0, 5);
  const losers  = sorted.slice(-5).reverse();

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
