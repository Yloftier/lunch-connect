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
  joined_at: string;
  user?: any;
}

interface ClubEvent {
  id: string;
  club_id: string;
  title: string;
  date: string;
  description: string;
  created_by: string;
}

interface Props {
  user: any;
}

export default function ClubScreen({ user }: Props) {
  const [clubs, setClubs] = useState<Club[]>([]);
  const [selectedClub, setSelectedClub] = useState<Club | null>(null);
  const [members, setMembers] = useState<ClubMember[]>([]);
  const [events, setEvents] = useState<ClubEvent[]>([]);
  const [myClubs, setMyClubs] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showEventForm, setShowEventForm] = useState(false);
  const [newEvent, setNewEvent] = useState({ title: '', date: '', description: '' });

  // 동아리 목록 불러오기
  const fetchClubs = async () => {
    const { data } = await supabase.from('clubs').select('*');
    setClubs(data || []);

    // 내가 가입한 동아리
    const { data: myData } = await supabase
      .from('club_members')
      .select('club_id')
      .eq('user_id', user.id);
    setMyClubs(myData?.map(m => m.club_id) || []);
  };

  // 동아리 상세 불러오기
  const fetchClubDetail = async (club: Club) => {
    setIsLoading(true);
    setSelectedClub(club);

    // 멤버 목록
    const { data: memberData } = await supabase
      .from('club_members')
      .select('*, user:user_id(id, name, team, role)')
      .eq('club_id', club.id);
    setMembers(memberData || []);

    // 활동 일정
    const { data: eventData } = await supabase
      .from('club_events')
      .select('*')
      .eq('club_id', club.id)
      .order('date', { ascending: true });
    setEvents(eventData || []);

    setIsLoading(false);
  };

  useEffect(() => { fetchClubs(); }, []);

  // 가입
  const handleJoin = async (clubId: string) => {
    const { error } = await supabase
      .from('club_members')
      .insert([{ club_id: clubId, user_id: user.id }]);

    if (!error) {
      setMyClubs(prev => [...prev, clubId]);
      if (selectedClub?.id === clubId) fetchClubDetail(selectedClub);
    }
  };

  // 탈퇴
  const handleLeave = async (clubId: string) => {
    if (!confirm('정말 탈퇴하시겠어요?')) return;
    await supabase
      .from('club_members')
      .delete()
      .eq('club_id', clubId)
      .eq('user_id', user.id);

    setMyClubs(prev => prev.filter(id => id !== clubId));
    if (selectedClub?.id === clubId) fetchClubDetail(selectedClub);
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
        description: newEvent.description,
        created_by: user.id
      }]);

    if (!error) {
      setNewEvent({ title: '', date: '', description: '' });
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

  const isMember = (clubId: string) => myClubs.includes(clubId);

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
                {isMember(club.id) && (
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
                    <h2 className="text-2xl font-black text-gray-800">{selectedClub.name}</h2>
                    <p className="text-gray-400 text-sm mt-1">{selectedClub.description}</p>
                  </div>
                </div>
                {isMember(selectedClub.id) ? (
                  <button
                    onClick={() => handleLeave(selectedClub.id)}
                    className="text-sm text-gray-400 hover:text-red-400 border border-gray-200 hover:border-red-300 px-4 py-2 rounded-xl transition-all"
                  >
                    탈퇴하기
                  </button>
                ) : (
                  <button
                    onClick={() => handleJoin(selectedClub.id)}
                    className="text-sm text-white bg-orange-500 hover:bg-orange-600 px-4 py-2 rounded-xl transition-all font-bold"
                  >
                    가입하기
                  </button>
                )}
              </div>
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
                        <div>
                          <p className="text-sm font-semibold text-gray-800">{member.user?.name}</p>
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
                  {isMember(selectedClub.id) && (
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
                      placeholder="일정 제목"
                      value={newEvent.title}
                      onChange={(e) => setNewEvent({...newEvent, title: e.target.value})}
                    />
                    <input
                      type="date"
                      className="w-full p-2 border rounded-lg text-xs text-black outline-none focus:ring-2 focus:ring-orange-400"
                      value={newEvent.date}
                      onChange={(e) => setNewEvent({...newEvent, date: e.target.value})}
                    />
                    <textarea
                      className="w-full p-2 border rounded-lg text-xs text-black outline-none focus:ring-2 focus:ring-orange-400 resize-none"
                      placeholder="일정 설명 (선택)"
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
                  <div className="space-y-2">
                    {events.map(event => (
                      <div key={event.id} className="flex items-start gap-2 p-3 bg-gray-50 rounded-xl">
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-gray-800">{event.title}</p>
                          <p className="text-xs text-orange-500 mt-0.5">
                            📅 {new Date(event.date + 'T00:00:00').toLocaleDateString('ko-KR')}
                          </p>
                          {event.description && (
                            <p className="text-xs text-gray-400 mt-1">{event.description}</p>
                          )}
                        </div>
                        {event.created_by === user.id && (
                          <button
                            onClick={() => handleDeleteEvent(event.id)}
                            className="text-xs text-gray-300 hover:text-red-400"
                          >
                            삭제
                          </button>
                        )}
                      </div>
                    ))}
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