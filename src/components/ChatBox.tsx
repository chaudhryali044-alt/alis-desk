'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import type { NewsArticle } from '@/lib/types';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatBoxProps {
  articles: NewsArticle[];
}

const SUGGESTED = [
  "What's moving markets today?",
  "Any M&A deals in the news?",
  "Summarise the macro picture",
  "Any earnings surprises?",
];

function Bubble({ msg }: { msg: Message }) {
  const isUser = msg.role === 'user';
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-3`}>
      {!isUser && (
        <div
          className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold mr-2 mt-0.5 shrink-0"
          style={{ background: 'var(--gold)', color: '#0a0b0d' }}
        >
          A
        </div>
      )}
      <div
        className="max-w-[82%] rounded-2xl px-3 py-2 text-sm leading-relaxed"
        style={
          isUser
            ? { background: 'var(--gold)', color: '#0a0b0d', borderBottomRightRadius: '4px' }
            : { background: 'var(--surface-2)', color: 'var(--text)', border: '1px solid var(--border)', borderBottomLeftRadius: '4px' }
        }
      >
        {msg.content}
      </div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex justify-start mb-3">
      <div
        className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold mr-2 mt-0.5 shrink-0"
        style={{ background: 'var(--gold)', color: '#0a0b0d' }}
      >
        A
      </div>
      <div
        className="rounded-2xl px-4 py-3 flex gap-1.5 items-center"
        style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderBottomLeftRadius: '4px' }}
      >
        {[0, 1, 2].map(i => (
          <span
            key={i}
            className="w-1.5 h-1.5 rounded-full animate-bounce"
            style={{ background: 'var(--text-muted)', animationDelay: `${i * 0.15}s` }}
          />
        ))}
      </div>
    </div>
  );
}

export default function ChatBox({ articles }: ChatBoxProps) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const headlines = articles.map(a => ({
    title: a.title,
    source: a.source,
    category: a.category,
    pubDate: a.pubDate,
  }));

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  useEffect(() => {
    if (open && messages.length === 0) {
      inputRef.current?.focus();
    }
  }, [open, messages.length]);

  const send = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    const userMsg: Message = { role: 'user', content: trimmed };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMsg],
          headlines,
        }),
      });
      const data = await res.json();
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: data.reply || 'Sorry, I could not get a response.' },
      ]);
    } catch {
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: 'Connection error — please check your GROQ_API_KEY.' },
      ]);
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [loading, messages, headlines]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send(input);
    }
  };

  const unreadCount = messages.filter(m => m.role === 'assistant').length;

  return (
    <>
      {/* Floating toggle button */}
      <button
        onClick={() => setOpen(o => !o)}
        aria-label="Open news chat"
        className="fixed bottom-5 right-5 z-40 w-14 h-14 rounded-full shadow-2xl flex items-center justify-center text-xl transition-transform hover:scale-105 active:scale-95"
        style={{ background: 'var(--gold)', color: '#0a0b0d' }}
      >
        {open ? (
          <span className="text-lg font-bold leading-none">✕</span>
        ) : (
          <>
            <span>💬</span>
            {!open && unreadCount === 0 && (
              <span
                className="absolute -top-1 -right-1 w-4 h-4 rounded-full text-[9px] font-bold flex items-center justify-center"
                style={{ background: 'var(--positive)', color: '#fff' }}
              >
                AI
              </span>
            )}
          </>
        )}
      </button>

      {/* Chat panel */}
      {open && (
        <div
          className="fixed bottom-24 right-5 z-40 w-80 sm:w-96 rounded-2xl shadow-2xl flex flex-col animate-fade-in overflow-hidden"
          style={{
            height: '520px',
            background: 'var(--surface)',
            border: '1px solid var(--border)',
          }}
        >
          {/* Header */}
          <div
            className="flex items-center gap-3 px-4 py-3 border-b border-[var(--border)] shrink-0"
            style={{ background: 'var(--surface)' }}
          >
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
              style={{ background: 'var(--gold)', color: '#0a0b0d' }}
            >
              A
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold leading-tight">News Assistant</p>
              <p className="mono text-[10px] truncate" style={{ color: 'var(--text-muted)' }}>
                {headlines.length} headlines loaded · ask me anything
              </p>
            </div>
            <span
              className="w-2 h-2 rounded-full shrink-0 animate-pulse"
              style={{ background: 'var(--positive)' }}
            />
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-3 py-3 min-h-0">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center gap-4 px-2">
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center text-xl"
                  style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}
                >
                  📰
                </div>
                <p className="text-xs text-center" style={{ color: 'var(--text-muted)' }}>
                  Ask me anything about today&apos;s financial news
                </p>
                <div className="w-full space-y-2">
                  {SUGGESTED.map(q => (
                    <button
                      key={q}
                      onClick={() => send(q)}
                      className="w-full text-left text-xs px-3 py-2 rounded-xl transition-colors"
                      style={{
                        background: 'var(--surface-2)',
                        border: '1px solid var(--border)',
                        color: 'var(--text-muted)',
                      }}
                      onMouseEnter={e => {
                        (e.currentTarget as HTMLElement).style.borderColor = 'var(--gold)';
                        (e.currentTarget as HTMLElement).style.color = 'var(--text)';
                      }}
                      onMouseLeave={e => {
                        (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)';
                        (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)';
                      }}
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <>
                {messages.map((msg, i) => <Bubble key={i} msg={msg} />)}
                {loading && <TypingIndicator />}
                <div ref={bottomRef} />
              </>
            )}
          </div>

          {/* Input */}
          <div
            className="px-3 py-3 border-t border-[var(--border)] shrink-0"
            style={{ background: 'var(--surface)' }}
          >
            <div
              className="flex items-end gap-2 rounded-xl px-3 py-2"
              style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}
            >
              <textarea
                ref={inputRef}
                rows={1}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about today's news…"
                disabled={loading}
                className="flex-1 resize-none bg-transparent text-sm outline-none leading-relaxed"
                style={{
                  color: 'var(--text)',
                  maxHeight: '96px',
                  minHeight: '24px',
                  fontFamily: 'inherit',
                }}
              />
              <button
                onClick={() => send(input)}
                disabled={!input.trim() || loading}
                className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-sm transition-opacity disabled:opacity-40"
                style={{ background: 'var(--gold)', color: '#0a0b0d' }}
                aria-label="Send"
              >
                ↑
              </button>
            </div>
            <p className="mono text-[9px] text-center mt-1.5" style={{ color: 'var(--text-muted)' }}>
              Enter to send · Shift+Enter for new line
            </p>
          </div>
        </div>
      )}
    </>
  );
}
