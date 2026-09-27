'use client';

import { useState } from 'react';
import { MagnifyingGlass } from '@phosphor-icons/react';
import type { TopStory, RelevanceTag } from '@/lib/types';

function readingTime(text: string): string {
  const words = text.trim().split(/\s+/).length;
  const mins = Math.max(1, Math.round(words / 200));
  return `${mins} min read`;
}

function sentimentScore(title: string, summary: string): number {
  const text = (title + ' ' + summary).toLowerCase();
  const pos = (text.match(/\b(surge|rally|gain|rise|soar|beat|exceed|record|strong|growth|profit|bull|optimis|positiv|up|high|boost|outperform)\b/g) || []).length;
  const neg = (text.match(/\b(fall|drop|decline|slump|miss|below|weak|loss|bear|pessimis|negativ|down|low|cut|underperform|crisis|crash|concern|risk|warn)\b/g) || []).length;
  const total = pos + neg;
  if (total === 0) return 0;
  return Math.max(-1, Math.min(1, (pos - neg) / total));
}

const SOURCE_COLORS: Record<string, { bg: string; text: string }> = {
  Reuters:         { bg: '#cc5200',  text: '#fff'    },
  CNBC:            { bg: '#003366',  text: '#fff'    },
  'FT':            { bg: '#FFF1E5',  text: '#a0522d' },
  'The Economist': { bg: '#cc0000',  text: '#fff'    },
  'FN London':     { bg: '#0a1628',  text: '#c9a84c' },
  MarketWatch:     { bg: '#1a3a2a',  text: '#2ecc71' },
  Bloomberg:       { bg: '#1a1a2e',  text: '#6495ed' },
  WSJ:             { bg: '#1d2d50',  text: '#fff'    },
};

function TagBadge({ tag }: { tag: RelevanceTag }) {
  const map: Record<RelevanceTag, string> = {
    Markets:      'tag-markets',
    Macro:        'tag-macro',
    Earnings:     'tag-earnings',
    Geopolitical: 'tag-geopolitical',
    Deals:        'tag-deals',
  };
  return <span className={`tag ${map[tag]}`}>{tag}</span>;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function StoryCard({ story, rank }: { story: TopStory; rank: number }) {
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  const rtLabel = readingTime(story.summary);
  const score   = sentimentScore(story.title, story.summary);

  const handleSummarise = async () => {
    if (aiSummary || aiLoading) return;
    setAiLoading(true);
    try {
      const r = await fetch('/api/summarise', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: story.title, description: story.summary }),
      });
      const d = await r.json();
      setAiSummary(d.summary ?? '');
    } catch {
      setAiSummary('Unable to generate analysis.');
    } finally {
      setAiLoading(false);
    }
  };

  const colors = SOURCE_COLORS[story.source] ?? { bg: 'var(--surface-3)', text: 'var(--gold)' };

  return (
    <article
      className="animate-fade-up"
      style={{ display: 'flex', gap: 14, padding: '16px 20px', borderBottom: '1px solid var(--border)' }}
    >
      {/* Large rank number — design element */}
      <div
        className="font-display font-bold shrink-0"
        style={{
          fontSize: 32, lineHeight: 1, marginTop: 2,
          backgroundImage: 'linear-gradient(to bottom, var(--gold) 0%, transparent 140%)',
          backgroundClip: 'text',
          WebkitBackgroundClip: 'text',
          color: 'transparent',
          WebkitTextFillColor: 'transparent',
          width: 28, textAlign: 'right' as const,
          opacity: 0.9,
        }}
      >
        {rank}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 7, flexWrap: 'wrap' }}>
          <span className="source-badge" style={{ background: colors.bg, color: colors.text }}>
            {story.source}
          </span>
          <span className="font-data" style={{ fontSize: 9, color: 'var(--text-muted)', letterSpacing: '0.06em' }}>
            {timeAgo(story.pubDate)}
          </span>
          <span className="font-data" style={{ fontSize: 9, color: 'var(--text-muted)', letterSpacing: '0.06em' }}>
            {rtLabel}
          </span>
          <TagBadge tag={story.tag} />
        </div>

        <a
          href={story.link}
          target="_blank"
          rel="noopener noreferrer"
          className="font-display"
          style={{
            fontSize: 15, fontWeight: 600, lineHeight: 1.38,
            display: 'block', marginBottom: 7,
            color: 'var(--text)', textDecoration: 'none',
            transition: 'color 0.2s',
          }}
          onMouseEnter={e => (e.currentTarget.style.color = 'var(--gold)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'var(--text)')}
        >
          {story.title}
        </a>

        <p className="editorial-prose" style={{ fontSize: 12.5, marginBottom: 8 }}>
          {story.summary}
        </p>

        {/* Sentiment bar */}
        <div style={{ marginBottom: 8, marginTop: -4 }}>
          <div style={{
            width: '100%', height: 2, background: 'var(--border)',
            borderRadius: 1, overflow: 'hidden',
          }}>
            <div style={{
              height: '100%',
              width: `${Math.abs(score) * 100}%`,
              background: score > 0.1 ? 'var(--positive)' : score < -0.1 ? 'var(--negative)' : 'var(--text-muted)',
              marginLeft: score >= 0 ? '50%' : `${50 - Math.abs(score) * 50}%`,
              borderRadius: 1,
              transition: 'width 0.4s ease',
            }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 2 }}>
            <span className="font-data" style={{ fontSize: 7.5, color: 'var(--negative)', letterSpacing: '0.08em' }}>BEARISH</span>
            <span className="font-data" style={{ fontSize: 7.5, color: 'var(--positive)', letterSpacing: '0.08em' }}>BULLISH</span>
          </div>
        </div>

        {aiSummary && (
          <div
            className="animate-fade-up"
            style={{
              fontSize: 11, lineHeight: 1.65,
              padding: '10px 12px', borderRadius: 3,
              background: 'var(--surface-2)',
              borderLeft: '2px solid var(--gold)',
              color: 'var(--text-secondary)',
              marginBottom: 8,
            }}
          >
            <span className="editorial-heading" style={{ display: 'block', marginBottom: 4 }}>
              AI Analysis
            </span>
            {aiSummary}
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <a
            href={story.link}
            target="_blank"
            rel="noopener noreferrer"
            className="font-data small-caps"
            style={{
              fontSize: 9, color: 'var(--gold-dim)',
              textDecoration: 'none', letterSpacing: '0.12em',
              transition: 'color 0.15s',
            }}
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--gold)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--gold-dim)')}
          >
            Read Full Story →
          </a>
          {!aiSummary && (
            <button
              onClick={handleSummarise}
              disabled={aiLoading}
              className="font-data"
              style={{
                fontSize: 9, letterSpacing: '0.08em',
                color: 'var(--text-muted)', background: 'none',
                border: 'none', cursor: 'pointer', padding: 0,
                textTransform: 'uppercase',
                transition: 'color 0.15s',
              }}
              onMouseEnter={e => !aiLoading && ((e.currentTarget as HTMLElement).style.color = 'var(--gold)')}
              onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = 'var(--text-muted)')}
            >
              {aiLoading ? 'Analysing…' : '✦ AI Analysis'}
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

function Skeleton({ rank }: { rank: number }) {
  return (
    <div style={{ display: 'flex', gap: 14, padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
      <span className="font-display font-bold shrink-0" style={{ fontSize: 32, lineHeight: 1, color: 'var(--border-2)', width: 28, textAlign: 'right' }}>
        {rank}
      </span>
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', gap: 7, marginBottom: 8 }}>
          <div className="skeleton" style={{ height: 15, width: 56, borderRadius: 999 }} />
          <div className="skeleton" style={{ height: 15, width: 36 }} />
          <div className="skeleton" style={{ height: 15, width: 50, borderRadius: 3 }} />
        </div>
        <div className="skeleton" style={{ height: 14, width: '100%', marginBottom: 5 }} />
        <div className="skeleton" style={{ height: 14, width: '80%', marginBottom: 10 }} />
        <div className="skeleton" style={{ height: 11, width: '100%', marginBottom: 4 }} />
        <div className="skeleton" style={{ height: 11, width: '70%' }} />
      </div>
    </div>
  );
}

interface Props { stories: TopStory[]; loading: boolean; }

export default function TopStories({ stories, loading }: Props) {
  return (
    <section className="card" style={{ height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <header className="section-header shrink-0" style={{ padding: '14px 20px 10px' }}>
        <span className="font-display font-bold" style={{ fontSize: 16, color: 'var(--text)', letterSpacing: '-0.01em' }}>
          Today&apos;s Briefing
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <span className="section-label">AI-Ranked</span>
          <span
            className="font-data"
            style={{
              fontSize: 9, padding: '1px 6px', borderRadius: 2,
              background: 'var(--surface-2)', color: 'var(--text-muted)',
              border: '1px solid var(--border-2)',
            }}
          >
            top 10
          </span>
        </div>
      </header>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        {loading
          ? [...Array(5)].map((_, i) => <Skeleton key={i} rank={i + 1} />)
          : stories.length === 0
          ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', padding: '64px 24px', color: 'var(--text-muted)' }}>
              <MagnifyingGlass size={28} weight="thin" style={{ marginBottom: 12, color: 'var(--text-muted)', opacity: 0.5 }} />
              <p className="font-body" style={{ fontSize: 13 }}>No stories available</p>
              <p className="font-data" style={{ fontSize: 9, marginTop: 4, letterSpacing: '0.10em', textTransform: 'uppercase' }}>RSS feeds may be temporarily unavailable</p>
            </div>
          )
          : stories.map((s, i) => <StoryCard key={i} story={s} rank={i + 1} />)
        }
      </div>
    </section>
  );
}
