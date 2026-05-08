'use client';

import { useState } from 'react';
import type { DealArticle } from '@/lib/types';

const SOURCE_COLORS: Record<string, { bg: string; text: string }> = {
  Reuters:       { bg: '#cc5200', text: '#fff' },
  WSJ:           { bg: '#1d2d50', text: '#fff' },
  'FN London':   { bg: '#0a1628', text: '#c9a84c' },
  Bloomberg:     { bg: '#1a1a2e', text: '#6495ed' },
  Axios:         { bg: '#cc3333', text: '#fff' },
  GlobalCapital: { bg: '#004080', text: '#fff' },
  PEI:           { bg: '#2d1b4e', text: '#9b59b6' },
  AltAssets:     { bg: '#1a3a1a', text: '#2ecc71' },
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
  const [open,    setOpen]    = useState(false);
  const [hovered, setHovered] = useState(false);

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
      className="animate-fade-up"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        padding: '14px 16px 12px',
        borderBottom: '1px solid var(--border)',
        borderLeft: `2px solid ${hovered ? 'var(--gold)' : 'transparent'}`,
        transition: 'border-color 0.2s ease, background-color 0.2s ease',
        background: hovered ? 'var(--surface-2)' : 'transparent',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
        <span className="source-badge" style={{ background: colors.bg, color: colors.text }}>
          {deal.source}
        </span>
        <span className="font-data" style={{ fontSize: 9, color: 'var(--text-muted)', letterSpacing: '0.06em' }}>
          {timeAgo(deal.pubDate)}
        </span>
      </div>

      <a
        href={deal.link}
        target="_blank"
        rel="noopener noreferrer"
        className="font-display"
        style={{
          fontSize: 14, fontWeight: 600, lineHeight: 1.4,
          display: 'block', marginBottom: 8,
          color: hovered ? 'var(--gold)' : 'var(--text)',
          textDecoration: 'none',
          transition: 'color 0.2s',
        }}
      >
        {deal.title}
      </a>

      {open && summary && (
        <div
          className="animate-fade-up"
          style={{
            fontSize: 11, lineHeight: 1.6,
            padding: '10px 12px', borderRadius: 3,
            background: 'var(--surface-2)',
            borderLeft: '2px solid var(--gold-dim)',
            color: 'var(--text-secondary)',
            marginBottom: 8,
          }}
        >
          {summary.split('\n').filter(Boolean).map((line, i) => <p key={i}>{line}</p>)}
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
        <button onClick={handleSummarise} disabled={loading} className="btn-ghost" style={{ fontSize: 9, padding: '3px 8px' }}>
          {loading ? '…' : summary && open ? 'Hide' : summary ? 'AI Summary' : '✦ Summarise'}
        </button>
        <a href={deal.link} target="_blank" rel="noopener noreferrer" className="btn-ghost" style={{ fontSize: 9, padding: '3px 8px' }}>
          Read →
        </a>
      </div>
    </article>
  );
}

function Skeleton() {
  return (
    <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
      <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
        <div className="skeleton" style={{ height: 16, width: 56, borderRadius: 999 }} />
        <div className="skeleton" style={{ height: 16, width: 36 }} />
      </div>
      <div className="skeleton" style={{ height: 13, width: '100%', marginBottom: 6 }} />
      <div className="skeleton" style={{ height: 13, width: '75%' }} />
    </div>
  );
}

interface Props { deals: DealArticle[]; loading: boolean; }

export default function DealFlow({ deals, loading }: Props) {
  return (
    <section className="card" style={{ height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <header
        className="section-header shrink-0"
        style={{ padding: '14px 16px 10px' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className="font-display font-bold" style={{ fontSize: 16, color: 'var(--text)', letterSpacing: '-0.01em' }}>
            Deal Flow
          </span>
          {!loading && (
            <span
              className="font-data"
              style={{
                fontSize: 9, padding: '1px 6px', borderRadius: 2,
                background: 'var(--surface-2)', color: 'var(--text-muted)',
                border: '1px solid var(--border-2)',
              }}
            >
              {deals.length}
            </span>
          )}
        </div>
        <span className="section-label">M&amp;A · PE · IPO</span>
      </header>

      <div className="col-scroll flex-1">
        {loading
          ? [...Array(6)].map((_, i) => <Skeleton key={i} />)
          : deals.length === 0
          ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '64px 24px', color: 'var(--text-muted)' }}>
              <span style={{ fontSize: 28, marginBottom: 12 }}>📋</span>
              <p className="font-body" style={{ fontSize: 13 }}>No deals in the feeds right now</p>
              <p className="font-data" style={{ fontSize: 10, marginTop: 4, letterSpacing: '0.06em' }}>REFRESHES EVERY 10 MIN</p>
            </div>
          )
          : deals.map(deal => <DealCard key={deal.id} deal={deal} />)
        }
      </div>
    </section>
  );
}
