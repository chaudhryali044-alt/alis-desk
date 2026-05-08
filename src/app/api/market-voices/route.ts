import { NextResponse } from 'next/server';
import Parser from 'rss-parser';
import type { MarketVoice } from '@/lib/types';

export const dynamic = 'force-dynamic';

const parser = new Parser({
  timeout: 8000,
  headers: { 'User-Agent': 'Mozilla/5.0 (compatible; PulseBot/1.0)' },
});

const VOICE_FEEDS = [
  { url: 'https://www.oaktreecapital.com/insights/rss',                        author: 'Howard Marks',     platform: 'Oaktree Capital'    },
  { url: 'https://www.bloomberg.com/opinion/authors/ARbTQlRLRjE/matthew-s-levine.rss', author: 'Matt Levine',   platform: 'Bloomberg'          },
  { url: 'https://kylascanlon.com/feed',                                        author: 'Kyla Scanlon',     platform: 'kylascanlon.com'    },
  { url: 'https://www.newcomer.co/feed',                                        author: 'Eric Newcomer',    platform: 'Newcomer'           },
  { url: 'https://www.kalzumeus.com/feed',                                      author: 'Patrick McKenzie', platform: 'kalzumeus.com'      },
  { url: 'https://www.project-syndicate.org/rss',                               author: 'Mohamed El-Erian', platform: 'Project Syndicate'  },
  { url: 'https://www.principles.com/feed',                                     author: 'Ray Dalio',        platform: 'Principles'         },
];

async function fetchVoice(feed: typeof VOICE_FEEDS[0]): Promise<MarketVoice[]> {
  try {
    const parsed = await parser.parseURL(feed.url);
    return (parsed.items ?? []).slice(0, 3).map((item, i) => ({
      id:       `${feed.author}-${i}-${Date.now()}`,
      author:   feed.author,
      platform: feed.platform,
      title:    item.title ?? 'Untitled',
      link:     item.link  ?? '#',
      pubDate:  item.pubDate ?? item.isoDate ?? new Date().toISOString(),
      excerpt:  (item.contentSnippet ?? item.content ?? '').slice(0, 180),
    }));
  } catch {
    return [];
  }
}

export async function GET() {
  const results = await Promise.allSettled(VOICE_FEEDS.map(fetchVoice));

  const all: MarketVoice[] = [];
  for (const r of results) {
    if (r.status === 'fulfilled') all.push(...r.value);
  }

  const voices = all
    .sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime())
    .slice(0, 8);

  return NextResponse.json({ voices }, {
    headers: { 'Cache-Control': 's-maxage=1800, stale-while-revalidate=3600' },
  });
}
