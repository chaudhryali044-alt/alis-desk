'use client';

import { useEffect, useState, useCallback } from 'react';
import Navbar from '@/components/Navbar';
import EconomyPulse from '@/components/EconomyPulse';
import DealFlow from '@/components/DealFlow';
import TopStories from '@/components/TopStories';
import IntelligencePanel from '@/components/IntelligencePanel';
import MarketSnapshot from '@/components/MarketSnapshot';
import DailyBriefing from '@/components/DailyBriefing';
import ChatBox from '@/components/ChatBox';
import type {
  DealArticle, TopStory,
  MacroEvent, MarketVoice, SnapshotQuote,
  NewsArticle,
} from '@/lib/types';

interface EnrichedEvent extends MacroEvent {
  sourceLink?: string;
  analysis?: string;
}

export default function Home() {
  /* ── Deal Flow ────────────────────────────────────── */
  const [deals, setDeals]               = useState<DealArticle[]>([]);
  const [dealsLoading, setDealsLoading] = useState(true);

  /* ── Top Stories ──────────────────────────────────── */
  const [stories, setStories]           = useState<TopStory[]>([]);
  const [storiesLoading, setStoriesLoading] = useState(true);

  /* ── Macro Calendar ───────────────────────────────── */
  const [events, setEvents]             = useState<EnrichedEvent[]>([]);
  const [eventsLoading, setEventsLoading] = useState(true);

  /* ── Market Voices ────────────────────────────────── */
  const [voices, setVoices]             = useState<MarketVoice[]>([]);
  const [voicesLoading, setVoicesLoading] = useState(true);

  /* ── Market Snapshot ──────────────────────────────── */
  const [snapQuotes, setSnapQuotes]     = useState<SnapshotQuote[]>([]);
  const [snapLoading, setSnapLoading]   = useState(true);

  /* ── Daily Briefing modal ─────────────────────────── */
  const [briefing, setBriefing]         = useState<string | null>(null);
  const [briefingLoading, setBriefingLoading] = useState(false);
  const [showBriefing, setShowBriefing] = useState(false);

  /* ── Chat context ─────────────────────────────────── */
  const [allArticles, setAllArticles]   = useState<NewsArticle[]>([]);

  /* ── Fetchers ─────────────────────────────────────── */
  const fetchDeals = useCallback(async () => {
    try {
      const r = await fetch('/api/deals');
      const d = await r.json();
      setDeals(d.deals ?? []);
    } catch { /* silent */ } finally { setDealsLoading(false); }
  }, []);

  const fetchStories = useCallback(async () => {
    try {
      const r = await fetch('/api/top-stories');
      const d = await r.json();
      setStories(d.stories ?? []);
    } catch { /* silent */ } finally { setStoriesLoading(false); }
  }, []);

  const fetchCalendar = useCallback(async () => {
    try {
      const r = await fetch('/api/macro-calendar');
      const d = await r.json();
      setEvents(d.events ?? []);
    } catch { /* silent */ } finally { setEventsLoading(false); }
  }, []);

  const fetchVoices = useCallback(async () => {
    try {
      const r = await fetch('/api/market-voices');
      const d = await r.json();
      setVoices(d.voices ?? []);
    } catch { /* silent */ } finally { setVoicesLoading(false); }
  }, []);

  const fetchSnapshot = useCallback(async () => {
    try {
      const r = await fetch('/api/snapshot');
      const d = await r.json();
      setSnapQuotes(d.quotes ?? []);
    } catch { /* silent */ } finally { setSnapLoading(false); }
  }, []);

  const fetchAllNews = useCallback(async () => {
    try {
      const r = await fetch('/api/news');
      const d = await r.json();
      setAllArticles(d.articles ?? []);
    } catch { /* silent */ }
  }, []);

  useEffect(() => {
    Promise.all([
      fetchDeals(), fetchStories(), fetchCalendar(),
      fetchVoices(), fetchSnapshot(), fetchAllNews(),
    ]);

    const t1 = setInterval(fetchDeals,    10 * 60 * 1000);
    const t2 = setInterval(fetchStories,  30 * 60 * 1000);
    const t3 = setInterval(fetchSnapshot,       60 * 1000);
    const t4 = setInterval(fetchVoices,   30 * 60 * 1000);
    const t5 = setInterval(fetchAllNews,   5 * 60 * 1000);

    return () => {
      clearInterval(t1); clearInterval(t2); clearInterval(t3);
      clearInterval(t4); clearInterval(t5);
    };
  }, [fetchDeals, fetchStories, fetchCalendar, fetchVoices, fetchSnapshot, fetchAllNews]);

  /* ── Daily Briefing handler ───────────────────────── */
  const handleBriefing = async () => {
    setShowBriefing(true);
    setBriefingLoading(true);
    setBriefing(null);
    try {
      const r = await fetch('/api/briefing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ articles: allArticles, marketData: null }),
      });
      const d = await r.json();
      setBriefing(d.briefing ?? 'Unable to generate briefing.');
    } catch {
      setBriefing('Failed to generate briefing. Please check your API keys.');
    } finally {
      setBriefingLoading(false);
    }
  };

  /* ── WhatsApp handler ─────────────────────────────── */
  const handleWhatsApp = async () => {
    const r = await fetch('/api/whatsapp-now', { method: 'POST' });
    const d = await r.json();
    if (!d.ok) throw new Error(d.error ?? 'Unknown error');
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--bg)' }}>
      {/* ── Navbar ──────────────────────────────────── */}
      <Navbar
        onBriefing={handleBriefing}
        briefingLoading={briefingLoading}
        onWhatsApp={handleWhatsApp}
      />

      {/* ── Economy Pulse (self-fetching, auto-refreshes every 60s) */}
      <EconomyPulse />

      {/* ── Three-column body ───────────────────────── */}
      <div
        className="flex-1 grid px-4 py-4 gap-4"
        style={{
          gridTemplateColumns: '1fr 1.3fr 1fr',
          alignItems: 'start',
          maxWidth: 1600,
          margin: '0 auto',
          width: '100%',
        }}
      >
        {/* Left — Deal Flow */}
        <div style={{ height: 'calc(100vh - 240px)', minHeight: 600 }}>
          <DealFlow deals={deals} loading={dealsLoading} />
        </div>

        {/* Centre — Top Stories */}
        <div style={{ height: 'calc(100vh - 240px)', minHeight: 600 }}>
          <TopStories stories={stories} loading={storiesLoading} />
        </div>

        {/* Right — Intelligence Panel */}
        <div>
          <IntelligencePanel
            events={events}
            eventsLoading={eventsLoading}
            voices={voices}
            voicesLoading={voicesLoading}
          />
        </div>
      </div>

      {/* ── Market Snapshot ─────────────────────────── */}
      <MarketSnapshot quotes={snapQuotes} loading={snapLoading} />

      {/* ── Modals / Overlays ───────────────────────── */}
      {showBriefing && (
        <DailyBriefing
          briefing={briefing}
          loading={briefingLoading}
          onClose={() => { setShowBriefing(false); setBriefing(null); }}
        />
      )}

      <ChatBox articles={allArticles} />
    </div>
  );
}
