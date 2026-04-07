'use client';

import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';

interface Restaurant {
  place_id: string;
  name: string;
  rating: number;
  user_ratings_total: number;
  vicinity: string;
  types: string[];
  opening_hours?: { open_now: boolean };
  photos?: { photo_reference: string }[];
  price_level?: string;
  distance?: number;
  lat?: number;
  lng?: number;
}

interface MyReview {
  id: string;
  place_id: string;
  user_id: string;
  rating: number;
  comment: string;
  created_at: string;
  user?: any;
}

interface GoogleReview {
  name: string;
  relativePublishTimeDescription?: string;
  rating: number;
  text?: { text: string; languageCode: string };
  authorAttribution?: {
    displayName: string;
    uri?: string;
    photoUri?: string;
  };
}

type ReviewTab = 'google' | 'langdy';

interface Props {
  user: any;
}

const CATEGORIES = [
  { label: '전체', value: '' },
  { label: '한식', value: '한식' },
  { label: '일식', value: '일식' },
  { label: '중식', value: '중식' },
  { label: '양식', value: '양식' },
  { label: '카페', value: '카페' },
];

const LAT = 37.4793;
const LNG = 126.9647;
const OFFICE_LAT = 37.477082829933536;
const OFFICE_LNG = 126.96270085137593;

const getDistance = (lat1: number, lng1: number, lat2: number, lng2: number) => {
  const R = 6371e3;
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ/2) * Math.sin(Δλ/2);
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)));
};

export default function RestaurantScreen({ user }: Props) {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null);
  const [reviews, setReviews] = useState<MyReview[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [newReview, setNewReview] = useState({ rating: 5, comment: '' });
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewTab, setReviewTab] = useState<ReviewTab>('google');
  const [googleReviews, setGoogleReviews] = useState<GoogleReview[]>([]);
  const [isLoadingGoogleReviews, setIsLoadingGoogleReviews] = useState(false);
  const [myReviewMap, setMyReviewMap] = useState<Record<string, boolean>>({});
  const [allReviews, setAllReviews] = useState<MyReview[]>([]);
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);

  const fetchRestaurants = async (keyword: string = '') => {
    setIsLoading(true);
    try {
      const query = keyword ? `${keyword} 식당` : '맛집';
      const res = await fetch(`/api/places?lat=${LAT}&lng=${LNG}&query=${encodeURIComponent(query)}`);
      const data = await res.json();
      const withDistance = (data.results || []).map((r: any) => ({
        ...r,
        distance: r.lat && r.lng ? getDistance(OFFICE_LAT, OFFICE_LNG, r.lat, r.lng) : null
      }));
      setRestaurants(withDistance);
      updateMapMarkers(withDistance);
    } catch (err) {
      console.error('식당 불러오기 실패:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchReviews = async (placeId: string) => {
    const { data: reviewData } = await supabase
      .from('restaurant_reviews')
      .select('*')
      .eq('place_id', placeId)
      .order('created_at', { ascending: false });
  
    if (!reviewData || reviewData.length === 0) {
      setReviews([]);
      return;
    }
  
    // user_id로 유저 정보 별도 조회
    const userIds = [...new Set(reviewData.map((r: any) => r.user_id))];
    const { data: userData } = await supabase
      .from('users')
      .select('id, name')
      .in('id', userIds);
  
    const userMap: Record<string, any> = {};
    (userData || []).forEach((u: any) => { userMap[u.id] = u; });
  
    const merged = reviewData.map((r: any) => ({
      ...r,
      user: userMap[r.user_id] || null
    }));
  
    setReviews(merged);
  };

  const fetchGoogleReviews = async (placeId: string) => {
    setIsLoadingGoogleReviews(true);
    try {
      const res = await fetch(`/api/places/reviews?placeId=${encodeURIComponent(placeId)}`);
      const data = await res.json();
      setGoogleReviews(data.reviews || []);
    } catch (err) {
      console.error('구글 리뷰 불러오기 실패:', err);
      setGoogleReviews([]);
    } finally {
      setIsLoadingGoogleReviews(false);
    }
  };

  const fetchMyReviews = async () => {
    const { data } = await supabase
      .from('restaurant_reviews')
      .select('place_id')
      .eq('user_id', user.id);
    const map: Record<string, boolean> = {};
    (data || []).forEach((r: any) => { map[r.place_id] = true; });
    setMyReviewMap(map);
    const { data: allData } = await supabase.from('restaurant_reviews').select('*');
    setAllReviews(allData || []);
  };

  const initMap = () => {
    if (!mapRef.current || mapInstanceRef.current) return;
    const google = (window as any).google;
    if (!google) return;
    const map = new google.maps.Map(mapRef.current, {
      center: { lat: LAT, lng: LNG },
      zoom: 16,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
      styles: [{ featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] }]
    });
    new google.maps.Marker({
      position: { lat: OFFICE_LAT, lng: OFFICE_LNG },
      map,
      title: '랭디 오피스',
      icon: {
        url: '/Langdy.png',
        scaledSize: new google.maps.Size(40, 40),
        anchor: new google.maps.Point(20, 20),
      },
      zIndex: 999
    });
    mapInstanceRef.current = map;
  };

  const updateMapMarkers = (restaurantList: Restaurant[]) => {
    const google = (window as any).google;
    if (!google || !mapInstanceRef.current) return;
    markersRef.current.forEach(m => m.setMap(null));
    markersRef.current = [];
    restaurantList.forEach((r, idx) => {
      if (!r.lat || !r.lng) return;
      const marker = new google.maps.Marker({
        position: { lat: r.lat, lng: r.lng },
        map: mapInstanceRef.current,
        title: r.name,
        label: { text: String(idx + 1), color: 'white', fontSize: '11px', fontWeight: 'bold' },
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 14,
          fillColor: '#f97316',
          fillOpacity: 1,
          strokeColor: '#fff',
          strokeWeight: 2,
        }
      });
      marker.addListener('click', () => handleSelectRestaurant(r));
      markersRef.current.push(marker);
    });
  };

  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY;
    const tryInitMap = () => {
      setTimeout(() => {
        if (mapRef.current && !mapInstanceRef.current) initMap();
      }, 100);
    };
    if ((window as any).google?.maps) { tryInitMap(); return; }
    if (document.querySelector('script[src*="maps.googleapis.com/maps/api/js"]')) {
      const check = setInterval(() => {
        if ((window as any).google?.maps) { clearInterval(check); tryInitMap(); }
      }, 100);
      return;
    }
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&language=ko`;
    script.async = true;
    script.onload = tryInitMap;
    document.head.appendChild(script);
  }, []);

  useEffect(() => { fetchRestaurants(); fetchMyReviews(); }, []);
  useEffect(() => { fetchRestaurants(selectedCategory); }, [selectedCategory]);

  const handleSelectRestaurant = async (restaurant: Restaurant) => {
    setSelectedRestaurant(restaurant);
    setReviewTab('google');
    setShowReviewModal(true);
    if (mapInstanceRef.current && restaurant.lat && restaurant.lng) {
      mapInstanceRef.current.panTo({ lat: restaurant.lat, lng: restaurant.lng });
      mapInstanceRef.current.setZoom(17);
    }
    await Promise.all([
      fetchReviews(restaurant.place_id),
      fetchGoogleReviews(restaurant.place_id),
    ]);
  };

  const handleAddReview = async () => {
    if (!newReview.comment.trim() || !selectedRestaurant) return;
    const { error } = await supabase
      .from('restaurant_reviews')
      .insert([{
        place_id: selectedRestaurant.place_id,
        place_name: selectedRestaurant.name,
        user_id: user.id,
        rating: newReview.rating,
        comment: newReview.comment.trim()
      }]);
    if (!error) {
      setNewReview({ rating: 5, comment: '' });
      await fetchReviews(selectedRestaurant.place_id);
      await fetchMyReviews();
    }
  };

  const handleDeleteReview = async (reviewId: string) => {
    await supabase.from('restaurant_reviews').delete().eq('id', reviewId);
    if (selectedRestaurant) await fetchReviews(selectedRestaurant.place_id);
    await fetchMyReviews();
  };

  const getPhotoUrl = (photoRef: string) => `/api/places/photo?ref=${photoRef}`;

  const getPriceLevel = (level?: string) => {
    const map: Record<string, string> = {
      'PRICE_LEVEL_INEXPENSIVE': '₩',
      'PRICE_LEVEL_MODERATE': '₩₩',
      'PRICE_LEVEL_EXPENSIVE': '₩₩₩',
      'PRICE_LEVEL_VERY_EXPENSIVE': '₩₩₩₩',
    };
    return level ? map[level] || '' : '';
  };

  return (
    <div className="flex flex-col h-screen">

      {/* 상단 헤더 */}
      <div className="px-6 pt-6 pb-4 bg-white border-b border-gray-100">
        <h1 className="text-2xl font-black text-gray-900 mb-1">주변 음식점 🍜</h1>
        <p className="text-sm text-gray-400">낙성대역 4번출구 주변 맛집이에요!</p>
        <div className="flex gap-2 flex-wrap mt-3">
          {CATEGORIES.map(cat => (
            <button
              key={cat.value}
              onClick={() => setSelectedCategory(cat.value)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all
                ${selectedCategory === cat.value
                  ? 'bg-orange-500 text-white'
                  : 'bg-gray-100 text-gray-500 hover:bg-orange-50 hover:text-orange-500'}`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">

        {/* 좌측: 식당 목록 */}
        <div className="w-80 overflow-y-auto border-r border-gray-100 bg-white">
          {isLoading ? (
            <div className="flex items-center justify-center h-40">
              <div className="text-3xl animate-spin">🍊</div>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {restaurants.map((restaurant, idx) => (
                <button
                  key={restaurant.place_id}
                  onClick={() => handleSelectRestaurant(restaurant)}
                  className={`w-full text-left p-4 hover:bg-orange-50 transition-all
                    ${selectedRestaurant?.place_id === restaurant.place_id
                      ? 'bg-orange-50 border-l-4 border-orange-500'
                      : ''}`}
                >
                  <div className="flex gap-3">
                    <div className="relative flex-shrink-0">
                      <div className="w-16 h-16 rounded-xl overflow-hidden bg-gray-100">
                        {restaurant.photos?.[0] ? (
                          <img
                            src={getPhotoUrl(restaurant.photos[0].photo_reference)}
                            alt={restaurant.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-2xl">🍽️</div>
                        )}
                      </div>
                      <div className="absolute -top-1 -left-1 w-5 h-5 bg-orange-500 text-white rounded-full flex items-center justify-center text-xs font-bold">
                        {idx + 1}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-gray-800 text-sm truncate">{restaurant.name}</p>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        <span className="text-xs text-yellow-500">⭐ {restaurant.rating}</span>
                        <span className="text-xs text-gray-300">({restaurant.user_ratings_total})</span>
                        {restaurant.price_level && (
                          <span className="text-xs text-gray-400">{getPriceLevel(restaurant.price_level)}</span>
                        )}
                        {(() => {
                          const placeReviews = allReviews.filter(r => r.place_id === restaurant.place_id);
                          if (placeReviews.length === 0) return null;
                          const avg = (placeReviews.reduce((s, r) => s + r.rating, 0) / placeReviews.length).toFixed(1);
                          return (
<span className="text-xs bg-orange-100 text-orange-500 px-1.5 py-0.5 rounded-full font-bold flex items-center gap-1">
  <img src="/langdyconnect.png" className="w-3 h-3 inline-block" />
  {avg} ({placeReviews.length})
</span>
                          );
                        })()}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        {restaurant.opening_hours && (
                          <span className={`text-xs font-semibold
                            ${restaurant.opening_hours.open_now ? 'text-green-500' : 'text-red-400'}`}>
                            {restaurant.opening_hours.open_now ? '● 영업중' : '● 영업종료'}
                          </span>
                        )}
                        {restaurant.distance && (
                          <span className="text-xs text-gray-400">
                            🚶 {restaurant.distance}m · 약 {Math.ceil(restaurant.distance / 67)}분
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 중앙: 지도 */}
        <div className="flex-1 relative">
          <div ref={mapRef} className="w-full h-full" />
        </div>

      </div>

      {/* 리뷰 모달 */}
      {showReviewModal && selectedRestaurant && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={() => setShowReviewModal(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[80vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 모달 헤더 */}
            <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-gray-100">
              <div>
                <h2 className="font-black text-gray-900 text-base">{selectedRestaurant.name}</h2>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-yellow-500">⭐ {selectedRestaurant.rating}</span>
                  {selectedRestaurant.opening_hours && (
                    <span className={`text-xs font-semibold
                      ${selectedRestaurant.opening_hours.open_now ? 'text-green-500' : 'text-red-400'}`}>
                      {selectedRestaurant.opening_hours.open_now ? '● 영업중' : '● 영업종료'}
                    </span>
                  )}
                  {selectedRestaurant.distance && (
                    <span className="text-xs text-gray-400">
                      🚶 {selectedRestaurant.distance}m
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={() => setShowReviewModal(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {/* 탭 */}
            <div className="flex px-5 pt-3 gap-2">
              <button
                onClick={() => setReviewTab('google')}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold transition-all
                  ${reviewTab === 'google'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-500 hover:bg-blue-50 hover:text-blue-500'}`}
              >
                🌐 구글 리뷰
              </button>
              <button
                onClick={() => setReviewTab('langdy')}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold transition-all
                  ${reviewTab === 'langdy'
                    ? 'bg-orange-500 text-white'
                    : 'bg-gray-100 text-gray-500 hover:bg-orange-50 hover:text-orange-500'}`}
              >
                🍊 랭디 리뷰
                {reviews.length > 0 && (
                  <span className={`ml-1 px-1.5 py-0.5 rounded-full text-xs
                    ${reviewTab === 'langdy' ? 'bg-white/30 text-white' : 'bg-orange-100 text-orange-500'}`}>
                    {reviews.length}
                  </span>
                )}
              </button>
            </div>

            {/* 탭 콘텐츠 */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">

              {/* 구글 리뷰 탭 */}
              {reviewTab === 'google' && (
                <>
                  {isLoadingGoogleReviews ? (
                    <div className="flex items-center justify-center py-10">
                      <div className="text-3xl animate-spin">🌐</div>
                    </div>
                  ) : googleReviews.length > 0 ? (
                    googleReviews.map((review: GoogleReview, idx: number) => (
                      <div key={idx} className="bg-gray-50 rounded-xl p-3">
                        <div className="flex items-center gap-2 mb-1.5">
                          {review.authorAttribution?.photoUri ? (
                            <img
                              src={review.authorAttribution.photoUri}
                              alt={review.authorAttribution.displayName}
                              className="w-7 h-7 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-7 h-7 bg-blue-100 rounded-full flex items-center justify-center text-blue-500 font-bold text-xs">
                              {review.authorAttribution?.displayName?.[0] || 'G'}
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-gray-700 truncate">
                              {review.authorAttribution?.displayName || '익명'}
                            </p>
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs text-yellow-400">
                                {'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}
                              </span>
                              {review.relativePublishTimeDescription && (
                                <span className="text-xs text-gray-400">{review.relativePublishTimeDescription}</span>
                              )}
                            </div>
                          </div>
                        </div>
                        {review.text?.text && (
                          <p className="text-xs text-gray-600 leading-relaxed">{review.text.text}</p>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-10">
                      <p className="text-3xl mb-2">🌐</p>
                      <p className="text-xs text-gray-400">구글 리뷰가 없어요!</p>
                    </div>
                  )}
                </>
              )}

              {/* 랭디 리뷰 탭 */}
              {reviewTab === 'langdy' && (
                <>
                  {!myReviewMap[selectedRestaurant.place_id] && (
                    <div className="bg-orange-50 rounded-xl p-3 space-y-2">
                      <p className="text-xs font-bold text-gray-700">리뷰 작성</p>
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map(star => (
                          <button
                            key={star}
                            onClick={() => setNewReview({...newReview, rating: star})}
                            className={`text-xl ${star <= newReview.rating ? 'text-yellow-400' : 'text-gray-200'}`}
                          >
                            ★
                          </button>
                        ))}
                      </div>
                      <textarea
                        className="w-full p-2 border rounded-lg text-xs text-black outline-none focus:ring-2 focus:ring-orange-400 resize-none"
                        placeholder="맛은 어땠나요?"
                        rows={3}
                        value={newReview.comment}
                        onChange={(e) => setNewReview({...newReview, comment: e.target.value})}
                      />
                      <button
                        onClick={handleAddReview}
                        className="w-full bg-orange-500 text-white py-2 rounded-lg text-xs font-bold"
                      >
                        등록
                      </button>
                    </div>
                  )}
                  {reviews.length > 0 ? reviews.map((review: MyReview) => (
                    <div key={review.id} className="bg-gray-50 rounded-xl p-3">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 bg-orange-100 rounded-full flex items-center justify-center text-orange-500 font-bold text-xs">
                            {review.user?.name?.[0]}
                          </div>
                          <span className="text-xs font-bold text-gray-700">{review.user?.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-yellow-400">{'★'.repeat(review.rating)}</span>
                          {review.user_id === user.id && (
                            <button
                              onClick={() => handleDeleteReview(review.id)}
                              className="text-xs text-gray-300 hover:text-red-400"
                            >
                              삭제
                            </button>
                          )}
                        </div>
                      </div>
                      <p className="text-xs text-gray-600">{review.comment}</p>
                    </div>
                  )) : (
                    <div className="text-center py-10">
                      <p className="text-3xl mb-2">🍊</p>
                      <p className="text-xs text-gray-400">아직 팀원 리뷰가 없어요!</p>
                      <p className="text-xs text-gray-300 mt-1">첫 번째 리뷰를 남겨보세요</p>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}