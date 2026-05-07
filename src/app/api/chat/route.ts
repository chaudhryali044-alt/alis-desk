import { NextRequest, NextResponse } from 'next/server';
import Groq from 'groq-sdk';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export async function POST(req: NextRequest) {
  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

  const { messages, headlines } = await req.json() as {
    messages: ChatMessage[];
    headlines: { title: string; source: string; category: string; pubDate: string }[];
  };

  if (!messages?.length) {
    return NextResponse.json({ error: 'No messages provided' }, { status: 400 });
  }

  const today = new Date().toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

  const headlineBlock = headlines
    .slice(0, 40)
    .map(h => `[${h.category} | ${h.source}] ${h.title}`)
    .join('\n');

  const systemPrompt = `You are a sharp, knowledgeable financial markets assistant embedded in "Ali's Desk", a professional financial news terminal.

Today is ${today}.

You have been given today's live news headlines from across Reuters, CNBC, FT, The Economist, MarketWatch, and FN London. Answer questions about the news concisely and professionally. If asked about something not covered in the headlines, say so clearly rather than guessing.

TODAY'S HEADLINES:
${headlineBlock}

Guidelines:
- Be concise — 2-4 sentences unless a longer answer is genuinely needed
- Reference specific sources when relevant (e.g. "per Reuters…")
- Use financial terminology naturally
- If asked for opinion or analysis, give a balanced view
- Never fabricate data or stories not in the headlines above`;

  try {
    const completion = await groq.chat.completions.create({
      model: 'llama-3.1-8b-instant',
      max_tokens: 512,
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages,
      ],
    });

    const reply = completion.choices[0]?.message?.content ?? '';
    return NextResponse.json({ reply });
  } catch (error) {
    console.error('Chat error:', error);
    return NextResponse.json({ error: 'Failed to get response' }, { status: 500 });
  }
}
