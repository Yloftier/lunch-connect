import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// 매칭 승인/거절
export async function POST(req: Request) {
  try {
    const { userId, groupId, action } = await req.json();
    // action: 'approve' | 'reject'

    // 1. 해당 유저의 알림 상태 업데이트
    const newStatus = action === 'approve' ? 'approved' : 'rejected';
    await supabase
      .from('matching_notifications')
      .update({ status: newStatus })
      .eq('user_id', userId)
      .eq('group_id', groupId)
      .eq('type', 'approval_request');

    if (action === 'reject') {
      // 거절 시: 그룹 approval_status를 rejected로
      await supabase
        .from('matching_groups')
        .update({ approval_status: 'rejected' })
        .eq('id', groupId);

      return NextResponse.json({ success: true, result: 'rejected' });
    }

    // 2. 승인 시: 해당 그룹의 모든 승인 요청 알림 확인
    const { data: allNotifications } = await supabase
      .from('matching_notifications')
      .select('*')
      .eq('group_id', groupId)
      .eq('type', 'approval_request');

    const allApproved = allNotifications?.every(n => n.status === 'approved');

    if (allApproved) {
      // 3. 전원 승인 → 그룹 확정
      await supabase
        .from('matching_groups')
        .update({ approval_status: 'confirmed' })
        .eq('id', groupId);

      // 4. 그룹 전체 멤버에게 매칭 완료 알림 발송
      const { data: groupData } = await supabase
        .from('matching_groups')
        .select('members, matcher_id')
        .eq('id', groupId)
        .single();

      if (groupData?.members) {
        const allMemberIds: string[] = groupData.members.map((m: any) => m.id);
        const completeNotifications = allMemberIds.map((uid: string) => ({
          user_id: uid,
          group_id: groupId,
          type: 'matching_complete',
          status: 'unread',
        }));
        await supabase.from('matching_notifications').insert(completeNotifications);
      }

      return NextResponse.json({ success: true, result: 'confirmed' });
    }

    return NextResponse.json({ success: true, result: 'waiting' });

  } catch (error) {
    console.error('승인 처리 오류:', error);
    return NextResponse.json({ error: '처리 중 오류가 발생했어요.' }, { status: 500 });
  }
}

// 내 매칭 알림 조회
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'userId 필요' }, { status: 400 });
    }

    // 1. 알림 목록 조회 (FK 없으므로 조인 없이 조회)
    const { data: notifications } = await supabase
      .from('matching_notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (!notifications || notifications.length === 0) {
      return NextResponse.json({ notifications: [] });
    }

    // 2. group_id 목록으로 matching_groups 별도 조회
    const groupIds = [...new Set(notifications.map(n => n.group_id))];
    const { data: groups } = await supabase
      .from('matching_groups')
      .select('id, date, members, matcher_id, approval_status')
      .in('id', groupIds);

    // 3. 알림에 group 데이터 병합
    const enriched = notifications.map(n => ({
      ...n,
      group: groups?.find(g => g.id === n.group_id) ?? null,
    }));

    return NextResponse.json({ notifications: enriched });

  } catch (error) {
    console.error('알림 조회 오류:', error);
    return NextResponse.json({ error: '조회 중 오류가 발생했어요.' }, { status: 500 });
  }
}
