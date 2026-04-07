'use client';

import React, { useState } from 'react';
import { supabase } from '../lib/supabase';

interface Props {
  onExistingUser: (user: any) => void;
  onNewUser: (loginData: { name: string; birth: string; password: string }) => void;
}

type View = 'login' | 'register';

export default function LoginScreen({ onExistingUser, onNewUser }: Props) {
  const [view, setView] = useState<View>('login');
  const [isLoading, setIsLoading] = useState(false);

  // 로그인 폼
  const [loginData, setLoginData] = useState({ name: '', password: '' });

  // 회원가입 폼
  const [registerData, setRegisterData] = useState({
    name: '',
    birth: '',
    password: '',
    passwordConfirm: ''
  });
  const [registerError, setRegisterError] = useState('');

  // 로그인
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('name', loginData.name)
        .single();

      if (error || !data) {
        alert('등록되지 않은 이름이에요. 회원가입을 해주세요!');
      } else if (data.password && data.password !== loginData.password) {
        alert('비밀번호가 틀렸어요!');
      } else {
        onExistingUser(data);
      }
    } catch (err) {
      alert('오류가 발생했습니다. 다시 시도해주세요.');
    } finally {
      setIsLoading(false);
    }
  };

  // 회원가입
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegisterError('');

    if (registerData.birth.length !== 8) {
      setRegisterError('생년월일은 8자리로 입력해주세요');
      return;
    }
    if (registerData.password.length < 4) {
      setRegisterError('비밀번호는 최소 4자리예요');
      return;
    }
    if (registerData.password !== registerData.passwordConfirm) {
      setRegisterError('비밀번호가 일치하지 않아요');
      return;
    }

    setIsLoading(true);
    try {
      // 이미 등록된 이름+생년월일인지 확인
      const { data: existing } = await supabase
        .from('users')
        .select('id')
        .eq('name', registerData.name)
        .eq('birth', registerData.birth)
        .single();

      if (existing) {
        setRegisterError('이미 등록된 계정이에요. 로그인해주세요!');
        setIsLoading(false);
        return;
      }

      // 온보딩으로 이동
      onNewUser({
        name: registerData.name,
        birth: registerData.birth,
        password: registerData.password
      });
    } catch (err) {
      // single()이 없으면 에러 → 신규 유저로 처리
      onNewUser({
        name: registerData.name,
        birth: registerData.birth,
        password: registerData.password
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8 border border-orange-100">

        {/* 로고 & 타이틀 */}
        <div className="text-center mb-8">
        <img src="/langdyconnect.png" alt="랭디 커넥트" className="w-20 h-20 mx-auto" />
        <h1 className="text-2xl font-bold mt-3 text-gray-800">랭디 커넥트</h1>
          <p className="text-gray-500 text-sm mt-1">
            {view === 'login' ? '로그인하고 시작해요!' : '회원가입하고 시작해요!'}
          </p>
        </div>

        {/* 로그인 폼 */}
        {view === 'login' && (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">이름</label>
              <input
                required
                className="w-full p-3 border rounded-xl outline-none focus:ring-2 focus:ring-orange-500 text-black"
                placeholder="성함을 입력해주세요"
                maxLength={5}
                value={loginData.name}
                onChange={(e) => setLoginData({...loginData, name: e.target.value})}
                onBlur={(e) => {
                  const val = e.target.value.replace(/[^가-힣\s]/g, '').slice(0, 5);
                  setLoginData({...loginData, name: val});
                }}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">비밀번호</label>
              <input
                required
                type="password"
                className="w-full p-3 border rounded-xl outline-none focus:ring-2 focus:ring-orange-500 text-black"
                placeholder="비밀번호 입력"
                minLength={4}
                maxLength={10}
                value={loginData.password}
                onChange={(e) => setLoginData({...loginData, password: e.target.value})}
              />
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-4 rounded-xl transition-all shadow-lg active:scale-95 disabled:opacity-50"
            >
              {isLoading ? '확인 중...' : '로그인 🚀'}
            </button>
            <button
              type="button"
              onClick={() => setView('register')}
              className="w-full text-sm text-gray-400 hover:text-orange-500 transition-all py-2"
            >
              처음이신가요? <span className="font-bold text-orange-500">회원가입</span>
            </button>
          </form>
        )}

        {/* 회원가입 폼 */}
        {view === 'register' && (
          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">이름</label>
              <input
                required
                className="w-full p-3 border rounded-xl outline-none focus:ring-2 focus:ring-orange-500 text-black"
                placeholder="성함을 입력해주세요"
                maxLength={5}
                value={registerData.name}
                onChange={(e) => setRegisterData({...registerData, name: e.target.value})}
                onBlur={(e) => {
                  const val = e.target.value.replace(/[^가-힣\s]/g, '').slice(0, 5);
                  setRegisterData({...registerData, name: val});
                }}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">생년월일 (8자리)</label>
              <input
                required
                className="w-full p-3 border rounded-xl outline-none focus:ring-2 focus:ring-orange-500 text-black"
                placeholder="예: 19900522"
                maxLength={8}
                value={registerData.birth}
                onChange={(e) => {
                  const val = e.target.value.replace(/[^0-9]/g, '');
                  setRegisterData({...registerData, birth: val});
                }}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">비밀번호</label>
              <input
                required
                type="password"
                className="w-full p-3 border rounded-xl outline-none focus:ring-2 focus:ring-orange-500 text-black"
                placeholder="4~10자리 비밀번호 설정"
                minLength={4}
                maxLength={10}
                value={registerData.password}
                onChange={(e) => {
                  setRegisterData({...registerData, password: e.target.value});
                  setRegisterError('');
                }}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">비밀번호 확인</label>
              <input
                required
                type="password"
                className={`w-full p-3 border rounded-xl outline-none focus:ring-2 focus:ring-orange-500 text-black
                  ${registerError ? 'border-red-400' : ''}`}
                placeholder="비밀번호 재입력"
                minLength={4}
                maxLength={10}
                value={registerData.passwordConfirm}
                onChange={(e) => {
                  setRegisterData({...registerData, passwordConfirm: e.target.value});
                  setRegisterError('');
                }}
              />
              {registerError && <p className="text-xs text-red-400 mt-1">{registerError}</p>}
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-4 rounded-xl transition-all shadow-lg active:scale-95 disabled:opacity-50"
            >
              {isLoading ? '확인 중...' : '다음 단계 →'}
            </button>
            <button
              type="button"
              onClick={() => setView('login')}
              className="w-full text-sm text-gray-400 hover:text-orange-500 transition-all py-2"
            >
              이미 계정이 있으신가요? <span className="font-bold text-orange-500">로그인</span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
}