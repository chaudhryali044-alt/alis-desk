import { NextResponse } from 'next/server';
import Groq from 'groq-sdk';
import type { FearGreedData } from '@/lib/types';

export const dynamic = 'force-dynamic';

function ratingFromScore(score: number): string {
  if (score <= 25) return 'Extreme Fear';
  if (score <= 45) return 'Fear';
  if (score <= 55) return 'Neutral';
  if (score <= 75) return 'Greed';
  return 'Extreme Greed';
}

async function fetchCNNFearGreed(): Promise<{ score: number; previousClose: number } | null> {
  try {
    const res = await fetch('https://production.dataviz.cnn.io/index/fearandgreed/graphdata', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        Referer: 'https://edition.cnn.com/',
      },
      next: { revalidate: 3600 },
    });
    if (!res.ok) return null;
    const data = await res.json();
    const fg = data?.fear_and_greed;
    if (!fg?.score) return null;
    return {
      score: Math.round(fg.score),
      previousClose: Math.round(fg.previous_close ?? fg.score),
    };
  } catch {
    return null;
  }
}

async function generateAnalysis(score: number, rating: string): Promise<string> {
  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
  try {
    const completion = await groq.chat.completions.create({
      model: 'llama-3.1-8b-instant',
      max_tokens: 80,
      temperature: 0.3,
      messages: [{
        role: 'user',
        content: `CNN Fear & Greed Index: ${score}/100 (${rating}). Write ONE sentence explaining what this means for equity markets and deal appetite right now. Be direct. No preamble.`,
      }],
    });
    return completion.choices[0]?.message?.content?.trim() ?? '';
  } catch {
    return '';
  }
}

const FALLBACK_ANALYSES: Record<string, string> = {
  'Extreme Fear': 'Panic selling dominates — distressed assets cheap, but deal closings are stalling as buyers demand wider risk premiums.',
  'Fear': 'Defensive positioning widespread — equity risk premium elevated, IPO windows closed, LBO financing expensive.',
  'Neutral': 'Balanced sentiment supports orderly deal markets — valuations fair, financing available at reasonable spreads.',
  'Greed': 'Risk appetite elevated — IPO and M&A volumes accelerating, credit spreads tightening.',
  'Extreme Greed': 'Euphoric conditions signal late cycle — frothy valuations, aggressive deal structures, watch for reversal.',
};

export async function GET() {
  const cnnData = await fetchCNNFearGreed();

  const score = cnnData?.score ?? 40;
  const previousClose = cnnData?.previousClose ?? score;
  const rating = ratingFromScore(score);

  const analysis = await generateAnalysis(score, rating)
    || FALLBACK_ANALYSES[rating]
    || 'Market sentiment currently mixed.';

  const payload: FearGreedData = { score, rating, previousClose, analysis };

  return NextResponse.json(payload, {
    headers: { 'Cache-Control': 's-maxage=3600, stale-while-revalidate=7200' },
  });

}
