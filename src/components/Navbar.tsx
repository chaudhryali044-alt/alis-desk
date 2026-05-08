'use client';

import { useState, useEffect } from 'react';
import ThemeToggle from './ThemeToggle';

function WhatsAppIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

type WaStatus = 'idle' | 'loading' | 'sent' | 'error';

interface NavbarProps {
  onBriefing: () => void;
  briefingLoading: boolean;
  onWhatsApp: () => Promise<void>;
}

export default function Navbar({ onBriefing, briefingLoading, onWhatsApp }: NavbarProps) {
  const [waStatus, setWaStatus] = useState<WaStatus>('idle');
  const [timeStr, setTimeStr] = useState('');
  const [dateStr, setDateStr] = useState('');

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

  const waLabel = { idle: 'Send to WhatsApp', loading: 'Sending…', sent: 'Sent ✓', error: 'Failed' }[waStatus];
  const waBg    = { idle: '#25D366', loading: '#1da851', sent: '#128C4A', error: '#dc2626' }[waStatus];

  return (
    <nav
      className="flex items-center justify-between px-5 py-0"
      style={{
        height: 52,
        background: 'var(--surface)',
        borderBottom: '1px solid var(--border)',
        position: 'sticky',
        top: 0,
        zIndex: 50,
      }}
    >
      {/* Logo */}
      <div className="flex items-center gap-3">
        <div
          className="w-7 h-7 rounded flex items-center justify-center font-display font-bold text-sm"
          style={{ background: 'var(--gold)', color: '#0a0700' }}
        >
          A
        </div>
        <div>
          <span className="font-display font-bold text-sm tracking-tight" style={{ color: 'var(--gold)' }}>
            Ali&apos;s Desk
          </span>
          <span className="hidden sm:inline font-data text-[9px] ml-2" style={{ color: 'var(--text-muted)' }}>
            FINANCIAL INTELLIGENCE
          </span>
        </div>
      </div>

      {/* Centre — live clock */}
      <div className="hidden md:flex items-center gap-2 font-data text-[10px]" style={{ color: 'var(--text-muted)' }}>
        <span
          className="w-1.5 h-1.5 rounded-full animate-pulse-dot"
          style={{ background: 'var(--positive)', display: 'inline-block' }}
        />
        LIVE &nbsp;·&nbsp; {dateStr} &nbsp;·&nbsp; {timeStr} PKT
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <button
          onClick={onBriefing}
          disabled={briefingLoading}
          className="btn-gold"
        >
          {briefingLoading ? (
            <>
              <span
                className="inline-block w-3 h-3 rounded-full border border-current border-t-transparent"
                style={{ animation: 'spin 0.7s linear infinite' }}
              />
              Generating…
            </>
          ) : (
            <>⚡ Daily Briefing</>
          )}
        </button>

        <button
          onClick={handleWhatsApp}
          disabled={waStatus !== 'idle'}
          className="flex items-center gap-1.5 font-body font-bold text-[11px] px-3 py-1.5 rounded-md transition-all disabled:opacity-70"
          style={{ background: waBg, color: '#fff', letterSpacing: '0.02em' }}
        >
          {waStatus === 'loading'
            ? <span className="inline-block w-3 h-3 rounded-full border border-white border-t-transparent" style={{ animation: 'spin 0.7s linear infinite' }} />
            : <WhatsAppIcon />
          }
          <span className="hidden sm:inline">{waLabel}</span>
        </button>

        <ThemeToggle />
      </div>
    </nav>
  );
}
