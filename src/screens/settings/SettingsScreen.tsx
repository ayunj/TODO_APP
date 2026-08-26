'use client';

import PageBar from '@/components/PageBar';
import { Group, Row } from '@/components/rows';
import { useAuth } from '@/lib/auth';
import { useGomdori } from '@/lib/gomdori';
import { useRooms } from '@/lib/rooms';
import { myCategories } from '@/lib/selectors';
import { useStore } from '@/lib/store';
import { toast } from '@/lib/toast';
import { useUi } from '@/lib/ui';

/**
 * 설정 첫 화면은 **무엇이 있는지 훑는 자리**다.
 * 값을 만지는 자리가 아니라 줄마다 들어가는 곳만 늘어놓는다 —
 * 여기에 값이 하나라도 보이면 나머지 줄도 만져야 할 것처럼 읽힌다.
 * 그래서 주 시작·알림은 `앱 설정` 안으로 들어갔다.
 */
export default function SettingsScreen() {
  const { presets, categories, resetAll } = useStore();
  const { enabled, account } = useAuth();
  const { admin } = useGomdori();
  const { enabled: roomsEnabled, rooms } = useRooms();
  const { depth, pushView, popView } = useUi();

  return (
    <>
      {/* 탭으로 뜰 때는 벗을 겹이 없다 — 그때만 화살표를 안 그린다 */}
      <PageBar title="설정" back={depth > 0} />

      <Group>
        {/* 누구로 들어와 있는지가 맨 먼저다 — 나머지 줄이 다 이 계정에 딸린 것이다 */}
        {enabled && account && (
          <Row
            value={account.email ?? '초대로 들어옴'}
            onClick={() => pushView({ kind: 'account' })}
          >
            계정
          </Row>
        )}
        <Row value={`${presets.length}개`} onClick={() => pushView({ kind: 'presetList' })}>
          즐겨찾기
        </Row>
        {/* 들어가면 보일 것과 같은 수를 적는다 — 남이 연 방 것은 그 자리에도 없다 */}
        <Row
          value={`${myCategories(categories, rooms).length}개`}
          onClick={() => pushView({ kind: 'categoryList' })}
        >
          카테고리
        </Row>
        <Row value="주 시작 · 알림" onClick={() => pushView({ kind: 'prefs' })}>
          앱 설정
        </Row>
        {/* 방은 남과 나누는 것이라 계정이 있어야 뜬다 */}
        {roomsEnabled && (
          <Row
            value={rooms.length ? `방 ${rooms.length}개` : '방 없음'}
            onClick={() => pushView({ kind: 'share' })}
          >
            같이 쓰기
          </Row>
        )}
      </Group>

      {/*
        상점 채우기 — **`shop_admins`에 든 계정에만 뜬다.**
        한 칸 떼어 둔다. 쓰는 사람이 하나뿐인 줄이라 위 다섯과 같은 무게로 읽히면 안 된다.

        여기서 감추는 것이 지키는 것은 아니다 — 통과 값표를 막는 것은
        RLS(`is_shop_admin()`)다. 이 줄은 **안 쓸 사람에게 안 보이게** 할 뿐이다.
      */}
      {admin && (
        <div className="mt-4">
          <Group>
            <Row value="옷과 방 올리기" onClick={() => pushView({ kind: 'shopAdmin' })}>
              상점 채우기
            </Row>
          </Group>
        </div>
      )}

      {/* 한 칸 떼어 둔다 — 나머지 줄과 같은 무게로 읽히면 안 되는 것이다 */}
      <div className="mt-4">
        <Group>
          <Row
            danger
            arrow={false}
            onClick={() => {
              if (!confirm('모든 할 일과 즐겨찾기를 지웁니다. 되돌릴 수 없어요.')) return;
              resetAll();
              popView();
              toast('초기화했습니다');
            }}
          >
            전체 초기화
          </Row>
        </Group>
      </div>
    </>
  );
}
