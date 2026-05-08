'use client';

import { useEffect, useState } from 'react';

export default function ThemeToggle() {
  const [isLight, setIsLight] = useState(false);

  useEffect(() => {
    setIsLight(document.documentElement.classList.contains('light'));
  }, []);

  const toggle = () => {
    const next = !isLight;
    setIsLight(next);
    const html = document.documentElement;
    if (next) {
      html.classList.remove('dark');
      html.classList.add('light');
    } else {
      html.classList.remove('light');
      html.classList.add('dark');
    }
    localStorage.setItem('theme', next ? 'light' : 'dark');
  };

  return (
    <button onClick={toggle} className="btn-ghost" aria-label="Toggle theme">
      <span className="text-sm leading-none">{isLight ? '🌙' : '☀️'}</span>
      <span className="hidden sm:inline text-[11px]">{isLight ? 'Dark' : 'Light'}</span>
    </button>
  );
}
