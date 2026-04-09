import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(req: Request) {
  try {
    const { matcherId, groupSize } = await req.json();
    const today = new Date().toISOString().split('T')[0];

    // 1. 오늘 매칭자 확인
    const { data: turnData } = await supabase
      .from('matching_turns')
      .select('*')
      .eq('date', today)
      .single();

    if (!turnData) {
      return NextResponse.json({ error: '오늘 매칭자 정보가 없어요.' }, { status: 400 });
    }

    if (turnData.matcher_id !== matcherId) {
      return NextResponse.json({ error: '오늘 매칭 권한이 없어요.' }, { status: 403 });
    }

    if (turnData.status === '완료') {
      return NextResponse.json({ error: '오늘 매칭이 이미 완료됐어요.' }, { status: 400 });
    }

    // 2. 매칭자 정보 가져오기
    const { data: matcher } = await supabase
      .from('users')
      .select('*')
      .eq('id', matcherId)
      .single();

    if (!matcher) {
      return NextResponse.json({ error: '매칭자 정보를 찾을 수 없어요.' }, { status: 400 });
    }

    // 3. 매칭대기자 가져오기 (매칭자 제외, 매칭 횟수 적은 순)
    const { data: allUsers } = await supabase
      .from('users')
      .select('*')
      .neq('id', matcherId);

    if (!allUsers || allUsers.length < groupSize - 1) {
      return NextResponse.json({ error: '매칭할 수 있는 인원이 부족해요.' }, { status: 400 });
    }

    // 4. 매칭 로직 (성별 혼합 필수)
    const matcherGender = matcher.gender;
    const otherGender = matcherGender === '남' ? '여' : '남';

    // 다른 성별 먼저 분리
    const otherGenderUsers = allUsers.filter(u => u.gender === otherGender);
    const sameGenderUsers = allUsers.filter(u => u.gender === matcherGender);

    if (otherGenderUsers.length === 0) {
      return NextResponse.json({ error: '다른 성별 인원이 없어서 매칭이 어려워요.' }, { status: 400 });
    }

    // 다른 성별에서 최소 1명 반드시 선택
    const shuffledOther = otherGenderUsers.sort(() => 0.5 - Math.random());
    const shuffledSame = sameGenderUsers.sort(() => 0.5 - Math.random());

    let selectedMembers = [];

    if (groupSize === 2) {
      // 2명: 매칭자 + 다른 성별 1명
      selectedMembers = [shuffledOther[0]];
    } else {
      // 3명: 매칭자 + 다른 성별 1명 + 나머지 1명 (성별 무관)
      const remaining = [...shuffledOther.slice(1), ...shuffledSame].sort(() => 0.5 - Math.random());
      selectedMembers = [shuffledOther[0], remaining[0]];
    }

    const matchingGroup = [matcher, ...selectedMembers];

    // 5. 매칭 결과 저장 (id 반환받기)
    const { data: groupData } = await supabase
      .from('matching_groups')
      .insert([{
        date: today,
        matcher_id: matcherId,
        members: matchingGroup.map(u => ({
          id: u.id,
          name: u.name,
          team: u.team,
          role: u.role,
          gender: u.gender
        })),
        approval_status: 'pending'
      }])
      .select('id')
      .single();

    // 6. calendar_events에 매칭 이벤트 등록
    if (groupData?.id) {
      await supabase
        .from('calendar_events')
        .insert([{
          date: today,
          type: 'matching',
          title: `점심 매칭`,
          matching_group_id: groupData.id,
        }]);
    }

    // 7. 매칭자 제외 멤버에게 승인 요청 알림 생성
    if (groupData?.id) {
      const nonMatcherMembers = selectedMembers; // 매칭자 본인 제외
      const notifications = nonMatcherMembers.map((u: any) => ({
        user_id: u.id,
        group_id: groupData.id,
        type: 'approval_request',
        status: 'pending',
      }));
      await supabase.from('matching_notifications').insert(notifications);
    }

    // 7. 매칭자 status 완료로 업데이트
    await supabase
      .from('matching_turns')
      .update({ status: '완료' })
      .eq('date', today);

    return NextResponse.json({ success: true, matchingGroup });

  } catch (error) {
    console.error('매칭 오류:', error);
    return NextResponse.json({ error: '매칭 중 오류가 발생했어요.' }, { status: 500 });
  }
}

// 오늘 매칭 현황 조회
export async function GET() {
  try {
    const today = new Date().toISOString().split('T')[0];
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    // 1라운드: 독립 쿼리 3개 병렬 (.limit(1) — 중복 데이터도 안전)
    const [todayTurnRes, todayGroupRes, tomorrowTurnRes] = await Promise.all([
      supabase.from('matching_turns').select('status, matcher_id').eq('date', today).limit(1),
      supabase.from('matching_groups').select('members, approval_status').eq('date', today).limit(1),
      supabase.from('matching_turns').select('matcher_id').eq('date', tomorrowStr).limit(1),
    ]);

    const todayTurn = todayTurnRes.data?.[0] ?? null;
    const todayGroup = todayGroupRes.data?.[0] ?? null;
    const tomorrowTurn = tomorrowTurnRes.data?.[0] ?? null;

    const matcherId = todayTurn?.matcher_id ?? null;
    const tomorrowMatcherId = tomorrowTurn?.matcher_id ?? null;

    // 2라운드: 매칭자 유저 정보 2개 병렬
    const [todayMatcherRes, tomorrowMatcherRes] = await Promise.all([
      matcherId
        ? supabase.from('users').select('id, name, team, gender').eq('id', matcherId).single()
        : Promise.resolve({ data: null }),
      tomorrowMatcherId
        ? supabase.from('users').select('id, name, team').eq('id', tomorrowMatcherId).single()
        : Promise.resolve({ data: null }),
    ]);

    return NextResponse.json({
      today: {
        matcher: todayMatcherRes.data ?? null,
        status: todayTurn?.status ?? null,
        group: todayGroup?.members ?? null,
        groupApprovalStatus: todayGroup?.approval_status ?? null,
        matcherId,
      },
      tomorrow: {
        matcher: tomorrowMatcherRes.data ?? null,
      },
    });

  } catch (error) {
    console.error('조회 오류:', error);
    return NextResponse.json({ error: '조회 중 오류가 발생했어요.' }, { status: 500 });
  }
}