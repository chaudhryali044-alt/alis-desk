import { NextRequest, NextResponse } from 'next/server';
import { generateWhatsAppBriefing, sendWhatsApp } from '@/lib/whatsapp-briefing';

// Vercel Cron schedule: 0 3 * * *  (3am UTC = 8am PKT)
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (
    process.env.CRON_SECRET &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    console.log('[cron/morning] Generating morning briefing…');
    const message = await generateWhatsAppBriefing('morning');
    await sendWhatsApp(message);
    console.log('[cron/morning] Morning briefing sent successfully.');
    return NextResponse.json({ ok: true, edition: 'morning', sentAt: new Date().toISOString() });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('[cron/morning] Failed:', msg);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
