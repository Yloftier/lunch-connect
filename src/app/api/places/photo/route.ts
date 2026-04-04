import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const ref = searchParams.get('ref');
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY;

  if (!ref) {
    return NextResponse.json({ error: 'ref 파라미터가 없어요.' }, { status: 400 });
  }

  try {
    const res = await fetch(
      `https://places.googleapis.com/v1/${ref}/media?maxHeightPx=400&maxWidthPx=400&key=${apiKey}`,
      { redirect: 'follow' }
    );

    const buffer = await res.arrayBuffer();
    const contentType = res.headers.get('content-type') || 'image/jpeg';

    return new NextResponse(buffer, {
      headers: { 'Content-Type': contentType }
    });
  } catch (error) {
    return NextResponse.json({ error: '사진을 불러오지 못했어요.' }, { status: 500 });
  }
}