'use client';

import React, { useState } from 'react';
import { supabase } from '../lib/supabase';

const TEAMS = [
  "경영지원팀", "사업팀-일본어", "사업팀-중국어", "사업팀-영어", 
  "마케팅팀-영상", "마케팅팀-마케팅", "cscx팀", "사업팀-일본시장", 
  "제품개발팀-기획디자인", "제품개발팀-F/E", "제품개발팀-B/E"
];

interface Props {
  loginData: { name: string; birth: string };
  gender: string;
  onComplete: (user: any) => void;
}

export default function OnboardingDetail({ loginData, gender, onComplete }: Props) {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    team: TEAMS[0],
    role: '팀원',
    slack_email: '',
    likes: '',
    dislikes: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { data, error } = await supabase
        .from('users')
        .insert([{
          name: loginData.name,
          birth: loginData.birth,
          gender,
          team: formData.team,
          role: formData.role,
          slack_email: formData.slack_email,
          likes: formData.likes,
          dislikes: formData.dislikes
        }])
        .select()
        .single();

      if (error) {
        alert(`저장 실패: ${error.message}`);
      } else {
        onComplete(data);
      }
    } catch (err) {
      alert("시스템 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8 border border-orange-100">
        <div className="text-center mb-6">
          <span className="text-5xl">🍽️</span>
          <h1 className="text-2xl font-bold mt-3 text-gray-800">거의 다 왔어요!</h1>
          <p className="text-gray-500 text-sm mt-1">팀과 음식 취향을 알려주세요</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">소속팀</label>
              <select
                className="w-full p-3 border rounded-xl bg-white text-black"
                value={formData.team}
                onChange={(e) => setFormData({...formData, team: e.target.value})}
              >
                {TEAMS.map(team => <option key={team} value={team}>{team}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">직책</label>
              <select
                className="w-full p-3 border rounded-xl bg-white text-black"
                value={formData.role}
                onChange={(e) => setFormData({...formData, role: e.target.value})}
              >
                <option value="팀원">팀원</option>
                <option value="팀장">팀장</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">사내 이메일 📧</label>
            <input
              required
              type="email"
              className="w-full p-3 border rounded-xl outline-none focus:ring-2 focus:ring-orange-500 text-black"
              placeholder="예: taeyoung@company.com"
              value={formData.slack_email}
              onChange={(e) => setFormData({...formData, slack_email: e.target.value})}
            />
            <p className="text-xs text-gray-400 mt-1">슬랙 알림을 받을 이메일이에요</p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">선호 음식 😋</label>
            <input
              className="w-full p-3 border rounded-xl outline-none focus:ring-2 focus:ring-orange-500 text-black"
              placeholder="좋아하는 음식을 써주세요"
              value={formData.likes}
              onChange={(e) => setFormData({...formData, likes: e.target.value})}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">비선호 음식 🙅‍♂️</label>
            <input
              className="w-full p-3 border rounded-xl outline-none focus:ring-2 focus:ring-orange-500 text-black"
              placeholder="못 먹거나 싫어하는 음식"
              value={formData.dislikes}
              onChange={(e) => setFormData({...formData, dislikes: e.target.value})}
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-4 rounded-xl transition-all shadow-lg active:scale-95 disabled:opacity-50"
          >
            {isLoading ? '저장 중...' : '입력 완료! 🚀'}
          </button>
        </form>
      </div>
    </div>
  );
}