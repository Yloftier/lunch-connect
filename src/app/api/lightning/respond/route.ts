import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(req: Request) {
  try {
    const { userId, eventId, action } = await req.json();
    // action: 'approve' | 'reject'

    const newStatus = action === 'approve' ? 'approved' : 'rejected';

    await supabase
      .from('lightning_participants')
      .update({ status: newStatus })
      .eq('user_id', userId)
      .eq('event_id', eventId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('번개 응답 오류:', error);
    return NextResponse.json({ error: '오류가 발생했어요.' }, { status: 500 });
  }
}
