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

Write a structured WhatsApp message using EXACTLY this format. Use WhatsApp formatting: *bold* for section headers. Be extremely concise — the TOTAL message body must stay under 1100 characters.

🌍 *GLOBAL MARKETS*
[2 sentences max: market mood, key index moves]

🏦 *BANKING & DEALS*
[2 sentences max: M&A, IPOs, credit events. If quiet, write "Quiet session for deals."]

📊 *MACRO & CENTRAL BANKS*
[2 sentences max: Fed/ECB/BOE/BOJ, inflation, GDP]

⚡ *SECTOR SPOTLIGHT*
[1 sentence only: the single most important sector story]

🎯 *BANKER'S WATCH*
• [Watch item 1 — one line]
• [Watch item 2 — one line]

Write in a direct, confident tone. No filler. No preamble. Do not fabricate data not in the headlines.`;
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
    max_tokens: 500,
    temperature: 0.4,
    messages: [{ role: 'user', content: prompt }],
  });

  const body = completion.choices[0]?.message?.content ?? 'Unable to generate briefing.';

  const header =
    edition === 'morning'
      ? `🌅 *PULSE — MORNING BRIEFING*`
      : edition === 'midnight'
      ? `🌙 *PULSE — MIDNIGHT RECAP*`
      : `📲 *PULSE — ON-DEMAND BRIEFING*`;

  const timestamp = `📅 ${formatPKTDate()} · ${formatPKTTime()} PKT`;
  const footer = `\n_Pulse by Ali Chaudhry · Financial Intelligence_`;

  return `${header}\n${timestamp}\n\n${body}${footer}`;
}

const CHAR_LIMIT = 1400;

export async function sendWhatsApp(message: string): Promise<void> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const toNumber = process.env.MY_WHATSAPP_NUMBER;

  if (!accountSid || !authToken || !toNumber) {
    throw new Error('Missing Twilio credentials: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, MY_WHATSAPP_NUMBER');
  }

  const safe =
    message.length > CHAR_LIMIT
      ? message.slice(0, CHAR_LIMIT - 3) + '...'
      : message;

  console.log(`[sendWhatsApp] message length: ${message.length} → sending: ${safe.length} chars`);

  const credentials = Buffer.from(`${accountSid}:${authToken}`).toString('base64');
  const from = 'whatsapp:+14155238886'; // Twilio WhatsApp sandbox number
  const to = toNumber.startsWith('whatsapp:') ? toNumber : `whatsapp:${toNumber}`;

  const body = new URLSearchParams({ From: from, To: to, Body: safe });

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
