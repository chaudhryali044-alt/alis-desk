'use client';

import { useState } from 'react';
import type { MacroEvent, MarketVoice } from '@/lib/types';

/* ─────────────────────────────────────────────────────────────────
   Widget 1 — Macro Calendar
───────────────────────────────────────────────────────────────── */
interface EnrichedEvent extends MacroEvent {
  sourceLink?: string;
  analysis?: string;
}

function ImpactDot({ impact }: { impact: 'High' | 'Medium' | 'Low' }) {
  const map = { High: '#e74c3c', Medium: '#f39c12', Low: '#2ecc71' };
  return (
    <span
      style={{
        display: 'inline-block',
        width: 8, height: 8,
        borderRadius: '50%',
        background: map[impact],
        flexShrink: 0,
        marginTop: 4,
      }}
      title={impact}
    />
  );
}

function MacroCalendar({ events, loading }: { events: EnrichedEvent[]; loading: boolean }) {
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
        <div className="space-y-0">
          {events.map((ev, i) => (
            <div key={i} className="py-2" style={{ borderBottom: '1px solid var(--border)' }}>
              <div className="flex items-start gap-2">
                <ImpactDot impact={ev.impact} />
                <span className="text-base leading-none shrink-0">{ev.flagEmoji}</span>
                <div className="flex-1 min-w-0">
                  {ev.sourceLink ? (
                    <a
                      href={ev.sourceLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[12px] font-medium leading-tight block transition-colors"
                      style={{ color: 'var(--text)' }}
                      onMouseEnter={e => (e.currentTarget.style.color = 'var(--gold)')}
                      onMouseLeave={e => (e.currentTarget.style.color = 'var(--text)')}
                    >
                      {ev.event}
                    </a>
                  ) : (
                    <p className="text-[12px] font-medium leading-tight" style={{ color: 'var(--text)' }}>
                      {ev.event}
                    </p>
                  )}
                  <p className="font-data text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                    {ev.date}{ev.time && ` · ${ev.time}`}
                    {ev.estimate && ` · Est: ${ev.estimate}`}
                    {ev.actual && <span style={{ color: 'var(--gold)' }}> · Act: {ev.actual}</span>}
                  </p>
                  {ev.analysis && (
                    <p className="text-[11px] mt-1 leading-snug" style={{ color: 'var(--text-secondary)' }}>
                      {ev.analysis}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   Widget 2 — Market Voices
───────────────────────────────────────────────────────────────── */
function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function VoiceCard({ voice }: { voice: MarketVoice }) {
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [aiLoading, setAiLoading]   = useState(false);

  const handleAnalyse = async () => {
    if (aiAnalysis || aiLoading) return;
    setAiLoading(true);
    try {
      const r = await fetch('/api/summarise', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: voice.title, description: voice.excerpt }),
      });
      const d = await r.json();
      setAiAnalysis(d.summary ?? '');
    } catch {
      setAiAnalysis('Unable to generate analysis.');
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div className="py-2.5" style={{ borderBottom: '1px solid var(--border)' }}>
      <div className="flex items-center gap-1.5 mb-1 flex-wrap">
        <span className="font-data text-[10px] font-bold" style={{ color: 'var(--gold)' }}>
          {voice.author}
        </span>
        <span className="font-data text-[9px]" style={{ color: 'var(--text-muted)' }}>
          · {voice.platform} · {timeAgo(voice.pubDate)}
        </span>
      </div>

      <a
        href={voice.link}
        target="_blank"
        rel="noopener noreferrer"
        className="text-[12px] font-medium leading-snug block mb-1.5 transition-colors"
        style={{ color: 'var(--text)' }}
        onMouseEnter={e => (e.currentTarget.style.color = 'var(--gold)')}
        onMouseLeave={e => (e.currentTarget.style.color = 'var(--text)')}
      >
        {voice.title}
      </a>

      {voice.excerpt && (
        <p className="text-[11px] leading-snug mb-1.5" style={{ color: 'var(--text-secondary)' }}>
          {voice.excerpt}
        </p>
      )}

      {aiAnalysis && (
        <div
          className="text-[11px] leading-relaxed px-2.5 py-1.5 rounded mb-1.5"
          style={{ background: 'var(--surface-2)', borderLeft: '2px solid var(--gold)', color: 'var(--text-secondary)' }}
        >
          <span className="font-data text-[9px] uppercase tracking-widest block mb-0.5" style={{ color: 'var(--gold)' }}>
            Market Impact
          </span>
          {aiAnalysis}
        </div>
      )}

      {!aiAnalysis && (
        <button
          onClick={handleAnalyse}
          disabled={aiLoading}
          className="font-data text-[10px] transition-colors"
          style={{ color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
          onMouseEnter={e => !aiLoading && (e.currentTarget.style.color = 'var(--gold)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
        >
          {aiLoading ? '⏳ Analysing…' : '✦ Why it matters'}
        </button>
      )}
    </div>
  );
}

function MarketVoices({ voices, loading }: { voices: MarketVoice[]; loading: boolean }) {
  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="font-display font-bold text-sm" style={{ color: 'var(--text)' }}>
          Market Voices
        </span>
        <span className="section-label">Thought Leaders</span>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="space-y-1.5">
              <div className="skeleton h-3 w-28" />
              <div className="skeleton h-3.5 w-full" />
              <div className="skeleton h-3 w-3/4" />
            </div>
          ))}
        </div>
      ) : voices.length === 0 ? (
        <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
          No posts available — RSS feeds may be temporarily unavailable.
        </p>
      ) : (
        <div>
          {voices.map(v => <VoiceCard key={v.id} voice={v} />)}
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   Composite export
───────────────────────────────────────────────────────────────── */
interface Props {
  events:        EnrichedEvent[];
  eventsLoading: boolean;
  voices:        MarketVoice[];
  voicesLoading: boolean;
}

export default function IntelligencePanel({ events, eventsLoading, voices, voicesLoading }: Props) {
  return (
    <aside className="flex flex-col gap-4" style={{ height: '100%' }}>
      <MacroCalendar events={events} loading={eventsLoading} />
      <MarketVoices  voices={voices} loading={voicesLoading} />
    </aside>
  );
}
