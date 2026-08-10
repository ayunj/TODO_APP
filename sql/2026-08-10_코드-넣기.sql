-- ═══════════════════════════════════════════════════════════════════
-- 2026-08-10 · 코드 넣기 미리보기
--
-- peek_room이 `나누는 것`까지 돌려준다. 들어가기 전에 무엇을 나누는 방인지
-- 알아야 한다 — 모르고 들어가면 남의 장보기가 갑자기 내 화면에 뜬다.
-- 두 번 돌려도 된다.
-- ═══════════════════════════════════════════════════════════════════

create or replace function peek_room(code text)
returns json
language plpgsql
security definer
set search_path = public
stable
as $$
declare target rooms; result json;
begin
  select * into target from rooms where join_code = tidy_code(code);
  if target.id is null then
    return null;
  end if;

  -- 이름·색·사람·나누는 것만 돌려준다. 방 안의 할 일·메모 같은 내용은 주지 않는다.
  select json_build_object(
    'id', target.id,
    'name', target.name,
    'color', target.color,
    'owner', (select display_name from room_members
              where room_id = target.id and user_id = target.created_by),
    'members', (select coalesce(json_agg(
                  json_build_object('name', display_name,
                                    'owner', user_id = target.created_by)
                  order by joined_at), '[]'::json)
                from room_members where room_id = target.id),
    'count', (select count(*) from room_members where room_id = target.id),
    'shareTasks', target.share_tasks,
    'shareShop', target.share_shop,
    'shareMemo', target.share_memo,
    'cats', (select coalesce(json_agg(
               json_build_object('name', name, 'color', color)
               order by sort_order), '[]'::json)
             from categories where room_id = target.id and deleted_at is null)
  ) into result;

  return result;
end $$;
