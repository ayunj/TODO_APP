'use client';

import type { CostumeSet } from '@/lib/types';

/**
 * 다음 시즌 예고 띠 — **짓다 만 세트가 스스로 말한다.**
 *
 * 관리자가 세트를 하나 짓고 곰·방·소품을 채워 넣는 동안, 그 세트는 상점 어디에도
 * 안 뜬다(`pullShop`이 덜 찬 세트를 걷어낸다 — `준비 중` 칸이 뜨면 파는 물건처럼
 * 읽혀서다). 그 사이가 **짧지 않다.** 그림 셋을 그리는 동안이니까.
 *
 * 그 사이를 이 한 줄이 메운다. **파는 것이 아니라 오는 것**이라 카드가 아니라
 * 띠고, 값도 그림도 안 붙는다 — 아직 없는 것에 값을 붙이면 못 사는 물건이 된다.
 *
 * **적어둘 것이 하나도 없다.** 세트 이름과 한 줄 설명이 이미 값표에 있고,
 * 다 차는 순간 이 띠는 저절로 사라지고 **그 자리에 배너가 선다** —
 * 켜고 끄는 스위치를 따로 두지 않는다.
 *
 * **누르는 자리가 아니다.** 갈 곳이 없다 — 세트 상세는 곰·방·소품이 다 있어야
 * 열리는 화면이라, 지금 열면 빈 칸 셋이 뜬다. 눌러서 아무 일도 안 나는 것보다
 * 안 눌리는 편이 낫다.
 */
export default function Coming({ set }: { set: CostumeSet }) {
  return (
    <div className="mb-[22px] flex items-center gap-3 rounded-[18px] bg-accent-tint px-4 py-3.5">
      <span className="min-w-0 flex-1">
        <b className="block truncate font-round text-[15px] font-medium text-ink">
          {set.name} 준비 중
        </b>
        {set.note && (
          <span className="mt-0.5 block truncate text-[11.5px] text-ink2">{set.note}</span>
        )}
      </span>
      {/*
        몇 개까지 왔나 — **채운 것이 아니라 남은 것을 세는 자리가 아니다.**
        `1/3`은 관리자만 아는 셈이라 여기 안 적는다. 사는 사람에게는
        `곧 온다`가 전부고, 언제 오는지는 그림이 다 그려져야 아는 것이다.
      */}
      <span className="flex-none rounded-full bg-card px-3 py-1.5 text-[11px] font-medium text-accent">
        곧 만나요
      </span>
    </div>
  );
}
