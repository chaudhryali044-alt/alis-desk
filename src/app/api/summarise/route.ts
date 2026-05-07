import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic();

export async function POST(req: NextRequest) {
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
    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 300,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = message.content[0].type === 'text' ? message.content[0].text : '';
    return NextResponse.json({ summary: text });
  } catch (error) {
    console.error('Summarise error:', error);
    return NextResponse.json({ error: 'Failed to summarise' }, { status: 500 });
  }
}
