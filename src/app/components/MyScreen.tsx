'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface MatchingNotification {
  id: string;
  user_id: string;
  group_id: string;
  type: 'approval_request' | 'matching_complete';
  status: string;
  created_at: string;
  group?: {
    id: string;
    date: string;
    members: any[];
    matcher_id: string;
    approval_status: string;
  };
}

interface Props {
  user: any;
  onLogout: () => void;
  onPendingChange: () => void;
}

interface ClubMembership {
  id: string;
  club_id: string;
  role: string;
  status: string;
  club: {
    id: string;
    name: string;
    emoji: string;
  };
}

interface PendingMember {
  id: string;
  user_id: string;
  club_id: string;
  user?: any;
  club?: any;
}

export default function MyScreen({ user, onLogout, onPendingChange }: Props) {
  const [myClubs, setMyClubs] = useState<ClubMembership[]>([]);
  const [pendingMembers, setPendingMembers] = useState<PendingMember[]>([]);
  const [matchingNotifications, setMatchingNotifications] = useState<MatchingNotification[]>([]);
  const [lightningPending, setLightningPending] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchMyData = async () => {
    setIsLoading(true);

    // 내 동아리 목록
    const { data: clubData } = await supabase
      .from('club_members')
      .select('id, club_id, role, status, club:club_id(id, name, emoji)')
      .eq('user_id', user.id)
      .eq('status', '승인');
    setMyClubs((clubData || []) as any);

    // 내가 회장인 동아리의 가입 신청 대기 목록
    const presidentClubs = (clubData || []).filter((m: any) => m.role === '회장');
    if (presidentClubs.length > 0) {
      const clubIds = presidentClubs.map((m: any) => m.club_id);
      const { data: pendingData } = await supabase
        .from('club_members')
        .select('*, user:user_id(id, name, team), club:club_id(id, name, emoji)')
        .in('club_id', clubIds)
        .eq('status', '신청중');
      setPendingMembers((pendingData || []) as any);
    }

    // 매칭 알림 조회
    const notiRes = await fetch(`/api/matching/approve?userId=${user.id}`);
    const notiData = await notiRes.json();
    setMatchingNotifications(notiData.notifications || []);

    // 번개 초대 알림 조회
    const lightningRes = await fetch(`/api/lightning?userId=${user.id}`);
    const lightningData = await lightningRes.json();
    setLightningPending(lightningData.pending || []);

    setIsLoading(false);
  };

  useEffect(() => { fetchMyData(); }, []);

  // 가입 승인
  const handleApprove = async (memberId: string) => {
    await supabase
      .from('club_members')
      .update({ status: '승인' })
      .eq('id', memberId);
    fetchMyData();
    onPendingChange();
  };

  // 가입 거절
  const handleReject = async (memberId: string) => {
    await supabase
      .from('club_members')
      .delete()
      .eq('id', memberId);
    fetchMyData();
    onPendingChange();
  };

  // 매칭 승인
  const handleMatchingApprove = async (groupId: string) => {
    await fetch('/api/matching/approve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: user.id, groupId, action: 'approve' }),
    });
    fetchMyData();
    onPendingChange();
  };

  // 매칭 거절
  const handleMatchingReject = async (groupId: string) => {
    await fetch('/api/matching/approve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: user.id, groupId, action: 'reject' }),
    });
    fetchMyData();
    onPendingChange();
  };

  // 매칭 완료 알림 읽음 처리
  const handleReadComplete = async (notificationId: string) => {
    await supabase
      .from('matching_notifications')
      .update({ status: 'read' })
      .eq('id', notificationId);
    fetchMyData();
    onPendingChange();
  };

  // 번개 승인/거절
  const handleLightningApprove = async (eventId: string, action: 'approve' | 'reject') => {
    await fetch('/api/lightning/respond', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: user.id, eventId, action }),
    });
    fetchMyData();
    onPendingChange();
  };

  const pendingMatchingNoti = matchingNotifications.filter(
    n => n.type === 'approval_request' && n.status === 'pending'
  );
  const completeMatchingNoti = matchingNotifications.filter(
    n => n.type === 'matching_complete' && n.status === 'unread'
  );

  return (
    <div className="max-w-2xl pt-4 space-y-4">

      {/* 프로필 헤더 */}
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-lg font-bold text-gray-800">내 프로필</h2>
        <button
          onClick={onLogout}
          className="text-xs text-gray-400 hover:text-red-400 transition-all px-3 py-1.5 border border-gray-200 hover:border-red-300 rounded-full"
        >
          로그아웃 🚪
        </button>
      </div>

      {/* 기본 정보 */}
      <div className="bg-white rounded-2xl p-5 shadow-sm space-y-3">
        {[
          { label: '이름', value: user.name },
          { label: '성별', value: user.gender === '남' ? '남성' : '여성' },
          { label: '소속팀', value: user.team },
          { label: '직책', value: user.role },
          { label: '선호 음식', value: user.likes || '미입력' },
          { label: '비선호 음식', value: user.dislikes || '미입력' },
        ].map(({ label, value }, i, arr) => (
          <div key={label}
            className={`flex justify-between items-center py-2 ${i < arr.length - 1 ? 'border-b border-gray-50' : ''}`}>
            <span className="text-sm text-gray-500">{label}</span>
            <span className="text-sm font-semibold text-gray-800">{value}</span>
          </div>
        ))}
      </div>

      {/* 내 동아리 */}
      <div className="bg-white rounded-2xl p-5 shadow-sm">
        <p className="font-bold text-gray-800 mb-3">내 동아리</p>
        {isLoading ? (
          <div className="text-center py-4">
            <div className="text-xl animate-spin inline-block">🍊</div>
          </div>
        ) : myClubs.length > 0 ? (
          <div className="space-y-2">
            {myClubs.map(membership => (
              <div key={membership.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                <span className="text-2xl">{(membership.club as any)?.emoji}</span>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-gray-800">{(membership.club as any)?.name}</p>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full font-bold
                  ${membership.role === '회장' ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-500'}`}>
                  {membership.role}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-300 text-sm text-center py-4">가입한 동아리가 없어요</p>
        )}
      </div>

      {/* 번개 초대 알림 */}
      {lightningPending.length > 0 && (
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <p className="font-bold text-gray-800">⚡ 번개 초대</p>
            <span className="text-xs bg-red-500 text-white px-2 py-0.5 rounded-full">{lightningPending.length}</span>
          </div>
          <div className="space-y-3">
            {lightningPending.map(ev => {
              const creator = ev.participants?.find((p: any) => p.user_id === ev.creator_id);
              const approvedCount = ev.participants?.filter((p: any) => p.status === 'approved').length || 0;
              return (
                <div key={ev.id} className="p-4 bg-yellow-50 rounded-xl border border-yellow-100">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-bold text-gray-800">{ev.title}</p>
                    {ev.time && <span className="text-xs text-gray-400">🕐 {ev.time}</span>}
                  </div>
                  <p className="text-xs text-gray-500 mb-1">
                    📅 {ev.date} · {creator?.user?.name}님이 초대했어요
                  </p>
                  <p className="text-xs text-gray-400 mb-3">
                    현재 {approvedCount}명 참가 확정
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleLightningApprove(ev.id, 'approve')}
                      className="flex-1 text-sm bg-yellow-400 text-white py-2 rounded-xl font-bold hover:bg-yellow-500">
                      참가 ⚡
                    </button>
                    <button
                      onClick={() => handleLightningApprove(ev.id, 'reject')}
                      className="flex-1 text-sm bg-gray-100 text-gray-500 py-2 rounded-xl">
                      패스
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 매칭 승인 요청 알림 */}
      {pendingMatchingNoti.length > 0 && (
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <p className="font-bold text-gray-800">매칭 승인 요청</p>
            <span className="text-xs bg-red-500 text-white px-2 py-0.5 rounded-full">{pendingMatchingNoti.length}</span>
          </div>
          <div className="space-y-3">
            {pendingMatchingNoti.map(noti => {
              const members: any[] = noti.group?.members || [];
              const matcher = members.find((m: any) => m.id === noti.group?.matcher_id);
              return (
                <div key={noti.id} className="p-4 bg-orange-50 rounded-xl border border-orange-100">
                  <p className="text-sm font-semibold text-gray-800 mb-1">
                    🎲 {matcher?.name}님이 점심 매칭을 요청했어요!
                  </p>
                  <p className="text-xs text-gray-500 mb-3">{noti.group?.date} · {members.length}명 그룹</p>
                  <div className="flex flex-wrap gap-1 mb-3">
                    {members.map((m: any) => (
                      <span key={m.id} className="text-xs bg-white text-gray-600 px-2 py-1 rounded-full border border-gray-200">
                        {m.name} {m.gender === '남' ? '👨' : '👩'}
                      </span>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleMatchingApprove(noti.group_id)}
                      className="flex-1 text-sm bg-orange-500 text-white py-2 rounded-xl font-bold"
                    >
                      승인 ✅
                    </button>
                    <button
                      onClick={() => handleMatchingReject(noti.group_id)}
                      className="flex-1 text-sm bg-gray-100 text-gray-500 py-2 rounded-xl"
                    >
                      거절
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 매칭 완료 알림 */}
      {completeMatchingNoti.length > 0 && (
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <p className="font-bold text-gray-800">매칭 완료 🎉</p>
            <span className="text-xs bg-red-500 text-white px-2 py-0.5 rounded-full">{completeMatchingNoti.length}</span>
          </div>
          <div className="space-y-3">
            {completeMatchingNoti.map(noti => {
              const members: any[] = noti.group?.members || [];
              return (
                <div key={noti.id} className="p-4 bg-green-50 rounded-xl border border-green-100">
                  <p className="text-sm font-semibold text-gray-800 mb-1">
                    🎉 {noti.group?.date} 점심 매칭이 확정됐어요!
                  </p>
                  <div className="flex flex-wrap gap-1 mb-3">
                    {members.map((m: any) => (
                      <span key={m.id} className="text-xs bg-white text-gray-600 px-2 py-1 rounded-full border border-green-200">
                        {m.name} {m.gender === '남' ? '👨' : '👩'}
                      </span>
                    ))}
                  </div>
                  <button
                    onClick={() => handleReadComplete(noti.id)}
                    className="w-full text-xs text-green-600 py-1.5 rounded-xl border border-green-200 bg-white"
                  >
                    확인
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 가입 승인 요청 (회장인 경우만) */}
      {pendingMembers.length > 0 && (
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <p className="font-bold text-gray-800">가입 승인 요청</p>
            <span className="text-xs bg-orange-500 text-white px-2 py-0.5 rounded-full">{pendingMembers.length}</span>
          </div>
          <div className="space-y-2">
            {pendingMembers.map(member => (
              <div key={member.id} className="flex items-center gap-3 p-3 bg-orange-50 rounded-xl">
                <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center text-orange-500 font-bold text-sm">
                  {member.user?.name?.[0]}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-gray-800">{member.user?.name}</p>
                  <p className="text-xs text-gray-400">
                    {member.user?.team} · {(member.club as any)?.emoji} {(member.club as any)?.name}
                  </p>
                </div>
                <button
                  onClick={() => handleApprove(member.id)}
                  className="text-xs bg-orange-500 text-white px-3 py-1.5 rounded-lg font-bold"
                >
                  승인
                </button>
                <button
                  onClick={() => handleReject(member.id)}
                  className="text-xs bg-gray-100 text-gray-500 px-3 py-1.5 rounded-lg"
                >
                  거절
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}