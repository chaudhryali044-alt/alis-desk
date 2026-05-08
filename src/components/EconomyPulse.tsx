'use client';

import type { EconomyMetric } from '@/lib/types';

interface Props { metrics: EconomyMetric[]; loading: boolean; }

function TrendArrow({ trend }: { trend?: 'up' | 'down' | 'flat' }) {
  if (trend === 'up')   return <span style={{ color: 'var(--positive)' }}>▲</span>;
  if (trend === 'down') return <span style={{ color: 'var(--negative)' }}>▼</span>;
  return <span style={{ color: 'var(--text-muted)' }}>─</span>;
}

function MetricCard({ m }: { m: EconomyMetric }) {
  return (
    <div
      className="flex flex-col justify-between px-4 py-3 shrink-0"
      style={{
        borderRight: '1px solid var(--border)',
        minWidth: 180,
        flex: '1 1 0',
      }}
    >
      <div className="section-label mb-1.5">{m.label}</div>
      <div className="flex items-baseline gap-2">
        <span className="font-data text-2xl font-bold" style={{ color: 'var(--gold)' }}>
          {m.value}
        </span>
        <span className="font-data text-sm" style={{ color: 'var(--text-muted)' }}>{m.unit}</span>
        <TrendArrow trend={m.trend} />
      </div>
      <p className="text-[11px] mt-1.5 leading-snug" style={{ color: 'var(--text-secondary)' }}>
        {m.analysis}
      </p>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div
      className="flex flex-col justify-between px-4 py-3 shrink-0"
      style={{ borderRight: '1px solid var(--border)', minWidth: 180, flex: '1 1 0' }}
    >
      <div className="skeleton h-2 w-24 mb-2" />
      <div className="skeleton h-7 w-20 mb-2" />
      <div className="skeleton h-2 w-full mb-1" />
      <div className="skeleton h-2 w-4/5" />
    </div>
  );
}

export default function EconomyPulse({ metrics, loading }: Props) {
  return (
    <section
      style={{
        background: 'var(--surface)',
        borderBottom: '1px solid var(--border)',
      }}
    >
      <div
        className="flex items-center gap-3 px-5"
        style={{ borderBottom: '1px solid var(--border)', height: 32 }}
      >
        <span className="section-label">Economy Pulse</span>
        <div className="gold-rule flex-1" />
        <span className="font-data text-[9px]" style={{ color: 'var(--text-muted)' }}>
          AI analysis refreshes every 6h
        </span>
      </div>

      <div className="flex overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
        {loading
          ? [...Array(6)].map((_, i) => <SkeletonCard key={i} />)
          : metrics.map(m => <MetricCard key={m.key} m={m} />)
        }
      </div>
    </section>
  );
}
