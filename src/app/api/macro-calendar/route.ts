import { NextResponse } from 'next/server';
import Groq from 'groq-sdk';
import type { MacroEvent } from '@/lib/types';

export const dynamic = 'force-dynamic';

const COUNTRY_FLAGS: Record<string, string> = {
  US: '🇺🇸', GB: '🇬🇧', EU: '🇪🇺', DE: '🇩🇪',
  FR: '🇫🇷', JP: '🇯🇵', CN: '🇨🇳', CA: '🇨🇦',
  AU: '🇦🇺', CH: '🇨🇭', NZ: '🇳🇿',
};

const EVENT_SOURCES: { pattern: RegExp; url: string }[] = [
  { pattern: /fed|fomc|federal reserve/i,   url: 'https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm' },
  { pattern: /ecb|european central bank/i,  url: 'https://www.ecb.europa.eu/press/calendars/mgcgc/html/index.en.html' },
  { pattern: /boe|bank of england/i,        url: 'https://www.bankofengland.co.uk/monetary-policy/meetings' },
  { pattern: /boj|bank of japan/i,          url: 'https://www.boj.or.jp/en/mopo/mpmsche_mpr/' },
  { pattern: /cpi|inflation/i,              url: 'https://www.bls.gov/cpi/' },
  { pattern: /nonfarm|employment|jobs|NFP/i,url: 'https://www.bls.gov/news.release/empsit.toc.htm' },
  { pattern: /gdp|gross domestic/i,         url: 'https://www.bea.gov/news/schedule' },
  { pattern: /pmi|purchasing manager/i,     url: 'https://www.spglobal.com/marketintelligence/en/mi/products/pmi.html' },
  { pattern: /retail/i,                     url: 'https://www.census.gov/retail/index.html' },
];

function sourceLink(eventName: string): string {
  for (const { pattern, url } of EVENT_SOURCES) {
    if (pattern.test(eventName)) return url;
  }
  return 'https://www.bloomberg.com/markets/economics';
}

function impactLabel(impact: string): 'High' | 'Medium' | 'Low' {
  const i = (impact ?? '').toLowerCase();
  if (i === 'high' || i === '3') return 'High';
  if (i === 'medium' || i === '2') return 'Medium';
  return 'Low';
}

function getWeekRange(): { from: string; to: string } {
  const now = new Date();
  const day = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - (day === 0 ? 6 : day - 1));
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  return { from: fmt(monday), to: fmt(sunday) };
}

async function generateEventAnalyses(events: { event: string; country: string; impact: string }[]): Promise<string[]> {
  if (!events.length) return [];

  const lines = events.map((e, i) => `${i + 1}. [${e.country}] ${e.event} (${e.impact} impact)`).join('\n');

  const prompt = `You are a sell-side economist. For each upcoming economic event below, write ONE tight sentence (under 16 words) on what it means for markets, financing conditions, or deal flow. No numbering, no event names — just the market insight.

${lines}

Return ONLY a JSON array of strings, one per event, in the same order:
["...", "...", ...]`;

  try {
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
    const completion = await groq.chat.completions.create({
      model: 'llama-3.1-8b-instant',
      max_tokens: 400,
      temperature: 0.3,
      response_format: { type: 'json_object' },
      messages: [{ role: 'user', content: `Respond with JSON like {"analyses": [...]}.\n\n${prompt}` }],
    });
    const parsed = JSON.parse(completion.choices[0]?.message?.content ?? '{}');
    const arr = parsed.analyses ?? parsed;
    return Array.isArray(arr) ? arr : [];
  } catch {
    return events.map(() => '');
  }
}

export async function GET() {
  const apiKey = process.env.FMP_API_KEY || 'demo';
  const { from, to } = getWeekRange();

  interface FMPEvent {
    event?: string; date?: string; country?: string;
    impact?: string; actual?: string; estimate?: string; previous?: string;
  }
  let rawEvents: FMPEvent[] = [];

  try {
    const res = await fetch(
      `https://financialmodelingprep.com/api/v3/economic_calendar?from=${from}&to=${to}&apikey=${apiKey}`,
      { next: { revalidate: 3600 } }
    );
    if (res.ok) {
      const data = await res.json();
      rawEvents = Array.isArray(data) ? data : [];
    }
  } catch { /* fall through */ }

  // Filter to High and Medium impact only, max 8
  const filtered = rawEvents
    .filter(e => impactLabel(e.impact ?? '') !== 'Low')
    .slice(0, 8);

  // Fallback placeholder events
  if (filtered.length === 0) {
    filtered.push(
      { event: 'FOMC Meeting Minutes', date: from, country: 'US', impact: 'High' },
      { event: 'CPI Inflation Data',   date: from, country: 'US', impact: 'High' },
      { event: 'ECB Rate Decision',    date: to,   country: 'EU', impact: 'High' },
    );
  }

  const analyses = await generateEventAnalyses(filtered.map(e => ({
    event: e.event ?? '', country: e.country ?? 'US', impact: impactLabel(e.impact ?? ''),
  })));

  const events: (MacroEvent & { sourceLink: string; analysis: string })[] = filtered.map((e, i) => {
    const [dateStr, timeStr] = (e.date ?? '').split(' ');
    const eventName = e.event ?? 'Economic Release';
    return {
      date:       dateStr ?? '',
      time:       timeStr?.slice(0, 5) ?? '',
      country:    e.country ?? 'US',
      flagEmoji:  COUNTRY_FLAGS[(e.country ?? 'US').toUpperCase()] ?? '🌐',
      event:      eventName,
      impact:     impactLabel(e.impact ?? ''),
      actual:     e.actual   || undefined,
      estimate:   e.estimate || undefined,
      previous:   e.previous || undefined,
      sourceLink: sourceLink(eventName),
      analysis:   analyses[i] ?? '',
    };
  });

  return NextResponse.json({ events, weekRange: { from, to } }, {
    headers: { 'Cache-Control': 's-maxage=3600, stale-while-revalidate=7200' },
  });
}
