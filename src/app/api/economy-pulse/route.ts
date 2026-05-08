import { NextResponse } from 'next/server';
import yahooFinance from 'yahoo-finance2';
import Groq from 'groq-sdk';
import type { EconomyMetric } from '@/lib/types';

export const dynamic = 'force-dynamic';

const FMP_BASE = 'https://financialmodelingprep.com/api/v4';

async function fetchFMPIndicator(name: string, apiKey: string): Promise<number | null> {
  try {
    const res = await fetch(`${FMP_BASE}/economic?name=${name}&apikey=${apiKey}`, {
      next: { revalidate: 21600 },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.[0]?.value ?? null;
  } catch {
    return null;
  }
}

async function fetchYahooPrice(symbol: string): Promise<{ price: number; changePercent: number } | null> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const q: any = await yahooFinance.quote(symbol);
    if (!q?.regularMarketPrice) return null;
    return {
      price: q.regularMarketPrice,
      changePercent: q.regularMarketChangePercent ?? 0,
    };
  } catch {
    return null;
  }
}

async function generateAnalyses(metrics: Record<string, string>): Promise<Record<string, string>> {
  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
  const lines = Object.entries(metrics)
    .map(([k, v]) => `${k}: ${v}`)
    .join('\n');

  const prompt = `You are a senior investment banker. Given these current economic indicators, write ONE sharp sentence for each that tells a finance professional exactly what it means for markets, deal flow, or borrowing costs. No preamble, no labels — just the insights.

${lines}

Respond ONLY with valid JSON in this exact shape (no extra keys):
{
  "fedRate": "...",
  "cpi": "...",
  "gdp": "...",
  "oil": "...",
  "gold": "...",
  "vix": "..."
}`;

  try {
    const completion = await groq.chat.completions.create({
      model: 'llama-3.1-8b-instant',
      max_tokens: 300,
      temperature: 0.3,
      response_format: { type: 'json_object' },
      messages: [{ role: 'user', content: prompt }],
    });
    const text = completion.choices[0]?.message?.content ?? '{}';
    return JSON.parse(text);
  } catch {
    return {};
  }
}

export async function GET() {
  const apiKey = process.env.FMP_API_KEY || 'demo';

  const [fedRateRaw, cpiRaw, gdpRaw, oilData, goldData, vixData] = await Promise.all([
    fetchFMPIndicator('federalFunds', apiKey),
    fetchFMPIndicator('CPI', apiKey),
    fetchFMPIndicator('realGDP', apiKey),
    fetchYahooPrice('CL=F'),
    fetchYahooPrice('GC=F'),
    fetchYahooPrice('^VIX'),
  ]);

  // Fallback to approximate current values when FMP returns nothing (free tier limitation)
  const fedRate = fedRateRaw ?? 4.33;
  const cpi     = cpiRaw    ?? 2.4;
  const gdp     = gdpRaw    ?? 2.4;
  const oil     = oilData?.price  ?? 79.50;
  const gold    = goldData?.price ?? 3320.00;
  const vix     = vixData?.price  ?? 18.5;

  const analyses = await generateAnalyses({
    'Fed Funds Rate': `${fedRate.toFixed(2)}%`,
    'US CPI (YoY)': `${cpi.toFixed(1)}%`,
    'US Real GDP Growth (annualized)': `${gdp.toFixed(1)}%`,
    'WTI Crude Oil': `$${oil.toFixed(2)}/bbl`,
    'Gold': `$${gold.toFixed(0)}/oz`,
    'VIX (Fear Index)': vix.toFixed(1),
  });

  const metrics: EconomyMetric[] = [
    {
      key: 'fedRate',
      label: 'Fed Funds Rate',
      value: fedRate.toFixed(2),
      unit: '%',
      trend: fedRate > 4 ? 'up' : 'flat',
      analysis: analyses['fedRate'] ?? 'Elevated rate environment — high cost of capital for LBOs and credit deals.',
    },
    {
      key: 'cpi',
      label: 'US Inflation (CPI)',
      value: cpi.toFixed(1),
      unit: '%',
      trend: cpi > 3 ? 'up' : cpi < 2.5 ? 'down' : 'flat',
      analysis: analyses['cpi'] ?? 'Inflation trending toward Fed target — timing of rate cuts remains uncertain.',
    },
    {
      key: 'gdp',
      label: 'US GDP Growth',
      value: gdp.toFixed(1),
      unit: '%',
      trend: gdp > 2 ? 'up' : 'down',
      analysis: analyses['gdp'] ?? 'Resilient growth supports equity valuations and M&A activity.',
    },
    {
      key: 'oil',
      label: 'WTI Crude Oil',
      value: oil.toFixed(2),
      unit: '$/bbl',
      trend: (oilData?.changePercent ?? 0) > 0 ? 'up' : 'down',
      analysis: analyses['oil'] ?? 'Energy prices feed directly into input cost pressures across sectors.',
    },
    {
      key: 'gold',
      label: 'Gold',
      value: gold.toFixed(0),
      unit: '$/oz',
      trend: (goldData?.changePercent ?? 0) > 0 ? 'up' : 'down',
      analysis: analyses['gold'] ?? 'Safe-haven demand reflects macro uncertainty — watch for risk-off signals.',
    },
    {
      key: 'vix',
      label: 'VIX — Fear Index',
      value: vix.toFixed(1),
      unit: '',
      trend: vix > 20 ? 'up' : 'down',
      analysis: analyses['vix'] ?? 'Volatility gauge signals current market anxiety; watch options pricing.',
    },
  ];

  return NextResponse.json({ metrics }, {
    headers: { 'Cache-Control': 's-maxage=21600, stale-while-revalidate=43200' },
  });
}
