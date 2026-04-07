import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(req: Request) {
  try {
    const { userId, eventId, action } = await req.json();
    // action: 'approve' | 'reject' | 'join' | 'cancel'

    // 기존 참가자 레코드 확인
    const { data: existing } = await supabase
      .from('lightning_participants')
      .select('id, status')
      .eq('user_id', userId)
      .eq('event_id', eventId)
      .single();

    if (action === 'join') {
      // 참가자 레코드가 없으면 새로 생성(approved), 있으면 approved로 업데이트
      if (!existing) {
        await supabase
          .from('lightning_participants')
          .insert([{ event_id: eventId, user_id: userId, status: 'approved' }]);
      } else {
        await supabase
          .from('lightning_participants')
          .update({ status: 'approved' })
          .eq('user_id', userId)
          .eq('event_id', eventId);
      }
    } else if (action === 'cancel') {
      // 참여 취소: 레코드 삭제
      await supabase
        .from('lightning_participants')
        .delete()
        .eq('user_id', userId)
        .eq('event_id', eventId);
    } else {
      // approve / reject (초대 응답)
      const newStatus = action === 'approve' ? 'approved' : 'rejected';
      await supabase
        .from('lightning_participants')
        .update({ status: newStatus })
        .eq('user_id', userId)
        .eq('event_id', eventId);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('번개 응답 오류:', error);
    return NextResponse.json({ error: '오류가 발생했어요.' }, { status: 500 });
  }
}
