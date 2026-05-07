'use client';

import ThemeToggle from './ThemeToggle';

interface HeaderProps {
  onBriefing: () => void;
  briefingLoading: boolean;
}

export default function Header({ onBriefing, briefingLoading }: HeaderProps) {
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
  const timeStr = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

  return (
    <header
      className="card border-b border-[var(--border)] rounded-none px-4 sm:px-6 py-3 flex items-center justify-between"
      style={{ background: 'var(--surface)', borderLeft: 'none', borderRight: 'none', borderTop: 'none' }}
    >
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold"
            style={{ background: 'var(--gold)', color: '#0a0b0d' }}
          >
            A
          </div>
          <div>
            <h1 className="text-base font-bold leading-tight" style={{ color: 'var(--gold)' }}>
              Ali&apos;s Desk
            </h1>
            <p className="text-[10px] mono" style={{ color: 'var(--text-muted)' }}>
              Financial Intelligence Terminal
            </p>
          </div>
        </div>

        <div className="hidden md:flex items-center gap-1 mono text-xs" style={{ color: 'var(--text-muted)' }}>
          <span
            className="w-2 h-2 rounded-full inline-block mr-1 animate-pulse"
            style={{ background: 'var(--positive)' }}
          />
          LIVE · {dateStr} · {timeStr}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={onBriefing}
          disabled={briefingLoading}
          className="btn-gold flex items-center gap-2 text-xs"
        >
          {briefingLoading ? (
            <>
              <span className="animate-spin inline-block w-3 h-3 border border-current border-t-transparent rounded-full" />
              Generating…
            </>
          ) : (
            <>
              <span>⚡</span>
              Daily Briefing
            </>
          )}
        </button>
        <ThemeToggle />
      </div>
    </header>
  );
}
