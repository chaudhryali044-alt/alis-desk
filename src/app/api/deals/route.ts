import { NextResponse } from 'next/server';
import Parser from 'rss-parser';
import type { DealArticle } from '@/lib/types';

export const revalidate = 600; // 10 minutes

const parser = new Parser({
  timeout: 8000,
  headers: { 'User-Agent': 'Mozilla/5.0 (compatible; AlisDeskBot/1.0)' },
});

const DEAL_FEEDS = [
  { url: 'https://feeds.reuters.com/reuters/businessNews', source: 'Reuters' },
  { url: 'https://feeds.a.wsj.com/rss/RSSWSJD.xml', source: 'WSJ' },
  { url: 'https://www.fnlondon.com/rss', source: 'FN London' },
  { url: 'https://feeds.bloomberg.com/deals/news.rss', source: 'Bloomberg' },
  { url: 'https://axios.com/feeds/feed.rss', source: 'Axios' },
  { url: 'https://www.globalcapital.com/rss', source: 'GlobalCapital' },
  { url: 'https://www.privateequityinternational.com/feed', source: 'PEI' },
  { url: 'https://www.altassets.net/feed', source: 'AltAssets' },
];

const DEAL_KEYWORDS = [
  'acquisition', 'merger', 'buyout', 'ipo', ' deal', 'private equity',
  'lbo', 'takeover', 'bid ', 'fundraise', 'capital raise', 'listing',
  ' stake', 'agreed to buy', 'agreed to acquire', 'offer for', 'going public',
  'spac', 'carve-out', 'divestiture', 'joint venture', 'strategic review',
];

function isDealArticle(title: string, desc: string): boolean {
  const text = `${title} ${desc}`.toLowerCase();
  return DEAL_KEYWORDS.some(kw => text.includes(kw));
}

async function fetchFeed(url: string, source: string): Promise<DealArticle[]> {
  try {
    const feed = await parser.parseURL(url);
    return (feed.items ?? [])
      .filter(item => isDealArticle(item.title ?? '', item.contentSnippet ?? item.content ?? ''))
      .slice(0, 12)
      .map((item, i) => ({
        id: `${source}-${i}-${Date.now()}`,
        title: item.title ?? 'Untitled',
        source,
        link: item.link ?? '#',
        pubDate: item.pubDate ?? item.isoDate ?? new Date().toISOString(),
        description: (item.contentSnippet ?? item.content ?? '').slice(0, 200),
      }));
  } catch {
    return [];
  }
}

export async function GET() {
  const results = await Promise.allSettled(
    DEAL_FEEDS.map(f => fetchFeed(f.url, f.source))
  );

  const all: DealArticle[] = [];
  for (const r of results) {
    if (r.status === 'fulfilled') all.push(...r.value);
  }

  const seen = new Set<string>();
  const deduped = all
    .filter(a => {
      const key = a.title.slice(0, 60).toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime())
    .slice(0, 15);

  return NextResponse.json({ deals: deduped });
}
