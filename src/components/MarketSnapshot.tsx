'use client';

import type { SnapshotQuote } from '@/lib/types';

function QuoteCard({ q }: { q: SnapshotQuote }) {
  const pos = q.changesPercentage >= 0;
  const changeColor = pos ? 'var(--positive)' : 'var(--negative)';

  return (
    <div
      className="card card-hover flex flex-col justify-between p-3 min-w-0"
      style={{ borderTop: `2px solid ${changeColor}` }}
    >
      <div className="flex items-center justify-between mb-1">
        <span className="font-data text-[10px] font-bold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
          {q.name}
        </span>
        <span
          className="font-data text-[10px] font-bold"
          style={{ color: changeColor }}
        >
          {pos ? '▲' : '▼'} {Math.abs(q.changesPercentage).toFixed(2)}%
        </span>
      </div>
      <div className="font-data font-bold" style={{ fontSize: 15, color: 'var(--text)', letterSpacing: '-0.02em' }}>
        {q.price.toLocaleString('en-US', { maximumFractionDigits: 2 })}
      </div>
      <div className="font-data text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
        {q.change >= 0 ? '+' : ''}{q.change.toFixed(2)}
      </div>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="card p-3" style={{ borderTop: '2px solid var(--border-2)' }}>
      <div className="flex justify-between mb-2">
        <div className="skeleton h-2.5 w-16" />
        <div className="skeleton h-2.5 w-10" />
      </div>
      <div className="skeleton h-4 w-24 mb-1.5" />
      <div className="skeleton h-2.5 w-12" />
    </div>
  );
}

interface Props { quotes: SnapshotQuote[]; loading: boolean; }

export default function MarketSnapshot({ quotes, loading }: Props) {
  return (
    <section
      style={{
        background: 'var(--surface)',
        borderTop: '1px solid var(--border)',
        padding: '12px 20px 16px',
      }}
    >
      <div className="flex items-center gap-3 mb-3">
        <span className="section-label">Market Snapshot</span>
        <div className="gold-rule flex-1" />
      </div>

      <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(8, 1fr)' }}>
        {loading
          ? [...Array(8)].map((_, i) => <SkeletonCard key={i} />)
          : quotes.map(q => <QuoteCard key={q.symbol} q={q} />)
        }
      </div>
    </section>
  );
}
