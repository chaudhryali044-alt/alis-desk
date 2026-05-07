'use client';

import { useState } from 'react';
import { NewsArticle } from '@/lib/types';

const SOURCE_COLOURS: Record<string, string> = {
  Reuters: '#ff6600',
  Bloomberg: '#6495ED',
  CNBC: '#003366',
  WSJ: '#000000',
  FT: '#FFC0CB',
  'The Economist': '#ff0000',
  'FN London': '#1a1a2e',
  MarketWatch: '#2ecc71',
};

interface NewsCardProps {
  article: NewsArticle;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function NewsCard({ article }: NewsCardProps) {
  const [summary, setSummary] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const sourceColor = SOURCE_COLOURS[article.source] || 'var(--gold)';

  const handleSummarise = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (summary) {
      setExpanded(!expanded);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/summarise', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: article.title,
          description: article.description,
          link: article.link,
          source: article.source,
        }),
      });
      const data = await res.json();
      setSummary(data.summary || 'Unable to summarise.');
      setExpanded(true);
    } catch {
      setSummary('Failed to summarise. Please check your API key.');
      setExpanded(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <article className="card card-hover p-4 flex flex-col gap-3 animate-fade-in">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span
              className="mono text-[10px] font-bold px-2 py-0.5 rounded-sm text-white"
              style={{ background: sourceColor }}
            >
              {article.source}
            </span>
            <span className="mono text-[10px]" style={{ color: 'var(--text-muted)' }}>
              {timeAgo(article.pubDate)}
            </span>
          </div>

          <a
            href={article.link}
            target="_blank"
            rel="noopener noreferrer"
            className="block text-sm font-semibold leading-snug hover:underline"
            style={{ color: 'var(--text)' }}
          >
            {article.title}
          </a>

          {article.description && (
            <p className="text-xs mt-1.5 line-clamp-2" style={{ color: 'var(--text-muted)' }}>
              {article.description}
            </p>
          )}
        </div>
      </div>

      {expanded && summary && (
        <div
          className="text-xs rounded-lg p-3 animate-fade-in"
          style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}
        >
          <div className="flex items-center gap-1.5 mb-2">
            <span style={{ color: 'var(--gold)' }}>✦</span>
            <span className="mono text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--gold)' }}>
              AI Summary
            </span>
          </div>
          <div className="space-y-1.5" style={{ color: 'var(--text)' }}>
            {summary.split('\n').filter(Boolean).map((line, i) => (
              <p key={i} className="leading-relaxed">{line}</p>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center gap-2 pt-1">
        <button onClick={handleSummarise} disabled={loading} className="btn-ghost text-xs flex items-center gap-1.5">
          {loading ? (
            <>
              <span className="animate-spin inline-block w-3 h-3 border border-current border-t-transparent rounded-full" />
              Analysing…
            </>
          ) : summary && expanded ? (
            '▲ Hide'
          ) : summary ? (
            '▼ Show summary'
          ) : (
            <>✦ AI Summarise</>
          )}
        </button>
        <a
          href={article.link}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-ghost text-xs"
        >
          Read →
        </a>
      </div>
    </article>
  );
}
