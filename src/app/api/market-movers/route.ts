import { NextResponse } from 'next/server';
import yahooFinance from 'yahoo-finance2';
import Groq from 'groq-sdk';

export const dynamic = 'force-dynamic';

interface RawMover {
  symbol: string;
  name: string;
  price: number;
  changePct: number;
  sector: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function screenerFetch(scrId: string): Promise<RawMover[]> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await (yahooFinance.screener as any)({
      scrIds: scrId,
      count: 6,
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const quotes: any[] = result?.quotes ?? [];
    return quotes.slice(0, 5).map(q => ({
      symbol:    q.symbol ?? '',
      name:      q.shortName ?? q.longName ?? q.symbol ?? '',
      price:     q.regularMarketPrice ?? 0,
      changePct: q.regularMarketChangePercent ?? 0,
      sector:    q.sector ?? 'Unknown',
    }));
  } catch {
    return [];
  }
}

async function generateReasons(movers: RawMover[]): Promise<string[]> {
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
          `For each stock below, write ONE sharp sentence (max 15 words) explaining today's move. ` +
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

const GAINER_FALLBACK: RawMover[] = [
  { symbol: 'NVDA',  name: 'NVIDIA',          price: 950,  changePct: 4.8,  sector: 'Technology' },
  { symbol: 'META',  name: 'Meta Platforms',   price: 580,  changePct: 3.5,  sector: 'Technology' },
  { symbol: 'AMZN',  name: 'Amazon',           price: 225,  changePct: 2.9,  sector: 'Consumer Cyclical' },
  { symbol: 'TSLA',  name: 'Tesla',            price: 295,  changePct: 2.4,  sector: 'Consumer Cyclical' },
  { symbol: 'MSFT',  name: 'Microsoft',        price: 465,  changePct: 1.8,  sector: 'Technology' },
];
const LOSER_FALLBACK: RawMover[] = [
  { symbol: 'PFE',   name: 'Pfizer',           price: 28,   changePct: -4.2, sector: 'Healthcare' },
  { symbol: 'BA',    name: 'Boeing',           price: 165,  changePct: -3.1, sector: 'Industrials' },
  { symbol: 'XOM',   name: 'Exxon Mobil',      price: 112,  changePct: -2.5, sector: 'Energy' },
  { symbol: 'CVS',   name: 'CVS Health',       price: 55,   changePct: -2.1, sector: 'Healthcare' },
  { symbol: 'T',     name: 'AT&T',             price: 22,   changePct: -1.7, sector: 'Communication' },
];

export async function GET() {
  const [gainersRaw, losersRaw] = await Promise.all([
    screenerFetch('day_gainers'),
    screenerFetch('day_losers'),
  ]);

  const gainers = gainersRaw.length >= 3 ? gainersRaw : GAINER_FALLBACK;
  const losers  = losersRaw.length  >= 3 ? losersRaw  : LOSER_FALLBACK;

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
