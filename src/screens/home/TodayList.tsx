'use client';

import { todayStr } from '@/lib/date';
import { useStore } from '@/lib/store';
import { useUi } from '@/lib/ui';
import type { Task } from '@/lib/types';

/** 홈에서는 다섯 줄까지만 본다. 그 아래는 일별 화면이 할 일이다. */
const CAP = 5;

/**
 * 오늘 목록 맛보기.
 *
 * **여기서는 체크만 된다.** 미루기·지우기·메모는 일별 화면의 몫이다 —
 * 홈은 훑어보는 자리라 줄마다 손댈 것이 셋씩 붙으면 훑을 수가 없다.
 */
export default function TodayList({ open, shut }: { open: Task[]; shut: Task[] }) {
  const { categoryOf, toggleTask } = useStore();
  const { setCursor, setTab, openSheet } = useUi();
  const today = todayStr();

  // 안 한 것이 위, 완료한 것은 아래로 — 숨기지 않고 취소선만 긋는다
  const rows = [...open, ...shut].slice(0, CAP);

  return (
    <section className="mb-[11px] rounded-card bg-card shadow-card">
      <div className="flex items-center gap-[7px] px-4 pb-2.5 pt-3.5">
        <h2 className="text-[14px] font-bold">오늘 할 일 목록</h2>
        {open.length > 0 && (
          <span className="grid h-[19px] min-w-[19px] place-items-center rounded-full bg-accent-soft px-1.5 text-[10.5px] font-bold text-[#b1543a]">
            {open.length}
          </span>
        )}
        <button
          type="button"
          onClick={() => {
            setCursor(today);
            setTab('day');
          }}
          className="ml-auto rounded-lg px-1 py-0.5 text-[11.5px] text-ink3 active:bg-sunk"
        >
          전체보기 ›
        </button>
      </div>

      {rows.length === 0 ? (
        <p className="px-4 pb-[26px] pt-[22px] text-center text-[12.5px] leading-[1.75] text-ink3">
          오늘은 비어 있어요
          <br />
          아래 <b className="font-medium text-accent">일</b>에서 담을 수 있어요
        </p>
      ) : (
        <ul className="list-none p-0 pb-1.5">
          {rows.map((t) => {
            const category = categoryOf(t.categoryId);
            const cycle =
              t.repeatDays === 1 ? '매일' : t.repeatDays > 1 ? `${t.repeatDays}일마다` : '';

            return (
              <li
                key={t.id}
                className="flex items-start gap-[11px] border-t border-line2 px-4 py-[11px] first:border-t-0"
              >
                <button
                  type="button"
                  aria-label="완료 표시"
                  aria-pressed={t.done}
                  onClick={() => toggleTask(t.id)}
                  className={`mt-px grid h-[25px] w-[25px] flex-none place-items-center rounded-full border-[1.8px] text-[12px] font-bold active:scale-90 ${
                    t.done ? 'border-ok bg-ok text-white' : 'border-edge text-transparent'
                  }`}
                >
                  ✓
                </button>

                <button
                  type="button"
                  aria-label="수정"
                  onClick={() => openSheet({ kind: 'task', id: t.id })}
                  className="min-w-0 flex-1 bg-transparent text-left"
                >
                  <span
                    className={`block break-words text-[14.5px] font-medium leading-[1.45] ${
                      t.done ? 'text-done line-through decoration-1' : ''
                    }`}
                  >
                    {t.title}
                    {t.priority === 3 && <span className="ml-1.5 text-[12px] text-star">★</span>}
                  </span>
                  <span
                    className={`mt-1 flex flex-wrap items-center gap-1.5 text-[11px] ${
                      t.done ? 'text-done' : 'text-ink3'
                    }`}
                  >
                    <span className="inline-flex items-center gap-[5px]">
                      <span
                        className={`h-[7px] w-[7px] rounded-full ${t.done ? 'opacity-40' : ''}`}
                        style={{ background: category.color }}
                      />
                      {category.name}
                    </span>
                    {cycle && (
                      <>
                        <span className="text-faint">·</span>
                        <span>{cycle}</span>
                      </>
                    )}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
