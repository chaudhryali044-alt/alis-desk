import { NextResponse } from 'next/server';
import yahooFinance from 'yahoo-finance2';
import type { MarketQuote } from '@/lib/types';

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

async function fetchIndicesFromYahoo(): Promise<Map<string, MarketQuote>> {
  const result = new Map<string, MarketQuote>();
  await Promise.allSettled(
    SYMBOLS.indices.map(async ({ symbol, name }) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const quote: any = await yahooFinance.quote(symbol);
      if (quote?.regularMarketPrice != null) {
        const price = quote.regularMarketPrice;
        const change = quote.regularMarketChange ?? 0;
        const changesPercentage = quote.regularMarketChangePercent ?? 0;
        result.set(symbol, {
          symbol,
          name,
          price,
          change: parseFloat(change.toFixed(2)),
          changesPercentage: parseFloat(changesPercentage.toFixed(2)),
          type: 'index',
        });
      }
    })
  );
  return result;
}

async function fetchFMPQuotes(symbols: string[], apiKey: string): Promise<FMPQuote[]> {
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
    '^GSPC': 7365.00, '^DJI': 49910.00, '^IXIC': 25970.00, '^FTSE': 8620.00, '^GDAXI': 23500.00, '^N225': 37400.00,
    'GCUSD': 3320.00, 'SIUSD': 32.50, 'CLUSD': 58.20, 'BZUSD': 61.80, 'NGUSD': 3.45,
    'EURUSD': 1.1320, 'GBPUSD': 1.3280, 'USDJPY': 143.20, 'USDCHF': 0.8210, 'AUDUSD': 0.6440, 'USDCNH': 7.2100,
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

  // Indices: always fetch from Yahoo Finance (no API key needed, live prices)
  let indicesMap = new Map<string, MarketQuote>();
  try {
    indicesMap = await fetchIndicesFromYahoo();
  } catch {
    // fall through to mock
  }

  const indices = SYMBOLS.indices.map(({ symbol, name }) =>
    indicesMap.get(symbol) ?? buildMockQuote(symbol, name, 'index')
  );

  // Commodities + FX: fetch from FMP
  const fmpSymbols = [
    ...SYMBOLS.commodities.map(s => s.symbol),
    ...SYMBOLS.fx.map(s => s.symbol),
  ];

  let fmpQuotes: FMPQuote[] = [];
  if (apiKey !== 'demo') {
    try {
      fmpQuotes = await fetchFMPQuotes(fmpSymbols, apiKey);
    } catch {
      // fall through to mock
    }
  }

  const fmpMap = new Map(fmpQuotes.map(q => [q.symbol, q]));

  const buildFMPCategory = (
    items: { symbol: string; name: string }[],
    type: 'commodity' | 'fx'
  ): MarketQuote[] =>
    items.map(({ symbol, name }) => {
      const q = fmpMap.get(symbol);
      if (q) {
        return { symbol, name, price: q.price, change: q.change, changesPercentage: q.changesPercentage, type };
      }
      return buildMockQuote(symbol, name, type);
    });

  return NextResponse.json({
    indices,
    commodities: buildFMPCategory(SYMBOLS.commodities, 'commodity'),
    fx: buildFMPCategory(SYMBOLS.fx, 'fx'),
  }, {
    headers: { 'Cache-Control': 's-maxage=60, stale-while-revalidate=120' },
  });
}
