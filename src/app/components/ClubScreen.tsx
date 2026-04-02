'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface Club {
  id: string;
  name: string;
  description: string;
  emoji: string;
}

interface ClubMember {
  id: string;
  club_id: string;
  user_id: string;
  role: string;
  status: string;
  joined_at: string;
  user?: any;
}

interface ClubEvent {
  id: string;
  club_id: string;
  title: string;
  date: string;
  time: string;
  location: string;
  description: string;
  created_by: string;
}

interface Attendance {
  id: string;
  event_id: string;
  user_id: string;
  status: string;
}

interface Props {
  user: any;
}

export default function ClubScreen({ user }: Props) {
  const [clubs, setClubs] = useState<Club[]>([]);
  const [selectedClub, setSelectedClub] = useState<Club | null>(null);
  const [members, setMembers] = useState<ClubMember[]>([]);
  const [pendingMembers, setPendingMembers] = useState<ClubMember[]>([]);
  const [events, setEvents] = useState<ClubEvent[]>([]);
  const [attendances, setAttendances] = useState<Attendance[]>([]);
  const [myMembership, setMyMembership] = useState<ClubMember | null>(null);
  const [myClubs, setMyClubs] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showEventForm, setShowEventForm] = useState(false);
const [newEvent, setNewEvent] = useState({ title: '', date: '', time: '', location: '', description: '' });
const [attendanceModal, setAttendanceModal] = useState<string | null>(null); // event_id

  const isPresident = myMembership?.role === '회장' && myMembership?.status === '승인';
  const isMember = myMembership?.status === '승인';
  const isPending = myMembership?.status === '신청중';
  const president = members.find(m => m.role === '회장');

  const fetchClubs = async () => {
    const { data } = await supabase.from('clubs').select('*');
    setClubs(data || []);

    const { data: myData } = await supabase
      .from('club_members')
      .select('club_id, status')
      .eq('user_id', user.id)
      .eq('status', '승인');
    setMyClubs(myData?.map(m => m.club_id) || []);
  };

  const fetchClubDetail = async (club: Club) => {
    setIsLoading(true);
    setSelectedClub(club);
    setShowEventForm(false);

    // 내 멤버십 확인
    const { data: myData } = await supabase
      .from('club_members')
      .select('*')
      .eq('club_id', club.id)
      .eq('user_id', user.id)
      .single();
    setMyMembership(myData || null);

// 승인된 멤버 목록
const { data: memberData } = await supabase
  .from('club_members')
  .select('id, club_id, user_id, role, status, joined_at')
  .eq('club_id', club.id)
  .eq('status', '승인');

// 멤버 유저 정보 별도로 가져오기
const memberUserIds = (memberData || []).map(m => m.user_id);
const { data: memberUsers } = await supabase
  .from('users')
  .select('id, name, team, role')
  .in('id', memberUserIds);

const membersWithUser = (memberData || []).map(m => ({
  ...m,
  user: memberUsers?.find(u => u.id === m.user_id) || null
}));
setMembers(membersWithUser as any);

// 가입 신청 대기 목록 (회장용)
const { data: pendingData } = await supabase
  .from('club_members')
  .select('id, club_id, user_id, role, status')
  .eq('club_id', club.id)
  .eq('status', '신청중');

const pendingUserIds = (pendingData || []).map(m => m.user_id);
const { data: pendingUsers } = await supabase
  .from('users')
  .select('id, name, team')
  .in('id', pendingUserIds.length > 0 ? pendingUserIds : ['none']);

const pendingWithUser = (pendingData || []).map(m => ({
  ...m,
  user: pendingUsers?.find(u => u.id === m.user_id) || null
}));
setPendingMembers(pendingWithUser as any);

    // 활동 일정
    const { data: eventData } = await supabase
      .from('club_events')
      .select('*')
      .eq('club_id', club.id)
      .order('date', { ascending: true });
    setEvents(eventData || []);

    // 참석 여부
    const { data: attendanceData } = await supabase
      .from('club_event_attendances')
      .select('*')
      .in('event_id', eventData?.map(e => e.id) || []);
    setAttendances(attendanceData || []);

    setIsLoading(false);
  };

  useEffect(() => { fetchClubs(); }, []);

  // 가입 신청
  const handleApply = async (clubId: string) => {
    const { error } = await supabase
      .from('club_members')
      .insert([{ club_id: clubId, user_id: user.id, status: '신청중', role: '멤버' }]);

    if (!error && selectedClub) fetchClubDetail(selectedClub);
  };

  // 탈퇴
  const handleLeave = async (clubId: string) => {
    if (!confirm('정말 탈퇴하시겠어요?')) return;
    await supabase
      .from('club_members')
      .delete()
      .eq('club_id', clubId)
      .eq('user_id', user.id);

    setMyMembership(null);
    setMyClubs(prev => prev.filter(id => id !== clubId));
    if (selectedClub) fetchClubDetail(selectedClub);
  };

  // 가입 승인
  const handleApprove = async (memberId: string) => {
    await supabase
      .from('club_members')
      .update({ status: '승인' })
      .eq('id', memberId);
    if (selectedClub) fetchClubDetail(selectedClub);
  };

  // 가입 거절
  const handleReject = async (memberId: string) => {
    await supabase
      .from('club_members')
      .delete()
      .eq('id', memberId);
    if (selectedClub) fetchClubDetail(selectedClub);
  };

  // 일정 추가
  const handleAddEvent = async () => {
    if (!newEvent.title || !newEvent.date) {
      alert('제목과 날짜는 필수예요!');
      return;
    }
    const { error } = await supabase
      .from('club_events')
      .insert([{
        club_id: selectedClub?.id,
        title: newEvent.title,
        date: newEvent.date,
        time: newEvent.time,
        location: newEvent.location,
        description: newEvent.description,
        created_by: user.id
      }]);

    if (!error) {
      setNewEvent({ title: '', date: '', time: '', location: '', description: '' });
      setShowEventForm(false);
      if (selectedClub) fetchClubDetail(selectedClub);
    }
  };

  // 일정 삭제
  const handleDeleteEvent = async (eventId: string) => {
    if (!confirm('일정을 삭제할까요?')) return;
    await supabase.from('club_events').delete().eq('id', eventId);
    if (selectedClub) fetchClubDetail(selectedClub);
  };

  // 참석 여부 토글
  const handleAttendance = async (eventId: string, currentStatus: string | null) => {
    if (currentStatus) {
      // 토글: 참석 ↔ 불참
      const newStatus = currentStatus === '참석' ? '불참' : '참석';
      await supabase
        .from('club_event_attendances')
        .update({ status: newStatus })
        .eq('event_id', eventId)
        .eq('user_id', user.id);
    } else {
      // 새로 등록
      await supabase
        .from('club_event_attendances')
        .insert([{ event_id: eventId, user_id: user.id, status: '참석' }]);
    }
    if (selectedClub) fetchClubDetail(selectedClub);
  };

  const getMyAttendance = (eventId: string) => {
    return attendances.find(a => a.event_id === eventId && a.user_id === user.id);
  };

  const getAttendanceCount = (eventId: string) => {
    return attendances.filter(a => a.event_id === eventId && a.status === '참석').length;
  };

  return (
    <div className="flex gap-5 p-5 min-h-screen">

      {/* 좌측: 동아리 목록 */}
      <div className="w-72 space-y-3">
        <h2 className="font-black text-gray-800 text-lg mb-4">동아리 🏃</h2>
        {clubs.map(club => (
          <button
            key={club.id}
            onClick={() => fetchClubDetail(club)}
            className={`w-full text-left p-5 rounded-2xl border-2 transition-all
              ${selectedClub?.id === club.id
                ? 'border-orange-500 bg-orange-50'
                : 'border-gray-100 bg-white hover:border-orange-200'}`}
          >
            <div className="flex items-center gap-3 mb-2">
              <span className="text-3xl">{club.emoji}</span>
              <div className="flex-1">
                <p className="font-bold text-gray-800">{club.name}</p>
                {myClubs.includes(club.id) && (
                  <span className="text-xs bg-orange-100 text-orange-500 px-2 py-0.5 rounded-full">가입중</span>
                )}
              </div>
            </div>
            <p className="text-xs text-gray-400">{club.description}</p>
          </button>
        ))}
      </div>

      {/* 우측: 동아리 상세 */}
      <div className="flex-1">
        {selectedClub ? (
          <>
            {/* 헤더 */}
            <div className="bg-white rounded-2xl p-6 shadow-sm mb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <span className="text-5xl">{selectedClub.emoji}</span>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-2xl font-black text-gray-800">{selectedClub.name}</h2>
                      {isPresident && (
                        <span className="text-xs bg-orange-500 text-white px-2 py-0.5 rounded-full">회장</span>
                      )}
                    </div>
                    <p className="text-gray-400 text-sm mt-1">{selectedClub.description}</p>
<div className="flex items-center gap-3 mt-2">
  <p className="text-xs text-gray-300">멤버 {members.length}명</p>
{president && (
  <div className="flex items-center gap-1.5">
    <span className="text-gray-200">|</span>
    <div className="w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center text-white font-bold text-xs">
      {president.user?.name?.[0]}
    </div>
    <div>
      <span className="text-xs font-bold text-gray-700">{president.user?.name}</span>
      <span className="text-xs text-gray-400"> · {president.user?.team}</span>
    </div>
    <span className="text-xs bg-orange-500 text-white px-2 py-0.5 rounded-full font-bold">회장</span>
  </div>
)}
</div>
                  </div>
                </div>

                {/* 가입/탈퇴 버튼 */}
                {!myMembership ? (
                  <button
                    onClick={() => handleApply(selectedClub.id)}
                    className="text-sm text-white bg-orange-500 hover:bg-orange-600 px-4 py-2 rounded-xl transition-all font-bold"
                  >
                    가입 신청
                  </button>
                ) : isPending ? (
                  <span className="text-sm text-gray-400 border border-gray-200 px-4 py-2 rounded-xl">
                    승인 대기중 ⏳
                  </span>
                ) : isMember && !isPresident ? (
                  <button
                    onClick={() => handleLeave(selectedClub.id)}
                    className="text-sm text-gray-400 hover:text-red-400 border border-gray-200 hover:border-red-300 px-4 py-2 rounded-xl transition-all"
                  >
                    탈퇴하기
                  </button>
                ) : null}
              </div>

              {/* 가입 신청 대기 목록 (회장만) */}
              {isPresident && pendingMembers.length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <p className="text-sm font-bold text-gray-700 mb-3">
                    가입 신청 대기 <span className="text-orange-500">{pendingMembers.length}명</span>
                  </p>
                  <div className="space-y-2">
                    {pendingMembers.map(member => (
                      <div key={member.id} className="flex items-center gap-3 bg-orange-50 p-3 rounded-xl">
                        <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center text-orange-500 font-bold text-sm">
                          {member.user?.name?.[0]}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-gray-800">{member.user?.name}</p>
                          <p className="text-xs text-gray-400">{member.user?.team}</p>
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

            <div className="grid grid-cols-2 gap-4">
              {/* 멤버 목록 */}
              <div className="bg-white rounded-2xl p-5 shadow-sm">
                <p className="font-bold text-gray-800 mb-4">
                  멤버 <span className="text-orange-500">{members.length}명</span>
                </p>
                {isLoading ? (
                  <div className="text-center py-4">
                    <div className="text-2xl animate-spin inline-block">🍊</div>
                  </div>
                ) : members.length > 0 ? (
                  <div className="space-y-3">
                    {members.map(member => (
                      <div key={member.id} className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-orange-100 rounded-full flex items-center justify-center text-orange-500 font-bold text-sm">
                          {member.user?.name?.[0]}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-1">
                            <p className="text-sm font-semibold text-gray-800">{member.user?.name}</p>
                            {member.role === '회장' && (
                              <span className="text-xs bg-orange-100 text-orange-500 px-1.5 py-0.5 rounded-full">회장</span>
                            )}
                          </div>
                          <p className="text-xs text-gray-400">{member.user?.team}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-300 text-sm text-center py-4">아직 멤버가 없어요</p>
                )}
              </div>

              {/* 활동 일정 */}
              <div className="bg-white rounded-2xl p-5 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <p className="font-bold text-gray-800">활동 일정</p>
                  {isMember && (
                    <button
                      onClick={() => setShowEventForm(!showEventForm)}
                      className="text-xs text-orange-500 font-bold"
                    >
                      + 일정 추가
                    </button>
                  )}
                </div>

                {/* 일정 추가 폼 */}
                {showEventForm && (
                  <div className="bg-orange-50 rounded-xl p-3 mb-3 space-y-2">
                    <input
                      className="w-full p-2 border rounded-lg text-xs text-black outline-none focus:ring-2 focus:ring-orange-400"
                      placeholder="일정 제목 *"
                      value={newEvent.title}
                      onChange={(e) => setNewEvent({...newEvent, title: e.target.value})}
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="date"
                        className="w-full p-2 border rounded-lg text-xs text-black outline-none focus:ring-2 focus:ring-orange-400"
                        value={newEvent.date}
                        onChange={(e) => setNewEvent({...newEvent, date: e.target.value})}
                      />
                      <input
                        type="time"
                        className="w-full p-2 border rounded-lg text-xs text-black outline-none focus:ring-2 focus:ring-orange-400"
                        value={newEvent.time}
                        onChange={(e) => setNewEvent({...newEvent, time: e.target.value})}
                      />
                    </div>
                    <input
                      className="w-full p-2 border rounded-lg text-xs text-black outline-none focus:ring-2 focus:ring-orange-400"
                      placeholder="장소"
                      value={newEvent.location}
                      onChange={(e) => setNewEvent({...newEvent, location: e.target.value})}
                    />
                    <textarea
                      className="w-full p-2 border rounded-lg text-xs text-black outline-none focus:ring-2 focus:ring-orange-400 resize-none"
                      placeholder="설명 (선택)"
                      rows={2}
                      value={newEvent.description}
                      onChange={(e) => setNewEvent({...newEvent, description: e.target.value})}
                    />
                    <button
                      onClick={handleAddEvent}
                      className="w-full bg-orange-500 text-white py-2 rounded-lg text-xs font-bold"
                    >
                      등록
                    </button>
                  </div>
                )}

                {events.length > 0 ? (
                  <div className="space-y-3">
                    {events.map(event => {
                      const myAttendance = getMyAttendance(event.id);
                      const attendCount = getAttendanceCount(event.id);

                      return (
                        <div key={event.id} className="p-3 bg-gray-50 rounded-xl">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1">
                              <p className="text-sm font-bold text-gray-800">{event.title}</p>
                              <div className="flex flex-wrap gap-2 mt-1">
                                <span className="text-xs text-orange-500">
                                  📅 {new Date(event.date + 'T00:00:00').toLocaleDateString('ko-KR')}
                                </span>
                                {event.time && (
                                  <span className="text-xs text-gray-400">🕐 {event.time}</span>
                                )}
                                {event.location && (
                                  <span className="text-xs text-gray-400">📍 {event.location}</span>
                                )}
                              </div>
                              {event.description && (
                                <p className="text-xs text-gray-400 mt-1">{event.description}</p>
                              )}
                            </div>
                            {event.created_by === user.id && (
                              <button
                                onClick={() => handleDeleteEvent(event.id)}
                                className="text-xs text-gray-300 hover:text-red-400 ml-2"
                              >
                                삭제
                              </button>
                            )}
                          </div>

                          {/* 참석 버튼 */}
{isMember && (
  <div className="mt-2 pt-2 border-t border-gray-100">
    {/* 참석 인원 아바타 */}
    {attendances.filter(a => a.event_id === event.id && a.status === '참석').length > 0 && (
      <div className="flex items-center gap-1 mb-2">
        <div className="flex -space-x-1">
          {attendances
            .filter(a => a.event_id === event.id && a.status === '참석')
            .slice(0, 5)
            .map(a => {
              const member = members.find(m => m.user_id === a.user_id);
              return (
                <div
                  key={a.id}
                  className="w-6 h-6 bg-orange-100 rounded-full flex items-center justify-center text-orange-500 font-bold text-xs border-2 border-white"
                  title={member?.user?.name}
                >
                  {member?.user?.name?.[0] || '?'}
                </div>
              );
            })}
        </div>
        <span className="text-xs text-gray-400 ml-1">
          {attendances.filter(a => a.event_id === event.id && a.status === '참석').length}명 참석
        </span>
      </div>
    )}

    <div className="flex items-center justify-between">
      <span className="text-xs text-gray-300">
        {attendances.filter(a => a.event_id === event.id && a.status === '참석').length === 0 && '아직 참석자가 없어요'}
      </span>
      <button
        onClick={() => setAttendanceModal(event.id)}
        className={`text-xs px-3 py-1.5 rounded-lg font-bold transition-all
          ${myAttendance?.status === '참석'
            ? 'bg-orange-500 text-white'
            : myAttendance?.status === '불참'
            ? 'bg-gray-200 text-gray-500'
            : 'bg-gray-100 text-gray-400 hover:bg-orange-50 hover:text-orange-500'}`}
      >
        {myAttendance?.status === '참석' ? '✅ 참석' : myAttendance?.status === '불참' ? '❌ 불참' : '참석 여부 선택'}
      </button>
    </div>
  </div>
)}
                       {/* 참석 여부 모달 */}
{attendanceModal && (
  <div
    className="fixed inset-0 z-50 flex items-center justify-center"
    style={{ backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
    onClick={() => setAttendanceModal(null)}
  >
    <div
      className="bg-white rounded-3xl shadow-2xl w-80 overflow-hidden"
      onClick={(e) => e.stopPropagation()}
    >
      {/* 모달 헤더 */}
      <div className="bg-orange-500 px-6 py-5 text-center">
        <p className="text-white text-xs font-semibold opacity-80 mb-1">활동 일정</p>
        <h3 className="text-white font-black text-xl">
          {events.find(e => e.id === attendanceModal)?.title}
        </h3>
        <div className="flex items-center justify-center gap-3 mt-2">
          {events.find(e => e.id === attendanceModal)?.date && (
            <span className="text-orange-100 text-xs">
              📅 {new Date(events.find(e => e.id === attendanceModal)!.date + 'T00:00:00').toLocaleDateString('ko-KR')}
            </span>
          )}
          {events.find(e => e.id === attendanceModal)?.time && (
            <span className="text-orange-100 text-xs">
              🕐 {events.find(e => e.id === attendanceModal)?.time}
            </span>
          )}
        </div>
      </div>

      {/* 모달 바디 */}
      <div className="p-6">
        <p className="text-center text-sm text-gray-500 mb-5">참석 여부를 선택해주세요</p>
        <div className="grid grid-cols-2 gap-3 mb-4">
          <button
            onClick={() => {
              handleAttendance(attendanceModal, getMyAttendance(attendanceModal)?.status || null);
              setAttendanceModal(null);
            }}
            className="flex flex-col items-center gap-2 py-5 rounded-2xl bg-orange-50 border-2 border-orange-200 hover:bg-orange-500 hover:border-orange-500 hover:text-white transition-all group"
          >
            <span className="text-3xl">✅</span>
            <span className="text-sm font-black text-orange-500 group-hover:text-white">참석</span>
          </button>
          <button
            onClick={async () => {
              const current = getMyAttendance(attendanceModal);
              if (current) {
                await supabase
                  .from('club_event_attendances')
                  .update({ status: '불참' })
                  .eq('event_id', attendanceModal)
                  .eq('user_id', user.id);
              } else {
                await supabase
                  .from('club_event_attendances')
                  .insert([{ event_id: attendanceModal, user_id: user.id, status: '불참' }]);
              }
              if (selectedClub) fetchClubDetail(selectedClub);
              setAttendanceModal(null);
            }}
            className="flex flex-col items-center gap-2 py-5 rounded-2xl bg-gray-50 border-2 border-gray-200 hover:bg-gray-500 hover:border-gray-500 hover:text-white transition-all group"
          >
            <span className="text-3xl">❌</span>
            <span className="text-sm font-black text-gray-400 group-hover:text-white">불참</span>
          </button>
        </div>
        <button
          onClick={() => setAttendanceModal(null)}
          className="w-full py-2 text-xs text-gray-300 hover:text-gray-400 transition-all"
        >
          닫기
        </button>
      </div>
    </div>
  </div>
)}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-gray-300 text-sm text-center py-4">아직 일정이 없어요</p>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
            <span className="text-5xl mb-4">🏃</span>
            <p className="text-gray-500 font-semibold">동아리를 선택해주세요</p>
            <p className="text-gray-400 text-sm mt-1">관심있는 동아리에 가입해보세요!</p>
          </div>
        )}
      </div>
    </div>
  );
}