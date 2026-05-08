'use client';

import { useEffect, useState, useCallback } from 'react';
import type { PulseVersion } from '@/app/api/market-pulse/route';

type Session = 'morning' | 'evening';

function ParagraphBlock({ heading, content }: { heading: string; content: string }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div
        className="font-data font-bold text-[10px] uppercase tracking-widest mb-2"
        style={{ color: 'var(--gold)' }}
      >
        {heading}
      </div>
      <p
        style={{
          fontSize: 13, lineHeight: 1.75,
          color: 'var(--text-secondary)',
          fontFamily: 'var(--font-sans), "DM Sans", system-ui, sans-serif',
        }}
      >
        {content}
      </p>
    </div>
  );
}

function TabButton({
  label, active, onClick,
}: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        background:   active ? 'var(--gold)' : 'transparent',
        color:        active ? '#0a0700' : 'var(--text-muted)',
        border:       active ? 'none' : '1px solid var(--border-2)',
        borderRadius: 5,
        padding:      '5px 14px',
        fontSize:     11,
        fontFamily:   'var(--font-mono), monospace',
        fontWeight:   700,
        letterSpacing: '0.04em',
        cursor:       'pointer',
        transition:   'all 0.15s',
      }}
    >
      {label}
    </button>
  );
}

export default function MarketPulse() {
  const [activeTab,   setActiveTab]   = useState<Session>('morning');
  const [morningData, setMorningData] = useState<PulseVersion | null>(null);
  const [eveningData, setEveningData] = useState<PulseVersion | null>(null);
  const [loading,     setLoading]     = useState<Record<Session, boolean>>({ morning: false, evening: false });
  const [error,       setError]       = useState<Record<Session, string | null>>({ morning: null, evening: null });

  const fetchPulse = useCallback(async (session: Session, force = false) => {
    setLoading(prev => ({ ...prev, [session]: true }));
    setError(prev  => ({ ...prev, [session]: null }));
    try {
      const r = await fetch(`/api/market-pulse?session=${session}${force ? '&force=true' : ''}`);
      const d = await r.json();
      if (!r.ok || d.error) throw new Error(d.error ?? 'Failed to fetch');
      if (session === 'morning') setMorningData(d.pulse);
      else                       setEveningData(d.pulse);
    } catch (err) {
      setError(prev => ({ ...prev, [session]: err instanceof Error ? err.message : 'Generation failed' }));
    } finally {
      setLoading(prev => ({ ...prev, [session]: false }));
    }
  }, []);

  // Auto-select tab based on PKT time
  useEffect(() => {
    const pktHour = new Date().toLocaleString('en-PK', {
      timeZone: 'Asia/Karachi', hour: 'numeric', hour12: false,
    });
    setActiveTab(Number(pktHour) >= 18 ? 'evening' : 'morning');
  }, []);

  // Fetch active tab on mount, then the other tab lazily
  useEffect(() => {
    fetchPulse(activeTab);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const other: Session = activeTab === 'morning' ? 'evening' : 'morning';
    const otherData = other === 'morning' ? morningData : eveningData;
    if (!otherData && !loading[other]) {
      fetchPulse(other);
    }
  }, [activeTab]); // eslint-disable-line react-hooks/exhaustive-deps

  const activeData    = activeTab === 'morning' ? morningData : eveningData;
  const isLoading     = loading[activeTab];
  const activeError   = error[activeTab];

  return (
    <div
      style={{
        maxWidth:    1600,
        margin:      '0 auto',
        width:       '100%',
        padding:     '0 16px 32px',
      }}
    >
      <div
        style={{
          background:   'var(--surface)',
          border:       '1px solid var(--gold-dim)',
          borderRadius: 8,
          padding:      '24px 28px',
          boxShadow:    '0 0 0 1px rgba(201,168,76,0.08)',
        }}
      >
        {/* ── Header row ── */}
        <div className="flex items-center justify-between flex-wrap gap-3 mb-5">
          <div className="flex items-center gap-3">
            <span className="section-label" style={{ fontSize: 10 }}>Today&apos;s Market Pulse</span>
            {activeData?.generatedAt && (
              <span
                className="font-data text-[9px]"
                style={{ color: 'var(--text-muted)', letterSpacing: '0.05em' }}
              >
                Generated {activeData.generatedAt}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Tabs */}
            <TabButton
              label="🌅 Morning"
              active={activeTab === 'morning'}
              onClick={() => setActiveTab('morning')}
            />
            <TabButton
              label="🌙 Evening"
              active={activeTab === 'evening'}
              onClick={() => setActiveTab('evening')}
            />

            {/* Regenerate */}
            <button
              onClick={() => fetchPulse(activeTab, true)}
              disabled={isLoading}
              className="btn-ghost"
              style={{ fontSize: 10 }}
            >
              {isLoading ? (
                <>
                  <span
                    style={{
                      display: 'inline-block', width: 10, height: 10,
                      border: '1.5px solid var(--text-muted)',
                      borderTopColor: 'var(--gold)',
                      borderRadius: '50%',
                      animation: 'spin 0.8s linear infinite',
                    }}
                  />
                  Generating…
                </>
              ) : '↻ Regenerate'}
            </button>
          </div>
        </div>

        {/* ── Title ── */}
        {activeData && !isLoading && (
          <div
            className="font-display font-bold mb-5"
            style={{ fontSize: 18, color: 'var(--text)', lineHeight: 1.3 }}
          >
            {activeTab === 'morning' ? '🌅' : '🌙'} {activeData.title}
          </div>
        )}

        {/* ── Content ── */}
        {isLoading ? (
          <div>
            {[...Array(4)].map((_, i) => (
              <div key={i} style={{ marginBottom: 24 }}>
                <div className="skeleton h-2.5 w-32 mb-3" />
                <div className="space-y-1.5">
                  <div className="skeleton h-2.5 w-full" />
                  <div className="skeleton h-2.5 w-11/12" />
                  <div className="skeleton h-2.5 w-full" />
                  <div className="skeleton h-2.5 w-4/5" />
                  <div className="skeleton h-2.5 w-10/12" />
                </div>
              </div>
            ))}
          </div>
        ) : activeError ? (
          <div
            className="font-data text-[12px]"
            style={{ color: 'var(--negative)', padding: '16px 0' }}
          >
            {activeError}
            <button
              onClick={() => fetchPulse(activeTab)}
              className="btn-ghost"
              style={{ fontSize: 10, marginLeft: 12 }}
            >
              Retry
            </button>
          </div>
        ) : activeData?.paragraphs?.length ? (
          <div
            style={{
              display:             'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap:                 '8px 40px',
            }}
          >
            {activeData.paragraphs.map((p, i) => (
              <ParagraphBlock key={i} heading={p.heading} content={p.content} />
            ))}
          </div>
        ) : (
          <div
            className="font-data text-[12px]"
            style={{ color: 'var(--text-muted)', padding: '16px 0', textAlign: 'center' }}
          >
            Click Regenerate to generate the {activeTab} pulse analysis.
          </div>
        )}
      </div>
    </div>
  );
}
