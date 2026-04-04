'use client';

import React, { useState } from 'react';
import { supabase } from '../lib/supabase';

const TEAMS = [
  "경영지원팀", "사업팀-일본어", "사업팀-중국어", "사업팀-영어", 
  "마케팅팀-영상", "마케팅팀-마케팅", "cscx팀", "사업팀-일본시장", 
  "제품개발팀-기획디자인", "제품개발팀-F/E", "제품개발팀-B/E"
];

const FOOD_CATEGORIES = [
  "한식", "일식", "중식", "양식", "분식", 
  "샐러드/포케", "고기/구이", "해산물", "국물요리", 
  "패스트푸드", "채식", "아무거나"
];

interface Props {
  loginData: { name: string; birth: string; password: string };
  gender: string;
  onComplete: (user: any) => void;
}

export default function OnboardingDetail({ loginData, gender, onComplete }: Props) {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    team: TEAMS[0],
    role: '팀원',
    slack_email: '',
  });
  const [likes, setLikes] = useState<string[]>([]);
  const [dislikes, setDislikes] = useState<string[]>([]);
  const [emailError, setEmailError] = useState('');

  // 이메일 유효성 검사
  const validateEmail = (email: string) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };

  // 선호 음식 토글
  const toggleLike = (food: string) => {
    if (likes.includes(food)) {
      setLikes(likes.filter(f => f !== food));
    } else {
      setLikes([...likes, food]);
    }
  };

  // 비선호 음식 토글
  const toggleDislike = (food: string) => {
    if (dislikes.includes(food)) {
      setDislikes(dislikes.filter(f => f !== food));
    } else {
      setDislikes([...dislikes, food]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // 이메일 유효성 검사
    if (!validateEmail(formData.slack_email)) {
      setEmailError('올바른 이메일 형식을 입력해주세요');
      return;
    }

    // 선호 음식 최소 1개
    if (likes.length === 0) {
      alert('선호 음식을 최소 1개 선택해주세요!');
      return;
    }

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
          likes: likes.join(', '),
          dislikes: dislikes.join(', '),
          password: loginData.password,
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

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* 팀 & 직책 */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">소속팀</label>
              <select
                className="w-full p-3 border rounded-xl bg-white text-black text-sm"
                value={formData.team}
                onChange={(e) => setFormData({...formData, team: e.target.value})}
              >
                {TEAMS.map(team => <option key={team} value={team}>{team}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">직책</label>
              <select
                className="w-full p-3 border rounded-xl bg-white text-black text-sm"
                value={formData.role}
                onChange={(e) => setFormData({...formData, role: e.target.value})}
              >
                <option value="팀원">팀원</option>
                <option value="팀장">팀장</option>
              </select>
            </div>
          </div>

          {/* 이메일 */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">사내 이메일 📧</label>
            <input
              required
              type="email"
              className={`w-full p-3 border rounded-xl outline-none focus:ring-2 focus:ring-orange-500 text-black text-sm
                ${emailError ? 'border-red-400' : ''}`}
              placeholder="예: taeyoung@company.com"
              value={formData.slack_email}
              onChange={(e) => {
                setFormData({...formData, slack_email: e.target.value});
                setEmailError('');
              }}
            />
            {emailError && <p className="text-xs text-red-400 mt-1">{emailError}</p>}
            <p className="text-xs text-gray-400 mt-1">슬랙 알림을 받을 이메일이에요</p>
          </div>

          {/* 선호 음식 */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              선호 음식 😋 <span className="text-xs text-gray-400">(복수 선택 가능)</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {FOOD_CATEGORIES.map(food => (
                <button
                  key={food}
                  type="button"
                  onClick={() => toggleLike(food)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all
                    ${likes.includes(food)
                      ? 'bg-orange-500 text-white'
                      : 'bg-gray-100 text-gray-500 hover:bg-orange-50 hover:text-orange-500'}`}
                >
                  {food}
                </button>
              ))}
            </div>
          </div>

          {/* 비선호 음식 */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              비선호 음식 🙅‍♂️ <span className="text-xs text-gray-400">(복수 선택 가능)</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {FOOD_CATEGORIES.filter(f => f !== '아무거나').map(food => (
                <button
                  key={food}
                  type="button"
                  onClick={() => toggleDislike(food)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all
                    ${dislikes.includes(food)
                      ? 'bg-red-400 text-white'
                      : 'bg-gray-100 text-gray-500 hover:bg-red-50 hover:text-red-400'}`}
                >
                  {food}
                </button>
              ))}
            </div>
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