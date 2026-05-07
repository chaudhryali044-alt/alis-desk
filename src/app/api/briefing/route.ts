import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic();

export async function POST(req: NextRequest) {
  const { articles, marketData } = await req.json();

  const topHeadlines = (articles as { title: string; source: string; category: string }[])
    .slice(0, 15)
    .map((a) => `[${a.category} | ${a.source}] ${a.title}`)
    .join('\n');

  const marketSummary = marketData
    ? Object.entries(
        marketData as Record<string, { name: string; changesPercentage: number }[]>
      )
        .map(([section, items]) =>
          `${section.toUpperCase()}: ${items
            .map(
              (i) =>
                `${i.name} ${i.changesPercentage >= 0 ? '+' : ''}${i.changesPercentage.toFixed(2)}%`
            )
            .join(', ')}`
        )
        .join('\n')
    : '';

  const prompt = `You are a seasoned financial journalist delivering a 3-minute morning briefing for institutional investors. Today is ${new Date().toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}.

Market snapshot:
${marketSummary}

Today's top headlines:
${topHeadlines}

Write a crisp, professional morning briefing in this exact structure:
1. **Opening (1 sentence)**: Set the tone — risk-on or risk-off, key theme of the day.
2. **Markets** (2-3 sentences): Key index moves, notable sector moves, bond market.
3. **Top Story** (2-3 sentences): The single most important story driving markets today.
4. **Macro Watch** (2 sentences): Key economic / central bank developments.
5. **Deals & Earnings** (2 sentences): Notable M&A or earnings if any.
6. **What to Watch** (3 bullet points): Key events, data releases, or risk factors to monitor today.

Keep it under 350 words. Write in a confident, direct tone — no waffle.`;

  try {
    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 600,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = message.content[0].type === 'text' ? message.content[0].text : '';
    return NextResponse.json({ briefing: text });
  } catch (error) {
    console.error('Briefing error:', error);
    return NextResponse.json({ error: 'Failed to generate briefing' }, { status: 500 });
  }
}
