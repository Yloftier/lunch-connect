'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface CalendarEvent {
  id: string;
  date: string;
  type: string;
  title: string;
  matching_group_id: string;
}

interface MatchingTurn {
  date: string;
  status: string;
  matcher: { id: string; name: string; team: string; };
}

interface MatchingGroup {
  id: string;
  date: string;
  matcher_id: string;
  members: any[];
}

interface Review {
  id: string;
  author_id: string;
  content: string;
  place_id?: string;
  place_name?: string;
  created_at: string;
  author?: any;
}

interface Comment {
  id: string;
  author_id: string;
  content: string;
  created_at: string;
  author?: any;
}

interface Props {
  user: any;
}

const DAYS = ['일', '월', '화', '수', '목', '금', '토'];

export default function CalendarScreen({ user }: Props) {
  const today = new Date();
  const [currentDate, setCurrentDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedDate, setSelectedDate] = useState<string | null>(today.toISOString().split('T')[0]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [turns, setTurns] = useState<MatchingTurn[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [selectedTurn, setSelectedTurn] = useState<MatchingTurn | null>(null);
  const [matchingGroup, setMatchingGroup] = useState<MatchingGroup | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [newReview, setNewReview] = useState({ content: '', restaurant: '', place_id: '', place_name: '', rating: 5 });
const [restaurantSearch, setRestaurantSearch] = useState('');
const [restaurantResults, setRestaurantResults] = useState<any[]>([]);
const [isSearchingRestaurant, setIsSearchingRestaurant] = useState(false);
const [showRestaurantModal, setShowRestaurantModal] = useState(false);
const [modalRestaurant, setModalRestaurant] = useState<{ place_id: string; place_name: string } | null>(null);
const [modalGoogleReviews, setModalGoogleReviews] = useState<any[]>([]);
const [modalLangdyReviews, setModalLangdyReviews] = useState<any[]>([]);
const [modalReviewTab, setModalReviewTab] = useState<'google' | 'langdy'>('google');
const [isLoadingModalReviews, setIsLoadingModalReviews] = useState(false);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [monthStats, setMonthStats] = useState({ total: 0, myTurn: 0 });
  const [restaurantMap, setRestaurantMap] = useState<Record<string, string>>({});
  const [birthdayMap, setBirthdayMap] = useState<Record<string, string[]>>({});

  // 번개 관련 상태
  const [lightningEvents, setLightningEvents] = useState<any[]>([]);
  const [showLightningModal, setShowLightningModal] = useState(false);
  const [lightningTitle, setLightningTitle] = useState('번개');
  const [lightningDate, setLightningDate] = useState('');
  const [lightningTime, setLightningTime] = useState('');
  const [lightningUserSearch, setLightningUserSearch] = useState('');
  const [lightningUserResults, setLightningUserResults] = useState<any[]>([]);
  const [lightningSelectedUsers, setLightningSelectedUsers] = useState<any[]>([]);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [isCreatingLightning, setIsCreatingLightning] = useState(false);
  const [lightningTopic, setLightningTopic] = useState('');

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const calendarDays: (number | null)[] = [
    ...Array.from({ length: firstDay }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1)
  ];

  const fetchEvents = async () => {
    const startDate = `${year}-${String(month + 1).padStart(2, '0')}-01`;
    const endDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`;

    // calendar_events 불러오기
    const { data: eventData } = await supabase
      .from('calendar_events')
      .select('*')
      .gte('date', startDate)
      .lte('date', endDate);

    setEvents(eventData || []);

    setEvents(eventData || []);

    // 후기에서 식당 이름 불러오기
    const groupIds = (eventData || [])
      .filter(e => e.matching_group_id)
      .map(e => e.matching_group_id);
    
    if (groupIds.length > 0) {
      const { data: reviewData } = await supabase
      .from('matching_reviews')
      .select('matching_group_id, place_name')
      .in('matching_group_id', groupIds);
    setRestaurantMap(
      Object.fromEntries(
        (reviewData || [])
          .filter(r => r.place_name)
          .map(r => [r.matching_group_id, r.place_name])
      )
    );
    }
    
    
    // matching_turns 불러오기 (매칭자 이름 포함)
    const { data: turnData } = await supabase
    .from('matching_turns')
    .select('date, status, matcher_id')
    .gte('date', startDate)
    .lte('date', endDate);
  
  // 매칭자 정보 별도로 가져오기
  const matcherIds = [...new Set(turnData?.map(t => t.matcher_id) || [])];
  const { data: matcherData } = await supabase
    .from('users')
    .select('id, name, team')
    .in('id', matcherIds);
  
  const turnsWithMatcher = (turnData || []).map(t => ({
    ...t,
    matcher: matcherData?.find(m => m.id === t.matcher_id) || null
  }));
  
  setTurns(turnsWithMatcher as any);

// 통계
const completed = turnData?.filter(t => t.status === '완료').length || 0;

// 내가 속한 매칭그룹 날 카운팅
const { data: allGroups } = await supabase
  .from('matching_groups')
  .select('date, members')
  .gte('date', startDate)
  .lte('date', endDate);

// 중복 날짜 제거 + 내가 속한 그룹만 카운팅
const uniqueDates = new Set(
    allGroups
      ?.filter(g => g.members?.some((m: any) => m.id === user.id))
      .map(g => g.date)
  );
  const myGroupCount = uniqueDates.size;

// 생일자 불러오기
const { data: allUsers } = await supabase
  .from('users')
  .select('id, name, birth');

const bMap: Record<string, string[]> = {};
(allUsers || []).forEach(u => {
  if (!u.birth || u.birth.length !== 8) return;
  const monthDay = u.birth.slice(4, 8);
  const dateKey = `${year}-${u.birth.slice(4, 6)}-${u.birth.slice(6, 8)}`;
  if (!bMap[dateKey]) bMap[dateKey] = [];
  bMap[dateKey].push(u.name);
});
setBirthdayMap(bMap);

  setMonthStats({ total: completed, myTurn: myGroupCount });

  // 번개 이벤트 fetch
  const { data: lightningRes } = await supabase
    .from('lightning_events')
    .select('*')
    .gte('date', startDate)
    .lte('date', endDate);

  // 번개 참가자 fetch
  const lightningIds = (lightningRes || []).map((e: any) => e.id);
  let lightningWithParticipants: any[] = [];
  if (lightningIds.length > 0) {
    const { data: lpData } = await supabase
      .from('lightning_participants')
      .select('*')
      .in('event_id', lightningIds);

    const lpUserIds = [...new Set((lpData || []).map((p: any) => p.user_id))];
    const { data: lpUsers } = await supabase
      .from('users')
      .select('id, name, team')
      .in('id', lpUserIds.length > 0 ? lpUserIds : ['none']);

    const lpUserMap: Record<string, any> = {};
    (lpUsers || []).forEach((u: any) => { lpUserMap[u.id] = u; });

    lightningWithParticipants = (lightningRes || []).map((ev: any) => ({
      ...ev,
      participants: (lpData || [])
        .filter((p: any) => p.event_id === ev.id)
        .map((p: any) => ({ ...p, user: lpUserMap[p.user_id] || null })),
    }));
  } else {
    lightningWithParticipants = lightningRes || [];
  }
  setLightningEvents(lightningWithParticipants);

  // 전체 유저 (번개 초대용)
  const { data: usersData } = await supabase
    .from('users')
    .select('id, name, team, gender')
    .neq('id', user.id);
  setAllUsers(usersData || []);
  };

  const fetchDateDetail = async (dateStr: string) => {
    setIsLoading(true);
    setMatchingGroup(null);
    setReviews([]);
    setComments([]);
    setSelectedEvent(null);
    setSelectedTurn(null);

    const event = events.find(e => e.date === dateStr);
    const turn = turns.find(t => t.date === dateStr);
    setSelectedEvent(event || null);
    setSelectedTurn(turn || null);

    if (event?.matching_group_id) {
      const { data: groupData } = await supabase
        .from('matching_groups')
        .select('*')
        .eq('id', event.matching_group_id)
        .single();
      setMatchingGroup(groupData);

      const { data: reviewData } = await supabase
      .from('matching_reviews')
      .select('*')
      .eq('matching_group_id', event.matching_group_id);
    
    const authorIds = [...new Set((reviewData || []).map((r: any) => r.author_id))];
    let authorMap: Record<string, any> = {};
    if (authorIds.length > 0) {
      const { data: authorData } = await supabase
        .from('users')
        .select('id, name')
        .in('id', authorIds);
      (authorData || []).forEach((u: any) => { authorMap[u.id] = u; });
    }
    setReviews((reviewData || []).map((r: any) => ({ ...r, author: authorMap[r.author_id] || null })));

      const { data: commentData } = await supabase
        .from('comments')
        .select('*, author:author_id(id, name)')
        .eq('event_id', event.id)
        .order('created_at', { ascending: true });
      setComments(commentData || []);
    }
    setIsLoading(false);
  };

  useEffect(() => { fetchEvents(); }, [currentDate]);
  useEffect(() => { if (selectedDate) fetchDateDetail(selectedDate); }, [selectedDate, events]);

  const handleAddComment = async () => {
    if (!newComment.trim() || !selectedEvent) return;
    const { data, error } = await supabase
      .from('comments')
      .insert([{ event_id: selectedEvent.id, author_id: user.id, content: newComment.trim() }])
      .select('*, author:author_id(id, name)')
      .single();
    if (!error && data) { setComments(prev => [...prev, data]); setNewComment(''); }
  };

  const handleDeleteComment = async (commentId: string) => {
    await supabase.from('comments').delete().eq('id', commentId);
    setComments(prev => prev.filter(c => c.id !== commentId));
  };

  const handleAddReview = async () => {
    if (!newReview.content.trim() || !selectedEvent) return;
    const { data, error } = await supabase
    .from('matching_reviews')
    .insert([{
      matching_group_id: selectedEvent.matching_group_id,
      author_id: user.id,
      content: newReview.content.trim(),
      place_id: newReview.place_id || null,
      place_name: newReview.place_name || null,
      rating: newReview.rating,
    }])
    .select('*')
    .single();

  // restaurant_reviews에도 동시 저장 (place_id 있을 때만)
  if (!error && newReview.place_id) {
    await supabase
      .from('restaurant_reviews')
      .insert([{
        place_id: newReview.place_id,
        place_name: newReview.place_name,
        user_id: user.id,
        rating: newReview.rating,
        comment: newReview.content.trim(),
      }]);
  }
      if (!error && data) {
        // 유저 정보 별도 조회
        const { data: authorData } = await supabase
          .from('users')
          .select('id, name')
          .eq('id', user.id)
          .single();
        setReviews(prev => [...prev, { ...data, author: authorData }]);
        setNewReview({ content: '', restaurant: '', place_id: '', place_name: '', rating: 5 });
        setRestaurantSearch('');
        setRestaurantResults([]);
        setShowReviewForm(false);
      }
  };
  
  const searchRestaurant = async (keyword: string) => {
    if (!keyword.trim()) { setRestaurantResults([]); return; }
    setIsSearchingRestaurant(true);
    try {
      const res = await fetch(`/api/places?lat=37.4793&lng=126.9647&query=${encodeURIComponent(keyword)}`);
      const data = await res.json();
      setRestaurantResults(data.results?.slice(0, 5) || []);
    } catch {
      setRestaurantResults([]);
    } finally {
      setIsSearchingRestaurant(false);
    }
  };
  
  const handleOpenRestaurantModal = async (placeId: string, placeName: string) => {
    setModalRestaurant({ place_id: placeId, place_name: placeName });
    setShowRestaurantModal(true);
    setModalReviewTab('google');
    setIsLoadingModalReviews(true);
    try {
      const [googleRes, langdyRes] = await Promise.all([
        fetch(`/api/places/reviews?placeId=${encodeURIComponent(placeId)}`),
        supabase.from('restaurant_reviews').select('*, user:user_id(id, name)').eq('place_id', placeId)
      ]);
      const googleData = await googleRes.json();
      setModalGoogleReviews(googleData.reviews || []);
  
      const langdyData = langdyRes.data || [];
      const userIds = [...new Set(langdyData.map((r: any) => r.user_id))];
      if (userIds.length > 0) {
        const { data: userData } = await supabase.from('users').select('id, name').in('id', userIds);
        const userMap: Record<string, any> = {};
        (userData || []).forEach((u: any) => { userMap[u.id] = u; });
        setModalLangdyReviews(langdyData.map((r: any) => ({ ...r, user: userMap[r.user_id] || null })));
      } else {
        setModalLangdyReviews([]);
      }
    } catch {
      setModalGoogleReviews([]);
      setModalLangdyReviews([]);
    } finally {
      setIsLoadingModalReviews(false);
    }
  };

  // 번개 유저 검색
  const handleLightningUserSearch = (query: string) => {
    setLightningUserSearch(query);
    if (!query.trim()) { setLightningUserResults([]); return; }
    const filtered = allUsers.filter(u =>
      u.name.includes(query) &&
      !lightningSelectedUsers.find(s => s.id === u.id)
    );
    setLightningUserResults(filtered.slice(0, 5));
  };

  const handleSelectLightningUser = (u: any) => {
    setLightningSelectedUsers(prev => [...prev, u]);
    setLightningUserSearch('');
    setLightningUserResults([]);
  };

  const handleRemoveLightningUser = (id: string) => {
    setLightningSelectedUsers(prev => prev.filter(u => u.id !== id));
  };

  // 번개 생성
  const handleCreateLightning = async () => {
    if (!lightningDate || lightningSelectedUsers.length === 0) {
      alert('날짜와 초대할 인원을 선택해주세요.');
      return;
    }
    setIsCreatingLightning(true);
    try {
      const res = await fetch('/api/lightning', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          creatorId: user.id,
          title: lightningTitle || '번개',
          topic: lightningTopic || null,
          date: lightningDate,
          time: lightningTime,
          invitedUserIds: lightningSelectedUsers.map(u => u.id),
        }),
      });
      const data = await res.json();
      if (!res.ok) { alert(data.error); return; }

      // 모달 닫고 초기화
      setShowLightningModal(false);
      setLightningTitle('번개');
      setLightningDate('');
      setLightningTime('');
      setLightningTopic('');
      setLightningSelectedUsers([]);
      await fetchEvents();
    } catch {
      alert('번개 생성 중 오류가 발생했어요.');
    } finally {
      setIsCreatingLightning(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr + 'T00:00:00');
    return `${d.getMonth() + 1}월 ${d.getDate()}일 (${DAYS[d.getDay()]})`;
  };

  return (
    <div className="flex gap-5 p-5 min-h-screen">

      {/* 좌측: 캘린더 */}
      <div className="flex-1">

        {/* 이번달 통계 */}
        <div className="grid grid-cols-2 gap-3 mb-5">
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <p className="text-xs text-gray-400">이번달 매칭 완료</p>
            <p className="text-2xl font-black text-orange-500 mt-1">{monthStats.total}회</p>
          </div>
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <p className="text-xs text-gray-400">팀원들과 즐거웠던 날 🧡</p>
            <p className="text-2xl font-black text-orange-500 mt-1">{monthStats.myTurn}회</p>
          </div>
        </div>

        {/* 캘린더 */}
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-6">
            <button onClick={() => setCurrentDate(new Date(year, month - 1, 1))}
              className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-500 text-lg">←</button>
            <h2 className="font-black text-gray-800 text-xl">{year}년 {month + 1}월</h2>
            <button onClick={() => setCurrentDate(new Date(year, month + 1, 1))}
              className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-500 text-lg">→</button>
          </div>

          {/* 요일 헤더 */}
          <div className="grid grid-cols-7 mb-2">
            {DAYS.map(day => (
              <div key={day} className={`text-center text-xs font-bold py-2
                ${day === '일' ? 'text-red-400' : day === '토' ? 'text-blue-400' : 'text-gray-400'}`}>
                {day}
              </div>
            ))}
          </div>

          {/* 날짜 그리드 */}
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((day, index) => {
              if (!day) return <div key={index} className="h-16" />;

              const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const turn = turns.find(t => t.date === dateStr);
              const isToday = dateStr === today.toISOString().split('T')[0];
              const isSelected = dateStr === selectedDate;
              const dayOfWeek = (firstDay + day - 1) % 7;

              // 날짜 배경색
              const getBgColor = () => {
                if (isSelected) return 'bg-orange-500 text-white';
                if (turn?.status === '완료') return 'bg-orange-50 border border-orange-200';
                if (turn?.status === '미실행') return 'bg-gray-50 border border-gray-200';
                if (isToday) return 'bg-orange-50';
                return 'hover:bg-gray-50';
              };

              // 날짜 숫자 색상
              const getDateColor = () => {
                if (isSelected) return 'text-white';
                if (dayOfWeek === 0) return 'text-red-400';
                if (dayOfWeek === 6) return 'text-blue-400';
                return 'text-gray-700';
              };

              return (
                <button
                  key={index}
                  onClick={() => setSelectedDate(dateStr)}
                  className={`h-16 flex flex-col items-center justify-start pt-2 rounded-xl transition-all ${getBgColor()}`}
                >
                  <span className={`text-sm font-bold ${getDateColor()}`}>{day}</span>
                  {/* 매칭자 이름 */}
{/* 매칭자 이름 */}
{turn && (
  <span className={`text-xs mt-0.5 font-medium truncate w-full text-center px-1
    ${isSelected ? 'text-white' : turn.status === '완료' ? 'text-orange-500' : 'text-gray-400'}`}>
    {(turn.matcher as any)?.name}
  </span>
)}

{/* 생일 도트 */}
{birthdayMap[dateStr] && (
  <span className={`text-xs truncate w-full text-center px-1
    ${isSelected ? 'text-white' : 'text-yellow-500'}`}>
    🎂 {birthdayMap[dateStr].join(', ')}
  </span>
)}

{/* 번개 표시 */}
{lightningEvents.filter(ev => ev.date === dateStr).map(ev => (
  <span key={ev.id}
    className={`text-xs font-bold px-1 rounded truncate w-full text-center block
      ${isSelected ? 'bg-yellow-300 text-yellow-900' : 'bg-yellow-400 text-white'}`}>
    ⚡ {ev.title}
  </span>
))}

{/* 식당 이름 */}
{turn && turn.status === '완료' && (() => {
  const event = events.find(e => e.date === dateStr);
  const restaurant = event ? restaurantMap[event.matching_group_id] : null;
  return restaurant ? (
    <span className={`text-xs truncate w-full text-center px-1
      ${isSelected ? 'text-orange-100' : 'text-gray-400'}`}>
      📍 {restaurant}
    </span>
  ) : null;
})()}
                </button>
              );
            })}
          </div>
        </div>

        {/* 범례 */}
        <div className="flex gap-4 mt-3 px-1">
          <div className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-orange-100 border border-orange-200" />
            <span className="text-xs text-gray-400">매칭완료</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-gray-100 border border-gray-200" />
            <span className="text-xs text-gray-400">매칭없음</span>
          </div>
        </div>
      </div>

      {/* 우측: 상세 패널 */}
      <div className="w-72 bg-white rounded-2xl shadow-sm p-5 self-start sticky top-5">
        <h3 className="font-bold text-gray-800 mb-1 text-sm">
          {selectedDate ? formatDate(selectedDate) : '날짜를 선택해주세요'}
        </h3>

{/* 생일자 표시 */}
{selectedDate && birthdayMap[selectedDate] && (
  <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 mb-3 flex items-center gap-2">
    <span className="text-lg">🎂</span>
    <div>
      <p className="text-xs font-bold text-yellow-600">오늘의 생일자</p>
      <p className="text-sm font-bold text-gray-800">{birthdayMap[selectedDate].join(', ')}님</p>
    </div>
  </div>
)}

        {/* 매칭자 표시 */}
        {selectedTurn && (
          <div className={`text-xs px-3 py-1.5 rounded-full inline-flex items-center gap-1 mb-4
            ${selectedTurn.status === '완료' ? 'bg-orange-100 text-orange-500' : 'bg-gray-100 text-gray-400'}`}>
            <span>매칭자: {(selectedTurn.matcher as any)?.name}</span>
            <span>{selectedTurn.status === '완료' ? '✅' : '❌'}</span>
          </div>
        )}

        {isLoading ? (
          <div className="text-center py-8">
            <div className="text-2xl animate-spin inline-block">🍊</div>
          </div>
        ) : selectedEvent ? (
          <>
            {/* 매칭그룹 */}
            {matchingGroup && (
              <div className="mb-5">
                <p className="text-xs text-gray-400 mb-2">매칭그룹</p>
                <div className="space-y-2">
                  {matchingGroup.members?.map((member: any) => (
                    <div key={member.id} className="flex items-center gap-2">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0
                        ${member.id === matchingGroup.matcher_id ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-600'}`}>
                        {member.name[0]}
                      </div>
                      <span className="text-sm text-gray-700">{member.name}</span>
                      {member.id === matchingGroup.matcher_id && (
                        <span className="text-xs bg-orange-100 text-orange-500 px-2 py-0.5 rounded-full ml-auto">매칭자</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

          {/* 후기 */}
<div className="mb-4">
  <div className="flex items-center justify-between mb-2">
    <p className="text-xs text-gray-400">후기</p>
    {/* 매칭그룹 멤버만 작성 가능 */}
    {matchingGroup?.members?.some((m: any) => m.id === user.id) && reviews.length === 0 && (
      <button onClick={() => setShowReviewForm(!showReviewForm)}
        className="text-xs text-orange-500 font-semibold">+ 작성</button>
    )}
  </div>

  {/* 비멤버에게 disabled 안내 */}
  {!matchingGroup?.members?.some((m: any) => m.id === user.id) && (
    <div className="bg-gray-50 rounded-xl p-3 mb-2 text-center">
      <p className="text-xs text-gray-300">오늘 참여한 사람만 작성 가능해요</p>
    </div>
  )}

{showReviewForm && matchingGroup?.members?.some((m: any) => m.id === user.id) && (
    <div className="bg-orange-50 rounded-xl p-3 mb-3 space-y-2">
      <div className="relative">
        <input
          className="w-full p-2 border rounded-lg text-xs text-black outline-none focus:ring-2 focus:ring-orange-400"
          placeholder="식당 이름 검색"
    value={restaurantSearch}
    onChange={(e) => {
      setRestaurantSearch(e.target.value);
      searchRestaurant(e.target.value);
    }}
  />
  {/* 선택된 식당 표시 */}
  {newReview.place_name && (
    <div className="flex items-center gap-1 mt-1">
      <span className="text-xs text-orange-500 font-bold">📍 {newReview.place_name}</span>
      <button
        onClick={() => setNewReview({...newReview, place_id: '', place_name: ''})}
        className="text-xs text-gray-300 hover:text-red-400"
      >✕</button>
    </div>
  )}
  {/* 검색 결과 드롭다운 */}
  {restaurantResults.length > 0 && !newReview.place_name && (
    <div className="absolute z-10 w-full bg-white border border-gray-200 rounded-lg shadow-lg mt-1 max-h-40 overflow-y-auto">
      {isSearchingRestaurant ? (
        <div className="p-2 text-xs text-center text-gray-400">검색 중...</div>
      ) : (
        restaurantResults.map((r: any) => (
          <button
            key={r.place_id}
            onClick={() => {
              setNewReview({...newReview, place_id: r.place_id, place_name: r.name});
              setRestaurantSearch(r.name);
              setRestaurantResults([]);
            }}
            className="w-full text-left px-3 py-2 hover:bg-orange-50 transition-all"
          >
            <p className="text-xs font-bold text-gray-800">{r.name}</p>
            <p className="text-xs text-gray-400 truncate">{r.vicinity}</p>
          </button>
        ))
      )}
    </div>
  )}
</div>
 {/* 별점 */}
 <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map(star => (
          <button
            key={star}
            onClick={() => setNewReview({...newReview, rating: star})}
            className={`text-xl ${star <= newReview.rating ? 'text-yellow-400' : 'text-gray-200'}`}
          >★</button>
        ))}
      </div>
      <textarea
        className="w-full p-2 border rounded-lg text-xs text-black outline-none focus:ring-2 focus:ring-orange-400 resize-none"
        placeholder="오늘 점심 어땠나요?"
        rows={3}
        value={newReview.content}
        onChange={(e) => setNewReview({...newReview, content: e.target.value})}
      />
      <button onClick={handleAddReview}
        className="w-full bg-orange-500 text-white py-2 rounded-lg text-xs font-bold">등록</button>
    </div>
  )}

  {reviews.length > 0 ? reviews.map(review => (
    <div key={review.id} className="bg-gray-50 rounded-xl p-3 mb-2">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-xs font-bold text-gray-700">{review.author?.name}</span>
        {review.place_name && (
  <button
  onClick={() => handleOpenRestaurantModal(review.place_id!, review.place_name!)}
    className="text-xs text-orange-500 hover:text-orange-600 hover:underline"
  >
    📍 {review.place_name}
  </button>
)}
      </div>
      <p className="text-xs text-gray-600">{review.content}</p>
    </div>
  )) : matchingGroup?.members?.some((m: any) => m.id === user.id) ? (
    <p className="text-xs text-gray-300 text-center py-2">아직 후기가 없어요. 첫 후기를 남겨보세요!</p>
  ) : null}
</div>
            {/* 댓글 */}
            <div>
              <p className="text-xs text-gray-400 mb-2">댓글 {comments.length > 0 ? `(${comments.length})` : ''}</p>
              <div className="space-y-2 mb-3 max-h-40 overflow-y-auto">
                {comments.map(comment => (
                  <div key={comment.id} className="flex items-start gap-2">
                    <div className="w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center text-xs font-bold text-gray-600 flex-shrink-0">
                      {comment.author?.name?.[0]}
                    </div>
                    <div className="flex-1">
                      <span className="text-xs font-bold text-gray-700">{comment.author?.name} </span>
                      <span className="text-xs text-gray-600">{comment.content}</span>
                    </div>
                    {comment.author_id === user.id && (
                      <button onClick={() => handleDeleteComment(comment.id)}
                        className="text-xs text-gray-300 hover:text-red-400 flex-shrink-0">삭제</button>
                    )}
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  className="flex-1 p-2 border rounded-lg text-xs text-black outline-none focus:ring-2 focus:ring-orange-400"
                  placeholder="댓글 달기..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddComment()}
                />
                <button onClick={handleAddComment}
                  className="bg-orange-500 text-white px-3 py-2 rounded-lg text-xs font-bold">등록</button>
              </div>
            </div>
          </>
        ) : selectedTurn ? (
          <div className="text-center py-8">
            <span className="text-3xl">😢</span>
            <p className="text-gray-500 text-sm mt-2 font-semibold">매칭이 없었던 날이에요</p>
            <p className="text-gray-400 text-xs mt-1">{(selectedTurn.matcher as any)?.name}님이 매칭자였어요</p>
          </div>
        ) : (
          <div className="text-center py-8">
            <span className="text-3xl">📭</span>
            <p className="text-gray-400 text-sm mt-2">이날은 일정이 없어요</p>
          </div>
        )}

        {/* 번개 목록 */}
        {selectedDate && lightningEvents.filter(ev => ev.date === selectedDate).length > 0 && (
          <div className="mt-4 border-t border-gray-100 pt-4">
            <p className="text-xs text-gray-400 mb-2">⚡ 번개</p>
            <div className="space-y-2">
              {lightningEvents.filter(ev => ev.date === selectedDate).map(ev => {
                const myParticipation = ev.participants?.find((p: any) => p.user_id === user.id);
                const isApproved = myParticipation?.status === 'approved';
                const isCreator = ev.creator_id === user.id;

                const handleJoinOrCancel = async (action: 'join' | 'cancel') => {
                  await fetch('/api/lightning/respond', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ userId: user.id, eventId: ev.id, action }),
                  });
                  await fetchEvents();
                };

                return (
                  <div key={ev.id} className="p-3 bg-yellow-50 rounded-xl border border-yellow-100">
                    {/* 제목 + 시간 */}
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-bold text-gray-800">{ev.title}</p>
                      {ev.time && <span className="text-xs text-gray-400">🕐 {ev.time}</span>}
                    </div>
                    {/* 주제 */}
                    {ev.topic && (
                      <p className="text-xs text-yellow-700 bg-yellow-100 rounded-lg px-2 py-1 mb-2 inline-block">
                        💬 {ev.topic}
                      </p>
                    )}
                    {/* 참가자 현황 */}
                    <div className="flex flex-wrap gap-1 mb-2">
                      {ev.participants?.map((p: any) => (
                        <span key={p.id}
                          className={`text-xs px-2 py-0.5 rounded-full border
                            ${p.status === 'approved' ? 'bg-green-50 text-green-600 border-green-200' :
                              p.status === 'rejected' ? 'bg-red-50 text-red-400 border-red-200' :
                              'bg-gray-50 text-gray-400 border-gray-200'}`}>
                          {p.user?.name} {p.status === 'approved' ? '✅' : p.status === 'rejected' ? '❌' : '⏳'}
                        </span>
                      ))}
                    </div>
                    {/* 참여/취소 버튼 */}
                    {!isCreator && (
                      isApproved ? (
                        <button
                          onClick={() => handleJoinOrCancel('cancel')}
                          className="w-full text-xs py-1.5 bg-gray-100 text-gray-500 rounded-lg hover:bg-red-50 hover:text-red-400 transition-all font-semibold">
                          참여 취소
                        </button>
                      ) : !myParticipation || myParticipation.status === 'rejected' ? (
                        <button
                          onClick={() => handleJoinOrCancel('join')}
                          className="w-full text-xs py-1.5 bg-yellow-400 text-white rounded-lg hover:bg-yellow-500 transition-all font-bold">
                          ⚡ 참여하기
                        </button>
                      ) : null
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 번개 추가 버튼 */}
        {selectedDate && (
          <button
            onClick={() => {
              setLightningDate(selectedDate);
              setShowLightningModal(true);
            }}
            className="w-full mt-4 py-2.5 border-2 border-dashed border-yellow-300 text-yellow-500 rounded-xl text-sm font-bold hover:bg-yellow-50 transition-all"
          >
            ⚡ 번개 추가
          </button>
        )}
      </div>

      {/* 번개 생성 모달 */}
      {showLightningModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={() => setShowLightningModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4"
            onClick={e => e.stopPropagation()}>
            {/* 헤더 */}
            <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-gray-100">
              <h2 className="font-black text-gray-900 text-base">⚡ 번개 만들기</h2>
              <button onClick={() => setShowLightningModal(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-500 text-sm font-bold">✕</button>
            </div>

            <div className="p-5 space-y-4">
              {/* 제목 */}
              <div>
                <label className="text-xs text-gray-500 font-semibold mb-1 block">제목</label>
                <input
                  className="w-full p-3 border border-gray-200 rounded-xl text-sm text-black outline-none focus:ring-2 focus:ring-yellow-400"
                  placeholder="번개, 급 술약속, 카페 등"
                  value={lightningTitle}
                  onChange={e => setLightningTitle(e.target.value)}
                />
              </div>

              {/* 날짜 + 시간 */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500 font-semibold mb-1 block">날짜</label>
                  <input type="date"
                    className="w-full p-3 border border-gray-200 rounded-xl text-sm text-black outline-none focus:ring-2 focus:ring-yellow-400"
                    value={lightningDate}
                    onChange={e => setLightningDate(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 font-semibold mb-1 block">시간 (선택)</label>
                  <input type="time"
                    className="w-full p-3 border border-gray-200 rounded-xl text-sm text-black outline-none focus:ring-2 focus:ring-yellow-400"
                    value={lightningTime}
                    onChange={e => setLightningTime(e.target.value)}
                  />
                </div>
              </div>

              {/* 번개 주제 (선택) */}
              <div>
                <label className="text-xs text-gray-500 font-semibold mb-1 block">주제 <span className="text-gray-300 font-normal">(선택)</span></label>
                <input
                  className="w-full p-3 border border-gray-200 rounded-xl text-sm text-black outline-none focus:ring-2 focus:ring-yellow-400"
                  placeholder="예) 치맥, 보드게임, 퇴근 후 한 잔..."
                  value={lightningTopic}
                  onChange={e => setLightningTopic(e.target.value)}
                />
              </div>

              {/* 인원 검색 */}
              <div>
                <label className="text-xs text-gray-500 font-semibold mb-1 block">초대할 인원</label>
                <div className="relative">
                  <input
                    className="w-full p-3 border border-gray-200 rounded-xl text-sm text-black outline-none focus:ring-2 focus:ring-yellow-400"
                    placeholder="이름으로 검색..."
                    value={lightningUserSearch}
                    onChange={e => handleLightningUserSearch(e.target.value)}
                  />
                  {lightningUserResults.length > 0 && (
                    <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-xl shadow-lg z-10 mt-1">
                      {lightningUserResults.map(u => (
                        <button key={u.id}
                          onClick={() => handleSelectLightningUser(u)}
                          className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-yellow-50 text-left">
                          <div className="w-7 h-7 bg-yellow-100 rounded-full flex items-center justify-center text-yellow-600 font-bold text-xs">
                            {u.name[0]}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-gray-800">{u.name}</p>
                            <p className="text-xs text-gray-400">{u.team}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {/* 선택된 인원 */}
                {lightningSelectedUsers.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {lightningSelectedUsers.map(u => (
                      <span key={u.id}
                        className="flex items-center gap-1.5 bg-yellow-100 text-yellow-700 text-xs px-3 py-1 rounded-full font-semibold">
                        {u.name}
                        <button onClick={() => handleRemoveLightningUser(u.id)} className="text-yellow-500 hover:text-red-400">✕</button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* 하단 버튼 */}
            <div className="flex gap-3 px-5 pb-5">
              <button onClick={() => setShowLightningModal(false)}
                className="flex-1 py-3 bg-gray-100 text-gray-600 rounded-xl text-sm font-bold">
                닫기
              </button>
              <button
                onClick={handleCreateLightning}
                disabled={isCreatingLightning}
                className="flex-1 py-3 bg-yellow-400 text-white rounded-xl text-sm font-black shadow-sm hover:bg-yellow-500 transition-all disabled:opacity-50">
                {isCreatingLightning ? '생성 중...' : '⚡ 생성'}
              </button>
            </div>
          </div>
        </div>
      )}
{/* 식당 리뷰 모달 */}
{showRestaurantModal && modalRestaurant && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={() => setShowRestaurantModal(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[80vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-gray-100">
              <div>
                <h2 className="font-black text-gray-900 text-base">{modalRestaurant.place_name}</h2>
                <p className="text-xs text-gray-400 mt-0.5">리뷰를 확인해보세요</p>
              </div>
              <button
                onClick={() => setShowRestaurantModal(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 text-sm font-bold"
              >✕</button>
            </div>

            {/* 미니맵 */}
            <div className="relative mx-5 mt-3 rounded-xl overflow-hidden border border-gray-100" style={{ height: '150px' }}>
              <iframe
                title="지도"
                width="100%"
                height="100%"
                style={{ border: 0 }}
                loading="lazy"
                src={`https://www.google.com/maps/embed/v1/place?key=${process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY}&q=place_id:${modalRestaurant.place_id}&language=ko`}
              />
              <a
                href={`https://www.google.com/maps/place/?q=place_id:${modalRestaurant.place_id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="absolute top-2 right-2 bg-white/90 rounded-full px-2 py-1 text-xs font-bold text-gray-700 shadow-sm hover:bg-white transition-all"
              >
                지도 열기 ↗
              </a>
            </div>

            <div className="flex px-5 pt-3 gap-2">
              <button
                onClick={() => setModalReviewTab('google')}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold transition-all
                  ${modalReviewTab === 'google' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-500 hover:bg-blue-50 hover:text-blue-500'}`}
              >🌐 구글 리뷰</button>
              <button
                onClick={() => setModalReviewTab('langdy')}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold transition-all
                  ${modalReviewTab === 'langdy' ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-500 hover:bg-orange-50 hover:text-orange-500'}`}
              >🍊 랭디 리뷰</button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
              {isLoadingModalReviews ? (
                <div className="flex items-center justify-center py-10">
                  <div className="text-3xl animate-spin">🍊</div>
                </div>
              ) : modalReviewTab === 'google' ? (
                modalGoogleReviews.length > 0 ? modalGoogleReviews.map((review: any, idx: number) => (
                  <div key={idx} className="bg-gray-50 rounded-xl p-3">
                    <div className="flex items-center gap-2 mb-1.5">
                      {review.authorAttribution?.photoUri ? (
                        <img src={review.authorAttribution.photoUri} className="w-7 h-7 rounded-full object-cover" />
                      ) : (
                        <div className="w-7 h-7 bg-blue-100 rounded-full flex items-center justify-center text-blue-500 font-bold text-xs">
                          {review.authorAttribution?.displayName?.[0] || 'G'}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-gray-700 truncate">{review.authorAttribution?.displayName || '익명'}</p>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs text-yellow-400">{'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}</span>
                          {review.relativePublishTimeDescription && (
                            <span className="text-xs text-gray-400">{review.relativePublishTimeDescription}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    {review.text?.text && <p className="text-xs text-gray-600 leading-relaxed">{review.text.text}</p>}
                  </div>
                )) : (
                  <div className="text-center py-10">
                    <p className="text-3xl mb-2">🌐</p>
                    <p className="text-xs text-gray-400">구글 리뷰가 없어요!</p>
                  </div>
                )
              ) : (
                modalLangdyReviews.length > 0 ? modalLangdyReviews.map((review: any) => (
                  <div key={review.id} className="bg-gray-50 rounded-xl p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-6 h-6 bg-orange-100 rounded-full flex items-center justify-center text-orange-500 font-bold text-xs">
                        {review.user?.name?.[0]}
                      </div>
                      <span className="text-xs font-bold text-gray-700">{review.user?.name}</span>
                      <span className="text-xs text-yellow-400 ml-auto">{'★'.repeat(review.rating)}</span>
                    </div>
                    <p className="text-xs text-gray-600">{review.comment}</p>
                  </div>
                )) : (
                  <div className="text-center py-10">
                    <p className="text-3xl mb-2">🍊</p>
                    <p className="text-xs text-gray-400">아직 팀원 리뷰가 없어요!</p>
                  </div>
                )
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}