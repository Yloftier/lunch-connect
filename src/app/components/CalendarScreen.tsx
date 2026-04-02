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
  restaurant: string;
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
  const [newReview, setNewReview] = useState({ content: '', restaurant: '' });
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [monthStats, setMonthStats] = useState({ total: 0, myTurn: 0 });

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

setMonthStats({ total: completed, myTurn: myGroupCount });
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
        .select('*, author:author_id(id, name)')
        .eq('matching_group_id', event.matching_group_id);
      setReviews(reviewData || []);

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
        restaurant: newReview.restaurant.trim()
      }])
      .select('*, author:author_id(id, name)')
      .single();
    if (!error && data) {
      setReviews(prev => [...prev, data]);
      setNewReview({ content: '', restaurant: '' });
      setShowReviewForm(false);
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
                  {turn && (
                    <span className={`text-xs mt-0.5 font-medium truncate w-full text-center px-1
                      ${isSelected ? 'text-white' : turn.status === '완료' ? 'text-orange-500' : 'text-gray-400'}`}>
                      {(turn.matcher as any)?.name}
                    </span>
                  )}
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
      <input
        className="w-full p-2 border rounded-lg text-xs text-black outline-none focus:ring-2 focus:ring-orange-400"
        placeholder="식당 이름"
        value={newReview.restaurant}
        onChange={(e) => setNewReview({...newReview, restaurant: e.target.value})}
      />
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
        {review.restaurant && (
          <span className="text-xs text-orange-500">📍 {review.restaurant}</span>
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
      </div>
    </div>
  );
}