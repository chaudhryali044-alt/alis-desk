import { NextRequest, NextResponse } from 'next/server';
import Groq from 'groq-sdk';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export interface PulseParagraph {
  heading: string;
  content: string;
}

export interface PulseVersion {
  session:     'morning' | 'evening';
  title:       string;
  paragraphs:  PulseParagraph[];
  generatedAt: string; // ISO string
}

/* ── In-process cache (persists across warm invocations) ─── */
const cache: { morning?: PulseVersion; evening?: PulseVersion } = {};
const MAX_AGE_MS = 13 * 60 * 60 * 1000; // 13 h — each version stays fresh until next cron

const YF_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
  'Accept': 'application/json',
};

/* ── Fetch context data ────────────────────────────────────── */
async function fetchContext(baseUrl: string) {
  const [newsRes, dealsRes, marketRes] = await Promise.allSettled([
    fetch(`${baseUrl}/api/news`,        { headers: YF_HEADERS }),
    fetch(`${baseUrl}/api/deals`,       { headers: YF_HEADERS }),
    fetch(`${baseUrl}/api/market-data`, { headers: YF_HEADERS }),
  ]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const news:    any[] = newsRes.status    === 'fulfilled' && newsRes.value.ok
    ? ((await newsRes.value.json())?.articles   ?? []).slice(0, 15) : [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const deals:   any[] = dealsRes.status   === 'fulfilled' && dealsRes.value.ok
    ? ((await dealsRes.value.json())?.deals     ?? []).slice(0, 8)  : [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tickers: any[] = marketRes.status  === 'fulfilled' && marketRes.value.ok
    ? ((await marketRes.value.json())?.tickers  ?? [])              : [];

  return { news, deals, tickers };
}

/* ── Build prompt ──────────────────────────────────────────── */
function buildPrompt(
  session: 'morning' | 'evening',
  date: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  news: any[], deals: any[], tickers: any[]
): string {
  const marketLines = tickers.map(t => {
    const sign = t.changePct >= 0 ? '+' : '';
    const pct  = `${sign}${Number(t.changePct).toFixed(2)}%`;
    return `${t.name}: ${Number(t.price).toLocaleString('en-US')}${t.unit ? ' ' + t.unit : ''} (${pct})`;
  }).join('\n');

  const newsLines  = news.map((a, i)  => `${i + 1}. ${a.title} — ${a.source}`).join('\n');
  const dealLines  = deals.map((d, i) => `${i + 1}. ${d.title} — ${d.source}`).join('\n');

  const isMorning = session === 'morning';

  const paragraphInstructions = isMorning ? `
Paragraph 1 heading: "Market Tone"
Write: Overall market tone and what is driving it today based on overnight developments and current price action.

Paragraph 2 heading: "Key Events to Watch"
Write: Key economic data releases, central bank decisions, or earnings reports today and exactly why they matter for markets.

Paragraph 3 heading: "Deal Flow"
Write: What transactions and M&A activity is happening across sectors, and what the deal activity signals about corporate confidence.

Paragraph 4 heading: "Risk Watch"
Write: The key risks and tail events that could move markets unexpectedly today — macro, geopolitical, or sector-specific.
` : `
Paragraph 1 heading: "What Markets Did Today"
Write: What happened across global markets today and the key fundamental drivers behind the moves.

Paragraph 2 heading: "Biggest Stories"
Write: The most market-moving headlines today — what happened and what it means for investors and deal makers.

Paragraph 3 heading: "Deal Flow Recap"
Write: The most important transactions announced or closed today, and what sectors are seeing the most activity.

Paragraph 4 heading: "Tomorrow's Watchlist"
Write: What to watch tomorrow — key economic events, earnings, and risks that could set the tone for the next session.
`;

  return `You are a senior sell-side analyst at a top-tier investment bank, writing the ${isMorning ? 'morning' : 'evening'} market note for ${date}.

LIVE MARKET DATA:
${marketLines || 'No market data available at this time.'}

TODAY'S NEWS HEADLINES:
${newsLines || 'No headlines available.'}

DEAL FLOW:
${dealLines || 'No deal flow available.'}

Write exactly 4 paragraphs of flowing, authoritative prose — like a Bloomberg Intelligence note or Goldman Sachs morning brief. Each paragraph should be 100-160 words. No bullet points. No lists. No markdown. Write in third person about markets, not second person to the reader.

Return your response as a JSON object with this exact structure:
{
  "paragraphs": [
    { "heading": "heading text", "content": "paragraph content" },
    { "heading": "heading text", "content": "paragraph content" },
    { "heading": "heading text", "content": "paragraph content" },
    { "heading": "heading text", "content": "paragraph content" }
  ]
}
${paragraphInstructions}`;
}

/* ── Generate via Groq ──────────────────────────────────── */
async function generatePulse(
  session: 'morning' | 'evening',
  baseUrl: string
): Promise<PulseVersion> {
  const { news, deals, tickers } = await fetchContext(baseUrl);

  const now  = new Date();
  const date = now.toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });
  const timeStr = now.toLocaleString('en-PK', {
    timeZone: 'Asia/Karachi', hour: '2-digit', minute: '2-digit', hour12: true,
  });

  const groq       = new Groq({ apiKey: process.env.GROQ_API_KEY });
  const prompt     = buildPrompt(session, date, news, deals, tickers);
  const completion = await groq.chat.completions.create({
    model:           'llama-3.3-70b-versatile',
    max_tokens:      1200,
    temperature:     0.4,
    response_format: { type: 'json_object' },
    messages: [{ role: 'user', content: prompt }],
  });

  const raw        = completion.choices[0]?.message?.content ?? '{}';
  const parsed     = JSON.parse(raw) as { paragraphs?: PulseParagraph[] };
  const paragraphs = parsed.paragraphs ?? [];

  const isMorning = session === 'morning';
  const title     = isMorning
    ? `Morning Pulse — ${now.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`
    : `Evening Pulse — ${now.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`;

  return {
    session,
    title,
    paragraphs,
    generatedAt: `${timeStr} PKT`,
  };
}

/* ── Route handler ─────────────────────────────────────── */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const session = (searchParams.get('session') ?? 'morning') as 'morning' | 'evening';
  const force   = searchParams.get('force') === 'true';

  const now   = Date.now();
  const cached = cache[session];

  // Return cached if fresh and not forced
  if (!force && cached) {
    const age = now - new Date(cached.generatedAt.replace(' PKT', '')).getTime();
    // Use cached if under max age — but just trust generatedAt exists, check by presence
    if (cache[session]) {
      return NextResponse.json({ pulse: cached, cached: true });
    }
    void age; // suppress unused warning
  }

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL
    ?? (req.headers.get('x-forwarded-host')
      ? `https://${req.headers.get('x-forwarded-host')}`
      : 'http://localhost:3000');

  try {
    const pulse   = await generatePulse(session, baseUrl);
    cache[session] = pulse;
    return NextResponse.json({ pulse, cached: false });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    // Return stale cache if generation fails
    if (cached) return NextResponse.json({ pulse: cached, cached: true, stale: true });
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
