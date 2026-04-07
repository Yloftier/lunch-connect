import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// 번개 생성
export async function POST(req: Request) {
  try {
    const { creatorId, title, date, time, invitedUserIds } = await req.json();

    // 1. 번개 이벤트 생성
    const { data: event, error } = await supabase
      .from('lightning_events')
      .insert([{ creator_id: creatorId, title: title || '번개', date, time }])
      .select('id')
      .single();

    if (error || !event) {
      return NextResponse.json({ error: '번개 생성 실패' }, { status: 500 });
    }

    // 2. 생성자 포함 전체 참가자 insert (생성자는 자동 approved)
    const allParticipants = [
      { event_id: event.id, user_id: creatorId, status: 'approved' },
      ...invitedUserIds.map((uid: string) => ({
        event_id: event.id,
        user_id: uid,
        status: 'pending',
      })),
    ];
    await supabase.from('lightning_participants').insert(allParticipants);

    return NextResponse.json({ success: true, eventId: event.id });
  } catch (error) {
    console.error('번개 생성 오류:', error);
    return NextResponse.json({ error: '오류가 발생했어요.' }, { status: 500 });
  }
}

// 번개 알림 조회 (내가 초대받은 것 + 내가 만든 것)
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    if (!userId) return NextResponse.json({ error: 'userId 필요' }, { status: 400 });

    // 내가 참가자인 번개 목록
    const { data: participations } = await supabase
      .from('lightning_participants')
      .select('*')
      .eq('user_id', userId);

    if (!participations || participations.length === 0) {
      return NextResponse.json({ pending: [], upcoming: [] });
    }

    const eventIds = participations.map(p => p.event_id);

    // 번개 이벤트 조회
    const { data: events } = await supabase
      .from('lightning_events')
      .select('*')
      .in('id', eventIds)
      .order('date', { ascending: true });

    // 각 번개의 참가자 전체 조회
    const { data: allParticipants } = await supabase
      .from('lightning_participants')
      .select('*')
      .in('event_id', eventIds);

    // 참가자 유저 정보 조회
    const userIds = [...new Set((allParticipants || []).map(p => p.user_id))];
    const { data: users } = await supabase
      .from('users')
      .select('id, name, team, gender')
      .in('id', userIds);

    const userMap: Record<string, any> = {};
    (users || []).forEach(u => { userMap[u.id] = u; });

    // 이벤트에 참가자 정보 병합
    const enrichedEvents = (events || []).map(ev => ({
      ...ev,
      participants: (allParticipants || [])
        .filter(p => p.event_id === ev.id)
        .map(p => ({ ...p, user: userMap[p.user_id] || null })),
      myStatus: participations.find(p => p.event_id === ev.id)?.status || 'pending',
    }));

    const today = new Date().toISOString().split('T')[0];

    // pending: 내가 아직 응답 안 한 초대
    const pending = enrichedEvents.filter(
      ev => ev.myStatus === 'pending' && ev.creator_id !== userId
    );

    // upcoming: 내가 승인한 + 오늘 이후
    const upcoming = enrichedEvents.filter(
      ev => ev.myStatus === 'approved' && ev.date >= today
    );

    return NextResponse.json({ pending, upcoming });
  } catch (error) {
    console.error('번개 조회 오류:', error);
    return NextResponse.json({ error: '오류가 발생했어요.' }, { status: 500 });
  }
}
