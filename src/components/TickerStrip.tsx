'use client';

import type { TickerItem } from '@/lib/types';

interface TickerStripProps {
  items: TickerItem[];
}

function TickerCell({ item }: { item: TickerItem }) {
  const positive = item.changesPercentage >= 0;
  return (
    <span className="inline-flex items-center gap-2 px-4 border-r border-[var(--border)] whitespace-nowrap">
      <span className="mono font-semibold text-xs" style={{ color: 'var(--gold)' }}>
        {item.symbol.replace('^', '')}
      </span>
      <span className="mono text-xs font-medium">
        {item.price.toLocaleString('en-US', { maximumFractionDigits: 4 })}
      </span>
      <span
        className="mono text-xs"
        style={{ color: positive ? 'var(--positive)' : 'var(--negative)' }}
      >
        {positive ? '▲' : '▼'} {Math.abs(item.changesPercentage).toFixed(2)}%
      </span>
    </span>
  );
}

export default function TickerStrip({ items }: TickerStripProps) {
  if (!items.length) {
    return (
      <div
        className="border-b border-[var(--border)] py-2 px-4 mono text-xs"
        style={{ color: 'var(--text-muted)', background: 'var(--surface)' }}
      >
        Loading market data…
      </div>
    );
  }

  const doubled = [...items, ...items];

  return (
    <div
      className="border-b border-[var(--border)] overflow-hidden py-2"
      style={{ background: 'var(--surface)' }}
    >
      <div className="ticker-scroll">
        {doubled.map((item, i) => (
          <TickerCell key={i} item={item} />
        ))}
      </div>
    </div>
  );
}
