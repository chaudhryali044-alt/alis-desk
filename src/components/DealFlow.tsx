'use client';

import { useState } from 'react';
import type { DealArticle } from '@/lib/types';

const SOURCE_COLORS: Record<string, { bg: string; text: string }> = {
  Reuters:     { bg: '#ff6600', text: '#fff' },
  WSJ:         { bg: '#1d2d50', text: '#fff' },
  'FN London': { bg: '#0a1628', text: '#c9a84c' },
  Bloomberg:   { bg: '#1a1a2e', text: '#6495ed' },
  Axios:       { bg: '#ff4444', text: '#fff' },
  GlobalCapital: { bg: '#004080', text: '#fff' },
  PEI:         { bg: '#2d1b4e', text: '#9b59b6' },
  AltAssets:   { bg: '#1a3a1a', text: '#2ecc71' },
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function DealCard({ deal }: { deal: DealArticle }) {
  const [summary, setSummary] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  const colors = SOURCE_COLORS[deal.source] ?? { bg: 'var(--surface-3)', text: 'var(--gold)' };

  const handleSummarise = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (summary) { setOpen(o => !o); return; }
    setLoading(true);
    try {
      const res = await fetch('/api/summarise', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: deal.title, description: deal.description, link: deal.link, source: deal.source }),
      });
      const data = await res.json();
      setSummary(data.summary ?? 'No summary available.');
      setOpen(true);
    } catch {
      setSummary('Failed to summarise.');
      setOpen(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <article
      className="card-hover px-4 py-3 animate-fade-up"
      style={{ borderBottom: '1px solid var(--border)' }}
    >
      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
        <span
          className="source-badge"
          style={{ background: colors.bg, color: colors.text }}
        >
          {deal.source}
        </span>
        <span className="font-data text-[10px]" style={{ color: 'var(--text-muted)' }}>
          {timeAgo(deal.pubDate)}
        </span>
      </div>

      <a
        href={deal.link}
        target="_blank"
        rel="noopener noreferrer"
        className="font-display text-[13px] font-semibold leading-snug block hover:text-gold transition-colors"
        style={{ color: 'var(--text)' }}
      >
        {deal.title}
      </a>

      {open && summary && (
        <div
          className="mt-2 text-[11px] leading-relaxed px-3 py-2 rounded animate-fade-up"
          style={{ background: 'var(--surface-2)', borderLeft: '2px solid var(--gold-dim)', color: 'var(--text-secondary)' }}
        >
          {summary.split('\n').filter(Boolean).map((line, i) => <p key={i}>{line}</p>)}
        </div>
      )}

      <div className="flex items-center gap-2 mt-2">
        <button onClick={handleSummarise} disabled={loading} className="btn-ghost text-[10px] py-1 px-2">
          {loading ? '…' : summary && open ? '▲ Hide' : summary ? '▼ AI Summary' : '✦ Summarise'}
        </button>
        <a href={deal.link} target="_blank" rel="noopener noreferrer" className="btn-ghost text-[10px] py-1 px-2">
          Read →
        </a>
      </div>
    </article>
  );
}

function Skeleton() {
  return (
    <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
      <div className="flex gap-2 mb-2">
        <div className="skeleton h-4 w-16" />
        <div className="skeleton h-4 w-10" />
      </div>
      <div className="skeleton h-3 w-full mb-1" />
      <div className="skeleton h-3 w-3/4" />
    </div>
  );
}

interface Props { deals: DealArticle[]; loading: boolean; }

export default function DealFlow({ deals, loading }: Props) {
  return (
    <section
      className="card flex flex-col"
      style={{ height: '100%', overflow: 'hidden' }}
    >
      <header
        className="flex items-center justify-between px-4 py-3 shrink-0"
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        <div className="flex items-center gap-2">
          <span className="font-display font-bold text-base" style={{ color: 'var(--text)' }}>Deal Flow</span>
          {!loading && (
            <span
              className="font-data text-[9px] px-1.5 py-0.5 rounded"
              style={{ background: 'var(--surface-2)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}
            >
              {deals.length}
            </span>
          )}
        </div>
        <span className="section-label">M&A · PE · IPO</span>
      </header>

      <div className="col-scroll flex-1">
        {loading
          ? [...Array(6)].map((_, i) => <Skeleton key={i} />)
          : deals.length === 0
          ? (
            <div className="flex flex-col items-center justify-center py-16 px-6" style={{ color: 'var(--text-muted)' }}>
              <span className="text-3xl mb-3">📋</span>
              <p className="text-sm">No deals in the feeds right now</p>
              <p className="text-xs mt-1">Refreshes every 10 minutes</p>
            </div>
          )
          : deals.map(deal => <DealCard key={deal.id} deal={deal} />)
        }
      </div>
    </section>
  );
}
