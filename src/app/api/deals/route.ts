import { NextResponse } from 'next/server';
import Parser from 'rss-parser';
import type { DealArticle } from '@/lib/types';

export const revalidate = 600;

const parser = new Parser({
  timeout: 8000,
  headers: { 'User-Agent': 'Mozilla/5.0 (compatible; PulseBot/1.0)' },
});

const DEAL_FEEDS = [
  { url: 'https://feeds.reuters.com/reuters/businessNews',       source: 'Reuters' },
  { url: 'https://feeds.reuters.com/reuters/companyNews',        source: 'Reuters' },
  { url: 'https://feeds.bloomberg.com/deals/news.rss',           source: 'Bloomberg' },
  { url: 'https://feeds.a.wsj.com/rss/RSSWSJD.xml',             source: 'WSJ' },
  { url: 'https://www.fnlondon.com/rss',                         source: 'FN London' },
  { url: 'https://axios.com/feeds/feed.rss',                     source: 'Axios' },
  { url: 'https://www.globalcapital.com/rss',                    source: 'GlobalCapital' },
  { url: 'https://www.privateequityinternational.com/feed',      source: 'PEI' },
  { url: 'https://www.altassets.net/feed',                       source: 'AltAssets' },
];

// Tight M&A/PE-specific keyword filter
const DEAL_KEYWORDS = [
  'acquisition', 'acquires', 'acquired',
  'merger', 'merging',
  'buyout', 'buy out',
  'lbo', 'leveraged buyout',
  'private equity', 'pe firm',
  'm&a',
  'takeover', 'take-over',
  ' bid for', ' bid on',
  'fundraise', 'fund raise', 'fund close', 'raises fund',
  'capital raise', 'capital raising',
  'listing', 'goes public', 'going public',
  'stake sale', 'selling stake', 'minority stake',
  'carve-out', 'carve out',
  'spin-off', 'spin off', 'spinoff',
  'management buyout', 'mbo',
  'spac',
  'portfolio company',
  'exit ', ' exit,', 'exits ',
  'divestiture', 'divests', 'divesting',
  'agreed to buy', 'agreed to acquire',
  'offer to acquire', 'offer for ', 'takeover bid',
];

function isDeal(title: string, desc: string): boolean {
  const text = `${title} ${desc}`.toLowerCase();
  return DEAL_KEYWORDS.some(kw => text.includes(kw));
}

async function fetchFeed(url: string, source: string): Promise<DealArticle[]> {
  try {
    const feed = await parser.parseURL(url);
    return (feed.items ?? [])
      .filter(item => isDeal(item.title ?? '', item.contentSnippet ?? item.content ?? ''))
      .slice(0, 10)
      .map((item, i) => ({
        id: `${source}-${i}-${Date.now()}`,
        title: item.title ?? 'Untitled',
        source,
        link: item.link ?? '#',
        pubDate: item.pubDate ?? item.isoDate ?? new Date().toISOString(),
        description: (item.contentSnippet ?? item.content ?? '').slice(0, 220),
      }));
  } catch {
    return [];
  }
}

export async function GET() {
  const results = await Promise.allSettled(DEAL_FEEDS.map(f => fetchFeed(f.url, f.source)));

  const all: DealArticle[] = [];
  for (const r of results) {
    if (r.status === 'fulfilled') all.push(...r.value);
  }

  const seen = new Set<string>();
  const deduped = all
    .filter(a => {
      const key = a.title.slice(0, 70).toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime())
    .slice(0, 15);

  return NextResponse.json({ deals: deduped });
}
