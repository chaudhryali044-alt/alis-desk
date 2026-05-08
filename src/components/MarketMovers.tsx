'use client';

import { useEffect, useState, useCallback } from 'react';
import type { Mover } from '@/lib/types';

interface MoversData {
  gainers: Mover[];
  losers:  Mover[];
  error?:  string;
}

function MoverRow({ m, isGainer }: { m: Mover; isGainer: boolean }) {
  const color  = isGainer ? 'var(--positive)' : 'var(--negative)';
  const arrow  = isGainer ? '▲' : '▼';
  const sign   = m.changePct >= 0 ? '+' : '';
  const pctStr = `${sign}${m.changePct.toFixed(2)}%`;

  return (
    <a
      href={`https://finance.yahoo.com/quote/${encodeURIComponent(m.symbol)}`}
      target="_blank"
      rel="noopener noreferrer"
      style={{ textDecoration: 'none' }}
    >
      <div
        style={{
          display:      'flex',
          gap:          10,
          padding:      '9px 12px',
          borderRadius: 5,
          background:   'var(--surface-2)',
          marginBottom: 4,
          transition:   'background 0.12s',
          cursor:       'pointer',
        }}
        onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-3)')}
        onMouseLeave={e => (e.currentTarget.style.background = 'var(--surface-2)')}
      >
        {/* Ticker + name + sector */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="flex items-baseline gap-2">
            <span className="font-data font-bold" style={{ fontSize: 11, color: 'var(--text)' }}>
              {m.symbol}
            </span>
            <span
              className="font-data"
              style={{
                fontSize: 9, color: 'var(--text-muted)',
                textTransform: 'uppercase', letterSpacing: '0.06em',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}
            >
              {m.sector}
            </span>
          </div>
          {m.reason && (
            <div
              style={{
                fontSize: 11, color: 'var(--text-secondary)',
                marginTop: 2, lineHeight: 1.4,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}
            >
              {m.reason}
            </div>
          )}
        </div>

        {/* Price + pct */}
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div className="font-data font-bold" style={{ fontSize: 12, color: 'var(--text)' }}>
            ${m.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="font-data" style={{ fontSize: 11, color }}>
            {arrow} {pctStr}
          </div>
        </div>
      </div>
    </a>
  );
}

function SkeletonRows() {
  return (
    <div className="space-y-1.5">
      {[...Array(5)].map((_, i) => (
        <div
          key={i}
          style={{ display: 'flex', gap: 10, padding: '9px 12px', background: 'var(--surface-2)', borderRadius: 5 }}
        >
          <div style={{ flex: 1 }}>
            <div className="skeleton h-2.5 w-16 mb-1.5" />
            <div className="skeleton h-2 w-36" />
          </div>
          <div>
            <div className="skeleton h-3 w-14 mb-1.5" />
            <div className="skeleton h-2 w-12" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function MarketMovers() {
  const [data,    setData]    = useState<MoversData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchMovers = useCallback(async () => {
    try {
      const r = await fetch('/api/market-movers');
      if (!r.ok) throw new Error('non-ok');
      const d: MoversData = await r.json();
      setData(d);
    } catch {
      /* keep existing data on refresh failures */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMovers();
    const t = setInterval(fetchMovers, 60_000);
    return () => clearInterval(t);
  }, [fetchMovers]);

  const unavailable = !loading && (!data || data.error || (data.gainers.length === 0 && data.losers.length === 0));

  return (
    <div className="card" style={{ padding: '16px 16px 12px' }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <span className="section-label">Market Movers</span>
        <span className="font-data text-[9px]" style={{ color: 'var(--text-muted)', letterSpacing: '0.06em' }}>
          60s REFRESH
        </span>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="skeleton h-2 w-20 mb-3" />
            <SkeletonRows />
          </div>
          <div>
            <div className="skeleton h-2 w-16 mb-3" />
            <SkeletonRows />
          </div>
        </div>
      ) : unavailable ? (
        <div
          className="font-data text-[11px]"
          style={{ color: 'var(--text-muted)', padding: '20px 0', textAlign: 'center' }}
        >
          Live market data unavailable — retrying shortly
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {/* Gainers */}
          <div>
            <div
              className="font-data text-[9px] uppercase font-bold tracking-widest mb-2"
              style={{ color: 'var(--positive)' }}
            >
              ▲ Top Gainers
            </div>
            {data!.gainers.map(m => (
              <MoverRow key={m.symbol} m={m} isGainer={true} />
            ))}
          </div>

          {/* Losers */}
          <div>
            <div
              className="font-data text-[9px] uppercase font-bold tracking-widest mb-2"
              style={{ color: 'var(--negative)' }}
            >
              ▼ Top Losers
            </div>
            {data!.losers.map(m => (
              <MoverRow key={m.symbol} m={m} isGainer={false} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
