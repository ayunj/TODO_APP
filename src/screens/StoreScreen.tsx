'use client';

import { useMemo, useState } from 'react';
import Coin from './store/Coin';
import SetDetail from './store/SetDetail';
import StoreCard from './store/StoreCard';
import Stage from './store/Stage';
import { familiesOf } from '@/lib/costumes';
import { useGomdori } from '@/lib/gomdori';
import { useUi } from '@/lib/ui';
import { BackIcon, GiftIcon, HomeIcon, StarIcon } from '@/components/Icons';
import type { Costume, Shop } from '@/lib/types';

/**
 * 칩이 **두 층이다.**
 *
 * ```
 * 전체 | 꾸미기 | 시즌 | 방 | 내 옷장      ← 대분류와 가로지르는 버튼 둘
 *        └ 전체 | 일상 | 코스튬            ← 중분류. 서버가 들고 있다
 * ```
 *
 * 위층은 **꾸미기와 시즌 둘뿐**이고 아래층만 늘어난다
 * ([상점 채우기](../../design/관리자.html)에서 관리자가 늘린다).
 * 한 층으로 두면 `코스튬`이 `시즌`과 나란히 서는데, 코스튬은 꾸미기의 한 갈래지
 * 시즌과 나란한 것이 아니다.
 *
 * **`방`과 `내 옷장`은 대분류가 아니다.** 대분류를 가로지르는 버튼이라
 * 종류(`kind === 'room'`)와 가진 것으로 고른다 — 시즌 방도 `방`에서 보여야 한다.
 *
 * **겹치면 시즌이 이긴다.** 할로윈 마녀는 완전 변신이면서 기간 한정인데,
 * `때가 있다`가 더 특별한 정보라 그쪽에만 둔다 — 두 칸에 같은 것이 두 번 뜨면 안 된다.
 */
type Chip = string;

/**
 * 상점 — [design/상점.html](../../design/상점.html) 그대로.
 *
 * 뼈대는 한 줄이다 — **카드는 고르는 자리, 위 칸은 하는 자리.**
 * 103px 카드 안에 사는 단추까지 넣으면 잘못 눌러 300P가 날아간다.
 *
 * 갈래마다 칩이 하나씩 선다. 부위(머리·몸·악세사리)로는 안 가른다 —
 * 부위를 나누는 순간 사람들은 겹쳐 입기를 기대한다.
 */
export default function StoreScreen() {
  const { enabled, shop, item, points, has, wornBear, wornRoom, buy, wear } = useGomdori();
  const { popView } = useUi();

  const [chip, setChip] = useState<Chip>('all');
  /** 아래층 칩. `all`이면 그 대분류를 통째로 본다. */
  const [sub, setSub] = useState<string>('all');
  const [tab, setTab] = useState<'bear' | 'room'>('bear');
  const [trying, setTrying] = useState<string>(wornBear);
  const [open, setOpen] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  /* 방은 대분류를 가로지른다 — 시즌 방도 여기서 보여야 한다 */
  const rooms = useMemo(() => shop.items.filter((c) => c.kind === 'room'), [shop]);
  const decoRooms = useMemo(() => rooms.filter((c) => !c.season), [rooms]);
  const decoFams = useMemo(() => familiesOf(shop, 'deco'), [shop]);
  const seasonFams = useMemo(() => familiesOf(shop, 'season'), [shop]);
  const decoOf = (fam: string) =>
    shop.items.filter((c) => !c.season && c.kind !== 'room' && c.family === fam);
  const sets = shop.sets.filter((x) => sub === 'all' || x.family === sub);

  const set = shop.sets.find((x) => x.key === open) ?? null;
  const it = item(trying);
  const roomly = it.kind === 'room';
  const worn = roomly ? wornRoom : wornBear;

  /*
    카드를 누르면 걸쳐보기만 한다. 다만 **보고 있던 것을 한 번 더 누르면 그대로 쓴다** —
    탭바에서 보던 탭을 한 번 더 눌러 오늘로 돌아오는 손짓과 같다.
    가진 것에만 걸린다. 안 산 것은 몇 번을 눌러도 미리보기다.
  */
  const pick = (key: string) => {
    if (trying === key && has(key)) void wear(key);
    else setTrying(key);
  };

  const doBuy = async (key: string) => {
    setBusy(true);
    try {
      await buy(key);
    } finally {
      setBusy(false);
    }
  };

  const title = chip === 'mine' ? '내 옷장' : '상점';
  /* 위층을 바꾸면 아래층은 늘 `전체`로 돌아간다 — 안 그러면 없는 칩이 눌린 채로 남는다 */
  const goChip = (k: Chip) => {
    setChip(k);
    setSub('all');
  };
  const subs = chip === 'deco' ? decoFams : chip === 'season' ? seasonFams : [];

  return (
    <>
      <header className="sticky top-0 z-[16] -mx-4 flex items-center gap-1.5 bg-bg px-4 pb-3.5 pt-[calc(14px+env(safe-area-inset-top))]">
        <button
          type="button"
          aria-label="돌아가기"
          onClick={() => (open ? setOpen(null) : popView())}
          className="-ml-1.5 grid h-[38px] w-[38px] flex-none place-items-center rounded-full text-ink2 active:bg-sunk"
        >
          <BackIcon className="h-5 w-5" />
        </button>
        <h1 className="min-w-0 flex-1 truncate font-round text-[19px] leading-[1.2] tracking-[-.02em]">
          {open ? '상점' : title}
        </h1>
        {/* 격자를 내리는 동안에도 보여야 한다 — 값을 보면서 고르는 화면이다 */}
        <span className="flex flex-none items-center gap-1.5 rounded-full bg-card py-[7px] pl-2 pr-[13px] shadow-card">
          <Coin />
          <b className="font-mono text-[13.5px] font-medium">{points}</b>
        </span>
      </header>

      {!enabled ? (
        <div className="rounded-card bg-card px-[18px] py-10 text-center text-[13px] leading-[1.7] text-ink3 shadow-card">
          <b className="mb-1.5 block font-round text-[15px] font-medium text-ink2">
            로그인하면 곰돌이를 꾸밀 수 있어요
          </b>
          할 일을 끝내면 포인트가 쌓이고, 그걸로 옷과 방을 사요.
        </div>
      ) : set ? (
        <SetDetail set={set} busy={busy} onBuy={doBuy} onWear={wear} />
      ) : (
        <>
          <Preview
            item={it}
            here={trying === worn}
            own={has(trying)}
            points={points}
            busy={busy}
            wornBear={wornBear}
            wornRoom={wornRoom}
            onWear={() => void wear(trying)}
            onBuy={() => void doBuy(trying)}
          />

          <div className="-mx-4 mb-3 flex gap-[7px] overflow-x-auto px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {[
              { key: 'all', name: '전체' },
              ...shop.groups,
              { key: 'room', name: '방' },
              { key: 'mine', name: '내 옷장' },
            ].map((g) => (
              <button
                key={g.key}
                type="button"
                aria-pressed={chip === g.key}
                onClick={() => goChip(g.key)}
                className={`flex-none rounded-full px-4 py-2 text-[12.5px] font-medium ${
                  chip === g.key
                    ? 'bg-accent text-white'
                    : 'bg-card text-ink2 shadow-[0_0_0_1.4px_var(--line)]'
                }`}
              >
                {g.name}
              </button>
            ))}
          </div>

          {/*
            아래층 — 고른 대분류에 중분류가 있을 때만 선다.
            **위층과 생김새를 다르게 뒀다.** 같은 알약을 두 줄 세우면
            어느 쪽이 위인지 눈으로 못 가린다.
          */}
          {subs.length > 0 && (
            <div className="-mx-4 mb-3 flex gap-4 overflow-x-auto px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {[{ key: 'all', name: '전체' }, ...subs].map((f) => (
                <button
                  key={f.key}
                  type="button"
                  aria-pressed={sub === f.key}
                  onClick={() => setSub(f.key)}
                  className={`flex-none border-b-2 pb-1.5 text-[12.5px] ${
                    sub === f.key
                      ? 'border-accent font-medium text-accent'
                      : 'border-transparent text-ink3'
                  }`}
                >
                  {f.name}
                </button>
              ))}
            </div>
          )}

          {chip === 'mine' ? (
            <Wardrobe shop={shop} tab={tab} setTab={setTab} pick={pick} trying={trying} />
          ) : chip === 'room' ? (
            <Group title="방 테마" aside="홈 배경이 바뀐다" list={rooms} pick={pick} trying={trying} />
          ) : chip === 'season' ? (
            <Sets list={sets} has={has} onOpen={setOpen} />
          ) : chip === 'deco' ? (
            /* 중분류를 고르면 그것만, `전체`면 중분류마다 한 무더기씩 */
            sub === 'all' ? (
              <>
                {decoFams.map((f) => (
                  <Group
                    key={f.key}
                    title={f.name}
                    list={decoOf(f.key)}
                    pick={pick}
                    trying={trying}
                  />
                ))}
                <Group title="방 테마" list={decoRooms} pick={pick} trying={trying} />
              </>
            ) : (
              <Group title={nameOf(subs, sub)} list={decoOf(sub)} pick={pick} trying={trying} />
            )
          ) : (
            <>
              <Head title="시즌 세트" aside="때가 있는 것" />
              <Sets list={shop.sets} has={has} onOpen={setOpen} bare />
              {decoFams.map((f) => (
                <Group key={f.key} title={f.name} list={decoOf(f.key)} pick={pick} trying={trying} />
              ))}
              <Group title="방 테마" list={decoRooms} pick={pick} trying={trying} />
            </>
          )}

          {/* 맨 아래 한 줄 — 칸마다 다르다. 잔소리가 아니라 안내다. */}
          <Tip chip={chip} tab={tab} />
        </>
      )}
    </>
  );
}

/** 지금 보고 있는 것 — 방과 곰이 따로 얹힌다 */
function Preview({
  item,
  here,
  own,
  points,
  busy,
  wornBear,
  wornRoom,
  onWear,
  onBuy,
}: {
  item: Costume;
  here: boolean;
  own: boolean;
  points: number;
  busy: boolean;
  wornBear: string;
  wornRoom: string;
  onWear: () => void;
  onBuy: () => void;
}) {
  const roomly = item.kind === 'room';
  // 옷은 입고, 방과 포즈는 적용한다. 방을 입는다고 하면 말이 안 된다.
  const verb = roomly || item.kind === 'pose' ? ['적용', '적용 중'] : ['입기', '입는 중'];
  const short = item.price - points;

  return (
    <section className="mb-3 rounded-card bg-card p-3.5 shadow-card">
      <Stage
        bear={roomly ? wornBear : item.key}
        room={roomly ? item.key : wornRoom}
        flag={here ? verb[1] : '미리보기'}
      />

      <div className="mt-3.5 flex min-h-[34px] items-center gap-2">
        <span className="min-w-0 flex-1 truncate font-round text-[17px]">{item.name}</span>
        {here ? (
          <span className="flex-none rounded-full bg-accent-tint px-4 py-[7px] text-[12.5px] font-medium text-accent">
            {verb[1]}
          </span>
        ) : own ? (
          <button
            type="button"
            onClick={onWear}
            className="flex-none rounded-full bg-card px-4 py-[7px] text-[12.5px] font-medium text-accent shadow-[0_0_0_1.5px_var(--accent)] active:bg-accent-tint"
          >
            {verb[0]}
          </button>
        ) : (
          // 값은 여기 한 번만 적는다. 단추에 또 적으면 값을 치르라고 미는 말이 된다.
          <span className="flex flex-none items-center gap-1.5 rounded-full bg-card py-[5px] pl-[5px] pr-3 font-mono text-[13px] font-medium text-ink2 shadow-[0_0_0_1.4px_var(--line)]">
            <Coin />
            {item.price}
          </span>
        )}
      </div>

      {!own &&
        (short <= 0 ? (
          // 사는 것만 폭을 다 쓴다 — 되돌릴 수 없는 일 하나만 이만큼 크다
          <button
            type="button"
            disabled={busy}
            onClick={onBuy}
            className="mt-2.5 w-full rounded-[14px] bg-accent p-[15px] text-[14.5px] font-medium text-white shadow-fab disabled:opacity-60"
          >
            {busy ? '사는 중…' : '구매하기'}
          </button>
        ) : (
          /*
            못 누르는 단추를 흐리게 두지 않는다 — 회색으로 눕혀두면 언젠가 눌리는 것으로
            보여 계속 눌러보게 된다. 그 자리에 얼마가 모자란지 한 줄로 적는다.
          */
          <div className="mt-2.5 rounded-[14px] bg-sunk p-3.5 text-center text-[12.5px] text-ink3">
            {short}P 더 모으면 살 수 있어요
          </div>
        ))}
    </section>
  );
}

function Wardrobe({
  shop,
  tab,
  setTab,
  pick,
  trying,
}: {
  shop: Shop;
  tab: 'bear' | 'room';
  setTab: (t: 'bear' | 'room') => void;
  pick: (key: string) => void;
  trying: string;
}) {
  const { has } = useGomdori();
  const all = shop.items.filter((c) => (tab === 'room' ? c.kind === 'room' : c.kind !== 'room'));
  const list = all.filter((c) => has(c.key));

  return (
    <>
      <div className="mb-3 flex gap-1 rounded-2xl bg-sunk p-1">
        {(
          [
            ['bear', '곰 스타일'],
            ['room', '방 테마'],
          ] as ['bear' | 'room', string][]
        ).map(([k, label]) => (
          <button
            key={k}
            type="button"
            aria-pressed={tab === k}
            onClick={() => setTab(k)}
            className={`flex-1 rounded-[14px] py-[9px] text-[12.5px] font-medium ${
              tab === k ? 'bg-card text-ink shadow-card' : 'text-ink3'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <Head title={tab === 'room' ? '가진 테마' : '가진 옷'} />
      <div className="mb-4 grid grid-cols-3 gap-[9px]">
        {list.map((c) => (
          <StoreCard key={c.key} item={c} onPick={() => pick(c.key)} trying={trying === c.key} />
        ))}
        {/* 빈 옷걸이 한 칸 — 다 모으면 사라진다 */}
        {list.length < all.length && (
          <span className="flex flex-col items-center justify-center gap-2 rounded-2xl border-[1.5px] border-dashed border-edge p-3 text-center text-[10px] leading-[1.5] text-ink3">
            <HomeIcon className="h-8 w-8 text-line" />
            더 많은 {tab === 'room' ? '테마' : '옷'}을<br />
            모아보세요
          </span>
        )}
      </div>
    </>
  );
}

/** 시즌 세트 격자 — 세트 하나가 칸 하나다. 방 그림을 얼굴로 세운다. */
function Sets({
  list,
  has,
  onOpen,
  bare,
}: {
  list: Shop['sets'];
  has: (key: string) => boolean;
  onOpen: (key: string) => void;
  bare?: boolean;
}) {
  return (
    <>
      {!bare && <Head title="시즌 세트" />}
      <div className="mb-4 grid grid-cols-3 gap-[9px]">
        {list.map((s) => (
          <StoreCard
            key={s.key}
            item={s.room}
            label={s.name}
            step={[s.bear, s.room, s.pose].filter((x) => has(x.key)).length}
            onPick={() => onOpen(s.key)}
          />
        ))}
      </div>
    </>
  );
}

/** 중분류 열쇠를 사람이 읽는 이름으로. 서버가 지은 이름이라 앱에 표가 없다. */
function nameOf(list: { key: string; name: string }[], key: string): string {
  return list.find((f) => f.key === key)?.name ?? key;
}

function Group({
  title,
  aside,
  list,
  pick,
  trying,
}: {
  title: string;
  aside?: string;
  list: Costume[];
  pick: (key: string) => void;
  trying: string;
}) {
  return (
    <>
      <Head title={title} aside={aside} />
      <div className="mb-4 grid grid-cols-3 gap-[9px]">
        {list.map((c) => (
          <StoreCard key={c.key} item={c} onPick={() => pick(c.key)} trying={trying === c.key} />
        ))}
      </div>
    </>
  );
}

function Head({ title, aside }: { title: string; aside?: string }) {
  return (
    <div className="mb-2.5 flex items-baseline gap-1.5">
      <b className="text-[13px] font-medium text-ink2">{title}</b>
      {aside && <em className="text-[11px] not-italic text-ink3">{aside}</em>}
    </div>
  );
}

function Tip({ chip, tab }: { chip: Chip; tab: 'bear' | 'room' }) {
  // 곰 스타일 칸에는 아무 줄도 안 둔다 — 할 말이 없는 자리에 말을 만들지 않는다
  if (chip === 'mine' && tab === 'bear') return null;

  const [Icon, text] =
    chip === 'season'
      ? [GiftIcon, '곰과 방을 다 모으면 포즈가 딸려와요']
      : chip === 'room' || chip === 'mine'
        ? [HomeIcon, '테마를 바꾸면 홈 배경이 바뀌어요']
        : [StarIcon, '포인트는 할 일을 끝내면 모을 수 있어요'];

  return (
    <div className="mb-6 flex items-center gap-2 rounded-[14px] bg-sunk px-3.5 py-3 text-[11.5px] leading-[1.5] text-ink2">
      <Icon className="h-[15px] w-[15px] flex-none text-cycle" />
      {text}
    </div>
  );
}
