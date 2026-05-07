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
