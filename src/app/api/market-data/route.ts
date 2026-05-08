import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const YF_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept': 'application/json',
};

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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function fetchChart(symbol: string): Promise<any> {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1d`;
    const r = await fetch(url, { headers: YF_HEADERS });
    if (!r.ok) return null;
    const data = await r.json();
    return data?.chart?.result?.[0]?.meta ?? null;
  } catch {
    return null;
  }
}

export async function GET() {
  const results = await Promise.allSettled(
    INSTRUMENTS.map(({ symbol }) => fetchChart(symbol))
  );

  const tickers = INSTRUMENTS
    .map(({ symbol, name, unit, decimals }, i) => {
      const r = results[i];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const meta: any = r.status === 'fulfilled' ? r.value : null;
      if (!meta?.regularMarketPrice) return null;

      const price    = meta.regularMarketPrice as number;
      const prevClose = meta.chartPreviousClose ?? meta.previousClose ?? price;
      const change   = price - prevClose;
      const changePct = prevClose !== 0 ? (change / prevClose) * 100 : 0;

      return {
        symbol,
        name,
        unit,
        decimals,
        price,
        change,
        changePct,
        high:       meta.regularMarketDayHigh  ?? price,
        low:        meta.regularMarketDayLow   ?? price,
        week52High: meta.fiftyTwoWeekHigh      ?? price,
        week52Low:  meta.fiftyTwoWeekLow       ?? price,
        yahooLink:  `https://finance.yahoo.com/quote/${encodeURIComponent(symbol)}`,
      };
    })
    .filter((t): t is NonNullable<typeof t> => t !== null);

  return NextResponse.json({ tickers }, {
    headers: { 'Cache-Control': 's-maxage=60, stale-while-revalidate=120' },
  });
}
