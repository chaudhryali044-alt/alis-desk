import { NextResponse } from 'next/server';
import yahooFinance from 'yahoo-finance2';
import type { SnapshotQuote } from '@/lib/types';

export const revalidate = 60;

const INSTRUMENTS = [
  { symbol: '^GSPC',  name: 'S&P 500'  },
  { symbol: '^DJI',   name: 'Dow Jones' },
  { symbol: '^IXIC',  name: 'Nasdaq'    },
  { symbol: '^FTSE',  name: 'FTSE 100'  },
  { symbol: '^GDAXI', name: 'DAX'       },
  { symbol: '^N225',  name: 'Nikkei 225'},
  { symbol: 'CL=F',   name: 'WTI Oil'   },
  { symbol: 'GC=F',   name: 'Gold'      },
];

const MOCK_PRICES: Record<string, { price: number; change: number; pct: number }> = {
  '^GSPC':  { price: 7365.00,  change: 28.4,  pct: 0.39  },
  '^DJI':   { price: 49910.00, change: 180.3, pct: 0.36  },
  '^IXIC':  { price: 25970.00, change: 112.5, pct: 0.44  },
  '^FTSE':  { price: 8620.00,  change: -12.4, pct: -0.14 },
  '^GDAXI': { price: 23500.00, change: 85.2,  pct: 0.36  },
  '^N225':  { price: 37400.00, change: -145.0,pct: -0.39 },
  'CL=F':   { price: 58.20,    change: -0.84, pct: -1.42 },
  'GC=F':   { price: 3320.00,  change: 12.5,  pct: 0.38  },
};

export async function GET() {
  const results = await Promise.allSettled(
    INSTRUMENTS.map(async ({ symbol, name }) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const q: any = await yahooFinance.quote(symbol);
      if (!q?.regularMarketPrice) throw new Error('no price');
      return {
        symbol,
        name,
        price: q.regularMarketPrice as number,
        change: (q.regularMarketChange as number) ?? 0,
        changesPercentage: (q.regularMarketChangePercent as number) ?? 0,
      } satisfies SnapshotQuote;
    })
  );

  const quotes: SnapshotQuote[] = INSTRUMENTS.map(({ symbol, name }, i) => {
    const r = results[i];
    if (r.status === 'fulfilled') return r.value;
    const m = MOCK_PRICES[symbol] ?? { price: 100, change: 0, pct: 0 };
    return { symbol, name, price: m.price, change: m.change, changesPercentage: m.pct };
  });

  return NextResponse.json({ quotes }, {
    headers: { 'Cache-Control': 's-maxage=60, stale-while-revalidate=120' },
  });
}
