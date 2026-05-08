'use client';

import { useEffect, useState, useCallback } from 'react';
import type { EarningsItem } from '@/lib/types';

function EpsBadge({ epsBeat }: { epsBeat: EarningsItem['epsBeat'] }) {
  if (!epsBeat) return null;
  const cfg = {
    beat:   { label: 'BEAT',   color: 'var(--positive)', border: '#1a4a2e', bg: 'rgba(46,204,113,0.08)' },
    miss:   { label: 'MISS',   color: 'var(--negative)', border: '#4a1a1a', bg: 'rgba(231,76,60,0.08)'  },
    inline: { label: 'IN LINE', color: 'var(--text-muted)', border: 'var(--border-2)', bg: 'transparent' },
  }[epsBeat];
  return (
    <span
      className="font-data"
      style={{
        fontSize: 8, fontWeight: 700, letterSpacing: '0.08em',
        padding: '2px 5px', borderRadius: 3,
        border: `1px solid ${cfg.border}`,
        background: cfg.bg, color: cfg.color,
        whiteSpace: 'nowrap',
      }}
    >
      {cfg.label}
    </span>
  );
}

function EarningsRow({ item }: { item: EarningsItem }) {
  const isUpcoming = item.status === 'upcoming';
  const fmtEps = (v: number | null) =>
    v === null ? '—' : `$${v.toFixed(2)}`;

  return (
    <div
      style={{
        display:      'flex',
        alignItems:   'center',
        gap:          10,
        padding:      '9px 12px',
        borderRadius: 5,
        background:   'var(--surface-2)',
        marginBottom: 4,
      }}
    >
      {/* Date chip */}
      <div
        className="font-data text-[9px] font-bold uppercase"
        style={{
          color:        isUpcoming ? 'var(--gold)' : 'var(--text-muted)',
          minWidth:     34,
          textAlign:    'center',
          lineHeight:   1.25,
        }}
      >
        {item.reportDateFmt}
      </div>

      {/* Name + symbol */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="flex items-baseline gap-1.5">
          <span className="font-data font-bold" style={{ fontSize: 11, color: 'var(--text)' }}>
            {item.symbol}
          </span>
          <span
            style={{
              fontSize: 11, color: 'var(--text-secondary)',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              maxWidth: 130,
            }}
          >
            {item.name}
          </span>
        </div>
        {!isUpcoming && item.epsActual !== null && (
          <div className="font-data" style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>
            EPS: est {fmtEps(item.epsEstimate)} · act {fmtEps(item.epsActual)}
          </div>
        )}
        {isUpcoming && item.epsEstimate !== null && (
          <div className="font-data" style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>
            EPS est: {fmtEps(item.epsEstimate)}
          </div>
        )}
      </div>

      {/* Badge */}
      <div style={{ flexShrink: 0 }}>
        {isUpcoming ? (
          <span
            className="font-data"
            style={{
              fontSize: 8, fontWeight: 700, letterSpacing: '0.06em',
              padding: '2px 6px', borderRadius: 3,
              border: '1px solid var(--gold-dim)', background: 'rgba(201,168,76,0.07)',
              color: 'var(--gold)', whiteSpace: 'nowrap',
            }}
          >
            UPCOMING
          </span>
        ) : (
          <EpsBadge epsBeat={item.epsBeat} />
        )}
      </div>
    </div>
  );
}

export default function EarningsCalendar() {
  const [items,   setItems]   = useState<EarningsItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchEarnings = useCallback(async () => {
    try {
      const r = await fetch('/api/earnings');
      if (!r.ok) throw new Error('non-ok');
      const d = await r.json();
      setItems(d.earnings ?? []);
    } catch { /* keep existing */ } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEarnings();
    const t = setInterval(fetchEarnings, 24 * 60 * 60_000);
    return () => clearInterval(t);
  }, [fetchEarnings]);

  // Sort: upcoming first, then by reportDate asc
  const sorted = [...items].sort((a, b) => {
    if (a.status !== b.status) return a.status === 'upcoming' ? -1 : 1;
    return new Date(a.reportDate).getTime() - new Date(b.reportDate).getTime();
  });

  return (
    <div className="card" style={{ padding: '16px 16px 12px' }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <span className="section-label">Earnings This Week</span>
        <span className="font-data text-[9px]" style={{ color: 'var(--text-muted)', letterSpacing: '0.06em' }}>
          24H REFRESH
        </span>
      </div>

      {loading ? (
        <div className="space-y-1">
          {[...Array(8)].map((_, i) => (
            <div
              key={i}
              style={{ display: 'flex', gap: 10, padding: '9px 12px', background: 'var(--surface-2)', borderRadius: 5 }}
            >
              <div className="skeleton h-3 w-8" />
              <div style={{ flex: 1 }}>
                <div className="skeleton h-2.5 w-28 mb-1.5" />
                <div className="skeleton h-2 w-20" />
              </div>
              <div className="skeleton h-4 w-14" />
            </div>
          ))}
        </div>
      ) : sorted.length === 0 ? (
        <div className="font-data text-[11px]" style={{ color: 'var(--text-muted)', padding: '12px 0' }}>
          No major earnings in the next 14 days.
        </div>
      ) : (
        <div>
          {sorted.map(item => (
            <EarningsRow key={item.symbol} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}
