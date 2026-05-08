'use client';

import type { TopStory, RelevanceTag } from '@/lib/types';

const SOURCE_COLORS: Record<string, { bg: string; text: string }> = {
  Reuters:        { bg: '#ff6600',  text: '#fff'     },
  CNBC:           { bg: '#003366',  text: '#fff'     },
  'FT':           { bg: '#FFF1E5',  text: '#a0522d'  },
  'The Economist':{ bg: '#cc0000',  text: '#fff'     },
  'FN London':    { bg: '#0a1628',  text: '#c9a84c'  },
  MarketWatch:    { bg: '#1a3a2a',  text: '#2ecc71'  },
  Bloomberg:      { bg: '#1a1a2e',  text: '#6495ed'  },
  WSJ:            { bg: '#1d2d50',  text: '#fff'     },
};

function TagBadge({ tag }: { tag: RelevanceTag }) {
  const map: Record<RelevanceTag, string> = {
    Markets:     'tag-markets',
    Macro:       'tag-macro',
    Earnings:    'tag-earnings',
    Geopolitical:'tag-geopolitical',
    Deals:       'tag-deals',
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
  const colors = SOURCE_COLORS[story.source] ?? { bg: 'var(--surface-3)', text: 'var(--gold)' };
  return (
    <article
      className="flex gap-4 px-5 py-4 animate-fade-up"
      style={{ borderBottom: '1px solid var(--border)' }}
    >
      {/* Rank */}
      <div
        className="font-data text-2xl font-bold shrink-0 leading-none mt-0.5"
        style={{ color: 'var(--border-2)', width: 24, textAlign: 'right' }}
      >
        {rank}
      </div>

      <div className="flex-1 min-w-0">
        {/* Source + time */}
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          <span
            className="source-badge"
            style={{ background: colors.bg, color: colors.text }}
          >
            {story.source}
          </span>
          <span className="font-data text-[10px]" style={{ color: 'var(--text-muted)' }}>
            {timeAgo(story.pubDate)}
          </span>
          <TagBadge tag={story.tag} />
        </div>

        {/* Headline */}
        <a
          href={story.link}
          target="_blank"
          rel="noopener noreferrer"
          className="font-display font-semibold text-sm leading-snug block mb-2 transition-colors hover:text-gold"
          style={{ color: 'var(--text)' }}
        >
          {story.title}
        </a>

        {/* AI summary */}
        <p className="text-[12px] leading-relaxed mb-2" style={{ color: 'var(--text-secondary)' }}>
          {story.summary}
        </p>

        <a
          href={story.link}
          target="_blank"
          rel="noopener noreferrer"
          className="font-data text-[10px] transition-colors"
          style={{ color: 'var(--gold-dim)' }}
          onMouseEnter={e => (e.currentTarget.style.color = 'var(--gold)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'var(--gold-dim)')}
        >
          Read full story →
        </a>
      </div>
    </article>
  );
}

function Skeleton({ rank }: { rank: number }) {
  return (
    <div className="flex gap-4 px-5 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
      <span className="font-data text-2xl font-bold shrink-0" style={{ color: 'var(--border-2)', width: 24, textAlign: 'right' }}>
        {rank}
      </span>
      <div className="flex-1 space-y-2">
        <div className="flex gap-2">
          <div className="skeleton h-4 w-16" />
          <div className="skeleton h-4 w-10" />
          <div className="skeleton h-4 w-14" />
        </div>
        <div className="skeleton h-3.5 w-full" />
        <div className="skeleton h-3.5 w-4/5" />
        <div className="skeleton h-3 w-full" />
        <div className="skeleton h-3 w-3/4" />
      </div>
    </div>
  );
}

interface Props { stories: TopStory[]; loading: boolean; }

export default function TopStories({ stories, loading }: Props) {
  return (
    <section
      className="card flex flex-col"
      style={{ height: '100%', overflow: 'hidden' }}
    >
      <header
        className="flex items-center justify-between px-5 py-3 shrink-0"
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        <span className="font-display font-bold text-base" style={{ color: 'var(--text)' }}>
          Today&apos;s Briefing
        </span>
        <div className="flex items-center gap-2">
          <span className="section-label">AI-ranked</span>
          <span
            className="font-data text-[9px] px-1.5 py-0.5 rounded"
            style={{ background: 'var(--surface-2)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}
          >
            top 5
          </span>
        </div>
      </header>

      <div className="flex-1 overflow-hidden">
        {loading
          ? [...Array(5)].map((_, i) => <Skeleton key={i} rank={i + 1} />)
          : stories.length === 0
          ? (
            <div className="flex flex-col items-center justify-center h-full py-16" style={{ color: 'var(--text-muted)' }}>
              <span className="text-3xl mb-3">📰</span>
              <p className="text-sm">Stories loading…</p>
            </div>
          )
          : stories.map((s, i) => <StoryCard key={i} story={s} rank={i + 1} />)
        }
      </div>
    </section>
  );
}
