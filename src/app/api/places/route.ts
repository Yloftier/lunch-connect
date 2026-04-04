import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const lat = searchParams.get('lat');
  const lng = searchParams.get('lng');
  const query = searchParams.get('query') || '맛집';
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY;

  try {
    const res = await fetch(
      `https://places.googleapis.com/v1/places:searchText`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': apiKey!,
'X-Goog-FieldMask': 'places.id,places.displayName,places.rating,places.userRatingCount,places.formattedAddress,places.photos,places.currentOpeningHours,places.priceLevel,places.types,places.location'        },
        body: JSON.stringify({
          textQuery: `${query} 낙성대역 맛집`,
          locationBias: {
            circle: {
              center: { latitude: parseFloat(lat!), longitude: parseFloat(lng!) },
              radius: 500.0
            }
          },
          languageCode: 'ko',
          maxResultCount: 20
        })
      }
    );
    const data = await res.json();

    // 기존 형식으로 변환
    const results = (data.places || []).map((place: any) => ({
        place_id: place.id,
        name: place.displayName?.text || '',
        rating: place.rating || 0,
        user_ratings_total: place.userRatingCount || 0,
        vicinity: place.formattedAddress || '',
        types: place.types || [],
        opening_hours: place.currentOpeningHours ? {
          open_now: place.currentOpeningHours.openNow
        } : undefined,
        photos: place.photos?.slice(0, 1).map((p: any) => ({
          photo_reference: p.name
        })),
        price_level: place.priceLevel,
        lat: place.location?.latitude,
        lng: place.location?.longitude,
      }));

    return NextResponse.json({ results });
  } catch (error) {
    console.error('Places API 오류:', error);
    return NextResponse.json({ error: '식당 정보를 불러오지 못했어요.' }, { status: 500 });
  }
}