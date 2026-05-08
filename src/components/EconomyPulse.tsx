'use client';

import { useEffect, useState, useCallback } from 'react';
import type { EconomyMetric } from '@/lib/types';

function TrendArrow({ trend, pct }: { trend?: 'up' | 'down' | 'flat'; pct: number }) {
  const formatted = `${pct >= 0 ? '+' : ''}${pct.toFixed(2)}%`;
  if (trend === 'up')   return <span style={{ color: 'var(--positive)', fontFamily: 'monospace' }}>▲ {formatted}</span>;
  if (trend === 'down') return <span style={{ color: 'var(--negative)', fontFamily: 'monospace' }}>▼ {formatted}</span>;
  return <span style={{ color: 'var(--text-muted)', fontFamily: 'monospace' }}>─ {formatted}</span>;
}

function MetricCard({ m }: { m: EconomyMetric }) {
  return (
    <div
      className="flex flex-col justify-between px-4 py-3 shrink-0"
      style={{ borderRight: '1px solid var(--border)', minWidth: 185, flex: '1 1 0' }}
    >
      <div className="section-label mb-1.5">{m.label}</div>
      <div className="flex items-baseline gap-2 flex-wrap">
        <span className="font-data text-2xl font-bold" style={{ color: 'var(--gold)' }}>
          {m.value}
        </span>
        {m.unit && <span className="font-data text-sm" style={{ color: 'var(--text-muted)' }}>{m.unit}</span>}
        <span className="font-data text-[11px]">
          <TrendArrow trend={m.trend} pct={m.change} />
        </span>
      </div>
      {m.asOf && m.asOf !== '—' && (
        <div className="font-data text-[9px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
          as of {m.asOf}
        </div>
      )}
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
      style={{ borderRight: '1px solid var(--border)', minWidth: 185, flex: '1 1 0' }}
    >
      <div className="skeleton h-2 w-24 mb-2" />
      <div className="skeleton h-7 w-20 mb-1" />
      <div className="skeleton h-2 w-16 mb-2" />
      <div className="skeleton h-2 w-full mb-1" />
      <div className="skeleton h-2 w-4/5" />
    </div>
  );
}

export default function EconomyPulse() {
  const [metrics, setMetrics]         = useState<EconomyMetric[]>([]);
  const [loading, setLoading]         = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [error, setError]             = useState(false);

  const fetchMetrics = useCallback(async () => {
    try {
      const r = await fetch('/api/economy-pulse');
      if (!r.ok) throw new Error('non-ok');
      const d = await r.json();
      const m: EconomyMetric[] = d.metrics ?? [];
      setMetrics(m);
      setError(m.length === 0);
      setLastRefresh(new Date());
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMetrics();
    const t = setInterval(fetchMetrics, 60 * 1000);
    return () => clearInterval(t);
  }, [fetchMetrics]);

  return (
    <section style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
      <div
        className="flex items-center gap-3 px-5"
        style={{ borderBottom: '1px solid var(--border)', height: 32 }}
      >
        <span className="section-label">Economy Pulse</span>
        <div className="gold-rule flex-1" />
        <span className="font-data text-[9px]" style={{ color: 'var(--text-muted)' }}>
          {loading
            ? 'Fetching live data…'
            : lastRefresh
            ? `Updated ${lastRefresh.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })} · refreshes every 60s`
            : 'Live data'}
        </span>
      </div>

      {/* min-height ensures the strip never collapses to 0 */}
      <div className="flex overflow-x-auto" style={{ scrollbarWidth: 'none', minHeight: 88 }}>
        {loading ? (
          [...Array(7)].map((_, i) => <SkeletonCard key={i} />)
        ) : error || metrics.length === 0 ? (
          <div
            className="flex items-center justify-center w-full font-data text-[11px]"
            style={{ color: 'var(--text-muted)', padding: '0 20px' }}
          >
            Market data temporarily unavailable — retrying in 60s
          </div>
        ) : (
          metrics.map(m => <MetricCard key={m.key} m={m} />)
        )}
      </div>
    </section>
  );
}
