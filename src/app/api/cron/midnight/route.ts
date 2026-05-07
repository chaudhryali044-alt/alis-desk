import { NextRequest, NextResponse } from 'next/server';
import { generateWhatsAppBriefing, sendWhatsApp } from '@/lib/whatsapp-briefing';

// Vercel Cron schedule: 0 19 * * *  (7pm UTC = 12am PKT next day)
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
    console.log('[cron/midnight] Generating midnight recap…');
    const message = await generateWhatsAppBriefing('midnight');
    await sendWhatsApp(message);
    console.log('[cron/midnight] Midnight recap sent successfully.');
    return NextResponse.json({ ok: true, edition: 'midnight', sentAt: new Date().toISOString() });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('[cron/midnight] Failed:', msg);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
