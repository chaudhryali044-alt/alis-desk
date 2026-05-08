import { NextResponse } from 'next/server';
import Groq from 'groq-sdk';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const { symbol, name, price, change, changePct, high, low, week52High, week52Low, unit, decimals } =
    await req.json();

  const fmt = (n: number) =>
    n.toLocaleString('en-US', { minimumFractionDigits: decimals ?? 2, maximumFractionDigits: decimals ?? 2 });

  const pctStr  = `${changePct >= 0 ? '+' : ''}${Number(changePct).toFixed(2)}%`;
  const context =
    `${name} (${symbol}) is at ${fmt(price)}${unit ? ' ' + unit : ''} ` +
    `(${pctStr} today). Day range: ${fmt(low)}–${fmt(high)}. ` +
    `52-week range: ${fmt(week52Low)}–${fmt(week52High)}. ` +
    `Absolute change: ${change >= 0 ? '+' : ''}${fmt(change)}.`;

  try {
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
    const completion = await groq.chat.completions.create({
      model: 'llama-3.1-8b-instant',
      max_tokens: 180,
      temperature: 0.3,
      messages: [{
        role: 'user',
        content:
          `You are a senior sell-side analyst. In exactly 3 concise sentences, ` +
          `explain what this market level means for markets and deal flow today. ` +
          `Be specific, sharp, and actionable. No preamble or labels.\n\n${context}`,
      }],
    });
    const analysis = completion.choices[0]?.message?.content?.trim() ?? '';
    return NextResponse.json({ analysis });
  } catch {
    return NextResponse.json({ analysis: '' });
  }
}
