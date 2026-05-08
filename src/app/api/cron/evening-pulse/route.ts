import { NextRequest, NextResponse } from 'next/server';

// Vercel Cron schedule: 0 13 * * *  (1pm UTC = 6pm PKT)
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
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL
      ?? (req.headers.get('x-forwarded-host')
        ? `https://${req.headers.get('x-forwarded-host')}`
        : 'http://localhost:3000');

    const r = await fetch(`${baseUrl}/api/market-pulse?session=evening&force=true`);
    const d = await r.json();
    return NextResponse.json({ ok: true, generatedAt: d.pulse?.generatedAt });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
