'use client';

import React, { useState } from 'react';
import MatchingScreen from './MatchingScreen';
import CalendarScreen from './CalendarScreen';

type Tab = 'matching' | 'calendar' | 'restaurant' | 'my';

interface Props {
  user: any;
}

export default function MainScreen({ user }: Props) {
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
          <h1 className="text-lg font-black text-gray-800 mt-1">랭디 점심 커넥트</h1>
        </div>

        <div className="p-4 flex-1">
          <nav className="space-y-1">
            {[
              { tab: 'matching', icon: '🎲', label: '매칭' },
              { tab: 'calendar', icon: '📅', label: '캘린더' },
              { tab: 'restaurant', icon: '🍜', label: '주변 음식점' },
              { tab: 'my', icon: '👤', label: 'My' },
            ].map(({ tab, icon, label }) => (
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
                <span className="text-sm">{label}</span>
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
            <div className="max-w-md mx-auto md:mx-0 pt-4">
              <h2 className="text-lg font-bold text-gray-800 mb-4">내 프로필</h2>
              <div className="bg-white rounded-2xl p-5 shadow-sm space-y-3">
                {[
                  { label: '이름', value: user.name },
                  { label: '성별', value: user.gender === '남' ? '남성' : '여성' },
                  { label: '소속팀', value: user.team },
                  { label: '직책', value: user.role },
                  { label: '선호 음식', value: user.likes || '미입력' },
                  { label: '비선호 음식', value: user.dislikes || '미입력' },
                ].map(({ label, value }, i, arr) => (
                  <div
                    key={label}
                    className={`flex justify-between items-center py-2 ${i < arr.length - 1 ? 'border-b border-gray-50' : ''}`}
                  >
                    <span className="text-sm text-gray-500">{label}</span>
                    <span className="text-sm font-semibold text-gray-800">{value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}