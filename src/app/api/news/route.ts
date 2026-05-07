import { NextResponse } from 'next/server';
import { fetchAllNews } from '@/lib/rss';

export const revalidate = 300; // 5 minutes

export async function GET() {
  try {
    const articles = await fetchAllNews();
    return NextResponse.json({ articles }, {
      headers: { 'Cache-Control': 's-maxage=300, stale-while-revalidate=600' },
    });
  } catch (error) {
    console.error('News fetch error:', error);
    return NextResponse.json({ articles: [] }, { status: 500 });
  }
}
