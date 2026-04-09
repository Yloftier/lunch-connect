'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface User {
  id: string;
  name: string;
  team: string;
  role: string;
  gender: string;
}

interface Props {
  user: any;
}

// 탭 전환 시 재로딩 방지용 모듈 레벨 캐시
let _cache: {
  todayMatcher: User | null;
  tomorrowMatcher: User | null;
  matchingGroup: User[] | null;
  todayStatus: string | null;
  groupApprovalStatus: string | null;
  matcherId: string | null;
  cachedAt: number;
} | null = null;
const CACHE_TTL = 30_000; // 30초

export default function MatchingScreen({ user }: Props) {
  const [todayMatcher, setTodayMatcher] = useState<User | null>(_cache?.todayMatcher ?? null);
  const [tomorrowMatcher, setTomorrowMatcher] = useState<User | null>(_cache?.tomorrowMatcher ?? null);
  const [matchingGroup, setMatchingGroup] = useState<User[] | null>(_cache?.matchingGroup ?? null);
  const [todayStatus, setTodayStatus] = useState<string | null>(_cache?.todayStatus ?? null);
  const [groupApprovalStatus, setGroupApprovalStatus] = useState<string | null>(_cache?.groupApprovalStatus ?? null);
  // 캐시가 있으면 로딩 스피너 없이 바로 표시
  const [isLoading, setIsLoading] = useState(_cache === null);
  const [isMatching, setIsMatching] = useState(false);
  const [groupSize, setGroupSize] = useState<2 | 3>(2);
  const [revealedMembers, setRevealedMembers] = useState<User[]>([]);
  const [phase, setPhase] = useState<'idle' | 'shaking' | 'revealing' | 'done'>('idle');

  const isMyTurn = todayMatcher?.id === user.id;
  const canMatch = isMyTurn && todayStatus === '대기중';

  const fetchTodayStatus = async (force = false) => {
    // 캐시 유효하면 스킵
    if (!force && _cache && Date.now() - _cache.cachedAt < CACHE_TTL) return;

    setIsLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().split('T')[0];

      // API 라우트 없이 Supabase 직접 호출 (3개 병렬)
      const [todayTurnRes, todayGroupRes, tomorrowTurnRes] = await Promise.all([
        supabase
          .from('matching_turns')
          .select('status, matcher_id, matcher:matcher_id(id, name, team, gender)')
          .eq('date', today)
          .single(),
        supabase
          .from('matching_groups')
          .select('members, approval_status')
          .eq('date', today)
          .single(),
        supabase
          .from('matching_turns')
          .select('matcher:matcher_id(id, name, team)')
          .eq('date', tomorrowStr)
          .single(),
      ]);

      const matcher = (todayTurnRes.data?.matcher as any) ?? null;
      const group = todayGroupRes.data?.members ?? null;
      const status = todayTurnRes.data?.status ?? null;
      const approvalStatus = todayGroupRes.data?.approval_status ?? null;
      const tomorrowMatcher = (tomorrowTurnRes.data?.matcher as any) ?? null;
      const matcherId = todayTurnRes.data?.matcher_id ?? null;

      // 캐시 업데이트
      _cache = {
        todayMatcher: matcher,
        tomorrowMatcher,
        matchingGroup: group,
        todayStatus: status,
        groupApprovalStatus: approvalStatus,
        matcherId,
        cachedAt: Date.now(),
      };

      setTodayMatcher(matcher);
      setTodayStatus(status);
      setMatchingGroup(group);
      setGroupApprovalStatus(approvalStatus);
      setTomorrowMatcher(tomorrowMatcher);
    } catch (err) {
      console.error('현황 조회 실패:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTodayStatus();
  }, []);

  const handleMatching = async () => {
    setIsMatching(true);
    setRevealedMembers([]);
    setPhase('shaking'); // 🎲 흔들리는 애니메이션 시작

    try {
      const res = await fetch('/api/matching', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ matcherId: user.id, groupSize })
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.error);
        setIsMatching(false);
        setPhase('idle');
        return;
      }

      const group: User[] = data.matchingGroup;

      // 2초 흔들기 후 한 명씩 공개
      setTimeout(() => {
        setPhase('revealing');

        group.forEach((member, index) => {
          setTimeout(() => {
            setRevealedMembers(prev => [...prev, member]);
            if (index === group.length - 1) {
              setTimeout(() => {
                setPhase('done');
                setMatchingGroup(group);
                setTodayStatus('완료');
                setGroupApprovalStatus('pending');
                setIsMatching(false);
                _cache = null; // 매칭 완료 후 캐시 무효화
              }, 800);
            }
          }, index * 1500); // 1.5초 간격으로 한 명씩
        });
      }, 2500);

    } catch (err) {
      alert('매칭 중 오류가 발생했어요.');
      setIsMatching(false);
      setPhase('idle');
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <div className="text-4xl animate-spin">🍊</div>
        <p className="text-gray-400 text-sm mt-4">불러오는 중...</p>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-5 py-6 md:py-10">

      {/* 오늘 매칭자 */}
      {phase === 'idle' || phase === 'done' ? (
        <div className="bg-white rounded-2xl p-5 shadow-sm mb-4">
          <p className="text-xs text-gray-400 mb-1">오늘의 매칭자</p>
          {todayMatcher ? (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center text-orange-500 font-bold">
                {todayMatcher.name[0]}
              </div>
              <div>
                <p className="font-bold text-gray-800">{todayMatcher.name}</p>
                <p className="text-xs text-gray-400">{todayMatcher.team}</p>
              </div>
              {isMyTurn && (
                <span className="ml-auto text-xs bg-orange-500 text-white px-3 py-1 rounded-full">나예요!</span>
              )}
            </div>
          ) : (
            <p className="text-gray-400 text-sm">아직 오늘 매칭자가 정해지지 않았어요</p>
          )}
        </div>
      ) : null}

      {/* 🎲 흔들리는 애니메이션 */}
      {phase === 'shaking' && (
        <div className="bg-white rounded-2xl p-10 shadow-sm mb-4 text-center">
          <div className="flex justify-center mb-6">
            <span className="text-7xl animate-bounce">🎲</span>
          </div>
          <p className="text-2xl font-black text-gray-800 mb-2">두근두근...</p>
          <p className="text-gray-400 text-sm">오늘의 점심 파트너를 찾고 있어요!</p>
          <div className="flex justify-center gap-1 mt-6">
            <span className="w-2 h-2 bg-orange-300 rounded-full animate-bounce" style={{animationDelay: '0ms'}}></span>
            <span className="w-2 h-2 bg-orange-400 rounded-full animate-bounce" style={{animationDelay: '150ms'}}></span>
            <span className="w-2 h-2 bg-orange-500 rounded-full animate-bounce" style={{animationDelay: '300ms'}}></span>
          </div>
        </div>
      )}

      {/* 한 명씩 공개 */}
      {phase === 'revealing' && (
        <div className="bg-white rounded-2xl p-5 shadow-sm mb-4">
          <p className="text-center text-sm font-bold text-gray-500 mb-5">
            🎉 오늘의 점심 파트너 공개!
          </p>
          <div className="space-y-3">
            {revealedMembers.map((member) => (
              <div
                key={member.id}
                className="flex items-center gap-3 p-4 bg-orange-50 rounded-2xl border-2 border-orange-200"
                style={{animation: 'fadeInUp 0.5s ease-out'}}
              >
                <div className="w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center text-white font-black text-xl">
                  {member.name[0]}
                </div>
                <div>
                  <p className="font-black text-gray-800 text-lg">{member.name}</p>
                  <p className="text-xs text-gray-400">{member.team} · {member.gender === '남' ? '👨' : '👩'}</p>
                </div>
              </div>
            ))}
            {/* 아직 안 공개된 자리 */}
            {Array.from({ length: groupSize - revealedMembers.length }).map((_, i) => (
              <div
                key={i}
                className="flex items-center gap-3 p-4 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200"
              >
                <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center text-2xl animate-pulse">
                  ❓
                </div>
                <p className="text-gray-300 font-bold">공개 중...</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 매칭 결과 (phase done 또는 이미 그룹 있을 때) */}
      {(phase === 'done' || (phase === 'idle' && matchingGroup)) && matchingGroup && (
        <div className="bg-white rounded-2xl p-5 shadow-sm mb-4">
          {/* 승인 대기 중 */}
          {(phase === 'done' || groupApprovalStatus === 'pending') && groupApprovalStatus !== 'confirmed' && (
            <div className="mb-4 p-3 bg-yellow-50 rounded-xl border border-yellow-100">
              <p className="text-xs font-bold text-yellow-700 mb-1">⏳ 승인 대기 중</p>
              <p className="text-xs text-yellow-600">
                {matchingGroup
                  .filter(m => m.id !== todayMatcher?.id)
                  .map(m => `${m.name}님`)
                  .join(', ')}의 응답을 기다리고 있어요
              </p>
            </div>
          )}
          {/* 매칭 확정 */}
          {groupApprovalStatus === 'confirmed' && (
            <div className="mb-4 p-3 bg-green-50 rounded-xl border border-green-100">
              <p className="text-xs font-bold text-green-700">🎉 매칭 확정!</p>
            </div>
          )}
          <p className="text-xs text-gray-400 mb-3">오늘의 매칭그룹</p>
          <div className="space-y-3">
            {matchingGroup.map((member) => (
              <div key={member.id} className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm
                  ${member.id === todayMatcher?.id
                    ? 'bg-orange-500 text-white'
                    : 'bg-gray-100 text-gray-600'}`}>
                  {member.name[0]}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-gray-800 text-sm">{member.name}</p>
                    {member.id === todayMatcher?.id && (
                      <span className="text-xs bg-orange-100 text-orange-500 px-2 py-0.5 rounded-full">매칭자</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400">{member.team} · {member.gender === '남' ? '👨' : '👩'}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 매칭 미실행 */}
      {todayStatus === '미실행' && phase === 'idle' && (
        <div className="bg-gray-50 rounded-2xl p-5 mb-4 text-center">
          <span className="text-4xl">😢</span>
          <p className="text-gray-600 font-semibold mt-2">오늘은 매칭이 없어요</p>
          <p className="text-gray-400 text-xs mt-1">내일을 기대해주세요!</p>
        </div>
      )}

      {/* 매칭 버튼 (내 차례 + 대기중) */}
      {canMatch && phase === 'idle' && (
        <div className="bg-white rounded-2xl p-5 shadow-sm mb-4">
          <p className="text-sm font-bold text-gray-700 mb-4">오늘 매칭 인원을 선택해주세요!</p>
          <div className="grid grid-cols-2 gap-3 mb-5">
            {([2, 3] as const).map(size => (
              <button
                key={size}
                onClick={() => setGroupSize(size)}
                className={`py-4 rounded-xl border-2 transition-all font-bold text-lg
                  ${groupSize === size
                    ? 'border-orange-500 bg-orange-50 text-orange-500'
                    : 'border-gray-200 text-gray-400'}`}
              >
                {size}명
              </button>
            ))}
          </div>
          <button
            onClick={handleMatching}
            disabled={isMatching}
            className="w-full bg-orange-500 text-white py-5 rounded-2xl text-xl font-black shadow-lg shadow-orange-200 hover:bg-orange-600 transition-all active:scale-95 disabled:opacity-50"
          >
            오늘의 매칭 시작! 🎲
          </button>
        </div>
      )}

      {/* 내일 매칭자 */}
      {phase !== 'shaking' && phase !== 'revealing' && (
        <div className="bg-gray-50 rounded-2xl p-4">
          <p className="text-xs text-gray-400 mb-2">내일의 매칭자 👀</p>
          {tomorrowMatcher ? (
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center text-gray-500 font-bold text-sm">
                {tomorrowMatcher.name[0]}
              </div>
              <p className="font-semibold text-gray-700 text-sm">{tomorrowMatcher.name}</p>
            </div>
          ) : (
            <p className="text-gray-400 text-sm">아직 정해지지 않았어요</p>
          )}
        </div>
      )}

      <style jsx>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>

    </div>
  );
}