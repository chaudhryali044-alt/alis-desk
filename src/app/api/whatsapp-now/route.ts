import { NextResponse } from 'next/server';
import { generateWhatsAppBriefing, sendWhatsApp } from '@/lib/whatsapp-briefing';

export const maxDuration = 60;

export async function POST() {
  try {
    const message = await generateWhatsAppBriefing('manual');
    await sendWhatsApp(message);
    return NextResponse.json({ ok: true, sentAt: new Date().toISOString() });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('[whatsapp-now] Failed:', msg);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
