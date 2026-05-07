import Groq from 'groq-sdk';
import { fetchAllNews } from './rss';

export type Edition = 'morning' | 'midnight' | 'manual';

interface Headline {
  title: string;
  source: string;
  category: string;
}

function formatPKTDate(): string {
  return new Date().toLocaleDateString('en-GB', {
    timeZone: 'Asia/Karachi',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function formatPKTTime(): string {
  return new Date().toLocaleTimeString('en-GB', {
    timeZone: 'Asia/Karachi',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function buildPrompt(edition: Edition, headlines: Headline[]): string {
  const date = formatPKTDate();
  const headlineBlock = headlines
    .slice(0, 40)
    .map(h => `[${h.category} | ${h.source}] ${h.title}`)
    .join('\n');

  const editionContext =
    edition === 'morning'
      ? `This is the MORNING BRIEFING (8am Pakistan Standard Time). Cover overnight developments from Asia and any pre-market moves in Europe/US. Help the reader set up their trading day — what happened while they slept, what they need to know before markets open.`
      : edition === 'midnight'
      ? `This is the MIDNIGHT RECAP (12am Pakistan Standard Time). Recap what happened during the full trading day globally. Summarise key moves, outcomes, and surprises. Point towards what to watch tomorrow — upcoming data, earnings, central bank events, or geopolitical risks.`
      : `This is an ON-DEMAND BRIEFING requested manually. Give a comprehensive snapshot of the current market situation — what's happening right now, what's been the dominant theme today, and what a finance professional needs to be across immediately.`;

  return `You are a senior investment banking analyst writing a WhatsApp briefing for finance professionals in Pakistan and the Gulf. Today is ${date}.

${editionContext}

AVAILABLE HEADLINES:
${headlineBlock}

Write a structured WhatsApp message using EXACTLY this format. Use WhatsApp formatting: *bold* for section headers. Keep each section tight — 2-4 sentences max. Total message must stay under 700 words.

🌍 *GLOBAL MARKETS*
[Overall market mood, key index moves, risk-on/risk-off tone, major macro developments]

🏦 *BANKING & DEALS*
[M&A, IPOs, bond issuances, credit events, regulatory changes affecting financial institutions. If nothing significant, say "Quiet session for deals."]

📊 *MACRO & CENTRAL BANKS*
[Fed, ECB, BOE, BOJ commentary or decisions, inflation data, GDP, anything moving rates]

⚡ *SECTOR SPOTLIGHT*
[The single most important sector story — tech, energy, financials, commodities, etc.]

🎯 *BANKER'S WATCH*
[2-3 specific things a finance professional should track and WHY — cite deal flow, rates, or market risk implications]

Write in a direct, confident tone. No filler phrases. Reference specific sources where relevant (e.g. "per Reuters…"). Do not fabricate data not in the headlines.`;
}

export async function generateWhatsAppBriefing(edition: Edition): Promise<string> {
  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

  const articles = await fetchAllNews();
  const headlines: Headline[] = articles.map(a => ({
    title: a.title,
    source: a.source,
    category: a.category,
  }));

  const prompt = buildPrompt(edition, headlines);

  const completion = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    max_tokens: 900,
    temperature: 0.4,
    messages: [{ role: 'user', content: prompt }],
  });

  const body = completion.choices[0]?.message?.content ?? 'Unable to generate briefing.';

  const header =
    edition === 'morning'
      ? `🌅 *ALI'S DESK — MORNING BRIEFING*`
      : edition === 'midnight'
      ? `🌙 *ALI'S DESK — MIDNIGHT RECAP*`
      : `📲 *ALI'S DESK — ON-DEMAND BRIEFING*`;

  const timestamp = `📅 ${formatPKTDate()} · ${formatPKTTime()} PKT`;
  const footer = `\n_Ali's Desk · Financial Intelligence Terminal_`;

  return `${header}\n${timestamp}\n\n${body}${footer}`;
}

export async function sendWhatsApp(message: string): Promise<void> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const toNumber = process.env.MY_WHATSAPP_NUMBER;

  if (!accountSid || !authToken || !toNumber) {
    throw new Error('Missing Twilio credentials: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, MY_WHATSAPP_NUMBER');
  }

  const credentials = Buffer.from(`${accountSid}:${authToken}`).toString('base64');
  const from = 'whatsapp:+14155238886'; // Twilio WhatsApp sandbox number
  const to = toNumber.startsWith('whatsapp:') ? toNumber : `whatsapp:${toNumber}`;

  const body = new URLSearchParams({ From: from, To: to, Body: message });

  const res = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
    {
      method: 'POST',
      headers: {
        Authorization: `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Twilio error ${res.status}: ${err}`);
  }
}
