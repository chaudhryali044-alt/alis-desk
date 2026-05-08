import { NextResponse } from 'next/server';
import Groq from 'groq-sdk';
import { fetchAllNews } from '@/lib/rss';
import type { TopStory } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET() {
  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

  const articles = await fetchAllNews();

  const headlineBlock = articles
    .slice(0, 35)
    .map((a, i) => `${i + 1}. [${a.source}] ${a.title} | ${a.link}`)
    .join('\n');

  const today = new Date().toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

  const prompt = `You are the head of research at a top investment bank. Today is ${today}.

From the headlines below, identify the 5 most important stories for a finance professional RIGHT NOW. Rank by market significance, potential impact on deal flow, and systemic importance.

HEADLINES:
${headlineBlock}

Return ONLY valid JSON — an array of exactly 5 objects. No explanation, no markdown.

[
  {
    "title": "exact headline from the list",
    "source": "source name",
    "link": "url from the list",
    "summary": "Two sharp sentences: what happened and why it matters for markets or deal flow.",
    "tag": "one of: Markets | Macro | Earnings | Geopolitical | Deals"
  }
]`;

  let stories: TopStory[] = [];
  try {
    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      max_tokens: 700,
      temperature: 0.2,
      messages: [{ role: 'user', content: prompt }],
    });

    const raw = completion.choices[0]?.message?.content ?? '[]';
    // Strip any markdown fences if present
    const cleaned = raw.replace(/```(?:json)?/gi, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleaned);
    if (Array.isArray(parsed)) {
      stories = parsed.slice(0, 5).map(s => ({
        title: s.title ?? '',
        source: s.source ?? '',
        link: s.link ?? '#',
        pubDate: new Date().toISOString(),
        summary: s.summary ?? '',
        tag: s.tag ?? 'Markets',
      }));
    }
  } catch {
    // Fall back to top 5 articles without AI ranking
    stories = articles.slice(0, 5).map(a => ({
      title: a.title,
      source: a.source,
      link: a.link,
      pubDate: a.pubDate,
      summary: a.description.slice(0, 200),
      tag: (a.category === 'M&A & Deals' ? 'Deals' : a.category) as TopStory['tag'],
    }));
  }

  return NextResponse.json({ stories }, {
    headers: { 'Cache-Control': 's-maxage=1800, stale-while-revalidate=3600' },
  });
}
