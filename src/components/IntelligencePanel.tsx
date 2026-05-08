'use client';

import { useState } from 'react';
import type { MacroEvent, MarketVoice } from '@/lib/types';

interface EnrichedEvent extends MacroEvent {
  sourceLink?: string;
  analysis?: string;
}

function ImpactDot({ impact }: { impact: 'High' | 'Medium' | 'Low' }) {
  const map = { High: '#E74C3C', Medium: '#E67E22', Low: '#2ECC71' };
  return (
    <span
      style={{
        display: 'inline-block', width: 7, height: 7,
        borderRadius: '50%', background: map[impact],
        flexShrink: 0, marginTop: 5,
      }}
      title={impact}
    />
  );
}

function MacroCalendar({ events, loading }: { events: EnrichedEvent[]; loading: boolean }) {
  return (
    <div className="card" style={{ padding: '14px 16px' }}>
      <div className="section-header" style={{ marginBottom: 12 }}>
        <span className="font-display font-bold" style={{ fontSize: 15, color: 'var(--text)', letterSpacing: '-0.01em' }}>
          Macro Calendar
        </span>
        <span className="section-label">This Week</span>
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[...Array(4)].map((_, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <div className="skeleton" style={{ height: 10, width: 24 }} />
              <div className="skeleton" style={{ height: 10, flex: 1 }} />
              <div className="skeleton" style={{ height: 10, width: 32 }} />
            </div>
          ))}
        </div>
      ) : events.length === 0 ? (
        <p className="font-data" style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.06em' }}>No major events this week.</p>
      ) : (
        <div>
          {events.map((ev, i) => (
            <div key={i} style={{ padding: '9px 0', borderBottom: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                <ImpactDot impact={ev.impact} />
                <span style={{ fontSize: 14, lineHeight: 1, flexShrink: 0 }}>{ev.flagEmoji}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  {ev.sourceLink ? (
                    <a
                      href={ev.sourceLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ fontSize: 12, fontWeight: 500, lineHeight: 1.35, display: 'block', color: 'var(--text)', textDecoration: 'none', transition: 'color 0.15s' }}
                      onMouseEnter={e => (e.currentTarget.style.color = 'var(--gold)')}
                      onMouseLeave={e => (e.currentTarget.style.color = 'var(--text)')}
                    >
                      {ev.event}
                    </a>
                  ) : (
                    <p style={{ fontSize: 12, fontWeight: 500, lineHeight: 1.35, color: 'var(--text)' }}>{ev.event}</p>
                  )}
                  <p className="font-data" style={{ fontSize: 9, marginTop: 3, color: 'var(--text-muted)', letterSpacing: '0.05em' }}>
                    {ev.date}{ev.time && ` · ${ev.time}`}
                    {ev.estimate && ` · Est: ${ev.estimate}`}
                    {ev.actual && <span style={{ color: 'var(--gold)' }}> · Act: {ev.actual}</span>}
                  </p>
                  {ev.analysis && (
                    <p style={{ fontSize: 11, marginTop: 4, lineHeight: 1.5, color: 'var(--text-secondary)' }}>
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
  const [aiLoading,  setAiLoading]  = useState(false);

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
    <div style={{ padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 4, flexWrap: 'wrap' }}>
        <span
          className="font-display font-bold"
          style={{ fontSize: 13, color: 'var(--text)', letterSpacing: '-0.01em' }}
        >
          {voice.author}
        </span>
        <span
          className="section-label"
          style={{ fontSize: 7.5, color: 'var(--text-muted)', letterSpacing: '0.14em' }}
        >
          {voice.platform}
        </span>
        <span className="font-data" style={{ fontSize: 9, color: 'var(--text-muted)' }}>
          {timeAgo(voice.pubDate)}
        </span>
      </div>

      <a
        href={voice.link}
        target="_blank"
        rel="noopener noreferrer"
        style={{ fontSize: 12.5, fontWeight: 500, lineHeight: 1.4, display: 'block', marginBottom: 5, color: 'var(--text)', textDecoration: 'none', transition: 'color 0.15s' }}
        onMouseEnter={e => (e.currentTarget.style.color = 'var(--gold)')}
        onMouseLeave={e => (e.currentTarget.style.color = 'var(--text)')}
      >
        {voice.title}
      </a>

      {voice.excerpt && (
        <p style={{ fontSize: 11, lineHeight: 1.55, marginBottom: 6, color: 'var(--text-secondary)' }}>
          {voice.excerpt}
        </p>
      )}

      {aiAnalysis && (
        <div
          style={{
            fontSize: 11, lineHeight: 1.6,
            padding: '8px 10px', borderRadius: 3,
            background: 'var(--surface-2)',
            borderLeft: '2px solid var(--gold)',
            color: 'var(--text-secondary)',
            marginBottom: 6,
          }}
        >
          <span className="editorial-heading" style={{ display: 'block', marginBottom: 3 }}>Market Impact</span>
          {aiAnalysis}
        </div>
      )}

      {!aiAnalysis && (
        <button
          onClick={handleAnalyse}
          disabled={aiLoading}
          className="font-data"
          style={{
            fontSize: 9, letterSpacing: '0.08em', textTransform: 'uppercase',
            color: 'var(--text-muted)', background: 'none',
            border: 'none', cursor: 'pointer', padding: 0,
            transition: 'color 0.15s',
          }}
          onMouseEnter={e => !aiLoading && ((e.currentTarget as HTMLElement).style.color = 'var(--gold)')}
          onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = 'var(--text-muted)')}
        >
          {aiLoading ? '⏳ Analysing…' : '✦ Why it matters'}
        </button>
      )}
    </div>
  );
}

function MarketVoices({ voices, loading }: { voices: MarketVoice[]; loading: boolean }) {
  return (
    <div className="card" style={{ padding: '14px 16px' }}>
      <div className="section-header" style={{ marginBottom: 12 }}>
        <span className="font-display font-bold" style={{ fontSize: 15, color: 'var(--text)', letterSpacing: '-0.01em' }}>
          Market Voices
        </span>
        <span className="section-label">Thought Leaders</span>
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {[...Array(4)].map((_, i) => (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              <div className="skeleton" style={{ height: 12, width: 110 }} />
              <div className="skeleton" style={{ height: 12, width: '100%' }} />
              <div className="skeleton" style={{ height: 11, width: '75%' }} />
            </div>
          ))}
        </div>
      ) : voices.length === 0 ? (
        <p className="font-data" style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.06em' }}>
          No posts available — RSS feeds may be temporarily unavailable.
        </p>
      ) : (
        <div>{voices.map(v => <VoiceCard key={v.id} voice={v} />)}</div>
      )}
    </div>
  );
}

interface Props {
  events: EnrichedEvent[]; eventsLoading: boolean;
  voices: MarketVoice[];   voicesLoading: boolean;
}

export default function IntelligencePanel({ events, eventsLoading, voices, voicesLoading }: Props) {
  return (
    <aside style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <MacroCalendar events={events} loading={eventsLoading} />
      <MarketVoices  voices={voices} loading={voicesLoading} />
    </aside>
  );
}
