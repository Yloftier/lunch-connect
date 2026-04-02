'use client';

import React, { useState } from 'react';
import { supabase } from './lib/supabase'; // 아까 만든 경로 확인!

// --- 소속팀 리스트 ---
const TEAMS = [
  "경영지원팀", "사업팀-일본어", "사업팀-중국어", "사업팀-영어", 
  "마케팅팀-영상", "마케팅팀-마케팅", "cscx팀", "사업팀-일본시장", 
  "제품개발팀-기획디자인", "제품개발팀-F/E", "제품개발팀-B/E"
];

export default function LunchDashboard() {
  // 상태 관리: 유저 정보 및 화면 전환
  const [user, setUser] = useState<any>(null);
  const [showOnboarding, setShowOnboarding] = useState(true);

  // 폼 데이터 상태 (기획안의 모든 항목 포함)
  const [formData, setFormData] = useState({
    name: '',
    birth: '',
    team: TEAMS[0],
    role: '팀원',
    likes: '',
    dislikes: ''
  });

  // DB 저장 함수
  const handleOnboarding = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // 생년월일 8자리 유효성 검사 (간단하게)
    if (formData.birth.length !== 8) {
      alert("생년월일은 8자리(예: 19900522)로 입력해주세요!");
      return;
    }

    try {
      const { data, error } = await supabase
        .from('users')
        .insert([
          { 
            name: formData.name, 
            birth: formData.birth, 
            team: formData.team, 
            role: formData.role, 
            likes: formData.likes, 
            dislikes: formData.dislikes 
          }
        ])
        .select();

      if (error) {
        alert(`DB 저장 실패: ${error.message}`);
        console.error("에러 상세:", error);
      } else {
        alert(`${formData.name}님, 등록이 완료되었습니다! 🍊`);
        setUser(formData);
        setShowOnboarding(false); // 메인 화면으로 전환
      }
    } catch (err) {
      alert("시스템 오류가 발생했습니다.");
    }
  };

  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center p-4 text-black">
      {showOnboarding ? (
        /* --- [1] 온보딩 화면 섹션 --- */
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full border border-orange-100">
          <div className="text-center mb-6">
            <span className="text-5xl">🍊</span>
            <h1 className="text-2xl font-bold mt-3 text-gray-800">랭디 점심 커넥트</h1>
            <p className="text-gray-500 text-sm mt-1">팀원 정보를 입력하고 시작해보세요!</p>
          </div>

          <form onSubmit={handleOnboarding} className="space-y-4">
            {/* 이름 입력 */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">이름</label>
              <input
                required
                className="w-full p-3 border rounded-xl outline-none focus:ring-2 focus:ring-orange-500"
                placeholder="성함을 입력해주세요"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
              />
            </div>

            {/* 생년월일 입력 */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">생년월일 (8자리)</label>
              <input
                required
                className="w-full p-3 border rounded-xl outline-none focus:ring-2 focus:ring-orange-500"
                placeholder="예: 19900522"
                value={formData.birth}
                onChange={(e) => setFormData({...formData, birth: e.target.value})}
              />
            </div>

            {/* 팀 & 직책 나란히 배치 */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">소속팀</label>
                <select 
                  className="w-full p-3 border rounded-xl bg-white"
                  value={formData.team}
                  onChange={(e) => setFormData({...formData, team: e.target.value})}
                >
                  {TEAMS.map(team => <option key={team} value={team}>{team}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">직책</label>
                <select 
                  className="w-full p-3 border rounded-xl bg-white"
                  value={formData.role}
                  onChange={(e) => setFormData({...formData, role: e.target.value})}
                >
                  <option value="팀원">팀원</option>
                  <option value="팀장">팀장</option>
                </select>
              </div>
            </div>

            {/* 음식 취향 */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">선호 음식 😋</label>
              <input
                className="w-full p-3 border rounded-xl outline-none focus:ring-2 focus:ring-orange-500"
                placeholder="좋아하는 음식을 써주세요"
                value={formData.likes}
                onChange={(e) => setFormData({...formData, likes: e.target.value})}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">비선호 음식 🙅‍♂️</label>
              <input
                className="w-full p-3 border rounded-xl outline-none focus:ring-2 focus:ring-orange-500"
                placeholder="못 먹거나 싫어하는 음식"
                value={formData.dislikes}
                onChange={(e) => setFormData({...formData, dislikes: e.target.value})}
              />
            </div>

            <button 
              type="submit"
              className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-4 rounded-xl transition-all mt-4 shadow-lg active:scale-95"
            >
              입력 완료! 🚀
            </button>
          </form>
        </div>
      ) : (
        /* --- [2] 메인 대시보드 화면 섹션 --- */
        <div className="text-center animate-fade-in">
          <span className="text-6xl mb-4 block">🎉</span>
          <h1 className="text-4xl font-black text-gray-900 mb-2">반가워요, {user.name}님!</h1>
          <p className="text-xl text-gray-600 mb-8">오늘 {user.team}의 점심 매칭을 시작해볼까요?</p>
          
          <div className="bg-white p-10 rounded-3xl shadow-2xl border-4 border-orange-400 max-w-sm mx-auto">
            <button className="w-full bg-orange-500 text-white py-6 rounded-2xl text-2xl font-black shadow-orange-200 shadow-xl hover:bg-orange-600 transition-all hover:-translate-y-1">
              오늘의 팀 매칭 🎲
            </button>
          </div>
        </div>
      )}
    </main>
  );
}