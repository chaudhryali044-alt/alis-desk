import { NextResponse } from 'next/server';
import Groq from 'groq-sdk';
import { fetchAllNews } from '@/lib/rss';
import type { TopStory } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET() {
  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

  const articles = await fetchAllNews();

  const today = new Date().toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

  // Send top 50 headlines to Groq — it ranks them down to 10
  const headlineBlock = articles
    .slice(0, 50)
    .map((a, i) => `${i + 1}. [${a.source}] ${a.title} | ${a.link}`)
    .join('\n');

  const prompt = `You are the head of research at a top investment bank. Today is ${today}.

From these headlines, select the 10 most important stories for a finance professional. Ranking criteria:
- HIGHEST: Central bank decisions, major market moves, M&A deals, earnings beats/misses, macro data
- HIGH: Corporate strategy, credit events, geopolitical events with clear market impact
- DEPRIORITISE: Domestic politics (unless market-moving), sports, entertainment, lifestyle

HEADLINES:
${headlineBlock}

Return ONLY valid JSON — an array of exactly 10 objects. No markdown, no preamble.
[{
  "title": "exact headline text",
  "source": "source name",
  "link": "url from list",
  "summary": "Two sharp sentences: what happened and why it matters for markets or deal flow.",
  "tag": "one of: Markets | Macro | Earnings | Geopolitical | Deals"
}]`;

  let stories: TopStory[] = [];

  try {
    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      max_tokens: 1200,
      temperature: 0.2,
      messages: [{ role: 'user', content: prompt }],
    });

    const raw = completion.choices[0]?.message?.content ?? '[]';
    const cleaned = raw.replace(/```(?:json)?/gi, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleaned);

    if (Array.isArray(parsed)) {
      stories = parsed.slice(0, 10).map(s => ({
        title:   s.title   ?? '',
        source:  s.source  ?? '',
        link:    s.link    ?? '#',
        pubDate: new Date().toISOString(),
        summary: s.summary ?? '',
        tag:     s.tag     ?? 'Markets',
      }));
    }
  } catch {
    // Fallback: top 10 articles without AI ranking
    stories = articles.slice(0, 10).map(a => ({
      title:   a.title,
      source:  a.source,
      link:    a.link,
      pubDate: a.pubDate,
      summary: a.description.slice(0, 200),
      tag:     (a.category === 'M&A & Deals' ? 'Deals' : a.category) as TopStory['tag'],
    }));
  }

  return NextResponse.json({ stories }, {
    headers: { 'Cache-Control': 's-maxage=1800, stale-while-revalidate=3600' },
  });
}
