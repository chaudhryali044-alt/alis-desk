'use client';

import { useEffect, useState, useCallback } from 'react';

interface Ticker {
  symbol:     string;
  name:       string;
  unit:       string;
  decimals:   number;
  price:      number;
  change:     number;
  changePct:  number;
  high:       number;
  low:        number;
  week52High: number;
  week52Low:  number;
  yahooLink:  string;
}

/* ─── Modal ─────────────────────────────────────────────────── */
function TickerModal({ ticker, onClose }: { ticker: Ticker; onClose: () => void }) {
  const [analysis, setAnalysis]   = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(true);

  const isUp   = ticker.changePct > 0.05;
  const isDown = ticker.changePct < -0.05;
  const signColor = isUp ? 'var(--positive)' : isDown ? 'var(--negative)' : 'var(--text-muted)';

  const fmt = (n: number) =>
    n.toLocaleString('en-US', {
      minimumFractionDigits:  ticker.decimals,
      maximumFractionDigits:  ticker.decimals,
    });

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch('/api/ticker-analysis', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify(ticker),
        });
        const d = await r.json();
        setAnalysis(d.analysis ?? '');
      } catch {
        setAnalysis('');
      } finally {
        setAiLoading(false);
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticker.symbol]);

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 300,
        background: 'rgba(0,0,0,0.72)',
        display: 'flex', alignItems: 'flex-start',
        justifyContent: 'center', paddingTop: 68,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        className="animate-fade-up"
        style={{
          background:   'var(--surface)',
          border:       '1px solid var(--border-2)',
          borderRadius: 8,
          width:        390,
          maxWidth:     'calc(100vw - 32px)',
          padding:      '20px 22px',
        }}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="font-data text-[9px] uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
              {ticker.symbol}
            </div>
            <div className="font-display font-bold text-lg leading-tight mt-0.5" style={{ color: 'var(--text)' }}>
              {ticker.name}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              color: 'var(--text-muted)', background: 'none',
              border: 'none', cursor: 'pointer',
              fontSize: 22, lineHeight: 1, padding: '0 0 0 16px',
            }}
          >
            ×
          </button>
        </div>

        {/* Price + change */}
        <div className="flex items-baseline gap-3 mb-4 flex-wrap">
          <span className="font-data font-bold" style={{ fontSize: 28, color: 'var(--gold)' }}>
            {fmt(ticker.price)}
            {ticker.unit && (
              <span className="font-data text-sm ml-1" style={{ color: 'var(--text-muted)' }}>
                {ticker.unit}
              </span>
            )}
          </span>
          <span className="font-data text-sm" style={{ color: signColor }}>
            {isUp ? '▲' : isDown ? '▼' : '─'}
            {' '}{ticker.change >= 0 ? '+' : ''}{fmt(ticker.change)}
            {' '}({ticker.changePct >= 0 ? '+' : ''}{ticker.changePct.toFixed(2)}%)
          </span>
        </div>

        {/* Ranges */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          {[
            { label: 'Day Range',      lo: ticker.low,        hi: ticker.high        },
            { label: '52-Week Range',  lo: ticker.week52Low,  hi: ticker.week52High  },
          ].map(r => (
            <div
              key={r.label}
              style={{ background: 'var(--surface-2)', borderRadius: 5, padding: '9px 11px' }}
            >
              <div
                className="font-data text-[9px] uppercase tracking-widest mb-1"
                style={{ color: 'var(--text-muted)' }}
              >
                {r.label}
              </div>
              <div className="font-data text-[12px]" style={{ color: 'var(--text)' }}>
                {fmt(r.lo)}&nbsp;–&nbsp;{fmt(r.hi)}
              </div>
            </div>
          ))}
        </div>

        {/* AI Analysis */}
        <div
          style={{
            background:   'var(--surface-2)',
            borderRadius: 5,
            borderLeft:   '2px solid var(--gold)',
            padding:      '12px 14px',
            marginBottom: 14,
          }}
        >
          <div
            className="font-data text-[9px] uppercase tracking-widest mb-2"
            style={{ color: 'var(--gold)' }}
          >
            AI Analysis · Markets &amp; Deal Flow
          </div>
          {aiLoading ? (
            <div className="space-y-1.5">
              <div className="skeleton h-2.5 w-full" />
              <div className="skeleton h-2.5 w-11/12" />
              <div className="skeleton h-2.5 w-3/4" />
            </div>
          ) : analysis ? (
            <p className="text-[12px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              {analysis}
            </p>
          ) : (
            <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
              Analysis unavailable — check Groq API key configuration.
            </p>
          )}
        </div>

        {/* Yahoo Finance link */}
        <a
          href={ticker.yahooLink}
          target="_blank"
          rel="noopener noreferrer"
          className="font-data text-[11px]"
          style={{
            display:        'flex',
            alignItems:     'center',
            justifyContent: 'center',
            gap:            6,
            padding:        '8px',
            borderRadius:   5,
            background:     'var(--surface-3)',
            border:         '1px solid var(--border)',
            color:          'var(--text-muted)',
            textDecoration: 'none',
            transition:     'border-color 0.15s, color 0.15s',
          }}
          onMouseEnter={e => {
            const el = e.currentTarget as HTMLElement;
            el.style.borderColor = 'var(--gold-dim)';
            el.style.color       = 'var(--gold)';
          }}
          onMouseLeave={e => {
            const el = e.currentTarget as HTMLElement;
            el.style.borderColor = 'var(--border)';
            el.style.color       = 'var(--text-muted)';
          }}
        >
          View live on Yahoo Finance →
        </a>
      </div>
    </div>
  );
}

/* ─── Single ticker item in the strip ───────────────────────── */
function TickerItem({ t, onSelect }: { t: Ticker; onSelect: (t: Ticker) => void }) {
  const isUp   = t.changePct >  0.05;
  const isDown = t.changePct < -0.05;

  const priceFmt = t.price.toLocaleString('en-US', {
    minimumFractionDigits: t.decimals,
    maximumFractionDigits: t.decimals,
  });
  const pctStr     = `${t.changePct >= 0 ? '+' : ''}${t.changePct.toFixed(2)}%`;
  const priceColor = isUp ? 'var(--gold)' : isDown ? 'var(--negative)' : 'var(--text)';
  const chgColor   = isUp ? 'var(--positive)' : isDown ? 'var(--negative)' : 'var(--text-muted)';

  return (
    <button
      onClick={() => onSelect(t)}
      style={{
        display:      'inline-flex',
        alignItems:   'center',
        gap:          8,
        padding:      '0 20px',
        height:       '100%',
        background:   'none',
        borderWidth:  '0 1px 0 0',
        borderStyle:  'solid',
        borderColor:  'var(--border)',
        cursor:       'pointer',
        flexShrink:   0,
        transition:   'background 0.1s',
      }}
      onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-2)')}
      onMouseLeave={e => (e.currentTarget.style.background = 'none')}
    >
      {/* Name */}
      <span
        className="font-data small-caps"
        style={{ fontSize: 9, color: 'var(--text-muted)', letterSpacing: '0.10em', whiteSpace: 'nowrap' }}
      >
        {t.name}
      </span>

      {/* Price */}
      <span
        className="font-data font-bold"
        style={{ fontSize: 14, color: priceColor, whiteSpace: 'nowrap' }}
      >
        {priceFmt}
        {t.unit && (
          <span style={{ fontSize: 10, color: 'var(--text-muted)', marginLeft: 2 }}>{t.unit}</span>
        )}
      </span>

      {/* Arrow + pct */}
      <span
        className="font-data"
        style={{ fontSize: 11.5, color: chgColor, whiteSpace: 'nowrap' }}
      >
        {isUp ? '▲' : isDown ? '▼' : '─'} {pctStr}
      </span>
    </button>
  );
}

/* ─── Ticker strip ───────────────────────────────────────────── */
export default function EconomyPulse() {
  const [tickers,  setTickers]  = useState<Ticker[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [selected, setSelected] = useState<Ticker | null>(null);
  const [paused,   setPaused]   = useState(false);

  const fetchTickers = useCallback(async (isRetry = false) => {
    try {
      const r = await fetch('/api/market-data');
      if (!r.ok) throw new Error('non-ok');
      const d = await r.json();
      const fetched: Ticker[] = d.tickers ?? [];
      if (fetched.length > 0) {
        setTickers(fetched);
        setLoading(false);
      } else if (!isRetry) {
        setTimeout(() => fetchTickers(true), 10_000);
      } else {
        setLoading(false);
      }
    } catch {
      if (!isRetry) {
        setTimeout(() => fetchTickers(true), 10_000);
      } else {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    fetchTickers();
    const t = setInterval(() => fetchTickers(), 60_000);
    return () => clearInterval(t);
  }, [fetchTickers]);

  return (
    <>
      <div
        style={{
          height:      44,
          background:  'var(--surface)',
          borderBottom: '1px solid var(--border)',
          display:     'flex',
          alignItems:  'center',
          position:    'relative',
          overflow:    'hidden',
        }}
      >
        {/* Fixed "MARKETS LIVE" label — anchors left of scrolling strip */}
        <div
          style={{
            position:    'absolute',
            left:        0, top: 0, bottom: 0,
            zIndex:      10,
            background:  'var(--surface)',
            borderRight: '1px solid var(--border)',
            display:     'flex',
            alignItems:  'center',
            padding:     '0 14px',
            gap:         7,
            flexShrink:  0,
          }}
        >
          <span
            className="animate-pulse-dot"
            style={{
              width: 7, height: 7, borderRadius: '50%',
              background: 'var(--positive)',
              display: 'inline-block',
            }}
          />
          <span className="section-label" style={{ fontSize: 8.5, letterSpacing: '0.20em' }}>LIVE</span>
        </div>

        {/* Right-side fade-out gradient */}
        <div
          style={{
            position:    'absolute',
            right:       0, top: 0, bottom: 0,
            width:       60, zIndex: 10,
            background:  'linear-gradient(to left, var(--surface) 0%, transparent 100%)',
            pointerEvents: 'none',
          }}
        />

        {/* Scrolling area */}
        <div
          style={{ marginLeft: 72, overflow: 'hidden', height: '100%', flex: 1 }}
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
        >
          {loading ? (
            /* Skeleton items while fetching */
            <div className="flex items-center gap-8 h-full px-4">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="flex gap-2 items-center shrink-0">
                  <div className="skeleton h-2 w-14" />
                  <div className="skeleton h-3 w-16" />
                  <div className="skeleton h-2 w-10" />
                </div>
              ))}
            </div>
          ) : tickers.length > 0 ? (
            /* Scrolling ticker — items duplicated for seamless loop */
            <div
              style={{
                display:            'inline-flex',
                alignItems:         'center',
                height:             '100%',
                animation:          'ticker-scroll 55s linear infinite',
                animationPlayState: paused ? 'paused' : 'running',
                willChange:         'transform',
              }}
            >
              {[...tickers, ...tickers].map((t, i) => (
                <TickerItem key={`${t.symbol}-${i}`} t={t} onSelect={setSelected} />
              ))}
            </div>
          ) : (
            <div
              className="flex items-center h-full px-4 font-data text-[11px]"
              style={{ color: 'var(--text-muted)' }}
            >
              Market data temporarily unavailable — retrying in 60s
            </div>
          )}
        </div>
      </div>

      {/* Click-through modal */}
      {selected && (
        <TickerModal ticker={selected} onClose={() => setSelected(null)} />
      )}
    </>
  );
}
