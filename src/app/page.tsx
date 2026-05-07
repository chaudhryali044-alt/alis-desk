'use client';

import { useEffect, useState, useCallback } from 'react';
import Header from '@/components/Header';
import TickerStrip from '@/components/TickerStrip';
import NewsFeed from '@/components/NewsFeed';
import MarketSidebar from '@/components/MarketSidebar';
import DailyBriefing from '@/components/DailyBriefing';
import ChatBox from '@/components/ChatBox';
import { NewsArticle, TickerItem } from '@/lib/types';

interface MarketData {
  indices: { symbol: string; name: string; price: number; change: number; changesPercentage: number; type: 'index' }[];
  commodities: { symbol: string; name: string; price: number; change: number; changesPercentage: number; type: 'commodity' }[];
  fx: { symbol: string; name: string; price: number; change: number; changesPercentage: number; type: 'fx' }[];
}

export default function Home() {
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [newsLoading, setNewsLoading] = useState(true);

  const [marketData, setMarketData] = useState<MarketData | null>(null);
  const [marketLoading, setMarketLoading] = useState(true);

  const [briefing, setBriefing] = useState<string | null>(null);
  const [briefingLoading, setBriefingLoading] = useState(false);
  const [showBriefing, setShowBriefing] = useState(false);

  const fetchNews = useCallback(async () => {
    try {
      const res = await fetch('/api/news');
      const data = await res.json();
      setArticles(data.articles || []);
    } catch {
      setArticles([]);
    } finally {
      setNewsLoading(false);
    }
  }, []);

  const fetchMarkets = useCallback(async () => {
    try {
      const res = await fetch('/api/market-data');
      const data = await res.json();
      setMarketData(data);
    } catch {
      setMarketData(null);
    } finally {
      setMarketLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNews();
    fetchMarkets();
    const newsTimer = setInterval(fetchNews, 5 * 60 * 1000);
    const marketTimer = setInterval(fetchMarkets, 60 * 1000);
    return () => {
      clearInterval(newsTimer);
      clearInterval(marketTimer);
    };
  }, [fetchNews, fetchMarkets]);

  const handleWhatsApp = async () => {
    const res = await fetch('/api/whatsapp-now', { method: 'POST' });
    const data = await res.json();
    if (!data.ok) throw new Error(data.error || 'Unknown error');
  };

  const handleBriefing = async () => {
    setShowBriefing(true);
    setBriefingLoading(true);
    setBriefing(null);
    try {
      const res = await fetch('/api/briefing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ articles, marketData }),
      });
      const data = await res.json();
      setBriefing(data.briefing || 'Unable to generate briefing.');
    } catch {
      setBriefing('Failed to generate briefing. Please check your Anthropic API key.');
    } finally {
      setBriefingLoading(false);
    }
  };

  const tickerItems: TickerItem[] = marketData
    ? [
        ...marketData.indices.map(q => ({ symbol: q.symbol, price: q.price, change: q.change, changesPercentage: q.changesPercentage })),
        ...marketData.commodities.map(q => ({ symbol: q.symbol, price: q.price, change: q.change, changesPercentage: q.changesPercentage })),
        ...marketData.fx.map(q => ({ symbol: q.symbol, price: q.price, change: q.change, changesPercentage: q.changesPercentage })),
      ]
    : [];

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--bg)' }}>
      <Header onBriefing={handleBriefing} briefingLoading={briefingLoading} onWhatsApp={handleWhatsApp} />
      <TickerStrip items={tickerItems} />

      <main className="flex-1 flex gap-4 p-4 max-w-screen-2xl mx-auto w-full">
        <div className="hidden lg:block">
          <MarketSidebar data={marketData} loading={marketLoading} />
        </div>

        <div className="flex-1 min-w-0">
          <NewsFeed articles={articles} loading={newsLoading} />
        </div>

        <div className="hidden xl:block w-64 shrink-0">
          <div className="card p-4 rounded-lg sticky top-4">
            <h3 className="text-xs font-semibold mb-3" style={{ color: 'var(--gold)' }}>
              About Ali&apos;s Desk
            </h3>
            <p className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
              Real-time financial intelligence aggregated from Reuters, CNBC, FT, The Economist, MarketWatch, and FN London.
            </p>
            <div className="mt-3 pt-3 border-t border-[var(--border)] space-y-2">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--positive)' }} />
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>News refreshes every 5 min</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--gold)' }} />
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Markets refresh every 60s</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#6495ED' }} />
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>AI powered by Claude</span>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-[var(--border)]">
              <p className="mono text-[10px] mb-2" style={{ color: 'var(--text-muted)' }}>Sources</p>
              {['Reuters', 'CNBC', 'MarketWatch', 'FT', 'The Economist', 'FN London'].map(source => (
                <div
                  key={source}
                  className="text-[10px] py-0.5 px-2 mb-1 rounded"
                  style={{ background: 'var(--surface-2)', color: 'var(--text-muted)' }}
                >
                  {source}
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>

      {showBriefing && (
        <DailyBriefing
          briefing={briefing}
          loading={briefingLoading}
          onClose={() => {
            setShowBriefing(false);
            setBriefing(null);
          }}
        />
      )}

      <ChatBox articles={articles} />
    </div>
  );
}
