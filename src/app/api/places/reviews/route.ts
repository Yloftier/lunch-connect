import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const placeId = searchParams.get('placeId');
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY;

  if (!placeId) {
    return NextResponse.json({ error: 'placeId is required' }, { status: 400 });
  }

  try {
    const res = await fetch(
      `https://places.googleapis.com/v1/places/${placeId}`,
      {
        headers: {
          'X-Goog-Api-Key': apiKey!,
          'X-Goog-FieldMask': 'reviews',
        },
      }
    );
    const data = await res.json();
    return NextResponse.json({ reviews: data.reviews || [] });
  } catch (error) {
    console.error('Places Reviews API 오류:', error);
    return NextResponse.json({ error: '리뷰를 불러오지 못했어요.' }, { status: 500 });
  }
}
