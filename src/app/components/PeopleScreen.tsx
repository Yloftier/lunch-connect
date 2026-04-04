'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface User {
  id: string;
  name: string;
  team: string;
  role: string;
  birth: string;
  gender: string;
  likes: string;
  dislikes: string;
}

interface Props {
  user: any;
}

const TEAMS = [
    '전체', '대표',
    '제품개발팀', '마케팅팀',
    '사업팀-영어', '사업팀-중국어', '사업팀-일본어', '사업팀-일본시장',
    'cscx팀', '경영지원팀'
  ];

export default function PeopleScreen({ user }: Props) {
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [selectedTeam, setSelectedTeam] = useState('전체');
  const [clubMap, setClubMap] = useState<Record<string, string[]>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  const fetchUsers = async () => {
    setIsLoading(true);

    const { data: userData } = await supabase
    .from('users')
    .select('id, name, team, role, birth, gender, likes, dislikes')
    .order('team', { ascending: true });
  
// 팀 내에서는 팀장 → 팀원 → 대표 순 (대표는 전체에서만 맨 앞)
const roleOrder: Record<string, number> = { '팀장': 0, '팀원': 1, '대표': 2 };
const globalRoleOrder: Record<string, number> = { '대표': 0, '팀장': 1, '팀원': 2 };
const sorted = (userData || []).sort((a, b) => {
  const globalA = globalRoleOrder[a.role] ?? 3;
  const globalB = globalRoleOrder[b.role] ?? 3;
  if (globalA !== globalB) return globalA - globalB;
  if (a.team !== b.team) return a.team.localeCompare(b.team);
  return (roleOrder[a.role] ?? 3) - (roleOrder[b.role] ?? 3);
});
  
  setUsers(sorted);
  setFilteredUsers(sorted);

    // 동아리 정보
    const { data: memberData } = await supabase
      .from('club_members')
      .select('user_id, club:club_id(name, emoji)')
      .eq('status', '승인');

    const map: Record<string, string[]> = {};
    (memberData || []).forEach((m: any) => {
      if (!map[m.user_id]) map[m.user_id] = [];
      map[m.user_id].push(`${m.club?.emoji} ${m.club?.name}`);
    });
    setClubMap(map);

    setIsLoading(false);
  };

  useEffect(() => { fetchUsers(); }, []);

  useEffect(() => {
    if (selectedTeam === '전체') {
      setFilteredUsers(users);
    } else if (selectedTeam === '대표') {
      setFilteredUsers(users.filter(u => u.role === '대표'));
    } else {
      // 팀 내에서는 팀장 → 팀원 → 대표 순
      const teamRoleOrder: Record<string, number> = { '팀장': 0, '팀원': 1, '대표': 2 };
      const filtered = users
        .filter(u => u.team === selectedTeam)
        .sort((a, b) => (teamRoleOrder[a.role] ?? 3) - (teamRoleOrder[b.role] ?? 3));
      setFilteredUsers(filtered);
    }
  }, [selectedTeam, users]);

  // 생년월일 포맷 (19900522 → 1990.05.22)
  const formatBirth = (birth: string) => {
    if (!birth || birth.length !== 8) return '-';
    return `${birth.slice(0, 4)}.${birth.slice(4, 6)}.${birth.slice(6, 8)}`;
  };

  // 이번달 생일인지 확인
  const isBirthdayThisMonth = (birth: string) => {
    if (!birth || birth.length !== 8) return false;
    const thisMonth = String(new Date().getMonth() + 1).padStart(2, '0');
    return birth.slice(4, 6) === thisMonth;
  };

  // 오늘 생일인지 확인
  const isBirthdayToday = (birth: string) => {
    if (!birth || birth.length !== 8) return false;
    const today = new Date();
    const thisMonth = String(today.getMonth() + 1).padStart(2, '0');
    const thisDay = String(today.getDate()).padStart(2, '0');
    return birth.slice(4, 6) === thisMonth && birth.slice(6, 8) === thisDay;
  };

  return (
    <div className="p-6 max-w-5xl">
      {/* 헤더 */}
      <div className="mb-6">
        <h1 className="text-2xl font-black text-gray-900">피플 👥</h1>
        <p className="text-sm text-gray-400 mt-1">랭디 팀원들을 만나보세요!</p>
      </div>

      {/* 팀 필터 */}
      <div className="flex gap-2 flex-wrap mb-6">
        {TEAMS.map(team => (
          <button
            key={team}
            onClick={() => setSelectedTeam(team)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all
              ${selectedTeam === team
                ? 'bg-orange-500 text-white'
                : 'bg-white text-gray-500 hover:bg-orange-50 hover:text-orange-500 border border-gray-200'}`}
          >
            {team}
          </button>
        ))}
      </div>

      {/* 인원 수 */}
      <p className="text-xs text-gray-400 mb-4">
        총 <span className="font-bold text-orange-500">{filteredUsers.length}명</span>
      </p>

      {isLoading ? (
        <div className="flex items-center justify-center min-h-[40vh]">
          <div className="text-4xl animate-spin">🍊</div>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {filteredUsers.map(u => (
            <button
              key={u.id}
              onClick={() => setSelectedUser(u)}
              className="bg-white rounded-2xl p-4 shadow-sm hover:shadow-md hover:border-orange-200 border-2 border-transparent transition-all text-left"
            >
              {/* 아바타 */}
              <div className="flex items-center gap-3 mb-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-lg flex-shrink-0
  ${u.role === '대표' ? 'bg-gray-800 text-white' : u.id === user.id ? 'bg-orange-500 text-white' : 'bg-orange-100 text-orange-500'}`}>
  {u.name[0]}
</div>
<div className="flex-1 min-w-0">
  <div className="flex items-center gap-1 flex-wrap">
    <p className="font-bold text-gray-800 text-sm truncate">{u.name}</p>
    {isBirthdayToday(u.birth) && <span className="text-sm">🎂</span>}
    {!isBirthdayToday(u.birth) && isBirthdayThisMonth(u.birth) && <span className="text-sm">🎁</span>}
  </div>
  <div className="flex items-center gap-1 mt-0.5">
    {u.role === '대표' && (
      <span className="text-xs bg-gray-800 text-white px-1.5 py-0.5 rounded-full">대표</span>
    )}
    {u.role === '팀장' && (
      <span className="text-xs bg-orange-100 text-orange-500 px-1.5 py-0.5 rounded-full">팀장</span>
    )}
    <p className="text-xs text-gray-400 truncate">{u.team}</p>
  </div>
</div>
              </div>

              {/* 팀 */}
              <div className="bg-gray-50 rounded-lg px-2 py-1 mb-2">
                <p className="text-xs text-gray-500 truncate">{u.team}</p>
              </div>

              {/* 동아리 */}
              {clubMap[u.id]?.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {clubMap[u.id].map((club, i) => (
                    <span key={i} className="text-xs bg-blue-50 text-blue-400 px-2 py-0.5 rounded-full">{club}</span>
                  ))}
                </div>
              )}
            </button>
          ))}
        </div>
      )}

      {/* 상세 모달 */}
      {selectedUser && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
          onClick={() => setSelectedUser(null)}
        >
          <div
            className="bg-white rounded-3xl shadow-2xl w-80 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 모달 헤더 */}
            <div className={`px-6 py-6 text-center ${selectedUser.role === '대표' ? 'bg-gray-800' : 'bg-orange-500'}`}>
              <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center text-orange-500 font-black text-2xl mx-auto mb-3">
                {selectedUser.name[0]}
              </div>
              <h3 className="text-white font-black text-xl">
                {selectedUser.name}
                {isBirthdayToday(selectedUser.birth) && ' 🎂'}
              </h3>
              <p className="text-orange-100 text-sm mt-1">{selectedUser.team}</p>
            </div>

            {/* 모달 바디 */}
            <div className="p-5 space-y-3">
              {[
                { label: '직책', value: selectedUser.role },
                { label: '성별', value: selectedUser.gender === '남' ? '남성 👨' : '여성 👩' },
                { label: '생년월일', value: formatBirth(selectedUser.birth) },
                { label: '선호 음식', value: selectedUser.likes || '미입력' },
                { label: '비선호 음식', value: selectedUser.dislikes || '미입력' },
              ].map(({ label, value }, i, arr) => (
                <div key={label}
                  className={`flex justify-between items-center py-2 ${i < arr.length - 1 ? 'border-b border-gray-50' : ''}`}>
                  <span className="text-sm text-gray-400">{label}</span>
                  <span className="text-sm font-semibold text-gray-800">{value}</span>
                </div>
              ))}

              {/* 동아리 */}
              {clubMap[selectedUser.id]?.length > 0 && (
                <div className="pt-2 border-t border-gray-50">
                  <p className="text-sm text-gray-400 mb-2">동아리</p>
                  <div className="flex flex-wrap gap-1">
                    {clubMap[selectedUser.id].map((club, i) => (
                      <span key={i} className="text-xs bg-blue-50 text-blue-400 px-3 py-1 rounded-full font-semibold">{club}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="px-5 pb-5">
              <button
                onClick={() => setSelectedUser(null)}
                className="w-full py-3 bg-gray-100 text-gray-500 rounded-xl font-bold hover:bg-gray-200 transition-all"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}