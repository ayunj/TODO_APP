'use client';

import { useCallback, useEffect, useState } from 'react';
import BannerSlot from './BannerSlot';
import Switch from './Switch';
import { GiftIcon } from '@/components/Icons';
import Thumb from './Thumb';
import { BUNDLED } from '@/lib/costumes';
import { pullSeasons, setShopItemActive } from '@/lib/repo/remote';
import { toast } from '@/lib/toast';
import type { Costume, CostumeSet, Shop } from '@/lib/types';

/**
 * 올린 것 — **먼저 열리는 화면**([시안](../../../design/관리자.html)의 앱 판).
 *
 * 서른 개를 훑고 켜고 끄는 일이 새로 올리는 일보다 잦아서 이쪽이 먼저 선다.
 *
 * **표가 카드가 된다.** 넓은 판의 여덟 열은 360px에 안 들어간다.
 * 폰에 남길 것은 **그림 · 이름 · 파는 중** 셋이고, 종류·분류·코드·가격은
 * 이름 밑 한 줄로 접었다. `고치기`는 카드를 누르는 것으로 갈음한다 —
 * **줄마다 글자 버튼을 하나 더 두면 손가락으로 스위치를 잘못 누른다.**
 */
export default function AdminList({
  shop,
  onOpen,
  onDone,
}: {
  shop: Shop;
  onOpen: (key: string) => void;
  onDone: () => Promise<void>;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const [sets, setSets] = useState<CostumeSet[]>([]);
  /** 고른 세트. 비어 있으면 다 보여준다 */
  const [only, setOnly] = useState('');

  /*
    세트는 **덜 찬 것까지** 봐야 한다. `shop.sets`는 다 찬 것만 세우니
    짓다 만 세트가 바로 여기서 빠진다 — 채우는 쪽에서 알아야 할 것이 그 세트다.
  */
  const loadSets = useCallback(() => {
    pullSeasons()
      .then(setSets)
      .catch(() => {
        /* 못 읽으면 띠를 안 세운다 — 목록은 그대로 뜬다 */
      });
  }, []);

  useEffect(loadSets, [loadSets]);

  /*
    **앱이 들고 나가는 둘은 여기 안 세운다** — 기본 곰돌이와 기본 룸.
    가격표에 줄이 없어서(`BUNDLED`) 스위치를 눌러도 고칠 줄이 없고, 그림도 앱 안에 있어
    올릴 것이 없다. 세워두면 **껐다 켤 수 있는 것처럼 보이는데 아무 일도 안 난다.**

    세트를 고르면 그 세트 것만 남긴다. 세트 하나가 셋으로 흩어져 있어서
    스물 몇 개 목록에서 눈으로 짝을 찾기 어렵다.
  */
  const own = new Set(BUNDLED.map((c) => c.key));
  const list = shop.items.filter((c) => !own.has(c.key) && (!only || c.season === only));
  const setOf = (key?: string) => sets.find((x) => x.key === key);

  const flip = async (item: Costume) => {
    setBusy(item.key);
    try {
      await setShopItemActive(item.key, !item.active);
      await onDone();
    } catch (e) {
      // 거의 다 관리자가 아니라서 막힌 것이다 — 서버가 한 말을 그대로 보여준다
      toast(e instanceof Error ? e.message : '못 바꿨어요');
    } finally {
      setBusy(null);
    }
  };

  return (
    <>
      {/*
        세트 채움 띠 — **세트는 곰 하나 · 방 하나 · 소품 하나가 다 차야 열린다.**
        몇 개 남았는지 여기서 센다. 가격표를 세어 내는 것이라 어디에도 적어두지 않는다 —
        적어두면 가격표와 어긋날 자리가 하나 더 생긴다.
      */}
      {sets.length > 0 && (
        <div className="-mx-4 mb-3 flex gap-1.5 overflow-x-auto px-4 pb-[3px] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {sets.map((x) => {
            const n = ['bear', 'room', 'pose'].filter((k) =>
              shop.items.some((c) => c.season === x.key && c.kind === k),
            ).length;
            const full = n === 3;
            const on = only === x.key;
            return (
              /* **한 번 더 누르면 풀린다** — 골라둔 것을 풀 자리를 따로 안 만든다 */
              <button
                key={x.key}
                type="button"
                aria-pressed={on}
                onClick={() => setOnly(on ? '' : x.key)}
                className={`flex flex-none items-center gap-1.5 rounded-full px-[11px] py-[5px] text-[11px] ${
                  on
                    ? 'bg-accent text-white'
                    : full
                      ? 'bg-accent-tint text-accent'
                      : 'bg-sunk text-ink2'
                }`}
              >
                {full && <GiftIcon className="h-3 w-3" />}
                {x.name.replace(' 세트', '')} <b className="font-mono font-medium">{n}/3</b>
              </button>
            );
          })}
        </div>
      )}

      {/*
        **띠를 누르라고 한 줄 적어둔다.** 배너 올리는 자리가 세트를 고른 뒤에야
        열려서, 안 눌러본 사람에게는 그 자리가 아예 없는 것과 같다.
        고른 뒤에는 사라진다 — 이미 아는 것을 계속 말하지 않는다.
      */}
      {!only && sets.length > 0 && (
        <p className="mb-2 text-[11px] leading-[1.55] text-ink3">
          세트를 누르면 그 세트 것만 보이고, <b className="font-medium text-ink2">배너</b>를 올릴
          수 있어요.
        </p>
      )}

      {only && (
        <p className="mb-2 flex items-baseline gap-2 text-[11px] text-ink3">
          <b className="font-medium text-accent">{setOf(only)?.name ?? only}</b>
          세트만 보고 있어요
          <button type="button" onClick={() => setOnly('')} className="ml-auto text-accent">
            전체 보기
          </button>
        </p>
      )}

      {/*
        **배너는 고른 세트 밑에 붙는다.** 배너만 따로 손보는 화면을 안 만들었다 —
        그러면 끝난 세트의 배너가 남아서 두 군데를 같이 꺼야 한다.
        세트를 고르면 그 세트의 배너 칸이 열리는 것이 `배너는 세트에 딸린다`는
        말과 같은 모양이다.
      */}
      {only && setOf(only) && (
        <BannerSlot
          key={only}
          set={setOf(only) as CostumeSet}
          onDone={async () => {
            loadSets();
          }}
        />
      )}

      <div className="mb-4 flex flex-col gap-2">
        {list.map((c) => (
          <Card
            key={c.key}
            item={c}
            shop={shop}
            set={setOf(c.season)?.name}
            busy={busy === c.key}
            onOpen={() => onOpen(c.key)}
            onFlip={() => void flip(c)}
          />
        ))}
        {list.length === 0 && (
          <p className="rounded-2xl border-[1.5px] border-dashed border-edge px-3.5 py-8 text-center text-[11.5px] leading-[1.6] text-ink3">
            {only ? (
              <>
                이 세트에 아직 아무것도 없어요.
                <br />
                <b className="font-medium text-ink2">＋ 채우기</b>로 곰 · 방 · 소품을 넣으세요.
              </>
            ) : (
              '아직 없어요'
            )}
          </p>
        )}
      </div>

      {/* 채우기로 가는 길 하나. 시안의 뜬 단추 자리다 */}
      <button
        type="button"
        onClick={() => onOpen('')}
        className="sticky bottom-[calc(18px+env(safe-area-inset-bottom))] mb-6 ml-auto block rounded-full bg-accent px-5 py-3.5 text-[13.5px] font-medium text-white shadow-fab"
      >
        ＋ 채우기
      </button>
    </>
  );
}

function Card({
  item,
  shop,
  set,
  busy,
  onOpen,
  onFlip,
}: {
  item: Costume;
  shop: Shop;
  /** 시즌 것이면 어느 세트인가 */
  set?: string;
  busy: boolean;
  onOpen: () => void;
  onFlip: () => void;
}) {
  const fam = shop.families.find((f) => f.key === item.family);
  const season = Boolean(item.season);
  const kindName = item.kind === 'room' ? '배경' : item.kind === 'pose' ? '소품' : '캐릭터';
  /*
    **시즌 것에는 중분류 대신 세트 이름을 적는다.**
    `계절`만 적혀 있으면 그 세트 안에서 곰·방·소품이 짝인지 알 길이 없다 —
    스물 몇 개 목록에서 눈으로 짝을 찾게 된다. 중분류는 세트를 따라가는 것이라
    (`sync_catalog_family`) 세트를 알면 그것도 아는 셈이다.
  */
  const where = season ? (set ?? '세트 없음') : (fam?.name ?? '—');

  return (
    <div className="flex items-center gap-[11px] rounded-2xl bg-card px-3 py-2.5 shadow-[0_0_0_1.2px_var(--line)]">
      {/* 카드를 누르면 고치러 간다 — 글자 버튼을 따로 두면 스위치를 잘못 누른다 */}
      <button type="button" onClick={onOpen} className="flex min-w-0 flex-1 items-center gap-[11px] text-left">
        <Thumb item={item} className="h-11 w-11 flex-none" />
        <span className="min-w-0 flex-1">
          <b className="block truncate text-[13px] font-medium text-ink">{item.name}</b>
          <span className="mt-1 block truncate font-mono text-[10.5px] text-ink3">
            <em
              className={`mr-[5px] inline-block rounded-full px-2 py-[2px] align-[1px] font-sans text-[10.5px] font-medium not-italic ${
                season ? 'bg-accent-tint text-accent' : 'bg-sunk text-ink2'
              }`}
            >
              {kindName}
            </em>
            <em className={`not-italic ${season ? 'font-medium text-accent' : ''}`}>{where}</em> ·{' '}
            {item.key} · {item.kind === 'pose' ? '보상' : `${item.price}P`}
          </span>
        </span>
      </button>
      <Switch on={Boolean(item.active)} busy={busy} onFlip={onFlip} />
    </div>
  );
}
