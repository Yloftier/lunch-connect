'use client';

import React, { useEffect, useState } from 'react';
import MatchingScreen from './MatchingScreen';
import CalendarScreen from './CalendarScreen';
import ClubScreen from './ClubScreen';
import { supabase } from '../lib/supabase';
import MyScreen from './MyScreen';

type Tab = 'matching' | 'calendar' | 'restaurant' | 'club' | 'my';

interface Props {
  user: any;
}

export default function MainScreen({ user }: Props) {
  const [clubBadge, setClubBadge] = useState(0);

  const fetchClubBadge = async () => {
    let count = 0;

    // 1. 내가 속한 동아리 확인
    const { data: myMemberships } = await supabase
      .from('club_members')
      .select('club_id, role')
      .eq('user_id', user.id)
      .eq('status', '승인');

    if (!myMemberships || myMemberships.length === 0) {
      setClubBadge(0);
      return;
    }

    // 2. 회장인 경우 가입 신청 대기 건 수
    const presidentClubIds = myMemberships
      .filter(m => m.role === '회장')
      .map(m => m.club_id);

    if (presidentClubIds.length > 0) {
      const { data: pendingData } = await supabase
        .from('club_members')
        .select('id')
        .in('club_id', presidentClubIds)
        .eq('status', '신청중');
      count += pendingData?.length || 0;
    }

    // 3. 참석 여부 미선택 일정 수
    const myClubIds = myMemberships.map(m => m.club_id);
    const { data: upcomingEvents } = await supabase
      .from('club_events')
      .select('id')
      .in('club_id', myClubIds)
      .gte('date', new Date().toISOString().split('T')[0]);

    if (upcomingEvents && upcomingEvents.length > 0) {
      const eventIds = upcomingEvents.map(e => e.id);
      const { data: myAttendances } = await supabase
        .from('club_event_attendances')
        .select('event_id')
        .in('event_id', eventIds)
        .eq('user_id', user.id);

      const attendedEventIds = myAttendances?.map(a => a.event_id) || [];
      const unselectedCount = eventIds.filter(id => !attendedEventIds.includes(id)).length;
      count += unselectedCount;
    }

    setClubBadge(count);
  };

  useEffect(() => {
    fetchClubBadge();
  }, []);

  const [activeTab, setActiveTab] = useState<Tab>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('lunch_tab') as Tab) || 'matching';
    }
    return 'matching';
  });

  return (
    <div className="min-h-screen bg-gray-50 flex">

      {/* ---- 좌측 사이드바 (PC용) ---- */}
      <div className="hidden md:flex flex-col w-64 bg-white border-r border-gray-100 fixed h-full">
        <div className="p-6 border-b border-gray-100">
          <span className="text-2xl">🍊</span>
          <h1 className="text-lg font-black text-gray-800 mt-1">랭디 커넥트</h1>
        </div>

        <div className="p-4 flex-1">
          <nav className="space-y-1">
          {[
  { tab: 'matching', icon: '🎲', label: '매칭', badge: 0 },
  { tab: 'calendar', icon: '📅', label: '캘린더', badge: 0 },
  { tab: 'restaurant', icon: '🍜', label: '주변 음식점', badge: 0 },
  { tab: 'club', icon: '🏃', label: '동아리', badge: clubBadge },
  { tab: 'my', icon: '👤', label: 'My', badge: 0 },
].map(({ tab, icon, label, badge }) => (
              <button
                key={tab}
                onClick={() => {
                    const t = tab as Tab;
                    localStorage.setItem('lunch_tab', t);
                    setActiveTab(t);
                  }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-left ${
                  activeTab === tab
                    ? 'bg-orange-50 text-orange-500 font-bold'
                    : 'text-gray-500 hover:bg-gray-50'
                }`}
              >
                <span className="text-xl">{icon}</span>
                <span className="text-sm flex-1">{label}</span>
                {badge > 0 && (
                  <span className="w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                    {badge}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>

{/* 사이드바 하단 유저 정보 */}
<div className="p-4 border-t border-gray-100">
  <div className="flex items-center gap-3">
    <div className="w-9 h-9 bg-orange-100 rounded-full flex items-center justify-center text-orange-500 font-bold text-sm">
      {user.name[0]}
    </div>
    <div className="flex-1">
      <p className="text-sm font-semibold text-gray-800">{user.name}</p>
      <p className="text-xs text-gray-400">{user.team}</p>
    </div>
    <button
      onClick={() => {
        localStorage.removeItem('lunch_user');
        localStorage.removeItem('lunch_tab');
        window.location.reload();
      }}
      className="text-xs text-gray-400 hover:text-red-400 transition-all"
      title="로그아웃"
    >
      🚪
    </button>
  </div>
</div>
      </div>

      {/* ---- 메인 콘텐츠 영역 ---- */}
      <div className="flex-1 md:ml-64 pb-20 md:pb-0">

        {/* PC 상단 헤더 */}
        <div className="hidden md:block px-10 pt-10 pb-6">
          <p className="text-sm text-gray-400">안녕하세요 👋</p>
          <h1 className="text-3xl font-black text-gray-900">{user.name}님</h1>
        </div>

        {/* 탭 콘텐츠 */}
        <div className="px-5 md:px-10">

          {/* 매칭 탭 */}
{activeTab === 'matching' && (
  <MatchingScreen user={user} />
)}

{/* 캘린더 탭 */}
{activeTab === 'calendar' && (
  <CalendarScreen user={user} />
)}
{/* 동아리 탭 */}
{activeTab === 'club' && (
  <ClubScreen user={user} />
)}
          {/* 주변 음식점 탭 */}
          {activeTab === 'restaurant' && (
            <div className="flex flex-col items-center justify-center min-h-[60vh]">
              <span className="text-5xl mb-4">🍜</span>
              <h2 className="text-xl font-bold text-gray-700">주변 음식점</h2>
              <p className="text-gray-400 text-sm mt-2">팀원 추천 맛집이 여기에 쌓여요</p>
              <p className="text-xs text-orange-400 mt-4 bg-orange-50 px-4 py-2 rounded-full">준비 중이에요 🛠️</p>
            </div>
          )}

{/* My 탭 */}
{activeTab === 'my' && (
  <MyScreen
    user={user}
    onLogout={() => {
      localStorage.removeItem('lunch_user');
      localStorage.removeItem('lunch_tab');
      window.location.reload();
    }}
    onPendingChange={() => fetchClubBadge()}
  />
)}
        </div>
      </div>
    </div>
  );
}