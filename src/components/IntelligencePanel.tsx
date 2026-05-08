'use client';

import type { FearGreedData, MacroEvent, IPOItem } from '@/lib/types';

/* ─────────────────────────────────────────────────────────────────
   Widget 1 — Fear & Greed Gauge
───────────────────────────────────────────────────────────────── */
const GAUGE_SEGMENTS = [
  { from: 0,  to: 25,  color: '#e74c3c', label: 'Extreme Fear' },
  { from: 25, to: 45,  color: '#e67e22', label: 'Fear'         },
  { from: 45, to: 55,  color: '#f1c40f', label: 'Neutral'      },
  { from: 55, to: 75,  color: '#2ecc71', label: 'Greed'        },
  { from: 75, to: 100, color: '#27ae60', label: 'Extreme Greed'},
];

function segmentColor(score: number) {
  return GAUGE_SEGMENTS.find(s => score >= s.from && score <= s.to)?.color ?? '#f1c40f';
}

function arcPath(cx: number, cy: number, r: number, s1: number, s2: number) {
  // score 0 = left (180°), score 100 = right (0°)
  const a1 = Math.PI - (s1 / 100) * Math.PI;
  const a2 = Math.PI - (s2 / 100) * Math.PI;
  const x1 = cx + r * Math.cos(a1), y1 = cy - r * Math.sin(a1);
  const x2 = cx + r * Math.cos(a2), y2 = cy - r * Math.sin(a2);
  return `M ${x1} ${y1} A ${r} ${r} 0 0 1 ${x2} ${y2}`;
}

function FearGauge({ data, loading }: { data: FearGreedData | null; loading: boolean }) {
  const score = data?.score ?? 50;
  const needleAngle = Math.PI - (score / 100) * Math.PI;
  const cx = 100, cy = 90, r = 72;
  const nx = cx + (r - 8) * Math.cos(needleAngle);
  const ny = cy - (r - 8) * Math.sin(needleAngle);
  const color = segmentColor(score);

  return (
    <div
      className="card p-4"
      style={{ borderBottom: '1px solid var(--border)' }}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="font-display font-bold text-sm" style={{ color: 'var(--text)' }}>
          Fear &amp; Greed
        </span>
        <span className="section-label">CNN Index</span>
      </div>

      {loading ? (
        <div className="flex flex-col items-center gap-3 py-4">
          <div className="skeleton h-24 w-full rounded" />
          <div className="skeleton h-3 w-3/4" />
        </div>
      ) : (
        <>
          <svg viewBox="0 0 200 100" className="w-full" style={{ maxHeight: 110 }}>
            {/* Track background */}
            <path
              d={arcPath(cx, cy, r, 0, 100)}
              fill="none"
              stroke="var(--surface-3)"
              strokeWidth="14"
              strokeLinecap="round"
            />
            {/* Coloured segments */}
            {GAUGE_SEGMENTS.map(seg => (
              <path
                key={seg.label}
                d={arcPath(cx, cy, r, seg.from, seg.to)}
                fill="none"
                stroke={seg.color}
                strokeWidth="14"
                opacity="0.85"
              />
            ))}
            {/* Needle */}
            <line
              x1={cx} y1={cy}
              x2={nx} y2={ny}
              stroke="#fff"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <circle cx={cx} cy={cy} r="4" fill="#fff" />
            {/* Score label */}
            <text
              x={cx} y={cy + 18}
              textAnchor="middle"
              fontSize="20"
              fontWeight="700"
              fontFamily="'Space Mono', monospace"
              fill={color}
            >
              {score}
            </text>
            {/* Rating label */}
            <text
              x={cx} y={cy + 32}
              textAnchor="middle"
              fontSize="8"
              fontFamily="'DM Sans', sans-serif"
              fill="var(--text-muted)"
            >
              {data?.rating ?? 'Neutral'}
            </text>
            {/* Axis labels */}
            <text x="8"  y={cy + 4} fontSize="7" fontFamily="monospace" fill="var(--text-muted)">Fear</text>
            <text x="162" y={cy + 4} fontSize="7" fontFamily="monospace" fill="var(--text-muted)">Greed</text>
          </svg>

          {data?.analysis && (
            <p className="text-[11px] leading-snug mt-2" style={{ color: 'var(--text-secondary)' }}>
              {data.analysis}
            </p>
          )}

          {data?.previousClose !== undefined && (
            <div className="font-data text-[10px] mt-2" style={{ color: 'var(--text-muted)' }}>
              Prev close: {data.previousClose} &nbsp;·&nbsp;
              <span style={{ color: score > data.previousClose ? 'var(--positive)' : score < data.previousClose ? 'var(--negative)' : 'var(--text-muted)' }}>
                {score > data.previousClose ? '▲' : score < data.previousClose ? '▼' : '─'}
                {Math.abs(score - data.previousClose).toFixed(0)} pts
              </span>
            </div>
          )}
        </>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   Widget 2 — Macro Calendar
───────────────────────────────────────────────────────────────── */
function MacroCalendar({ events, loading }: { events: MacroEvent[]; loading: boolean }) {
  return (
    <div className="card p-4" style={{ borderBottom: '1px solid var(--border)' }}>
      <div className="flex items-center justify-between mb-3">
        <span className="font-display font-bold text-sm" style={{ color: 'var(--text)' }}>
          Macro Calendar
        </span>
        <span className="section-label">This Week</span>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex gap-2 items-center">
              <div className="skeleton h-3 w-6" />
              <div className="skeleton h-3 flex-1" />
              <div className="skeleton h-3 w-8" />
            </div>
          ))}
        </div>
      ) : events.length === 0 ? (
        <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>No major events this week.</p>
      ) : (
        <div className="space-y-1.5">
          {events.map((ev, i) => (
            <div key={i} className="flex items-start gap-2 py-1.5" style={{ borderBottom: '1px solid var(--border)' }}>
              <span className="text-base leading-none shrink-0 mt-0.5">{ev.flagEmoji}</span>
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-medium leading-tight truncate" style={{ color: 'var(--text)' }}>
                  {ev.event}
                </p>
                <p className="font-data text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                  {ev.date} {ev.time && `· ${ev.time}`}
                  {ev.estimate && ` · Est: ${ev.estimate}`}
                  {ev.actual && <span style={{ color: 'var(--gold)' }}> · Act: {ev.actual}</span>}
                </p>
              </div>
              <span className={`shrink-0 mt-0.5 impact-${ev.impact.toLowerCase()}`}>
                {ev.impact}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   Widget 3 — IPO Pipeline
───────────────────────────────────────────────────────────────── */
function IPORow({ ipo }: { ipo: IPOItem }) {
  const isUpcoming = ipo.status === 'upcoming';
  return (
    <div className="flex items-center justify-between py-1.5" style={{ borderBottom: '1px solid var(--border)' }}>
      <div className="min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="font-data text-[11px] font-bold" style={{ color: 'var(--gold)' }}>
            {ipo.symbol}
          </span>
          <span className="text-[11px] truncate" style={{ color: 'var(--text)', maxWidth: 110 }}>
            {ipo.company}
          </span>
        </div>
        <div className="font-data text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
          {ipo.date}
          {ipo.exchange && ` · ${ipo.exchange}`}
          {ipo.priceRange && ` · ${ipo.priceRange}`}
        </div>
      </div>
      <div className="text-right shrink-0">
        {ipo.marketCap && (
          <div className="font-data text-[11px]" style={{ color: 'var(--text-secondary)' }}>
            {ipo.marketCap}
          </div>
        )}
        {ipo.firstDayReturn !== undefined ? (
          <div
            className="font-data text-[10px] font-bold"
            style={{ color: ipo.firstDayReturn >= 0 ? 'var(--positive)' : 'var(--negative)' }}
          >
            {ipo.firstDayReturn >= 0 ? '+' : ''}{ipo.firstDayReturn.toFixed(1)}%
          </div>
        ) : isUpcoming ? (
          <div className="font-data text-[9px] px-1.5 py-0.5 rounded" style={{ background: 'var(--surface-3)', color: 'var(--text-muted)' }}>
            pending
          </div>
        ) : null}
      </div>
    </div>
  );
}

function IPOPipeline({ upcoming, recent, loading }: { upcoming: IPOItem[]; recent: IPOItem[]; loading: boolean }) {
  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="font-display font-bold text-sm" style={{ color: 'var(--text)' }}>
          IPO Pipeline
        </span>
        <span className="section-label">FMP Calendar</span>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => <div key={i} className="skeleton h-8 w-full rounded" />)}
        </div>
      ) : (
        <>
          {upcoming.length > 0 && (
            <div className="mb-3">
              <div className="font-data text-[9px] uppercase tracking-widest mb-1.5" style={{ color: 'var(--text-muted)' }}>
                Upcoming
              </div>
              {upcoming.map((ipo, i) => <IPORow key={i} ipo={ipo} />)}
            </div>
          )}
          {recent.length > 0 && (
            <div>
              <div className="font-data text-[9px] uppercase tracking-widest mb-1.5" style={{ color: 'var(--text-muted)' }}>
                Recent
              </div>
              {recent.map((ipo, i) => <IPORow key={i} ipo={ipo} />)}
            </div>
          )}
          {upcoming.length === 0 && recent.length === 0 && (
            <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
              No IPO data available. Add a valid FMP_API_KEY to enable.
            </p>
          )}
        </>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   Composite export
───────────────────────────────────────────────────────────────── */
interface Props {
  fearGreed: FearGreedData | null;
  fearGreedLoading: boolean;
  events: MacroEvent[];
  eventsLoading: boolean;
  ipoUpcoming: IPOItem[];
  ipoRecent: IPOItem[];
  ipoLoading: boolean;
}

export default function IntelligencePanel({
  fearGreed, fearGreedLoading,
  events, eventsLoading,
  ipoUpcoming, ipoRecent, ipoLoading,
}: Props) {
  return (
    <aside className="flex flex-col gap-4" style={{ height: '100%' }}>
      <FearGauge data={fearGreed} loading={fearGreedLoading} />
      <MacroCalendar events={events} loading={eventsLoading} />
      <IPOPipeline upcoming={ipoUpcoming} recent={ipoRecent} loading={ipoLoading} />
    </aside>
  );
}
