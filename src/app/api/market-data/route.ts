import { NextResponse } from 'next/server';
import { MarketQuote } from '@/lib/types';

const FMP_BASE = 'https://financialmodelingprep.com/api/v3';

const SYMBOLS = {
  indices: [
    { symbol: '^GSPC', name: 'S&P 500' },
    { symbol: '^DJI', name: 'Dow Jones' },
    { symbol: '^IXIC', name: 'Nasdaq' },
    { symbol: '^FTSE', name: 'FTSE 100' },
    { symbol: '^GDAXI', name: 'DAX' },
    { symbol: '^N225', name: 'Nikkei 225' },
  ],
  commodities: [
    { symbol: 'GCUSD', name: 'Gold' },
    { symbol: 'SIUSD', name: 'Silver' },
    { symbol: 'CLUSD', name: 'WTI Crude' },
    { symbol: 'BZUSD', name: 'Brent Crude' },
    { symbol: 'NGUSD', name: 'Nat Gas' },
  ],
  fx: [
    { symbol: 'EURUSD', name: 'EUR/USD' },
    { symbol: 'GBPUSD', name: 'GBP/USD' },
    { symbol: 'USDJPY', name: 'USD/JPY' },
    { symbol: 'USDCHF', name: 'USD/CHF' },
    { symbol: 'AUDUSD', name: 'AUD/USD' },
    { symbol: 'USDCNH', name: 'USD/CNH' },
  ],
};

interface FMPQuote {
  symbol: string;
  price: number;
  change: number;
  changesPercentage: number;
}

async function fetchQuotes(symbols: string[], apiKey: string): Promise<FMPQuote[]> {
  const joined = symbols.join(',');
  const res = await fetch(
    `${FMP_BASE}/quote/${joined}?apikey=${apiKey}`,
    { next: { revalidate: 60 } }
  );
  if (!res.ok) return [];
  return res.json();
}

function buildMockQuote(symbol: string, name: string, type: 'index' | 'commodity' | 'fx'): MarketQuote {
  const mockPrices: Record<string, number> = {
    '^GSPC': 5318.42, '^DJI': 39387.76, '^IXIC': 16542.83, '^FTSE': 8246.10, '^GDAXI': 18187.56, '^N225': 38820.10,
    'GCUSD': 2328.50, 'SIUSD': 27.42, 'CLUSD': 79.85, 'BZUSD': 83.42, 'NGUSD': 2.14,
    'EURUSD': 1.0842, 'GBPUSD': 1.2734, 'USDJPY': 154.62, 'USDCHF': 0.9102, 'AUDUSD': 0.6521, 'USDCNH': 7.2418,
  };
  const price = mockPrices[symbol] || 100;
  const change = (Math.random() - 0.48) * price * 0.015;
  return {
    symbol,
    name,
    price,
    change: parseFloat(change.toFixed(type === 'fx' ? 4 : 2)),
    changesPercentage: parseFloat(((change / price) * 100).toFixed(2)),
    type,
  };
}

export async function GET() {
  const apiKey = process.env.FMP_API_KEY || 'demo';

  const allSymbols = [
    ...SYMBOLS.indices.map(s => s.symbol),
    ...SYMBOLS.commodities.map(s => s.symbol),
    ...SYMBOLS.fx.map(s => s.symbol),
  ];

  let quotes: FMPQuote[] = [];
  if (apiKey !== 'demo') {
    try {
      quotes = await fetchQuotes(allSymbols, apiKey);
    } catch {
      // fall through to mock
    }
  }

  const quoteMap = new Map(quotes.map(q => [q.symbol, q]));

  const buildCategory = (
    items: { symbol: string; name: string }[],
    type: 'index' | 'commodity' | 'fx'
  ): MarketQuote[] =>
    items.map(({ symbol, name }) => {
      const q = quoteMap.get(symbol);
      if (q) {
        return { symbol, name, price: q.price, change: q.change, changesPercentage: q.changesPercentage, type };
      }
      return buildMockQuote(symbol, name, type);
    });

  return NextResponse.json({
    indices: buildCategory(SYMBOLS.indices, 'index'),
    commodities: buildCategory(SYMBOLS.commodities, 'commodity'),
    fx: buildCategory(SYMBOLS.fx, 'fx'),
  }, {
    headers: { 'Cache-Control': 's-maxage=60, stale-while-revalidate=120' },
  });
}
