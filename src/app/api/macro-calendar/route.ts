import { NextResponse } from 'next/server';
import type { MacroEvent } from '@/lib/types';

export const revalidate = 21600;

const COUNTRY_FLAGS: Record<string, string> = {
  US: '🇺🇸', GB: '🇬🇧', EU: '🇪🇺', DE: '🇩🇪', FR: '🇫🇷',
  JP: '🇯🇵', CN: '🇨🇳', CA: '🇨🇦', AU: '🇦🇺', CH: '🇨🇭',
};

function flagFor(country: string): string {
  return COUNTRY_FLAGS[country.toUpperCase()] ?? '🌐';
}

function impactLabel(impact: string): 'High' | 'Medium' | 'Low' {
  const i = (impact ?? '').toLowerCase();
  if (i === 'high' || i === '3') return 'High';
  if (i === 'medium' || i === '2') return 'Medium';
  return 'Low';
}

function getWeekRange(): { from: string; to: string } {
  const now = new Date();
  const day = now.getDay(); // 0 = Sun
  const monday = new Date(now);
  monday.setDate(now.getDate() - (day === 0 ? 6 : day - 1));
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  return { from: fmt(monday), to: fmt(sunday) };
}

export async function GET() {
  const apiKey = process.env.FMP_API_KEY || 'demo';
  const { from, to } = getWeekRange();

  let events: MacroEvent[] = [];

  try {
    const res = await fetch(
      `https://financialmodelingprep.com/api/v3/economic_calendar?from=${from}&to=${to}&apikey=${apiKey}`,
      { next: { revalidate: 21600 } }
    );
    if (res.ok) {
      const raw: {
        event?: string;
        date?: string;
        country?: string;
        impact?: string;
        actual?: string;
        estimate?: string;
        previous?: string;
      }[] = await res.json();

      events = (Array.isArray(raw) ? raw : [])
        .filter(e => impactLabel(e.impact ?? '') !== 'Low')
        .slice(0, 10)
        .map(e => {
          const [dateStr, timeStr] = (e.date ?? '').split(' ');
          return {
            date: dateStr ?? '',
            time: timeStr?.slice(0, 5) ?? '',
            country: e.country ?? 'US',
            flagEmoji: flagFor(e.country ?? 'US'),
            event: e.event ?? 'Economic Release',
            impact: impactLabel(e.impact ?? ''),
            actual: e.actual ?? undefined,
            estimate: e.estimate ?? undefined,
            previous: e.previous ?? undefined,
          };
        });
    }
  } catch {
    // Fall through to empty
  }

  // If API is unavailable, return a representative placeholder set
  if (events.length === 0) {
    events = [
      { date: from, time: '08:30', country: 'US', flagEmoji: '🇺🇸', event: 'Initial Jobless Claims', impact: 'Medium' },
      { date: from, time: '10:00', country: 'US', flagEmoji: '🇺🇸', event: 'ISM Services PMI', impact: 'High' },
      { date: to, time: '12:00', country: 'EU', flagEmoji: '🇪🇺', event: 'ECB Rate Decision', impact: 'High' },
    ];
  }

  return NextResponse.json({ events, weekRange: { from, to } });
}
