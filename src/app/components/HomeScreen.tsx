'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface Props {
  user: any;
}

interface DaySchedule {
  date: Date;
  dateStr: string;
  matchingTurn?: {
    matcher: any;
    status: string;
    group?: any[];
  };
  clubEvents: {
    id: string;
    title: string;
    time: string;
    location: string;
    club: any;
    myAttendance?: string;
  }[];
}

const DAYS = ['일', '월', '화', '수', '목', '금', '토'];

export default function HomeScreen({ user }: Props) {
  const [weekSchedules, setWeekSchedules] = useState<DaySchedule[]>([]);
  const [birthdayUsers, setBirthdayUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchWeekData = async () => {
    setIsLoading(true);

    const today = new Date();
    const days: DaySchedule[] = [];

    let count = 0;
    let i = 0;
    while (count < 7) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      const dayOfWeek = date.getDay();
      // 주말 제외 (0=일, 6=토)
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        const dateStr = date.toISOString().split('T')[0];
        days.push({ date, dateStr, clubEvents: [] });
        count++;
      }
      i++;
    }

    const startDate = days[0].dateStr;
    const endDate = days[6].dateStr;

    // 매칭 턴 불러오기
    const { data: turnData } = await supabase
      .from('matching_turns')
      .select('date, status, matcher_id')
      .gte('date', startDate)
      .lte('date', endDate);

    // 매칭자 정보
    const matcherIds = [...new Set((turnData || []).map(t => t.matcher_id))];
    const { data: matcherUsers } = await supabase
      .from('users')
      .select('id, name, team')
      .in('id', matcherIds.length > 0 ? matcherIds : ['none']);

    // 매칭 그룹
    const { data: groupData } = await supabase
      .from('matching_groups')
      .select('date, members, matcher_id')
      .gte('date', startDate)
      .lte('date', endDate);

    // 내가 속한 동아리
    const { data: myClubs } = await supabase
      .from('club_members')
      .select('club_id, club:club_id(id, name, emoji)')
      .eq('user_id', user.id)
      .eq('status', '승인');

    const myClubIds = (myClubs || []).map((m: any) => m.club_id);

    // 동아리 일정
    let clubEvents: any[] = [];
    if (myClubIds.length > 0) {
      const { data: eventData } = await supabase
        .from('club_events')
        .select('*, club:club_id(id, name, emoji)')
        .in('club_id', myClubIds)
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: true });

      clubEvents = eventData || [];

      // 내 참석 여부
      const eventIds = clubEvents.map(e => e.id);
      const { data: attendances } = await supabase
        .from('club_event_attendances')
        .select('event_id, status')
        .in('event_id', eventIds.length > 0 ? eventIds : ['none'])
        .eq('user_id', user.id);

      clubEvents = clubEvents.map(e => ({
        ...e,
        myAttendance: attendances?.find(a => a.event_id === e.id)?.status || null
      }));
    }

    // 날짜별로 조합
    const result = days.map(day => {
      const turn = turnData?.find(t => t.date === day.dateStr);
      const matcher = matcherUsers?.find(u => u.id === turn?.matcher_id);
      const group = groupData?.find(g => g.date === day.dateStr);
      const dayClubEvents = clubEvents.filter(e => e.date === day.dateStr);

      return {
        ...day,
        matchingTurn: turn ? {
          matcher,
          status: turn.status,
          group: group?.members || null
        } : undefined,
        clubEvents: dayClubEvents
      };
    });

// 이달의 생일자
const thisMonth = String(new Date().getMonth() + 1).padStart(2, '0');
const { data: allUsers } = await supabase
  .from('users')
  .select('id, name, birth, team');

const birthdays = (allUsers || []).filter(u => 
  u.birth && u.birth.length === 8 && u.birth.slice(4, 6) === thisMonth
).sort((a, b) => a.birth.slice(6, 8).localeCompare(b.birth.slice(6, 8)));

setBirthdayUsers(birthdays);
setWeekSchedules(result);
setIsLoading(false);
  };

  useEffect(() => { fetchWeekData(); }, []);

  const formatDate = (date: Date) => {
    const isToday = date.toDateString() === new Date().toDateString();
    return {
      month: date.getMonth() + 1,
      day: date.getDate(),
      dayOfWeek: DAYS[date.getDay()],
      isToday
    };
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-4xl animate-spin">🍊</div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl">
{/* 헤더 */}
<div className="mb-6">
  <p className="text-sm text-gray-400">안녕하세요 👋</p>
  <h1 className="text-2xl font-black text-gray-900">
    {user.name}님, 이번 주 일정이에요!
  </h1>
</div>

{/* 이달의 생일자 */}
{birthdayUsers.length > 0 && (
  <div className="bg-white rounded-2xl p-5 shadow-sm mb-6 border-2 border-yellow-200">
    <div className="flex items-center gap-2 mb-3">
      <span className="text-xl">🎂</span>
      <p className="font-black text-gray-800">
        {new Date().getMonth() + 1}월의 생일자
      </p>
      <span className="text-xs bg-yellow-100 text-yellow-600 px-2 py-0.5 rounded-full font-bold">
        {birthdayUsers.length}명
      </span>
    </div>
    <div className="flex flex-wrap gap-2">
      {birthdayUsers.map(u => {
        const isToday = u.birth.slice(4, 8) === String(new Date().getMonth() + 1).padStart(2, '0') + String(new Date().getDate()).padStart(2, '0');
        const day = u.birth.slice(6, 8);
        return (
          <div key={u.id}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl
              ${isToday ? 'bg-yellow-400 text-white' : 'bg-yellow-50 text-gray-700'}`}>
            <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-sm
              ${isToday ? 'bg-white text-yellow-500' : 'bg-yellow-200 text-yellow-600'}`}>
              {u.name[0]}
            </div>
            <div>
              <p className="text-sm font-bold">{u.name} {isToday ? '🎉' : ''}</p>
              <p className={`text-xs ${isToday ? 'text-yellow-100' : 'text-gray-400'}`}>
                {parseInt(day)}일 · {u.team}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  </div>
)}

      {/* 이번 주 일정 */}
      <div className="space-y-3">
        {weekSchedules.map((day) => {
          const { month, dayOfWeek, day: dayNum, isToday } = formatDate(day.date);
          const hasEvent = day.matchingTurn || day.clubEvents.length > 0;

          return (
            <div key={day.dateStr}
              className={`bg-white rounded-2xl p-4 shadow-sm border-2 transition-all
                ${isToday ? 'border-orange-400' : 'border-transparent'}`}>

              {/* 날짜 헤더 */}
              <div className="flex items-center gap-3 mb-3">
                <div className={`w-10 h-10 rounded-xl flex flex-col items-center justify-center
                  ${isToday ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-600'}`}>
                  <span className="text-xs font-bold">{dayOfWeek}</span>
                  <span className="text-sm font-black">{dayNum}</span>
                </div>
                <div>
                  <p className={`text-sm font-bold ${isToday ? 'text-orange-500' : 'text-gray-700'}`}>
                    {month}월 {dayNum}일 ({dayOfWeek})
                    {isToday && <span className="ml-2 text-xs bg-orange-100 text-orange-500 px-2 py-0.5 rounded-full">오늘</span>}
                  </p>
                </div>
              </div>

              {/* 일정 내용 */}
              {hasEvent ? (
                <div className="space-y-2 pl-13">
                  {/* 매칭 일정 */}
                  {day.matchingTurn && (
                    <div className={`flex items-start gap-3 p-3 rounded-xl
                      ${day.matchingTurn.status === '완료' ? 'bg-orange-50' : 'bg-gray-50'}`}>
                      <span className="text-lg">🍱</span>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-bold text-gray-800">점심 매칭</p>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-semibold
                            ${day.matchingTurn.status === '완료' ? 'bg-orange-100 text-orange-500' :
                              day.matchingTurn.status === '미실행' ? 'bg-gray-100 text-gray-400' :
                              'bg-blue-50 text-blue-400'}`}>
                            {day.matchingTurn.status === '완료' ? '매칭완료' :
                             day.matchingTurn.status === '미실행' ? '미진행' : '대기중'}
                          </span>
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5">
                          매칭자: <span className="font-semibold text-gray-600">{day.matchingTurn.matcher?.name}</span>
                          {day.matchingTurn.matcher?.team && ` · ${day.matchingTurn.matcher.team}`}
                        </p>
                        {/* 매칭 그룹 */}
                        {day.matchingTurn.group && (
                          <div className="flex items-center gap-1 mt-1">
                            <div className="flex -space-x-1">
                              {day.matchingTurn.group.slice(0, 4).map((member: any) => (
                                <div key={member.id}
                                  className="w-5 h-5 bg-orange-200 rounded-full flex items-center justify-center text-orange-700 font-bold text-xs border border-white"
                                  title={member.name}>
                                  {member.name[0]}
                                </div>
                              ))}
                            </div>
                            <span className="text-xs text-gray-400">
                              {day.matchingTurn.group.map((m: any) => m.name).join(', ')}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* 동아리 일정 */}
                  {day.clubEvents.map(event => (
                    <div key={event.id} className="flex items-start gap-3 p-3 rounded-xl bg-blue-50">
                      <span className="text-lg">{event.club?.emoji || '🏃'}</span>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-bold text-gray-800">{event.title}</p>
                          <span className="text-xs text-blue-400 font-semibold">{event.club?.name}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          {event.time && <span className="text-xs text-gray-400">🕐 {event.time}</span>}
                          {event.location && <span className="text-xs text-gray-400">📍 {event.location}</span>}
                        </div>
                        {/* 참석 여부 */}
                        <div className="mt-1">
                          {event.myAttendance ? (
                            <span className={`text-xs px-2 py-0.5 rounded-full font-semibold
                              ${event.myAttendance === '참석' ? 'bg-blue-100 text-blue-500' : 'bg-gray-100 text-gray-400'}`}>
                              {event.myAttendance === '참석' ? '✅ 참석' : '❌ 불참'}
                            </span>
                          ) : (
                            <span className="text-xs text-orange-400 bg-orange-50 px-2 py-0.5 rounded-full">
                              ⚠️ 참석 여부 미선택
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-gray-300 pl-13">일정이 없어요</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}