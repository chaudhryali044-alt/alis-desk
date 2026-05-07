'use client';

import { useState } from 'react';
import { NewsArticle, NewsCategory } from '@/lib/types';
import NewsCard from './NewsCard';

const TABS: NewsCategory[] = ['Markets', 'Macro', 'M&A & Deals', 'Earnings'];

interface NewsFeedProps {
  articles: NewsArticle[];
  loading: boolean;
}

function SkeletonCard() {
  return (
    <div className="card p-4 space-y-3">
      <div className="flex gap-2">
        <div className="h-4 w-16 rounded animate-pulse" style={{ background: 'var(--border)' }} />
        <div className="h-4 w-12 rounded animate-pulse" style={{ background: 'var(--border)' }} />
      </div>
      <div className="space-y-2">
        <div className="h-3 w-full rounded animate-pulse" style={{ background: 'var(--border)' }} />
        <div className="h-3 w-4/5 rounded animate-pulse" style={{ background: 'var(--border)' }} />
        <div className="h-3 w-3/5 rounded animate-pulse" style={{ background: 'var(--border)' }} />
      </div>
      <div className="h-3 w-2/3 rounded animate-pulse" style={{ background: 'var(--border)' }} />
    </div>
  );
}

export default function NewsFeed({ articles, loading }: NewsFeedProps) {
  const [activeTab, setActiveTab] = useState<NewsCategory>('Markets');

  const filtered = articles.filter(a => a.category === activeTab);
  const counts = Object.fromEntries(
    TABS.map(tab => [tab, articles.filter(a => a.category === tab).length])
  );

  return (
    <div className="flex-1 min-w-0">
      <div
        className="flex gap-1 mb-4 p-1 rounded-lg"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
      >
        {TABS.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-md text-xs font-medium transition-all"
            style={{
              background: activeTab === tab ? 'var(--gold)' : 'transparent',
              color: activeTab === tab ? '#0a0b0d' : 'var(--text-muted)',
            }}
          >
            {tab}
            {counts[tab] > 0 && (
              <span
                className="text-[10px] mono rounded px-1"
                style={{
                  background: activeTab === tab ? 'rgba(0,0,0,0.2)' : 'var(--surface-2)',
                  color: activeTab === tab ? '#0a0b0d' : 'var(--text-muted)',
                }}
              >
                {counts[tab]}
              </span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid gap-3">
          {[...Array(6)].map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : filtered.length === 0 ? (
        <div
          className="card p-12 text-center"
          style={{ color: 'var(--text-muted)' }}
        >
          <p className="text-2xl mb-2">📰</p>
          <p className="text-sm font-medium">No {activeTab} stories found</p>
          <p className="text-xs mt-1">Check back shortly — feeds refresh every 5 minutes</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {filtered.map(article => (
            <NewsCard key={article.id} article={article} />
          ))}
        </div>
      )}
    </div>
  );
}
