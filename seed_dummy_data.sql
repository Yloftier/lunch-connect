-- ============================================================
-- 랭디 커넥트 더미 데이터 시드 스크립트
-- Supabase SQL 에디터에서 실행하세요
-- 오늘 날짜 기준으로 데이터를 생성합니다
-- ============================================================

-- ① 기존 더미 데이터 정리 (선택사항 — 필요 시 주석 해제)
-- DELETE FROM club_event_attendances;
-- DELETE FROM club_events;
-- DELETE FROM club_members;
-- DELETE FROM lightning_participants;
-- DELETE FROM lightning_events;
-- DELETE FROM matching_notifications;
-- DELETE FROM calendar_events WHERE type = 'matching';
-- DELETE FROM matching_groups;
-- DELETE FROM matching_turns;

-- ============================================================
-- ② matching_turns: 이번 주 + 다음 주 평일에 순서대로 배정
-- ============================================================
DO $$
DECLARE
  user_ids uuid[];
  user_count int;
  turn_idx int := 0;
  d date := CURRENT_DATE;
  day_count int := 0;
BEGIN
  -- 존재하는 유저 ID 목록 (최대 10명)
  SELECT ARRAY(SELECT id FROM users ORDER BY created_at LIMIT 10)
  INTO user_ids;

  user_count := array_length(user_ids, 1);

  IF user_count IS NULL OR user_count = 0 THEN
    RAISE NOTICE '유저가 없습니다. 먼저 유저를 생성하세요.';
    RETURN;
  END IF;

  -- 오늘부터 14일간 평일만 매칭 턴 생성
  WHILE day_count < 14 LOOP
    -- 주말 제외 (0=일, 6=토)
    IF EXTRACT(DOW FROM d) NOT IN (0, 6) THEN
      -- 이미 존재하는 날짜는 스킵
      IF NOT EXISTS (SELECT 1 FROM matching_turns WHERE date = d) THEN
        INSERT INTO matching_turns (date, matcher_id, status)
        VALUES (
          d,
          user_ids[(turn_idx % user_count) + 1],
          CASE
            WHEN d < CURRENT_DATE THEN '완료'
            WHEN d = CURRENT_DATE THEN '대기중'
            ELSE '대기중'
          END
        );
        turn_idx := turn_idx + 1;
      END IF;
    END IF;

    d := d + INTERVAL '1 day';
    day_count := day_count + 1;
  END LOOP;

  RAISE NOTICE '매칭 턴 생성 완료: % 명 유저로 % 일치 생성', user_count, turn_idx;
END $$;

-- ============================================================
-- ③ matching_groups + calendar_events: 과거 날짜 매칭 결과 생성
-- ============================================================
DO $$
DECLARE
  user_ids uuid[];
  user_records record;
  all_users jsonb[];
  u record;
  idx int := 0;
  turn record;
  group_members jsonb;
  group_id uuid;
  m1 jsonb; m2 jsonb; m3 jsonb;
BEGIN
  SELECT ARRAY(SELECT id FROM users ORDER BY created_at LIMIT 10)
  INTO user_ids;

  IF array_length(user_ids, 1) IS NULL THEN RETURN; END IF;

  -- 유저 정보를 jsonb 배열로 준비
  SELECT ARRAY(
    SELECT jsonb_build_object(
      'id', id::text,
      'name', name,
      'team', COALESCE(team, ''),
      'role', COALESCE(role, ''),
      'gender', COALESCE(gender, '남')
    )
    FROM users
    ORDER BY created_at
    LIMIT 10
  ) INTO all_users;

  idx := 0;

  -- 완료 상태의 턴에 매칭 그룹 + calendar_event 생성
  FOR turn IN
    SELECT t.id, t.date, t.matcher_id
    FROM matching_turns t
    WHERE t.status = '완료'
      AND t.date >= CURRENT_DATE - INTERVAL '30 days'
      AND NOT EXISTS (
        SELECT 1 FROM matching_groups g WHERE g.date = t.date
      )
  LOOP
    -- 매칭자 + 2명 = 3명 그룹 구성 (매칭자 위치 기준으로 다음 2명)
    idx := (idx + 1) % array_length(all_users, 1);
    m1 := all_users[((idx) % array_length(all_users, 1)) + 1];
    m2 := all_users[((idx + 1) % array_length(all_users, 1)) + 1];
    m3 := all_users[((idx + 2) % array_length(all_users, 1)) + 1];

    group_members := jsonb_build_array(m1, m2, m3);

    -- matching_groups 생성
    INSERT INTO matching_groups (date, matcher_id, members, approval_status)
    VALUES (turn.date, turn.matcher_id, group_members, 'confirmed')
    RETURNING id INTO group_id;

    -- calendar_events 생성 (캘린더에 표시되려면 필수!)
    INSERT INTO calendar_events (date, type, title, matching_group_id)
    VALUES (turn.date, 'matching', '점심 매칭', group_id)
    ON CONFLICT DO NOTHING;

  END LOOP;

  RAISE NOTICE '매칭 그룹 + 캘린더 이벤트 생성 완료';
END $$;

-- ============================================================
-- ④ 동아리 멤버 + 일정 생성
-- ============================================================
DO $$
DECLARE
  v_user_ids uuid[];
  v_club_ids uuid[];
  v_club_count int;
  v_user_count int;
  v_u_idx int;
  v_c_idx int;
  v_club_id uuid;
  v_president_id uuid;
  v_member_id uuid;
  v_event_date date;
BEGIN
  SELECT ARRAY(SELECT id FROM users ORDER BY created_at LIMIT 10) INTO v_user_ids;
  SELECT ARRAY(SELECT id FROM clubs ORDER BY created_at) INTO v_club_ids;

  v_user_count := COALESCE(array_length(v_user_ids, 1), 0);
  v_club_count := COALESCE(array_length(v_club_ids, 1), 0);

  IF v_user_count = 0 OR v_club_count = 0 THEN
    RAISE NOTICE '유저 또는 동아리가 없습니다.';
    RETURN;
  END IF;

  -- 각 동아리에 멤버 추가
  FOR v_c_idx IN 1..v_club_count LOOP
    v_club_id := v_club_ids[v_c_idx];
    v_president_id := v_user_ids[((v_c_idx - 1) % v_user_count) + 1];

    -- 회장 추가 (없으면)
    IF NOT EXISTS (SELECT 1 FROM club_members cm WHERE cm.club_id = v_club_id AND cm.user_id = v_president_id) THEN
      INSERT INTO club_members (club_id, user_id, role, status, joined_at)
      VALUES (v_club_id, v_president_id, '회장', '승인', CURRENT_TIMESTAMP);
    END IF;

    -- 나머지 유저 중 2~3명 멤버로 추가
    FOR v_u_idx IN 1..LEAST(3, v_user_count - 1) LOOP
      v_member_id := v_user_ids[((v_c_idx + v_u_idx - 1) % v_user_count) + 1];
      IF v_member_id != v_president_id THEN
        IF NOT EXISTS (SELECT 1 FROM club_members cm WHERE cm.club_id = v_club_id AND cm.user_id = v_member_id) THEN
          INSERT INTO club_members (club_id, user_id, role, status, joined_at)
          VALUES (v_club_id, v_member_id, '멤버', '승인', CURRENT_TIMESTAMP);
        END IF;
      END IF;
    END LOOP;

    -- 동아리 일정 2개 생성 (이번 주 + 다음 주)
    -- 이번 주 수요일
    v_event_date := DATE_TRUNC('week', CURRENT_DATE)::date + 2;
    IF NOT EXISTS (
      SELECT 1 FROM club_events ce WHERE ce.club_id = v_club_id AND ce.date = v_event_date
    ) THEN
      INSERT INTO club_events (club_id, title, date, time, location, description, created_by)
      VALUES (v_club_id, '정기 모임', v_event_date, '19:00', '4F 대회의실', '이번 주 정기 모임입니다!', v_president_id);
    END IF;

    -- 다음 주 수요일
    v_event_date := DATE_TRUNC('week', CURRENT_DATE)::date + 9;
    IF NOT EXISTS (
      SELECT 1 FROM club_events ce WHERE ce.club_id = v_club_id AND ce.date = v_event_date
    ) THEN
      INSERT INTO club_events (club_id, title, date, time, location, description, created_by)
      VALUES (v_club_id, '번개 모임', v_event_date, '18:30', '근처 식당', '번개 모임! 많이 참여해주세요 🔥', v_president_id);
    END IF;

  END LOOP;

  RAISE NOTICE '동아리 멤버 + 일정 생성 완료';
END $$;

-- ============================================================
-- ⑤ 번개 이벤트 생성
-- ============================================================
DO $$
DECLARE
  v_user_ids uuid[];
  v_creator_id uuid;
  v_invited_id1 uuid;
  v_invited_id2 uuid;
  v_event_id uuid;
  v_lightning_date date;
BEGIN
  SELECT ARRAY(SELECT id FROM users ORDER BY created_at LIMIT 10) INTO v_user_ids;

  IF array_length(v_user_ids, 1) < 2 THEN RETURN; END IF;

  v_creator_id  := v_user_ids[1];
  v_invited_id1 := v_user_ids[2];
  v_invited_id2 := CASE WHEN array_length(v_user_ids, 1) >= 3 THEN v_user_ids[3] ELSE v_user_ids[1] END;

  -- 오늘 번개
  v_lightning_date := CURRENT_DATE;
  IF NOT EXISTS (
    SELECT 1 FROM lightning_events le WHERE le.creator_id = v_creator_id AND le.date = v_lightning_date
  ) THEN
    INSERT INTO lightning_events (creator_id, title, topic, date, time)
    VALUES (v_creator_id, '점심 번개', '오늘 같이 점심 드실 분!', v_lightning_date, '12:00')
    RETURNING id INTO v_event_id;

    INSERT INTO lightning_participants (event_id, user_id, status) VALUES
      (v_event_id, v_creator_id,  'approved'),
      (v_event_id, v_invited_id1, 'approved'),
      (v_event_id, v_invited_id2, 'pending');
  END IF;

  -- 이번 주 금요일 번개
  v_lightning_date := DATE_TRUNC('week', CURRENT_DATE)::date + 4;
  IF v_lightning_date >= CURRENT_DATE AND NOT EXISTS (
    SELECT 1 FROM lightning_events le WHERE le.date = v_lightning_date AND le.title = '금요일 번개'
  ) THEN
    INSERT INTO lightning_events (creator_id, title, topic, date, time)
    VALUES (v_user_ids[LEAST(2, array_length(v_user_ids,1))], '금요일 번개', '금요일 같이 점심!', v_lightning_date, '12:00')
    RETURNING id INTO v_event_id;

    INSERT INTO lightning_participants (event_id, user_id, status) VALUES
      (v_event_id, v_user_ids[LEAST(2, array_length(v_user_ids,1))], 'approved'),
      (v_event_id, v_user_ids[1], 'approved');
  END IF;

  RAISE NOTICE '번개 이벤트 생성 완료';
END $$;

-- ============================================================
-- 결과 확인
-- ============================================================
SELECT '=== matching_turns ===' as info, COUNT(*) as count FROM matching_turns WHERE date >= CURRENT_DATE - 7
UNION ALL
SELECT '=== matching_groups ===', COUNT(*) FROM matching_groups WHERE date >= CURRENT_DATE - 30
UNION ALL
SELECT '=== calendar_events ===', COUNT(*) FROM calendar_events WHERE date >= CURRENT_DATE - 30
UNION ALL
SELECT '=== club_members ===', COUNT(*) FROM club_members WHERE status = '승인'
UNION ALL
SELECT '=== club_events ===', COUNT(*) FROM club_events WHERE date >= CURRENT_DATE
UNION ALL
SELECT '=== lightning_events ===', COUNT(*) FROM lightning_events WHERE date >= CURRENT_DATE;
