/* ─── Legacy (kept for WhatsApp briefing / chat routes) ─────── */
export type NewsCategory = 'Markets' | 'Macro' | 'M&A & Deals' | 'Earnings';

export interface NewsArticle {
  id: string;
  title: string;
  description: string;
  link: string;
  pubDate: string;
  source: string;
  category: NewsCategory;
  imageUrl?: string;
}

export interface MarketQuote {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changesPercentage: number;
  type: 'index' | 'commodity' | 'fx';
}

export interface TickerItem {
  symbol: string;
  price: number;
  change: number;
  changesPercentage: number;
}

/* ─── Economy Pulse ──────────────────────────────────────────── */
export interface EconomyMetric {
  key: string;
  label: string;
  value: string;
  unit: string;
  trend?: 'up' | 'down' | 'flat';
  analysis: string;
}

/* ─── Deal Flow ──────────────────────────────────────────────── */
export interface DealArticle {
  id: string;
  title: string;
  source: string;
  link: string;
  pubDate: string;
  description: string;
}

/* ─── Top Stories ────────────────────────────────────────────── */
export type RelevanceTag = 'Markets' | 'Macro' | 'Earnings' | 'Geopolitical' | 'Deals';

export interface TopStory {
  title: string;
  source: string;
  link: string;
  pubDate: string;
  summary: string;
  tag: RelevanceTag;
}

/* ─── Market Snapshot ────────────────────────────────────────── */
export interface SnapshotQuote {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changesPercentage: number;
}

/* ─── Fear & Greed ───────────────────────────────────────────── */
export interface FearGreedData {
  score: number;
  rating: string;
  previousClose: number;
  analysis: string;
}

/* ─── Macro Calendar ─────────────────────────────────────────── */
export interface MacroEvent {
  date: string;
  time: string;
  country: string;
  flagEmoji: string;
  event: string;
  impact: 'High' | 'Medium' | 'Low';
  actual?: string;
  estimate?: string;
  previous?: string;
}

/* ─── IPO Calendar ───────────────────────────────────────────── */
export interface IPOItem {
  symbol: string;
  company: string;
  date: string;
  exchange?: string;
  priceRange?: string;
  marketCap?: string;
  sector?: string;
  firstDayReturn?: number;
  status: 'upcoming' | 'recent';
}
