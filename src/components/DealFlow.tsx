'use client';

import { useState } from 'react';
import { ClipboardText } from '@phosphor-icons/react';
import type { DealArticle } from '@/lib/types';

type DealType = 'MA' | 'PE' | 'IPO' | 'Debt' | 'Other';

function detectDealType(title: string): DealType {
  const t = title.toLowerCase();
  if (/\bipo\b|initial public offering|goes public|listing/.test(t)) return 'IPO';
  if (/\bpe\b|private equity|buyout|acquisition|acquire|merger|merges with|takeover/.test(t)) return 'MA';
  if (/\bdebt\b|bond|credit|loan|refinanc|issu/.test(t)) return 'Debt';
  if (/fund|raise|raises|backed|invest/.test(t)) return 'PE';
  return 'Other';
}

const DEAL_TYPE_STYLES: Record<DealType, { border: string; label: string; labelColor: string; labelBg: string }> = {
  MA:    { border: 'var(--gold)',     label: 'M&A',   labelColor: '#0a0700',   labelBg: 'var(--gold)' },
  PE:    { border: '#9B59B6',         label: 'PE',    labelColor: '#fff',      labelBg: '#5a2d82' },
  IPO:   { border: '#3B9EFF',         label: 'IPO',   labelColor: '#fff',      labelBg: '#1a5fa8' },
  Debt:  { border: '#2ECC71',         label: 'Debt',  labelColor: '#0a1a10',   labelBg: '#1a6b3a' },
  Other: { border: 'var(--border-2)', label: '',      labelColor: '',          labelBg: '' },
};

function extractDealSize(title: string): string | null {
  const m = title.match(/\$[\d,.]+\s*(?:billion|million|bn|mn|[bm])\b/i)
    || title.match(/\$[\d,.]+[bm]\b/i);
  if (!m) return null;
  return m[0].replace(/billion/i, 'B').replace(/million/i, 'M').replace(/\s+/g, '');
}

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

  const colors   = SOURCE_COLORS[deal.source] ?? { bg: 'var(--surface-3)', text: 'var(--gold)' };
  const dealType = detectDealType(deal.title);
  const dealSize = extractDealSize(deal.title);

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
        borderLeft: `2px solid ${hovered ? DEAL_TYPE_STYLES[dealType].border : 'rgba(255,255,255,0.04)'}`,
        transition: 'border-color 0.2s ease, background-color 0.2s ease',
        background: hovered ? 'linear-gradient(to right, var(--surface-2) 0%, var(--surface) 100%)' : 'transparent',
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

      {(DEAL_TYPE_STYLES[dealType].label || dealSize) && (
        <div style={{ display: 'flex', gap: 5, alignItems: 'center', marginBottom: 6 }}>
          {DEAL_TYPE_STYLES[dealType].label && (
            <span style={{
              fontFamily: 'var(--font-mono), monospace',
              fontSize: 8, fontWeight: 700, letterSpacing: '0.10em',
              padding: '1px 5px', borderRadius: 2,
              background: DEAL_TYPE_STYLES[dealType].labelBg,
              color: DEAL_TYPE_STYLES[dealType].labelColor,
            }}>
              {DEAL_TYPE_STYLES[dealType].label}
            </span>
          )}
          {dealSize && (
            <span style={{
              fontFamily: 'var(--font-mono), monospace',
              fontSize: 8, fontWeight: 700, letterSpacing: '0.08em',
              padding: '1px 5px', borderRadius: 2,
              background: 'var(--surface-2)',
              color: 'var(--gold)',
              border: '1px solid var(--gold-dim)',
            }}>
              {dealSize}
            </span>
          )}
        </div>
      )}

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
              <ClipboardText size={28} weight="thin" style={{ marginBottom: 12, color: 'var(--text-muted)', opacity: 0.5 }} />
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
