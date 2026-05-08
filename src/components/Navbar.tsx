'use client';

import { useState, useEffect } from 'react';
import ThemeToggle from './ThemeToggle';

function WhatsAppIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

type WaStatus = 'idle' | 'loading' | 'sent' | 'error';
type AccentTheme = 'gold' | 'salmon' | 'midnight';

interface NavbarProps {
  onBriefing: () => void;
  briefingLoading: boolean;
  onWhatsApp: () => Promise<void>;
}

const ACCENTS: { id: AccentTheme; color: string; label: string }[] = [
  { id: 'gold',     color: '#C9A84C', label: 'Gold'          },
  { id: 'salmon',   color: '#990F3D', label: 'FT Red'        },
  { id: 'midnight', color: '#4A90D9', label: 'Midnight Blue' },
];

export default function Navbar({ onBriefing, briefingLoading, onWhatsApp }: NavbarProps) {
  const [waStatus,      setWaStatus]      = useState<WaStatus>('idle');
  const [timeStr,       setTimeStr]       = useState('');
  const [dateStr,       setDateStr]       = useState('');
  const [activeAccent,  setActiveAccent]  = useState<AccentTheme>('gold');

  useEffect(() => {
    function tick() {
      const now = new Date();
      setTimeStr(now.toLocaleTimeString('en-GB', { timeZone: 'Asia/Karachi', hour: '2-digit', minute: '2-digit' }));
      setDateStr(now.toLocaleDateString('en-GB', { timeZone: 'Asia/Karachi', weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }));
    }
    tick();
    const id = setInterval(tick, 30000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('accent') as AccentTheme | null;
      if (saved && ACCENTS.find(a => a.id === saved)) setActiveAccent(saved);
    } catch { /* */ }
  }, []);

  const switchAccent = (id: AccentTheme) => {
    setActiveAccent(id);
    document.documentElement.setAttribute('data-accent', id);
    try { localStorage.setItem('accent', id); } catch { /* */ }
  };

  const handleWhatsApp = async () => {
    if (waStatus !== 'idle') return;
    setWaStatus('loading');
    try {
      await onWhatsApp();
      setWaStatus('sent');
      setTimeout(() => setWaStatus('idle'), 4000);
    } catch {
      setWaStatus('error');
      setTimeout(() => setWaStatus('idle'), 4000);
    }
  };

  const waLabel = { idle: 'WhatsApp', loading: 'Sending…', sent: 'Sent ✓', error: 'Failed' }[waStatus];
  const waBg    = { idle: '#25D366', loading: '#1da851', sent: '#128C4A', error: '#dc2626' }[waStatus];

  return (
    <nav
      style={{
        height: 64,
        background: 'var(--surface)',
        borderBottom: '1px solid var(--border)',
        position: 'sticky',
        top: 0,
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 24px',
      }}
    >
      {/* ── Logo ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div
          style={{
            width: 32, height: 32, borderRadius: 3,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'var(--gold)', color: 'var(--gold-text, #0a0700)',
            fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15,
          }}
        >
          P
        </div>
        <div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 5 }}>
            <span
              className="font-display font-bold"
              style={{ fontSize: 17, letterSpacing: '-0.01em', color: 'var(--gold)', lineHeight: 1 }}
            >
              Pulse
            </span>
            <span
              className="font-display"
              style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1 }}
            >
              by Ali Chaudhry
            </span>
          </div>
          <div
            className="section-label hidden sm:block"
            style={{ marginTop: 3, fontSize: 8, letterSpacing: '0.20em', color: 'var(--text-muted)' }}
          >
            Financial Intelligence
          </div>
        </div>
      </div>

      {/* ── Centre — live clock ── */}
      <div
        className="hidden md:flex items-center gap-2 font-data"
        style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.06em' }}
      >
        <span
          style={{
            width: 6, height: 6, borderRadius: '50%',
            background: 'var(--positive)', display: 'inline-block',
          }}
          className="animate-pulse-dot"
        />
        LIVE &nbsp;·&nbsp; {dateStr} &nbsp;·&nbsp; {timeStr} PKT
      </div>

      {/* ── Actions ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {/* Accent theme switcher */}
        <div
          style={{
            display: 'flex', alignItems: 'center', gap: 5,
            padding: '4px 8px',
            border: '1px solid var(--border-2)',
            borderRadius: 3,
          }}
        >
          {ACCENTS.map(a => (
            <button
              key={a.id}
              onClick={() => switchAccent(a.id)}
              title={a.label}
              style={{
                width: 12, height: 12,
                borderRadius: '50%',
                background: a.color,
                border: activeAccent === a.id ? '2px solid var(--text)' : '2px solid transparent',
                cursor: 'pointer',
                transition: 'border-color 0.2s, transform 0.15s',
                transform: activeAccent === a.id ? 'scale(1.25)' : 'scale(1)',
                padding: 0,
              }}
              aria-label={`Switch to ${a.label} theme`}
            />
          ))}
        </div>

        <button
          onClick={onBriefing}
          disabled={briefingLoading}
          className="btn-gold"
          style={{ fontSize: 10, padding: '6px 12px' }}
        >
          {briefingLoading ? (
            <>
              <span
                style={{
                  display: 'inline-block', width: 10, height: 10,
                  borderRadius: '50%', border: '1.5px solid currentColor',
                  borderTopColor: 'transparent', animation: 'spin 0.7s linear infinite',
                }}
              />
              Generating…
            </>
          ) : '⚡ Daily Briefing'}
        </button>

        <button
          onClick={handleWhatsApp}
          disabled={waStatus !== 'idle'}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            background: waBg, color: '#fff',
            fontFamily: 'var(--font-mono)', fontSize: 10,
            fontWeight: 700, letterSpacing: '0.06em',
            textTransform: 'uppercase',
            padding: '6px 11px',
            borderRadius: 3, border: 'none', cursor: 'pointer',
            transition: 'opacity 0.15s, background-color 0.3s',
            opacity: waStatus !== 'idle' ? 0.75 : 1,
          }}
        >
          {waStatus === 'loading'
            ? <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', border: '1.5px solid #fff', borderTopColor: 'transparent', animation: 'spin 0.7s linear infinite' }} />
            : <WhatsAppIcon />
          }
          <span className="hidden sm:inline">{waLabel}</span>
        </button>

        <ThemeToggle />
      </div>
    </nav>
  );
}
