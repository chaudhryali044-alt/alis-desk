import { NextResponse } from 'next/server';
import { generateWhatsAppBriefing, sendWhatsApp } from '@/lib/whatsapp-briefing';

export const maxDuration = 60;

export async function POST() {
  console.log('TWILIO_ACCOUNT_SID:', process.env.TWILIO_ACCOUNT_SID ? 'found' : 'MISSING')
  console.log('TWILIO_AUTH_TOKEN:', process.env.TWILIO_AUTH_TOKEN ? 'found' : 'MISSING')
  console.log('MY_WHATSAPP_NUMBER:', process.env.MY_WHATSAPP_NUMBER ? 'found' : 'MISSING')

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
