import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(req: Request) {
  try {
    const today = new Date().toISOString().split('T')[0];

    // 1. 오늘 이미 매칭자가 지정됐는지 확인
    const { data: existingTurn } = await supabase
      .from('matching_turns')
      .select('*')
      .eq('date', today)
      .single();

    if (existingTurn) {
      return NextResponse.json({ message: '오늘 매칭자가 이미 지정되어 있어요.' });
    }

    // 2. 전체 유저 가져오기
    const { data: allUsers } = await supabase
      .from('users')
      .select('*');

    if (!allUsers || allUsers.length === 0) {
      return NextResponse.json({ error: '유저가 없어요.' }, { status: 400 });
    }

    // 3. 각 유저별 매칭 횟수 계산
    const { data: allTurns } = await supabase
      .from('matching_turns')
      .select('matcher_id')
      .eq('status', '완료');

    const matchCount: Record<string, number> = {};
    allUsers.forEach(u => { matchCount[u.id] = 0; });
    allTurns?.forEach(t => {
      if (matchCount[t.matcher_id] !== undefined) {
        matchCount[t.matcher_id]++;
      }
    });

    // 4. 매칭 횟수 가장 적은 사람 찾기 (동률이면 랜덤)
    const minCount = Math.min(...Object.values(matchCount));
    const candidates = allUsers.filter(u => matchCount[u.id] === minCount);
    const selectedMatcher = candidates[Math.floor(Math.random() * candidates.length)];

    // 5. 오늘 매칭자로 등록
    await supabase
      .from('matching_turns')
      .insert([{
        matcher_id: selectedMatcher.id,
        date: today,
        status: '대기중'
      }]);

    console.log(`[Cron] 오늘 매칭자: ${selectedMatcher.name}`);

    return NextResponse.json({
      success: true,
      matcher: selectedMatcher.name,
      date: today
    });

  } catch (error) {
    console.error('[Cron] 오류:', error);
    return NextResponse.json({ error: '오류가 발생했어요.' }, { status: 500 });
  }
}
