'use client';

import PageBar from '@/components/PageBar';
import { Group, Note, ToggleRow } from '@/components/rows';
import { useStore } from '@/lib/store';

/**
 * 앱 설정 — 주 시작 요일과 알림. **이 기기에만 걸린다.**
 * 폰에서는 울리고 PC에서는 안 울리는 게 자연스럽다.
 */
export default function PrefsScreen() {
  const {
    weekStart,
    setWeekStart,
    notify,
    setNotify,
    notifyTodo,
    notifyLeft,
    setNotifyTime,
  } = useStore();

  return (
    <>
      <PageBar title="앱 설정" />

      <p className="mb-2 ml-1 text-[12px] text-ink2">주 시작</p>
      <div className="flex gap-2">
        {([1, 0] as const).map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => setWeekStart(d)}
            className={`flex-1 rounded-2xl py-[13px] text-[13.5px] font-medium transition-colors ${
              weekStart === d
                ? 'bg-accent text-white shadow-fab'
                : 'bg-card text-ink2 shadow-card active:bg-sunk'
            }`}
          >
            {d === 1 ? '월요일' : '일요일'}
          </button>
        ))}
      </div>
      <Note>달력과 기록 탭 주간 격자가 같이 따라가요.</Note>

      <div className="mt-[18px]">
        <Group label="알림">
          <ToggleRow on={notify} onChange={setNotify}>
            알림 받기
          </ToggleRow>

          {/*
            켜야 시각 두 줄이 열린다. 안 받을 사람에게는 아예 안 보인다 —
            회색으로 눕혀두면 "언젠가 눌리는 것"으로 보여서 계속 눌러보게 된다.
          */}
          {notify && (
            <>
              <TimeRow label="오늘 할 일" value={notifyTodo} onChange={(v) => setNotifyTime('todo', v)} />
              <TimeRow label="오늘 남은 일" value={notifyLeft} onChange={(v) => setNotifyTime('left', v)} />
            </>
          )}
        </Group>
      </div>
    </>
  );
}

/**
 * 시각은 그 자리에서 고친다 — 이것 하나 고르자고 화면을 또 밀고 들어가지 않는다.
 * 폰에서는 눌렀을 때 시계가 올라온다.
 */
function TimeRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="flex w-full items-center gap-2.5 rounded-2xl bg-card px-[15px] py-4 text-[14.5px] shadow-card active:bg-sunk">
      <span className="min-w-0 truncate">{label}</span>
      <input
        type="time"
        value={value}
        // 비우고 나가면 그전 값을 지킨다 — 빈 시각은 알림을 조용히 죽인다
        onChange={(e) => e.target.value && onChange(e.target.value)}
        className="time-input ml-auto text-right text-[13.5px]"
      />
    </label>
  );
}
