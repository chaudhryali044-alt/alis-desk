import { NextRequest, NextResponse } from 'next/server';
import Groq from 'groq-sdk';

export async function POST(req: NextRequest) {
  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
  const { title, description, link, source } = await req.json();

  if (!title) {
    return NextResponse.json({ error: 'Missing title' }, { status: 400 });
  }

  const prompt = `You are a senior financial analyst. Summarise the following news article in 3 concise bullet points for a busy professional. Focus on: (1) what happened, (2) market implications, (3) what to watch next. Be direct and use financial terminology.

Source: ${source}
Title: ${title}
Description: ${description || '(no description available)'}
Link: ${link}

Respond with exactly 3 bullet points, each starting with "•". No headers, no preamble.`;

  try {
    const completion = await groq.chat.completions.create({
      model: 'llama-3.1-8b-instant',
      max_tokens: 300,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = completion.choices[0]?.message?.content ?? '';
    return NextResponse.json({ summary: text });
  } catch (error) {
    console.error('Summarise error:', error);
    return NextResponse.json({ error: 'Failed to summarise' }, { status: 500 });
  }
}
