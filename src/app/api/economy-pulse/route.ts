import { NextResponse } from 'next/server';
import yahooFinance from 'yahoo-finance2';
import Groq from 'groq-sdk';
import type { EconomyMetric } from '@/lib/types';

export const dynamic = 'force-dynamic';

const INSTRUMENTS = [
  { symbol: '^GSPC',    key: 'sp500',    label: 'S&P 500',         unit: '',      decimals: 0, pctDecimals: 2 },
  { symbol: '^VIX',     key: 'vix',      label: 'VIX',             unit: '',      decimals: 1, pctDecimals: 1 },
  { symbol: 'CL=F',     key: 'oil',      label: 'WTI Oil',         unit: '$/bbl', decimals: 2, pctDecimals: 2 },
  { symbol: 'GC=F',     key: 'gold',     label: 'Gold',            unit: '$/oz',  decimals: 0, pctDecimals: 2 },
  { symbol: '^TNX',     key: 'tenYear',  label: 'US 10Y Yield',    unit: '%',     decimals: 2, pctDecimals: 1 },
  { symbol: 'DX-Y.NYB', key: 'dxy',     label: 'Dollar Index',    unit: '',      decimals: 1, pctDecimals: 2 },
  { symbol: 'HG=F',     key: 'copper',  label: 'Copper',          unit: '$/lb',  decimals: 2, pctDecimals: 2 },
];

async function fetchQuote(symbol: string): Promise<{
  price: number; change: number; changePct: number; asOf: string;
} | null> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const q: any = await yahooFinance.quote(symbol);
    if (!q?.regularMarketPrice) return null;
    const asOf = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    return {
      price:     q.regularMarketPrice as number,
      change:    q.regularMarketChange as number ?? 0,
      changePct: q.regularMarketChangePercent as number ?? 0,
      asOf,
    };
  } catch {
    return null;
  }
}

async function generateAnalyses(dataLines: string[]): Promise<Record<string, string>> {
  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
  const prompt = `You are a senior investment banker. Given these live market levels, write ONE razor-sharp sentence (under 18 words) per metric explaining what it means RIGHT NOW for markets, valuations, or deal flow. No preamble, no labels in the sentence.

${dataLines.join('\n')}

Return ONLY valid JSON with these exact keys:
{ "sp500": "...", "vix": "...", "oil": "...", "gold": "...", "tenYear": "...", "dxy": "...", "copper": "..." }`;

  try {
    const completion = await groq.chat.completions.create({
      model: 'llama-3.1-8b-instant',
      max_tokens: 350,
      temperature: 0.3,
      response_format: { type: 'json_object' },
      messages: [{ role: 'user', content: prompt }],
    });
    return JSON.parse(completion.choices[0]?.message?.content ?? '{}');
  } catch {
    return {};
  }
}

const FALLBACK_ANALYSES: Record<string, string> = {
  sp500:   'Equity valuations anchored to earnings growth — watch Fed guidance for multiple expansion.',
  vix:     'Implied volatility signals current market anxiety level; affects option hedging costs.',
  oil:     'Energy prices flow directly into input costs, inflation, and consumer spending.',
  gold:    'Safe-haven demand reflects macro uncertainty — watch for risk-off shift.',
  tenYear: 'Risk-free rate benchmark determines discount rates for all asset valuations.',
  dxy:     'Dollar strength pressures EM assets and multi-national earnings translations.',
  copper:  'Industrial bellwether — copper price signals global growth and infrastructure demand.',
};

export async function GET() {
  const results = await Promise.allSettled(
    INSTRUMENTS.map(({ symbol }) => fetchQuote(symbol))
  );

  const dataLines: string[] = [];
  const quoteMap: Record<string, { price: number; change: number; changePct: number; asOf: string }> = {};

  INSTRUMENTS.forEach(({ symbol, key, label, unit }, i) => {
    const r = results[i];
    if (r.status === 'fulfilled' && r.value) {
      quoteMap[key] = r.value;
      dataLines.push(`${label}: ${r.value.price.toFixed(2)}${unit} (${r.value.changePct >= 0 ? '+' : ''}${r.value.changePct.toFixed(2)}%)`);
    } else {
      dataLines.push(`${label}: data unavailable`);
    }
  });

  const analyses = await generateAnalyses(dataLines);

  const metrics: EconomyMetric[] = INSTRUMENTS.map(({ key, label, unit, decimals }) => {
    const q = quoteMap[key];
    const pct = q?.changePct ?? 0;
    return {
      key,
      label,
      value: q ? q.price.toFixed(decimals) : '—',
      unit,
      change:    parseFloat(pct.toFixed(2)),
      changePts: parseFloat((q?.change ?? 0).toFixed(decimals)),
      trend:     pct > 0.05 ? 'up' : pct < -0.05 ? 'down' : 'flat',
      asOf:      q?.asOf ?? '—',
      analysis:  analyses[key] ?? FALLBACK_ANALYSES[key] ?? '',
    };
  });

  return NextResponse.json({ metrics }, {
    headers: { 'Cache-Control': 's-maxage=60, stale-while-revalidate=120' },
  });
}
