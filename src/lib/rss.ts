import Parser from 'rss-parser';
import { NewsArticle, NewsCategory } from './types';

const parser = new Parser({
  timeout: 10000,
  headers: {
    'User-Agent': 'Mozilla/5.0 (compatible; AlisDeskBot/1.0)',
  },
});

interface FeedConfig {
  url: string;
  source: string;
  defaultCategory: NewsCategory;
}

const FEEDS: FeedConfig[] = [
  { url: 'https://feeds.reuters.com/reuters/businessNews',           source: 'Reuters',        defaultCategory: 'Markets'     },
  { url: 'https://feeds.reuters.com/reuters/companyNews',            source: 'Reuters',        defaultCategory: 'M&A & Deals' },
  { url: 'https://www.cnbc.com/id/100003114/device/rss/rss.html',   source: 'CNBC',           defaultCategory: 'Markets'     },
  { url: 'https://www.cnbc.com/id/10001147/device/rss/rss.html',    source: 'CNBC',           defaultCategory: 'Earnings'    },
  { url: 'https://feeds.bloomberg.com/markets/news.rss',            source: 'Bloomberg',      defaultCategory: 'Markets'     },
  { url: 'https://feeds.bloomberg.com/economics/news.rss',          source: 'Bloomberg',      defaultCategory: 'Macro'       },
  { url: 'https://feeds.bloomberg.com/deals/news.rss',              source: 'Bloomberg',      defaultCategory: 'M&A & Deals' },
  { url: 'https://www.ft.com/markets?format=rss',                   source: 'FT',             defaultCategory: 'Markets'     },
  { url: 'https://www.ft.com/rss/home',                             source: 'FT',             defaultCategory: 'Macro'       },
  { url: 'https://feeds.a.wsj.com/rss/RSSMarketsMain.xml',          source: 'WSJ',            defaultCategory: 'Markets'     },
  { url: 'https://feeds.a.wsj.com/rss/RSSWSJD.xml',                source: 'WSJ',            defaultCategory: 'M&A & Deals' },
  { url: 'https://www.economist.com/finance-and-economics/rss.xml', source: 'The Economist',  defaultCategory: 'Macro'       },
  { url: 'https://www.fnlondon.com/rss',                            source: 'FN London',      defaultCategory: 'M&A & Deals' },
  { url: 'https://feeds.content.dowjones.io/public/rss/mw_topstories', source: 'MarketWatch', defaultCategory: 'Markets'     },
  { url: 'https://feeds.content.dowjones.io/public/rss/mw_marketdata', source: 'MarketWatch', defaultCategory: 'Markets'     },
];

const CATEGORY_KEYWORDS: Record<NewsCategory, string[]> = {
  'Markets': ['stock', 'equity', 'shares', 'index', 'dow', 's&p', 'nasdaq', 'ftse', 'market', 'trading', 'rally', 'sell-off', 'bonds', 'yield', 'treasury', 'etf', 'fund'],
  'Macro': ['gdp', 'inflation', 'fed', 'federal reserve', 'central bank', 'ecb', 'boe', 'rate', 'economy', 'employment', 'unemployment', 'recession', 'growth', 'monetary', 'fiscal', 'policy', 'china', 'trade war', 'tariff'],
  'M&A & Deals': ['merger', 'acquisition', 'deal', 'takeover', 'buyout', 'ipo', 'listing', 'private equity', 'venture', 'fundraise', 'billion deal', 'agreement', 'bid', 'offer'],
  'Earnings': ['earnings', 'revenue', 'profit', 'loss', 'quarterly', 'results', 'eps', 'forecast', 'guidance', 'beat', 'miss', 'outlook', 'annual', 'q1', 'q2', 'q3', 'q4'],
};

function categorise(title: string, description: string, defaultCategory: NewsCategory): NewsCategory {
  const text = `${title} ${description}`.toLowerCase();
  const scores: Record<NewsCategory, number> = {
    'Markets': 0, 'Macro': 0, 'M&A & Deals': 0, 'Earnings': 0,
  };
  for (const [cat, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    for (const kw of keywords) {
      if (text.includes(kw)) scores[cat as NewsCategory]++;
    }
  }
  const best = (Object.entries(scores) as [NewsCategory, number][]).reduce((a, b) => b[1] > a[1] ? b : a);
  return best[1] > 0 ? best[0] : defaultCategory;
}

function extractImage(item: Parser.Item): string | undefined {
  const enclosure = (item as Record<string, unknown>)['enclosure'] as { url?: string } | undefined;
  const mediaThumbnail = (item as Record<string, unknown>)['media:thumbnail'] as { $?: { url?: string } } | undefined;
  const mediaContent = (item as Record<string, unknown>)['media:content'] as { $?: { url?: string } } | undefined;
  return enclosure?.url || mediaThumbnail?.$?.url || mediaContent?.$?.url;
}

async function fetchFeed(config: FeedConfig): Promise<NewsArticle[]> {
  try {
    const feed = await parser.parseURL(config.url);
    return (feed.items || []).slice(0, 8).map((item, i) => {
      const title = item.title || 'Untitled';
      const description = item.contentSnippet || item.content || item.summary || '';
      const category = categorise(title, description, config.defaultCategory);
      return {
        id: `${config.source}-${i}-${Date.now()}`,
        title,
        description: description.slice(0, 300),
        link: item.link || '#',
        pubDate: item.pubDate || item.isoDate || new Date().toISOString(),
        source: config.source,
        category,
        imageUrl: extractImage(item),
      };
    });
  } catch {
    return [];
  }
}

export async function fetchAllNews(): Promise<NewsArticle[]> {
  const results = await Promise.allSettled(FEEDS.map(fetchFeed));
  const articles: NewsArticle[] = [];
  for (const r of results) {
    if (r.status === 'fulfilled') articles.push(...r.value);
  }
  const seen = new Set<string>();
  return articles
    .filter(a => {
      const key = a.title.slice(0, 60).toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime());
}
