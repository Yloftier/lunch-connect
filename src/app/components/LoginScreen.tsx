'use client';

import React, { useState } from 'react';
import { supabase } from '../lib/supabase';

interface Props {
  onExistingUser: (user: any) => void;
  onNewUser: (loginData: { name: string; birth: string }) => void;
}

export default function LoginScreen({ onExistingUser, onNewUser }: Props) {
  const [loginData, setLoginData] = useState({ name: '', birth: '' });
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (loginData.birth.length !== 8) {
      alert("생년월일은 8자리(예: 19900522)로 입력해주세요!");
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('name', loginData.name)
        .eq('birth', loginData.birth)
        .single();

      if (error || !data) {
        onNewUser(loginData);
      } else {
        onExistingUser(data);
      }
    } catch (err) {
      alert("오류가 발생했습니다. 다시 시도해주세요.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8 border border-orange-100">
        <div className="text-center mb-8">
          <span className="text-5xl">🍊</span>
          <h1 className="text-2xl font-bold mt-3 text-gray-800">랭디 점심 커넥트</h1>
          <p className="text-gray-500 text-sm mt-1">이름과 생년월일로 시작해요!</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">이름</label>
            <input
              required
              className="w-full p-3 border rounded-xl outline-none focus:ring-2 focus:ring-orange-500 text-black"
              placeholder="성함을 입력해주세요"
              value={loginData.name}
              onChange={(e) => setLoginData({...loginData, name: e.target.value})}
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">생년월일 (8자리)</label>
            <input
              required
              className="w-full p-3 border rounded-xl outline-none focus:ring-2 focus:ring-orange-500 text-black"
              placeholder="예: 19900522"
              value={loginData.birth}
              onChange={(e) => setLoginData({...loginData, birth: e.target.value})}
            />
          </div>
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-4 rounded-xl transition-all shadow-lg active:scale-95 disabled:opacity-50"
          >
            {isLoading ? '확인 중...' : '시작하기 🚀'}
          </button>
        </form>
      </div>
    </div>
  );
}