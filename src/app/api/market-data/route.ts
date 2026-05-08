import { NextResponse } from 'next/server';
import yahooFinance from 'yahoo-finance2';

export const dynamic = 'force-dynamic';

const INSTRUMENTS = [
  { symbol: '^GSPC',    name: 'S&P 500',      unit: '',      decimals: 0 },
  { symbol: '^DJI',     name: 'Dow Jones',     unit: '',      decimals: 0 },
  { symbol: '^IXIC',    name: 'Nasdaq',        unit: '',      decimals: 0 },
  { symbol: '^FTSE',    name: 'FTSE 100',      unit: '',      decimals: 0 },
  { symbol: '^GDAXI',   name: 'DAX',           unit: '',      decimals: 0 },
  { symbol: '^N225',    name: 'Nikkei 225',    unit: '',      decimals: 0 },
  { symbol: '^VIX',     name: 'VIX',           unit: '',      decimals: 2 },
  { symbol: 'CL=F',     name: 'WTI Oil',       unit: '$/bbl', decimals: 2 },
  { symbol: 'GC=F',     name: 'Gold',          unit: '$/oz',  decimals: 0 },
  { symbol: 'HG=F',     name: 'Copper',        unit: '$/lb',  decimals: 3 },
  { symbol: '^TNX',     name: 'US 10Y Yield',  unit: '%',     decimals: 3 },
  { symbol: 'DX-Y.NYB', name: 'Dollar Index',  unit: '',      decimals: 2 },
];

const FALLBACK: Record<string, {
  price: number; change: number; changePct: number;
  high: number; low: number; week52High: number; week52Low: number;
}> = {
  '^GSPC':    { price: 7365,   change: 28.4,   changePct:  0.39,  high: 7390,   low: 7320,   week52High: 7500,  week52Low: 5200  },
  '^DJI':     { price: 49910,  change: 180.3,  changePct:  0.36,  high: 50100,  low: 49600,  week52High: 50500, week52Low: 39000 },
  '^IXIC':    { price: 25970,  change: 112.5,  changePct:  0.44,  high: 26100,  low: 25800,  week52High: 26500, week52Low: 18000 },
  '^FTSE':    { price: 8620,   change: -12.4,  changePct: -0.14,  high: 8660,   low: 8590,   week52High: 8900,  week52Low: 7200  },
  '^GDAXI':   { price: 23500,  change: 85.2,   changePct:  0.36,  high: 23600,  low: 23400,  week52High: 24000, week52Low: 17000 },
  '^N225':    { price: 37400,  change: -145.0, changePct: -0.39,  high: 37600,  low: 37200,  week52High: 40000, week52Low: 31000 },
  '^VIX':     { price: 18.50,  change: -0.80,  changePct: -4.15,  high: 19.2,   low: 18.1,   week52High: 65,    week52Low: 12    },
  'CL=F':     { price: 58.20,  change: -0.84,  changePct: -1.42,  high: 59.1,   low: 57.8,   week52High: 87,    week52Low: 55    },
  'GC=F':     { price: 3320,   change: 12.5,   changePct:  0.38,  high: 3335,   low: 3305,   week52High: 3500,  week52Low: 2000  },
  'HG=F':     { price: 4.850,  change: 0.050,  changePct:  1.04,  high: 4.90,   low: 4.80,   week52High: 5.20,  week52Low: 3.60  },
  '^TNX':     { price: 4.350,  change: 0.020,  changePct:  0.46,  high: 4.40,   low: 4.30,   week52High: 5.00,  week52Low: 3.80  },
  'DX-Y.NYB': { price: 101.50, change: -0.30,  changePct: -0.30,  high: 102.0,  low: 101.2,  week52High: 114,   week52Low: 99    },
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function fetchQuote(symbol: string): Promise<any> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const q = await (yahooFinance.quote(symbol) as Promise<any>);
    if (q?.regularMarketPrice) return q;
    return null;
  } catch {
    return null;
  }
}

export async function GET() {
  const results = await Promise.allSettled(
    INSTRUMENTS.map(({ symbol }) => fetchQuote(symbol))
  );

  const tickers = INSTRUMENTS.map(({ symbol, name, unit, decimals }, i) => {
    const fb = FALLBACK[symbol];
    const r  = results[i];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const q: any = r.status === 'fulfilled' ? r.value : null;

    return {
      symbol,
      name,
      unit,
      decimals,
      price:      q?.regularMarketPrice        ?? fb.price,
      change:     q?.regularMarketChange        ?? fb.change,
      changePct:  q?.regularMarketChangePercent ?? fb.changePct,
      high:       q?.regularMarketDayHigh       ?? fb.high,
      low:        q?.regularMarketDayLow        ?? fb.low,
      week52High: q?.fiftyTwoWeekHigh           ?? fb.week52High,
      week52Low:  q?.fiftyTwoWeekLow            ?? fb.week52Low,
      yahooLink:  `https://finance.yahoo.com/quote/${encodeURIComponent(symbol)}`,
      isFallback: !q,
    };
  });

  return NextResponse.json({ tickers }, {
    headers: { 'Cache-Control': 's-maxage=60, stale-while-revalidate=120' },
  });
}
