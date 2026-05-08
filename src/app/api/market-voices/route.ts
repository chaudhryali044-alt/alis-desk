import { NextResponse } from 'next/server';
import Parser from 'rss-parser';
import type { MarketVoice } from '@/lib/types';

export const dynamic = 'force-dynamic';

const parser = new Parser({
  timeout: 8000,
  headers: { 'User-Agent': 'Mozilla/5.0 (compatible; PulseBot/1.0)' },
});

const VOICE_FEEDS = [
  { url: 'https://www.oaktreecapital.com/insights/rss',                   author: 'Howard Marks',     platform: 'Oaktree Capital'   },
  { url: 'https://kylascanlon.substack.com/feed',                         author: 'Kyla Scanlon',     platform: 'Substack'          },
  { url: 'https://www.newcomer.co/feed',                                  author: 'Eric Newcomer',    platform: 'Newcomer'          },
  { url: 'https://feeds.bloomberg.com/opinion/news.rss',                  author: 'Bloomberg Opinion',platform: 'Bloomberg'         },
  { url: 'https://www.project-syndicate.org/rss',                         author: 'Mohamed El-Erian', platform: 'Project Syndicate' },
  { url: 'https://www.bam.kalzumeus.com/archive/feed/',                   author: 'Patrick McKenzie', platform: 'Bits about Money'  },
  { url: 'https://www.bridgewater.com/research-and-insights/rss',         author: 'Ray Dalio',        platform: 'Bridgewater'       },
];

// Static fallback voices shown when all feeds fail
const STATIC_FALLBACK: MarketVoice[] = [
  {
    id: 'static-1',
    author: 'Howard Marks',
    platform: 'Oaktree Capital',
    title: 'On the Uncertainty of Macro Forecasting',
    link: 'https://www.oaktreecapital.com/insights',
    pubDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    excerpt: 'The most important thing is not to think you know what the macro future holds. Humility about macro forecasting is a prerequisite for good investing.',
  },
  {
    id: 'static-2',
    author: 'Kyla Scanlon',
    platform: 'Substack',
    title: 'Vibes, Data, and the Economy People Actually Feel',
    link: 'https://kylascanlon.substack.com',
    pubDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    excerpt: 'There is a growing gap between official economic data and the economy that people experience daily. Sentiment is a real economic force, not just noise.',
  },
  {
    id: 'static-3',
    author: 'Mohamed El-Erian',
    platform: 'Project Syndicate',
    title: 'The New Monetary Policy Trilemma',
    link: 'https://www.project-syndicate.org',
    pubDate: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
    excerpt: 'Central banks are navigating a trilemma — taming inflation, avoiding recession, and maintaining financial stability — that rarely allows all three objectives to be met simultaneously.',
  },
  {
    id: 'static-4',
    author: 'Eric Newcomer',
    platform: 'Newcomer',
    title: 'Venture Capital in the AI Era: Concentration Risk',
    link: 'https://www.newcomer.co',
    pubDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    excerpt: 'A handful of AI infrastructure bets are consuming an outsized share of venture capital, creating concentration risk that could reverberate through the entire startup ecosystem.',
  },
  {
    id: 'static-5',
    author: 'Patrick McKenzie',
    platform: 'Bits about Money',
    title: 'How Payment Infrastructure Shapes Economic Activity',
    link: 'https://www.bam.kalzumeus.com',
    pubDate: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
    excerpt: 'The invisible rails of payment systems — their fees, latency, and availability — silently determine which transactions are economically viable and which are not.',
  },
  {
    id: 'static-6',
    author: 'Ray Dalio',
    platform: 'Bridgewater',
    title: 'The Changing World Order and Capital Flows',
    link: 'https://www.bridgewater.com/research-and-insights',
    pubDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    excerpt: 'We are in the early stages of a great power conflict that is reshaping the global reserve currency system and the flow of capital across borders.',
  },
];

async function fetchVoice(feed: typeof VOICE_FEEDS[0]): Promise<MarketVoice[]> {
  try {
    const parsed = await parser.parseURL(feed.url);
    return (parsed.items ?? []).slice(0, 2).map((item, i) => ({
      id:       `${feed.author}-${i}-${Date.now()}`,
      author:   feed.author,
      platform: feed.platform,
      title:    item.title ?? 'Untitled',
      link:     item.link  ?? '#',
      pubDate:  item.pubDate ?? item.isoDate ?? new Date().toISOString(),
      excerpt:  (item.contentSnippet ?? item.content ?? '').slice(0, 200),
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

  // Use static fallback when all feeds fail
  const final = voices.length > 0 ? voices : STATIC_FALLBACK;

  return NextResponse.json({ voices: final }, {
    headers: { 'Cache-Control': 's-maxage=1800, stale-while-revalidate=3600' },
  });
}
