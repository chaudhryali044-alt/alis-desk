'use client';

import { MarketQuote } from '@/lib/types';

interface MarketData {
  indices: MarketQuote[];
  commodities: MarketQuote[];
  fx: MarketQuote[];
}

interface MarketSidebarProps {
  data: MarketData | null;
  loading: boolean;
}

function QuoteRow({ quote }: { quote: MarketQuote }) {
  const positive = quote.changesPercentage >= 0;
  const isFx = quote.type === 'fx';
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-[var(--border)] last:border-0">
      <div>
        <div className="text-xs font-medium leading-tight">{quote.name}</div>
        <div className="mono text-[10px]" style={{ color: 'var(--text-muted)' }}>
          {quote.symbol.replace('^', '')}
        </div>
      </div>
      <div className="text-right">
        <div className="mono text-xs font-semibold">
          {isFx
            ? quote.price.toFixed(4)
            : quote.price.toLocaleString('en-US', { maximumFractionDigits: 2 })}
        </div>
        <div
          className="mono text-[10px]"
          style={{ color: positive ? 'var(--positive)' : 'var(--negative)' }}
        >
          {positive ? '+' : ''}{quote.changesPercentage.toFixed(2)}%
        </div>
      </div>
    </div>
  );
}

function Section({ title, quotes }: { title: string; quotes: MarketQuote[] }) {
  return (
    <div className="mb-4">
      <h3
        className="mono text-[10px] font-semibold uppercase tracking-widest mb-2 pb-1 border-b border-[var(--border)]"
        style={{ color: 'var(--gold)' }}
      >
        {title}
      </h3>
      <div>
        {quotes.map(q => <QuoteRow key={q.symbol} quote={q} />)}
      </div>
    </div>
  );
}

function SkeletonRow() {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-[var(--border)]">
      <div className="space-y-1">
        <div className="h-3 w-20 rounded animate-pulse" style={{ background: 'var(--border)' }} />
        <div className="h-2 w-12 rounded animate-pulse" style={{ background: 'var(--border)' }} />
      </div>
      <div className="space-y-1 text-right">
        <div className="h-3 w-16 rounded animate-pulse" style={{ background: 'var(--border)' }} />
        <div className="h-2 w-12 rounded animate-pulse" style={{ background: 'var(--border)' }} />
      </div>
    </div>
  );
}

export default function MarketSidebar({ data, loading }: MarketSidebarProps) {
  return (
    <aside
      className="w-64 shrink-0 card rounded-lg p-4 h-fit sticky top-4 overflow-y-auto"
      style={{ maxHeight: 'calc(100vh - 120px)' }}
    >
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold">Markets</h2>
        <span
          className="mono text-[10px] px-2 py-0.5 rounded"
          style={{ background: 'var(--surface-2)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}
        >
          {new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>

      {loading || !data ? (
        <div>
          {[...Array(12)].map((_, i) => <SkeletonRow key={i} />)}
        </div>
      ) : (
        <>
          <Section title="Indices" quotes={data.indices} />
          <Section title="Commodities" quotes={data.commodities} />
          <Section title="FX" quotes={data.fx} />
        </>
      )}

      <p className="mono text-[9px] mt-3 text-center" style={{ color: 'var(--text-muted)' }}>
        Powered by Financial Modeling Prep
      </p>
    </aside>
  );
}
