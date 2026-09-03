'use client';

import { useEffect, useMemo, useState } from 'react';
import Banner from './store/Banner';
import Coin from './store/Coin';
import Rail, { RAIL_MIN } from './store/Rail';
import SetDetail from './store/SetDetail';
import StoreCard from './store/StoreCard';
import Stage from './store/Stage';
import { bannerSet, familiesOf, freshOf, groupOf, onSale, rankOf } from '@/lib/costumes';
import { useGomdori } from '@/lib/gomdori';
import { toast } from '@/lib/toast';
import { useUi } from '@/lib/ui';
import { BackIcon, HomeIcon, ShirtIcon, StarIcon, TrophyIcon } from '@/components/Icons';
import type { Costume, CostumeSet, Shop } from '@/lib/types';

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
 * 내 옷장의 칸 셋 — **종류 그대로다.**
 *
 * 소품을 곰 스타일에 같이 두었더니 `옷`이라기엔 곰 한 마리가 통째로 다른 것이
 * 옷들 사이에 끼어 있었다. 세트를 다 모아야 딸려오는 것이라 모으는 재미가
 * 걸린 자리인데, 옷 스무 벌 뒤에 묻혔다.
 */
type Shelf = 'bear' | 'room' | 'pose';

/**
 * `더보기`로 펼치는 두 칸.
 *
 * **중분류 줄은 여기 없다.** `꾸미기 > 코스튬` 칩이 이미 그 목록이라
 * 화면을 하나 더 만들면 같은 격자가 두 군데가 된다 — 그 줄의 `더보기`는
 * 칩을 옮길 뿐이다. 갈 칩이 없는 둘만 여기 온다.
 */
type More = 'fresh' | 'rank';

/**
 * 제목 줄에 적을 이름. **그게 전부다.**
 *
 * 한때 무엇으로 고른 줄인지를 밑에 한 줄씩 적어뒀다(`상점에 걸린 지 2주 안 된
 * 것들이에요`). 걷어냈다 — **줄 이름이 이미 그 말이다.** 같은 말을 두 번 하면
 * 아래 것이 설명으로 읽혀서, 읽을 것이 하나 더 있는 화면이 된다.
 */
const MORE: Record<More, string> = {
  fresh: '새로 들어왔어요',
  rank: '랭킹',
};

/**
 * 상점 — [design/상점.html](../../design/상점.html) 그대로.
 *
 * 뼈대는 한 줄이다 — **상점은 사는 자리, 내 옷장은 입어보는 자리.**
 *
 * 전에는 화면 맨 위에 곰돌이 칸이 붙박여 있어서 어느 칩에서든 걸쳐볼 수 있었다.
 * 걷어냈다 — **안 산 옷을 걸쳐보는 자리와 가격을 치르는 자리가 한 칸에 겹쳐 있으면
 * 입어보다가 사게 된다.** 그리고 사고 나면 어차피 입혀지니, 상점에서 미리 걸쳐본
 * 것은 대부분 그냥 지나가는 장면이었다.
 *
 * 그래서 갈랐다 —
 *
 * | 어디 | 카드를 누르면 | 알약 |
 * |---|---|---|
 * | 상점 | [사는 시트](../sheets/BuySheet.tsx)가 올라온다 | `보유중` · 값 |
 * | 내 옷장 | 위 칸에 걸쳐본다. 한 번 더 누르면 입는다 | `입기` · `입는 중` |
 *
 * **카드는 여전히 고르는 자리다.** 103px 안에 사는 단추까지 넣으면
 * 잘못 눌러 300P가 날아간다 — 가격을 치르는 것은 시트가 한다.
 *
 * 갈래마다 칩이 하나씩 선다. 부위(머리·몸·악세사리)로는 안 가른다 —
 * 부위를 나누는 순간 사람들은 겹쳐 입기를 기대한다.
 */
export default function StoreScreen() {
  const { enabled, shop: all, item, points, has, wornBear, wornRoom, buy, wear, refreshShop } =
    useGomdori();
  const { popView, openSheet } = useUi();

  /*
    **열 때마다 다시 받아온다.** 앱을 켤 때 한 번만 받으면 방금 채운 것이
    앱을 다시 켤 때까지 안 보인다 — 채우고 바로 보러 오는 자리다.
    못 받아오면 들고 있던 것으로 그대로 선다.
  */
  useEffect(() => {
    void refreshShop().catch(() => {});
  }, [refreshShop]);

  /*
    **파는 것만 고른다.** 채우는 사람에게는 숨긴 것까지 내려와서(가격표 정책),
    안 거르면 그 사람 눈에만 반쯤 그린 물건이 상점에 선다.
    옷장은 아래에서 `all`을 그대로 쓴다 — 산 뒤에 내린 옷도 내 옷장에는 있어야 한다.
  */
  const shop = useMemo(() => onSale(all), [all]);

  const [chip, setChip] = useState<Chip>('all');
  /** 아래층 칩. `all`이면 그 대분류를 통째로 본다. */
  const [sub, setSub] = useState<string>('all');
  const [tab, setTab] = useState<Shelf>('bear');
  const [trying, setTrying] = useState<string>(wornBear);
  /*
    **밖에서 갈아입으면 걸쳐보는 칸도 따라간다.**

    걸쳐보는 것은 입은 것과 따로 논다 — 안 산 옷도 걸쳐볼 수 있어야 해서다.
    그래서 열 때 한 번만 입은 것을 베껴 왔는데, **세트 칸에서 입고 나오면**
    입기 전 곰돌이를 그대로 들고 서 있었다. 새로고침해야 바뀌었다.

    입은 것이 바뀌는 길은 `입기`를 눌렀을 때뿐이라(사면 그 자리에서 입는다)
    따라가도 걸쳐보던 것을 뺏지 않는다 — 그 순간엔 둘이 같은 것이다.
  */
  useEffect(() => {
    setTrying(wornBear);
  }, [wornBear]);
  const [open, setOpen] = useState<string | null>(null);
  /** 가로줄을 펼쳐 본 칸. `null`이면 메인이다 */
  const [more, setMore] = useState<More | null>(null);
  const [busy, setBusy] = useState(false);

  /* 방은 대분류를 가로지른다 — 시즌 방도 여기서 보여야 한다 */
  const rooms = useMemo(() => shop.items.filter((c) => c.kind === 'room'), [shop]);
  const decoFams = useMemo(() => familiesOf(shop, 'deco'), [shop]);
  const seasonFams = useMemo(() => familiesOf(shop, 'season'), [shop]);
  /*
    **`방` 밑에도 대분류가 선다.** 방 테마가 꾸미기에도 시즌에도 있어서,
    한 무더기로 늘어놓으면 기본 룸과 크리스마스 룸이 나란히 선다.

    **든 것이 있는 대분류만 세운다.** 지금은 시즌 방이 없어 `꾸미기` 하나만 뜨고,
    관리자가 시즌 방을 하나 올리면 `시즌`이 저절로 따라 선다 — 여기 적어둘 것이 없다.
  */
  const roomGroups = useMemo(
    () => shop.groups.filter((g) => rooms.some((c) => groupOf(c) === g.key)),
    [shop, rooms],
  );
  const decoOf = (fam: string) =>
    shop.items.filter((c) => !c.season && c.kind !== 'room' && c.family === fam);
  const sets = shop.sets.filter((x) => sub === 'all' || x.family === sub);
  /*
    **아무것도 안 든 대분류는 칩을 안 세운다.** 시즌 세트를 다 걷어낸 뒤 `시즌`을
    그대로 두면 눌렀을 때 빈 화면이 뜨는데, 그건 파는 것이 없는 게 아니라
    **화면이 고장 난 것**으로 읽힌다. 관리자가 세트를 하나 지으면 칩도 같이 돌아온다.
  */
  const groups = useMemo(
    () =>
      shop.groups.filter((g) =>
        g.key === 'season'
          ? shop.sets.length > 0
          : shop.items.some((c) => groupOf(c) === g.key),
      ),
    [shop],
  );

  const set = shop.sets.find((x) => x.key === open) ?? null;
  const it = item(trying);
  const roomly = it.kind === 'room';
  const worn = roomly ? wornRoom : wornBear;

  /*
    **내 옷장에서만** 걸쳐본다. 다만 **보고 있던 것을 한 번 더 누르면 그대로 쓴다** —
    탭바에서 보던 탭을 한 번 더 눌러 오늘로 돌아오는 손짓과 같다.
    옷장에 선 것은 다 가진 것이라 여기서 `has`를 다시 물을 일이 없다.
  */
  const fit = (key: string) => {
    if (trying === key) void wear(key);
    else setTrying(key);
  };

  /*
    **상점에서 카드를 누르면 사는 시트가 올라온다.** 그 자리에서 바로 사지 않는다 —
    103px 칸을 잘못 스치면 300P가 날아간다. 가진 것도 연다:
    눌러도 아무 일이 없으면 고장으로 읽힌다.
  */
  const openBuy = (key: string) => openSheet({ kind: 'buy', id: key });

  /*
    **세트 펼친 칸에서만 쓴다.** 격자에서 사는 것은 시트가 가져갔다.
    서버가 막은 까닭(`포인트가 모자랍니다`)은 그대로 옮겨 적는다 —
    안 그러면 눌렀는데 아무 일도 안 일어난 것으로 보인다.
  */
  const doBuy = async (key: string) => {
    setBusy(true);
    try {
      await buy(key);
    } catch (e) {
      toast(e instanceof Error ? e.message : '사지 못했어요');
    } finally {
      setBusy(false);
    }
  };

  /* 상점 메인의 두 줄. 거르는 규칙이 한 군데에 있다([costumes.ts](../lib/costumes.ts)) */
  const fresh = useMemo(() => freshOf(shop), [shop]);
  const ranked = useMemo(() => rankOf(shop), [shop]);
  const banner = useMemo(() => bannerSet(shop), [shop]);

  const title = more ? MORE[more] : chip === 'mine' ? '내 옷장' : '상점';
  /* 위층을 바꾸면 아래층은 늘 `전체`로 돌아간다 — 안 그러면 없는 칩이 눌린 채로 남는다 */
  const goChip = (k: Chip) => {
    setChip(k);
    /* 방 밑의 칩은 `전체`가 없다 — 알약 둘 가운데 하나가 늘 눌려 있다 */
    setSub(k === 'room' ? (roomGroups[0]?.key ?? 'all') : 'all');
  };
  const subs = chip === 'deco' ? decoFams : chip === 'season' ? seasonFams : [];
  /* 방 밑의 칩은 중분류가 아니라 대분류다 — 알약 두 칸으로 세운다 */
  const roomSub = roomGroups.some((g) => g.key === sub) ? sub : (roomGroups[0]?.key ?? '');
  const roomList = rooms.filter((c) => groupOf(c) === roomSub);

  return (
    <>
      <header className="sticky top-0 z-[16] -mx-4 flex items-center gap-1.5 bg-bg px-4 pb-3.5 pt-[calc(14px+env(safe-area-inset-top))]">
        <button
          type="button"
          aria-label="돌아가기"
          onClick={() => (open ? setOpen(null) : more ? setMore(null) : popView())}
          className="-ml-1.5 grid h-[38px] w-[38px] flex-none place-items-center rounded-full text-ink2 active:bg-sunk"
        >
          <BackIcon className="h-5 w-5" />
        </button>
        <h1 className="min-w-0 flex-1 truncate font-round text-[19px] leading-[1.2] tracking-[-.02em]">
          {open ? '상점' : title}

        </h1>
        {/* 격자를 내리는 동안에도 보여야 한다 — 가격을 보면서 고르는 화면이다 */}
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
        <SetDetail set={set} busy={busy} onBuy={doBuy} />
      ) : more ? (
        /* 가로줄에서 밀어야 나오던 것이 여기서는 다 보인다 */
        <MoreList
          list={more === 'fresh' ? fresh : ranked}
          rank={more === 'rank'}
          onPick={openBuy}
        />
      ) : (
        <>
          <div className="-mx-4 mb-3 flex gap-[7px] overflow-x-auto px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {[
              { key: 'all', name: '전체' },
              ...groups,
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
            <>
              {/*
                **걸쳐보는 칸은 칩 아래에 선다.** 위에 붙박아두면 상점 칩에서도
                보이고, 옷장으로 옮길 때 칩 줄이 통째로 아래로 밀려난다.
              */}
              <Fitting
                item={it}
                here={trying === worn}
                wornBear={wornBear}
                wornRoom={wornRoom}
                onWear={() => void wear(trying)}
              />
              <Wardrobe shop={all} tab={tab} setTab={setTab} pick={fit} trying={trying} />
            </>
          ) : chip === 'room' ? (
            <>
              {/*
                **알약 두 칸.** 중분류 칩(밑줄)과 생김새를 다르게 뒀다 —
                여기 서는 것은 중분류가 아니라 대분류라서, 같은 모양으로 두면
                `일상`과 `꾸미기`가 같은 층으로 읽힌다.
              */}
              {roomGroups.length > 0 && (
                <div className="mb-3 flex gap-1 rounded-2xl bg-sunk p-1">
                  {roomGroups.map((g) => (
                    <button
                      key={g.key}
                      type="button"
                      aria-pressed={roomSub === g.key}
                      onClick={() => setSub(g.key)}
                      className={`flex-1 rounded-[14px] py-[9px] text-[12.5px] font-medium ${
                        roomSub === g.key ? 'bg-card text-ink shadow-card' : 'text-ink3'
                      }`}
                    >
                      {g.name}
                    </button>
                  ))}
                </div>
              )}
              <Group title="방 테마" list={roomList} pick={openBuy} />
            </>
          ) : chip === 'season' ? (
            <Sets list={sets} has={has} onOpen={setOpen} />
          ) : chip === 'deco' ? (
            /* 중분류를 고르면 그것만, `전체`면 중분류마다 한 무더기씩 */
            sub === 'all' ? (
              /*
                **방 테마를 여기 안 세운다.** `방` 버튼이 따로 있어서 같은 것이 두 번 뜬다 —
                꾸미기를 열면 옷만 보이고, 방은 `방`에서 본다.
              */
              <>
                {decoFams.map((f) => (
                  <Group key={f.key} title={f.name} list={decoOf(f.key)} pick={openBuy} />
                ))}
              </>
            ) : (
              <Group title={nameOf(subs, sub)} list={decoOf(sub)} pick={openBuy} />
            )
          ) : (
            <Main
              banner={banner}
              fresh={fresh}
              ranked={ranked}
              sets={shop.sets}
              has={has}
              fams={decoFams}
              decoOf={decoOf}
              rooms={rooms}
              onPick={openBuy}
              onSet={setOpen}
              onMore={setMore}
              goFam={(fam) => {
                setChip('deco');
                setSub(fam);
              }}
              goRoom={() => goChip('room')}
            />
          )}

        </>
      )}
    </>
  );
}

/**
 * 상점 메인 — **고르는 자리가 아니라 보여주는 자리다.**
 *
 * 전에는 파는 것을 무더기째 세로로 늘어놓았다. 넷일 때는 그게 맞았는데,
 * 스물이 되면 세 개씩 일곱 줄이 서고 **무엇부터 볼지를 화면이 안 말해준다.**
 *
 * 그래서 줄을 세운다 — 배너 한 장, 그리고 가로줄 몇
 * ([시안](../../design/상점-메인.html)).
 *
 * | 줄 | 무엇으로 고르나 | `더보기` |
 * |---|---|---|
 * | 배너 | 관리자가 올린 사진이 걸린 세트 | 그 세트 상세 |
 * | 새로 들어왔어요 | **켜진 날**이 가까운 차례 | 펼친 격자 |
 * | 랭킹 | 서버가 센 **산 사람 수** 차례 | 펼친 격자 |
 * | 중분류마다 한 줄 | 일상 · 코스튬 · 방 | **이미 있는 칩**으로 |
 *
 * **배너에 걸린 세트는 세트 줄에서 뺀다.** 안 빼면 같은 세트가 맨 위에 크게 한 번,
 * 아래 격자에 작게 한 번 뜬다.
 *
 * ─── 하나도 안 서면 옛 격자로 물러선다 ──────────────────────────
 *
 * 이 화면은 **물건이 열 개는 넘어야 산다.** 줄마다 넷은 있어야 서는데
 * (`RAIL_MIN`), 지금처럼 파는 것이 넷뿐이면 줄이 하나도 못 서서
 * **칩 줄 아래가 통째로 빈다.** 그건 파는 것이 없는 게 아니라 고장으로 읽힌다.
 *
 * 그래서 **아무 줄도 안 서면 무더기 격자를 그대로 세운다.** 물건이 늘면
 * 저절로 줄이 서고 격자는 물러난다 — 어디에 스위치를 두지 않는다.
 */
function Main({
  banner,
  fresh,
  ranked,
  sets,
  has,
  fams,
  decoOf,
  rooms,
  onPick,
  onSet,
  onMore,
  goFam,
  goRoom,
}: {
  banner: CostumeSet | null;
  fresh: Costume[];
  ranked: Costume[];
  sets: Shop['sets'];
  has: (key: string) => boolean;
  fams: { key: string; name: string }[];
  decoOf: (fam: string) => Costume[];
  rooms: Costume[];
  onPick: (key: string) => void;
  onSet: (key: string) => void;
  onMore: (what: More) => void;
  goFam: (fam: string) => void;
  goRoom: () => void;
}) {
  /* 배너에 걸린 세트는 여기 또 안 세운다 */
  const rest = sets.filter((x) => x.key !== banner?.key);

  /**
   * 이 화면이 설 만한가 — 하나도 없으면 옛 격자로 물러선다.
   *
   * **세트가 있으면 배너는 늘 선다.** 아직 아무것도 안 올렸어도
   * [세워둔 한 장](store/Banner.tsx)이 그 자리를 채운다.
   */
  const standing =
    Boolean(banner) ||
    fresh.length >= RAIL_MIN ||
    ranked.length >= RAIL_MIN ||
    rest.length > 0 ||
    rooms.length >= RAIL_MIN ||
    fams.some((f) => decoOf(f.key).length >= RAIL_MIN);

  if (!standing) {
    return (
      <>
        {sets.length > 0 && (
          <>
            <Head title="시즌 세트" aside="때가 있는 것" />
            <Sets list={sets} has={has} onOpen={onSet} bare />
          </>
        )}
        {fams.map((f) => (
          <Group key={f.key} title={f.name} list={decoOf(f.key)} pick={onPick} />
        ))}
        {/* 여기는 **다 보여주는 자리**라 방도 든다. 꾸미기 칩에서는 뺐다. */}
        <Group title="방 테마" list={rooms} pick={onPick} />
      </>
    );
  }

  return (
    <>
      {banner && <Banner set={banner} onOpen={() => onSet(banner.key)} />}

      <Rail
        icon={<StarIcon className="h-4 w-4" />}
        title="새로 들어왔어요"
        list={fresh}
        fresh
        onPick={onPick}
        onMore={() => onMore('fresh')}
      />
      <Rail
        icon={<TrophyIcon className="h-4 w-4" />}
        title="랭킹"
        list={ranked}
        rank
        onPick={onPick}
        onMore={() => onMore('rank')}
      />

      {/*
        세트는 가로줄이 아니라 격자다 — **칸 하나가 물건 하나가 아니라 세 개짜리 묶음**이라
        옆 칸과 견주는 것이 아니라 하나씩 열어보는 것이다.
      */}
      {rest.length > 0 && (
        <>
          <Head title="시즌 세트" aside="때가 있는 것" />
          <Sets list={rest} has={has} onOpen={onSet} bare />
        </>
      )}

      {/*
        중분류마다 한 줄. **아이콘을 하나로 둔다** — 중분류는 관리자가 늘리는 것이라
        갈래마다 그림을 골라주면 새로 지은 중분류에는 붙일 것이 없다.
      */}
      {fams.map((f) => (
        <Rail
          key={f.key}
          icon={<ShirtIcon className="h-4 w-4" />}
          title={f.name}
          list={decoOf(f.key)}
          onPick={onPick}
          onMore={() => goFam(f.key)}
        />
      ))}
      <Rail
        icon={<HomeIcon className="h-4 w-4" />}
        title="방 테마"
        list={rooms}
        onPick={onPick}
        onMore={goRoom}
      />
    </>
  );
}

/**
 * `더보기`로 펼친 격자 — **가로줄에서 밀어야 나오던 것이 다 보인다.**
 *
 * 밀고 들어가는 화면(`Route`)으로 안 만들었다. 세트 상세가 이미 이 얼개라
 * (제목 줄은 그대로 두고 아래만 갈아 끼운다) 같은 자리를 둘로 만들 까닭이 없다 —
 * 뒤로 화살표가 한 겹 벗어 메인으로 돌아온다.
 *
 * **랭킹에만 등수를 적는다.** 신상은 차례가 뜻을 갖는 줄이 아니다 —
 * 어제 걸린 것이 그제 걸린 것보다 `1등`일 까닭이 없다.
 */
function MoreList({
  list,
  rank,
  onPick,
}: {
  list: Costume[];
  rank: boolean;
  onPick: (key: string) => void;
}) {
  return (
    <>
      {list.length === 0 ? (
        <p className="rounded-2xl border-[1.5px] border-dashed border-edge px-3.5 py-10 text-center text-[11.5px] leading-[1.6] text-ink3">
          아직 없어요
        </p>
      ) : (
        <div className="mb-4 grid grid-cols-3 gap-[9px]">
          {list.map((c, i) => (
            <StoreCard
              key={c.key}
              item={c}
              rank={rank ? i + 1 : undefined}
              fresh={!rank}
              onPick={() => onPick(c.key)}
            />
          ))}
        </div>
      )}
    </>
  );
}

/**
 * 걸쳐보는 칸 — **내 옷장에만 선다.** 방과 곰이 따로 얹힌다.
 *
 * 여기 서는 것은 다 가진 것이라 **가격도 사는 단추도 없다.** 있던 것을 걷어냈다 —
 * 걸쳐보는 칸에 사는 단추가 붙어 있으면 입어보다가 가격을 치르게 된다.
 * 사는 것은 [상점의 시트](../sheets/BuySheet.tsx)가 한다.
 */
function Fitting({
  item,
  here,
  wornBear,
  wornRoom,
  onWear,
}: {
  item: Costume;
  here: boolean;
  wornBear: string;
  wornRoom: string;
  onWear: () => void;
}) {
  const roomly = item.kind === 'room';
  // 옷은 입고, 방과 포즈는 적용한다. 방을 입는다고 하면 말이 안 된다.
  const verb = roomly || item.kind === 'pose' ? ['적용', '적용 중'] : ['입기', '입는 중'];

  return (
    <section className="mb-3 rounded-card bg-card p-3.5 shadow-card">
      {/*
        **홈 칸보다 한 뼘 작다.** 홈에 서는 칸을 그대로 옮겨왔더니 옷장 격자가
        통째로 접힌 아래로 밀려서, 옷 하나 걸쳐볼 때마다 스크롤을 내려야 했다.
        홈은 그 칸이 화면의 주인공이지만 **여기서는 고르는 격자가 주인공이다.**

        **비율은 그대로 두고 폭만 줄인다.** 곰돌이가 서는 자리는 칸에 대한 %라
        ([stage.ts](../lib/stage.ts)) 칸이 통째로 줄면 걸쳐본 대로 홈에 선다 —
        줄여도 되는 것은 크기뿐이고 비율은 아니다.
      */}
      <div className="mx-auto w-[80%]">
        <Stage
          bear={roomly ? wornBear : item.key}
          room={roomly ? item.key : wornRoom}
          flag={here ? verb[1] : '걸쳐보는 중'}
        />
      </div>

      <div className="mt-3.5 flex min-h-[34px] items-center gap-2">
        <span className="min-w-0 flex-1 truncate font-round text-[17px]">{item.name}</span>
        {here ? (
          <span className="flex-none rounded-full bg-accent-tint px-4 py-[7px] text-[12.5px] font-medium text-accent">
            {verb[1]}
          </span>
        ) : (
          <button
            type="button"
            onClick={onWear}
            className="flex-none rounded-full bg-card px-4 py-[7px] text-[12.5px] font-medium text-accent shadow-[0_0_0_1.5px_var(--accent)] active:bg-accent-tint"
          >
            {verb[0]}
          </button>
        )}
      </div>
    </section>
  );
}

/** 칸마다 뭐라고 부르나. 세 군데에서 같은 이름을 써서 표로 뺀다. */
const SHELF: Record<Shelf, { head: string; what: string }> = {
  bear: { head: '가진 옷', what: '옷' },
  room: { head: '가진 테마', what: '테마' },
  pose: { head: '가진 소품', what: '소품' },
};

function Wardrobe({
  shop,
  tab,
  setTab,
  pick,
  trying,
}: {
  shop: Shop;
  tab: Shelf;
  setTab: (t: Shelf) => void;
  pick: (key: string) => void;
  trying: string;
}) {
  const { has } = useGomdori();
  const all = shop.items.filter((c) => c.kind === tab);
  const list = all.filter((c) => has(c.key));

  return (
    <>
      <div className="mb-3 flex gap-1 rounded-2xl bg-sunk p-1">
        {(
          [
            ['bear', '곰 스타일'],
            ['room', '방 테마'],
            ['pose', '소품'],
          ] as [Shelf, string][]
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

      <Head title={SHELF[tab].head} />
      <div className="mb-4 grid grid-cols-3 gap-[9px]">
        {list.map((c) => (
          <StoreCard
            key={c.key}
            item={c}
            mine
            onPick={() => pick(c.key)}
            trying={trying === c.key}
          />
        ))}
        {/*
          빈 옷걸이 한 칸 — 다 모으면 사라진다.
          **아직 아무것도 없는 칸에도 세운다.** 소품처럼 통째로 빌 수 있는 칸에서
          제목만 남으면 뭔가 빠진 것으로 읽힌다.
        */}
        {(list.length < all.length || list.length === 0) && (
          <span className="flex flex-col items-center justify-center gap-2 rounded-2xl border-[1.5px] border-dashed border-edge p-3 text-center text-[10px] leading-[1.5] text-ink3">
            <HomeIcon className="h-8 w-8 text-line" />
            더 많은 {SHELF[tab].what}을<br />
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
  // 세트가 없으면 아무것도 안 세운다. 위 `Group`과 같은 까닭이다.
  if (list.length === 0) return null;

  return (
    <>
      {!bare && <Head title="시즌 세트" />}
      <div className="mb-4 grid grid-cols-3 gap-[9px]">
        {list.map((s) => (
          <StoreCard
            key={s.key}
            item={s.room}
            bear={s.bear}
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

/** 상점 격자 한 무더기 — 누르면 [사는 시트](../sheets/BuySheet.tsx)가 올라온다 */
function Group({
  title,
  aside,
  list,
  pick,
}: {
  title: string;
  aside?: string;
  list: Costume[];
  pick: (key: string) => void;
}) {
  // 빈 무더기는 통째로 안 세운다 — 제목만 남은 자리는 뭔가 빠진 것으로 읽힌다
  if (list.length === 0) return null;

  return (
    <>
      <Head title={title} aside={aside} />
      <div className="mb-4 grid grid-cols-3 gap-[9px]">
        {list.map((c) => (
          <StoreCard key={c.key} item={c} onPick={() => pick(c.key)} />
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

