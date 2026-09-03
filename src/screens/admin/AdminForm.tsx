'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Align from './Align';
import Thumb from './Thumb';
import Coin from '../store/Coin';
import { shopPath } from '@/lib/costumes';
import { BEAR_ART, ROOM_ART, ROOM_BOX } from '@/lib/stage';
import { fitScene, type Fitted } from '@/lib/fit';
import {
  createSeason,
  createShopFamily,
  pullSeasons,
  saveShopItem,
  setShopItemActive,
  uploadShopImage,
} from '@/lib/repo/remote';
import { toast } from '@/lib/toast';
import type { Costume, CostumeSet, Shop } from '@/lib/types';



/**
 * 채우기 — [시안](../../../design/관리자.html)의 앱 판 둘째 화면.
 *
 * **무엇인지를 그림보다 먼저 묻는다.** 그림이 갈 폴더가 종류·대분류·중분류 셋으로
 * 정해져서, 그림부터 고르게 두면 폴더를 정하러 다시 올라와야 한다.
 *
 * **고르는 칸 셋은 가로 전체를 쓴다.** 세 갈래를 가로로 나누면
 * `소품 든 캐릭터`가 두 줄로 접히고, 접히면 셋의 높이가 서로 달라진다.
 *
 * **저장은 바닥에 붙는다.** 폼이 스크롤이라 끝까지 내려야 나오면 안 된다.
 *
 * ─── 시즌은 한 층 더 판다 ──────────────────────────────────────
 *
 *   시즌 ─ 계절  ─ 봄꽃 세트 · 물놀이 세트
 *        └ 기념일 ─ 할로윈 세트 · 크리스마스 세트
 *
 * **중분류도 세트도 여기서 늘린다.** 중분류는 이름과 폴더를 같이 받고
 * (폴더는 한 번 정하면 안 바뀐다 — 그림이 그 이름 밑에 쌓인다), 세트는 이름만 받는다
 * (열쇠는 `s000001`부터 번호표로 딴다).
 *
 * 시즌 물건은 **세트만 고르면 된다.** 중분류는 그 세트를 따라간다
 * (서버의 `sync_catalog_family` 트리거) — 물건마다 고르게 두면 할로윈 곰은
 * 기념일인데 할로윈 방은 계절인 일이 생긴다. 여기서 중분류를 먼저 묻는 건
 * **세트를 좁히기 위해서**지 물건에 붙이려는 게 아니다.
 */
export default function AdminForm({
  shop,
  itemKey,
  onClose,
  onDone,
}: {
  shop: Shop;
  /** 고칠 물건. `null`이면 새로 넣는 것 */
  itemKey: string | null;
  onClose: () => void;
  onDone: () => Promise<void>;
}) {
  const was = itemKey ? shop.items.find((c) => c.key === itemKey) : undefined;

  const [kind, setKind] = useState<Costume['kind']>(was?.kind ?? 'bear');
  const [family, setFamily] = useState(was?.family ?? 'costume');
  const [name, setName] = useState(was?.name ?? '');
  const [price, setPrice] = useState(String(was?.price ?? 300));
  const [busy, setBusy] = useState(false);

  const [group, setGroup] = useState(was?.season ? 'season' : 'deco');
  const [season, setSeason] = useState(was?.season ?? '');
  /** 세트는 덜 찬 것까지 봐야 한다 — `shop.sets`는 다 찬 것만 세운다 */
  const [sets, setSets] = useState<CostumeSet[]>([]);
  const [newFam, setNewFam] = useState(false);
  const [newSet, setNewSet] = useState(false);

  /**
   * 담긴 그림 — 곰은 [Align](Align.tsx)이, 방은 아래에서 담는다.
   * **맞추는 일을 여기 두지 않는다** — 자를 재고 눈금을 세우고 손잡이 셋을 다는 일이라
   * 이 폼에 섞으면 무엇이 무엇인지 못 가린다.
   */
  const [fitted, setFitted] = useState<Fitted | null>(null);
  /**
   * 곰을 담는 손 — [Align](Align.tsx)이 넘겨준다.
   *
   * 미리보기(`fitted`)는 손잡이가 멈춘 뒤에 굽는 것이라 **반 박자 늦다.**
   * 밀고 바로 저장을 누르면 한 발 늦은 것이 올라갈 수 있어서,
   * **저장할 때는 이 손으로 그 순간 값을 굽는다.**
   */
  const compose = useRef<null | (() => Promise<Fitted>)>(null);
  /** 방은 자를 맞출 것이 없다 — 정사각 한 장을 통째로 쓴다 */
  const [sceneFile, setSceneFile] = useState<File | null>(null);
  const scenePick = useRef<HTMLInputElement>(null);

  const fams = useMemo(
    () => shop.families.filter((f) => f.group === group),
    [shop, group],
  );

  /*
    **`룸` 중분류와 `배경 — 방` 종류를 서로 묶는다.**

    둘을 따로 물었더니 **중분류만 `룸`으로 고르고 종류는 `캐릭터`인 채로** 두는 일이
    생겼다. 그러면 방 그림을 곰돌이 맞추는 칸에 놓고 발바닥 눈금에 맞추라고 하는 꼴이
    되고, 자리도 `deco/room/gomdori/…`로 잡힌다 — 방인데 곰 폴더다.

    꾸미기에서는 이 둘이 **한 짝이다.** `룸`은 방을 담으려고 만든 중분류이고,
    방을 담을 다른 중분류는 없다. 그래서 한쪽을 고르면 다른 쪽이 따라간다.

    **시즌은 안 묶는다.** 세트 하나가 곰·방·소품 셋을 다 갖고 있어서,
    거기서는 같은 중분류 안에 종류 셋이 나란히 있어야 한다.
  */
  const ROOM_FAM = 'room';
  const pickFamily = (next: string) => {
    setFamily(next);
    if (group !== 'deco') return;
    if (next === ROOM_FAM) setKind('room');
    else if (kind === 'room') setKind('bear');
  };
  const pickKind = (next: Costume['kind']) => {
    setKind(next);
    if (group !== 'deco') return;
    if (next === 'room' && fams.some((f) => f.key === ROOM_FAM)) setFamily(ROOM_FAM);
    else if (next !== 'room' && family === ROOM_FAM) {
      setFamily(fams.find((f) => f.key !== ROOM_FAM)?.key ?? family);
    }
  };
  /*
    대분류를 바꾸면 **아래 둘이 없는 것을 가리킨 채로 남는다.**

    중분류는 그 대분류에 있는 것으로 옮긴다 — **종류에 맞는 것이 있으면 그것으로.**
    그냥 첫 칸으로 보내면 방을 고른 채 꾸미기로 넘어올 때 `일상`에 앉아
    방이 곰 폴더로 가버린다.

    소품은 시즌에만 있다(세트 보상이다). 꾸미기로 넘어오면 곰으로 되돌린다 —
    안 되돌리면 고를 수 없는 값이 골라진 채로 남는다.
  */
  useEffect(() => {
    if (group === 'deco' && kind === 'pose') setKind('bear');
    if (fams.some((f) => f.key === family)) return;
    const want = group === 'deco' && kind === 'room' ? ROOM_FAM : null;
    setFamily((want && fams.some((f) => f.key === want) ? want : fams[0]?.key) ?? '');
  }, [fams, family, group, kind]);

  const loadSets = useCallback(async () => {
    try {
      setSets(await pullSeasons());
    } catch {
      /* 못 읽으면 세트를 못 고를 뿐이다 — 꾸미기 물건은 그대로 넣는다 */
    }
  }, []);
  useEffect(() => {
    void loadSets();
  }, [loadSets]);

  /** 고른 중분류에 든 세트만 — 세트가 열 몇 개로 늘면 한 줄 목록에서 못 찾는다 */
  const mySets = useMemo(() => sets.filter((x) => x.family === family), [sets, family]);
  useEffect(() => {
    if (group === 'season' && !mySets.some((x) => x.key === season)) {
      setSeason(mySets[0]?.key ?? '');
    }
  }, [group, mySets, season]);

  /*
    **경로를 손으로 안 적는다.** 종류와 중분류를 고르면 거기서 나온다
    (서버의 `shop_folder()`와 같은 규칙). 안 보여주면 올린 뒤에
    어느 폴더에 들어갔는지 알 길이 없다.

    새로 넣는 것은 코드가 아직 없다 — 저장할 때 번호표가 붙어서, 그 자리를 `?`로 둔다.
  */
  const draft: Costume = {
    key: itemKey ?? '?',
    name,
    price: 0,
    kind,
    // 시즌 물건의 중분류는 **세트가 정한다** — 그림 자리도 그걸 따라간다
    family: group === 'season' ? (sets.find((x) => x.key === season)?.family ?? family) : family,
    season: group === 'season' ? season || undefined : undefined,
  };
  const at = shopPath(draft, shop.families);

  /* 방 그림은 자르지 않고 크기만 맞춘다 */
  useEffect(() => {
    if (!sceneFile) return;
    let dead = false;
    void fitScene(sceneFile).then((next) => {
      if (dead) URL.revokeObjectURL(next.url);
      else setFitted(next);
    });
    return () => {
      dead = true;
    };
  }, [sceneFile]);

  /** 올릴 그림의 규격 — **종류를 따라 바뀐다.** 안 그러면 방을 투명 배경으로 그려 온다 */
  const spec = kind === 'room' ? 'PNG · 정사각 · 배경까지 꽉 차게' : '';

  const save = async (live: boolean) => {
    if (!name.trim()) return toast('이름을 적어주세요');
    if (group === 'season' && !season) return toast('어느 세트인지 골라주세요');
    setBusy(true);
    try {
      /*
        **넣는 것이 먼저다.** 새로 넣는 것은 코드가 저장할 때 붙어서,
        그 코드를 알아야 그림을 어디에 둘지 정할 수 있다.
      */
      const key = await saveShopItem({
        key: itemKey ?? undefined,
        kind,
        name: name.trim(),
        price: kind === 'pose' ? 0 : Number(price) || 0,
        family: draft.family ?? family,
        season: draft.season,
      });

      /*
        **누르는 그 순간 값으로 굽는다.** 미리보기는 반 박자 늦어서, 손잡이를 밀고
        바로 누르면 한 발 늦은 것이 올라간다. 방은 담는 손이 없어 미리보기를 그대로 쓴다.

        맞춘 값은 이 blob에 박혀 있다 — 올린 뒤에 앱이 다시 맞출 것이 없다.
      */
      const shot = compose.current ? await compose.current() : fitted;
      if (shot) await uploadShopImage({ ...draft, key }, shop.families, shot.blob);
      /*
        **켜는 것이 맨 끝이다.** 그림을 올리기 전에 켜면 그 사이에 상점을 연 사람에게
        그림 없는 칸이 뜨고, 그건 `아직 안 그렸어요`가 아니라 파는 물건으로 읽힌다.
      */
      await setShopItemActive(key, live);

      toast(live ? '상점에 걸었어요' : '숨김으로 넣었어요');
      await onDone();
      onClose();
    } catch (e) {
      // 거의 다 관리자가 아니라서 막힌 것이다 — 서버가 한 말을 그대로 보여준다
      toast(e instanceof Error ? e.message : '저장하지 못했어요');
    } finally {
      setBusy(false);
    }
  };

  const sceneShown = fitted?.url ?? was?.img;

  return (
    <>
      {/* ── 무엇인지 먼저 ── */}
      <section className="mb-4 rounded-[18px] bg-card p-3.5">
        <Row label="종류">
          <Select value={kind} onChange={(v) => pickKind(v as Costume['kind'])}>
            <option value="bear">캐릭터 — 곰</option>
            <option value="room">배경 — 방</option>
            {/* 소품은 세트 보상이라 시즌에만 있다 — 꾸미기에서 고르면 갈 데가 없다 */}
            {group === 'season' && <option value="pose">소품 든 캐릭터</option>}
          </Select>
          <Hint>
            {kind === 'room' ? (
              <>
                방은 <b className="font-medium text-ink2">칸을 꽉 채우는 정사각 한 장</b>이에요 —
                크기를 맞출 것이 없어요.
              </>
            ) : (
              <>
                곰은 <b className="font-medium text-ink2">기본 곰에 맞춰</b> 세워요.
              </>
            )}
          </Hint>
        </Row>

        <Row label="대분류">
          {/* **대분류는 못 늘린다.** 둘이 상점 칩의 뼈대여서 셋째가 생기면 화면부터 다시 그려야 한다 */}
          <div className="flex gap-1 rounded-[14px] bg-sunk p-1">
            {shop.groups.map((g) => (
              <button
                key={g.key}
                type="button"
                aria-pressed={group === g.key}
                onClick={() => setGroup(g.key)}
                className={`flex-1 rounded-[11px] py-[9px] text-[12.5px] ${
                  group === g.key
                    ? 'bg-card font-medium text-accent shadow-[0_2px_8px_rgba(97,89,83,.07)]'
                    : 'text-ink2'
                }`}
              >
                {g.name}
              </button>
            ))}
          </div>
        </Row>

        <Row label="중분류" aside={<Add on={newFam} onToggle={() => setNewFam((v) => !v)} />}>
          <Select value={family} onChange={pickFamily}>
            {fams.length === 0 && <option value="">아직 없어요</option>}
            {fams.map((f) => (
              <option key={f.key} value={f.key}>
                {f.name}
              </option>
            ))}
          </Select>
          {newFam && <NewFamily group={group} onClose={() => setNewFam(false)} onDone={onDone} />}
        </Row>

        {/*
          시즌은 **한 층 더 판다** — 중분류 밑에 세트가 들어간다.
          물건은 세트만 고르면 되고, 중분류는 그 세트를 따라간다.
        */}
        {group === 'season' ? (
          <Row
            label="어느 세트"
            aside={<Add on={newSet} onToggle={() => setNewSet((v) => !v)} />}
            last
          >
            <Select value={season} onChange={setSeason}>
              {mySets.length === 0 && <option value="">아직 없어요</option>}
              {mySets.map((x) => (
                <option key={x.key} value={x.key}>
                  {x.name}
                </option>
              ))}
            </Select>
            {newSet && (
              <NewSeason
                family={family}
                famName={fams.find((f) => f.key === family)?.name ?? '중분류'}
                onClose={() => setNewSet(false)}
                onDone={async (key) => {
                  await loadSets();
                  setSeason(key);
                }}
              />
            )}
            <Hint>
              곰 하나 · 방 하나 · 소품 하나가{' '}
              <b className="font-medium text-ink2">다 차야</b> 세트가 열려요.
            </Hint>
          </Row>
        ) : null}
      </section>

      {/*
        묶어뒀지만 **이미 어긋나 있는 물건**이 있을 수 있다 — 묶기 전에 넣은 것이다.
        고치러 들어오면 그 값이 그대로 뜨니, 그때는 적어서 알려준다.
      */}
      {group === 'deco' && family === 'room' && kind !== 'room' && (
        <p className="mb-3 rounded-xl bg-accent px-3 py-2.5 text-[11px] font-medium leading-[1.5] text-white">
          중분류가 <b>룸</b>인데 종류가 <b>배경 — 방</b>이 아니에요. 그림이 곰 폴더로 가고
          크기도 곰에 맞춰져요.
        </p>
      )}

      {/* ── 그림 ── */}
      <p className="mb-2 text-[11px] font-medium text-ink3">그림</p>
      {kind === 'room' ? (
        <>
          <button
            type="button"
            onClick={() => scenePick.current?.click()}
            className={`grid aspect-square w-full place-items-center overflow-hidden rounded-[18px] text-center ${
              sceneShown
                ? 'bg-card shadow-[0_0_0_1.6px_var(--line)]'
                : 'border-[1.6px] border-dashed border-edge bg-sunk p-5'
            }`}
          >
            {sceneShown ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={sceneShown}
                alt=""
                aria-hidden="true"
                className="h-full w-full object-cover object-bottom"
              />
            ) : (
              <span>
                <span className="block text-[12.5px] text-ink2">앨범에서 고르기</span>
                <span className="mt-[5px] block font-mono text-[11px] text-ink3">{spec}</span>
              </span>
            )}
          </button>
          <input
            ref={scenePick}
            type="file"
            accept="image/png,image/webp,image/jpeg"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) setSceneFile(f);
              e.target.value = '';
            }}
          />
          <Hint>
            방은 칸을 <b className="font-medium text-ink2">꽉 채워요</b> — 정사각이 아니면 위가 잘려요.
          </Hint>
        </>
      ) : (
        /*
          곰과 소품은 **자에 맞춰 놓는다**([Align](Align.tsx)).
          `key`를 물건마다 갈라둔다 — 다른 물건으로 옮길 때 맞춘 값이 따라가면 안 된다.
        */
        <Align
          key={itemKey ?? 'new'}
          had={was?.img}
          onFitted={setFitted}
          onComposer={(make) => {
            compose.current = make;
          }}
        />
      )}

      {/* ── 그림이 가는 자리 ── */}
      <div className="mt-3 overflow-x-auto whitespace-nowrap rounded-xl bg-sunk px-3 py-2.5 font-mono text-[11.5px] text-ink2">
        {at ? (
          <>
            <i className="not-italic text-ink3">shop/</i>
            {at.slice(0, at.lastIndexOf('/') + 1)}
            <b className="font-medium text-accent">{at.slice(at.lastIndexOf('/') + 1)}</b>
          </>
        ) : (
          <i className="not-italic text-ink3">중분류를 고르면 자리가 정해져요</i>
        )}
      </div>
      {!itemKey && (
        <Hint>
          코드는 <b className="font-medium text-ink2">저장할 때 다음 번호가 붙어요.</b>{' '}
          파일 이름도 그 코드가 돼요.
        </Hint>
      )}

      {/* ── 상점에서 이렇게 보여요 ── */}
      <p className="mb-2 mt-4 text-[11px] font-medium text-ink3">상점에서 이렇게 보여요</p>
      <Preview shop={shop} item={{ ...draft, name, price: Number(price) || 0 }} src={fitted?.url} />

      {/* ── 적는 자리 ── */}
      <div className="mt-4">
        <Row label="이름">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="곰드래곤"
            maxLength={8}
            className="w-full rounded-xl bg-card px-3 py-[11px] text-[13.5px] text-ink shadow-[0_0_0_1.4px_var(--line)] placeholder:text-faint focus:shadow-[0_0_0_1.6px_var(--accent-soft)] focus:outline-none"
          />
          <Hint>
            상점 카드에 그대로 떠요. <b className="font-medium text-ink2">여덟 자를 넘기면</b> 잘려요.
          </Hint>
        </Row>

        <div className="grid grid-cols-2 gap-3.5">
          <Row label="코드" last>
            <div className="flex items-center rounded-xl bg-sunk px-3 py-[10px] font-mono text-[13.5px] text-ink2">
              <span className="min-w-0 flex-1 truncate">{itemKey ?? '저장할 때'}</span>
            </div>
          </Row>
          <Row label="가격" last>
            {kind === 'pose' ? (
              // 가격이 없는 물건 — 칸을 비워두지 않고 **왜 없는지**를 그 자리에 적는다
              <p className="rounded-xl bg-accent-tint px-3 py-[9px] text-[11.5px] leading-[1.4] text-accent">
                <b className="font-medium">세트 보상</b>이라 가격이 없어요
              </p>
            ) : (
              <span className="relative block">
                <span className="pointer-events-none absolute left-3 top-1/2 -mt-[9px]">
                  <Coin className="!h-[18px] !w-[18px] !text-[10px]" />
                </span>
                <input
                  value={price}
                  onChange={(e) => setPrice(e.target.value.replace(/\D/g, ''))}
                  inputMode="numeric"
                  className="w-full rounded-xl bg-card py-[11px] pl-9 pr-3 font-mono text-[13.5px] text-ink shadow-[0_0_0_1.4px_var(--line)] focus:shadow-[0_0_0_1.6px_var(--accent-soft)] focus:outline-none"
                />
              </span>
            )}
          </Row>
        </div>
      </div>

      {/* ── 바닥에 붙는 저장 ── */}
      {/*
        **`z-10`이 있어야 한다.** 곰돌이가 `z-[1]`로 서 있어서(`BEAR_ART`),
        z를 안 주면 뒤에 적힌 이 줄이 곰돌이 밑으로 깔린다 —
        DOM 차례가 아니라 z가 먼저다. 곰돌이 발이 단추를 덮고 있었다.
      */}
      <div className="sticky bottom-0 z-10 -mx-4 mt-5 border-t border-line bg-card px-4 pb-[calc(16px+env(safe-area-inset-bottom))] pt-2.5">
        {/*
          **지금 어느 쪽인지 적는다.**

          고치러 들어온 물건은 이미 파는 중이거나 숨김이다. 그걸 안 적어두면
          큰 단추가 늘 `저장하고 팔기`라서, **내려둔 것을 손보러 들어와 큰 단추를
          누르는 순간 다시 팔린다** — 눌러본 사람은 저장만 한 줄로 안다.

          적어두면 큰 단추가 `바꾸는 것`으로 읽힌다.
        */}
        {itemKey && (
          <p className="mb-2 flex items-baseline gap-1.5 text-[11px] text-ink3">
            지금
            <b
              className={`rounded-full px-2 py-[2px] text-[10.5px] font-medium ${
                was?.active ? 'bg-accent-tint text-accent' : 'bg-sunk text-ink3'
              }`}
            >
              {was?.active ? '파는 중' : '숨김'}
            </b>
            {was?.active ? '· 상점에 걸려 있어요' : '· 상점에 안 떠요. 산 사람 옷장에는 남아요'}
          </p>
        )}

        <div className="flex gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => void save(false)}
            className="flex-1 rounded-[14px] bg-sunk py-[13px] text-[13.5px] font-medium text-ink2 disabled:opacity-60"
          >
            {itemKey && !was?.active ? '숨긴 채로 저장' : '숨김'}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => void save(true)}
            className="flex-[2] rounded-[14px] bg-accent py-[13px] text-[13.5px] font-medium text-white disabled:opacity-60"
          >
            {busy ? '저장 중…' : was?.active ? '저장' : '저장하고 팔기'}
          </button>
        </div>
      </div>
    </>
  );
}

/**
 * 상점에서 어떻게 보이나 — **격자 칸과 미리보기 둘.**
 *
 * 안에서는 `걸쳐보는 칸`이라 부르는데(상점에서 사기 전에 걸쳐보는 자리다)
 * 화면에는 안 적는다 — 채우는 사람에게는 그냥 미리보기다.
 * 올리고 나서 상점에 들어가 확인하는 왕복이 생기면 서른 장을 서른 번 왕복하게 된다.
 */
function Preview({ shop, item, src }: { shop: Shop; item: Costume; src?: string }) {
  const roomly = item.kind === 'room';
  const worn = shop.items.find((c) => c.key === 'room-base');

  return (
    <>
      <div className="flex items-start gap-3">
        <div className="flex-none">
          <p className="mb-1.5 text-center text-[10px] text-ink3">격자 칸</p>
          <div className="flex w-[103px] flex-col items-center gap-1.5 rounded-2xl bg-card px-2 pb-2.5 pt-[9px] shadow-[0_0_0_1.4px_var(--line)]">
            <span className="w-full truncate text-center text-[11.5px] font-medium leading-[1.3] text-ink2">
              {item.name || '이름 없음'}
            </span>
            <Thumb item={item} src={src} className="aspect-square w-full !rounded-xl" />
            <span className="inline-flex items-center gap-1 rounded-full bg-card py-1 pl-[5px] pr-2.5 font-mono text-[10.5px] font-medium text-ink2 shadow-[0_0_0_1.2px_var(--line)]">
              <Coin className="!h-[14px] !w-[14px] !text-[8px]" />
              {item.price}
            </span>
          </div>
        </div>

        <div className="min-w-0 flex-1">
          <p className="mb-1.5 text-center text-[10px] text-ink3">미리보기</p>
          {/* 아래를 맞춰 자른다 — 가운데로 자르면 바닥이 먹혀 곰돌이가 벽에 붙어 선다 */}
          <div className={`${ROOM_BOX} rounded-[14px] bg-sunk`}>
            {roomly ? (
              src ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={src} alt="" aria-hidden="true" className={ROOM_ART} />
              ) : null
            ) : (
              worn?.img && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={worn.img} alt="" aria-hidden="true" className={ROOM_ART} />
              )
            )}
            {!roomly && src && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={src} alt="" aria-hidden="true" className={BEAR_ART} />
            )}
          </div>
        </div>
      </div>

      <p className="mt-2.5 text-[11px] leading-[1.5] text-ink3">
        {roomly ? (
          <>
            방은 칸을 <b className="font-medium text-ink2">꽉 채워요</b> — 정사각이 아니면 위가 잘려요.
          </>
        ) : (
          <>
            곰은 칸 안에 앉아요. <b className="font-medium text-ink2">배경이 투명해야</b> 방 위에 서요.
          </>
        )}
      </p>
    </>
  );
}

function Row({
  label,
  aside,
  last,
  children,
}: {
  label: string;
  /** 이름 오른쪽에 붙는 것 — `+ 새로 만들기` 같은 것 */
  aside?: React.ReactNode;
  last?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={last ? '' : 'mb-4'}>
      <label className="mb-[7px] flex items-baseline text-[11.5px] font-medium text-ink2">
        <span className="flex-1">{label}</span>
        {aside}
      </label>
      {children}
    </div>
  );
}

function Add({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button type="button" onClick={onToggle} className="text-[11px] font-normal text-accent">
      {on ? '접기' : '+ 새로 만들기'}
    </button>
  );
}

/**
 * 중분류 짓기 — **이름과 폴더를 같이 받는다.**
 *
 * 폴더를 안 받으면 `기념일`을 무엇으로 적어 폴더를 만들지 정할 길이 없고,
 * 이름을 그대로 쓰면 한글이 주소에 실린다.
 *
 * **폴더는 한 번 정하면 안 바뀐다** — 이미 쌓인 그림이 그 이름 밑에 있다.
 * 이름은 언제든 고쳐도 된다.
 *
 * Storage에 폴더를 미리 만들 것은 없다. **경로 앞부분이 폴더 노릇을 해서**
 * 첫 그림을 올리는 순간 그 자리가 생긴다.
 */
function NewFamily({
  group,
  onClose,
  onDone,
}: {
  group: string;
  onClose: () => void;
  onDone: () => Promise<void>;
}) {
  const [name, setName] = useState('');
  const [key, setKey] = useState('');
  const [busy, setBusy] = useState(false);

  const make = async () => {
    if (!name.trim() || !key.trim()) return toast('이름과 폴더를 다 적어주세요');
    setBusy(true);
    try {
      await createShopFamily({ key: key.trim(), group, name: name.trim() });
      toast('중분류를 만들었어요');
      await onDone();
      onClose();
    } catch (e) {
      toast(e instanceof Error ? e.message : '못 만들었어요');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-2.5 rounded-[14px] bg-sunk p-3">
      <div className="grid grid-cols-2 gap-2.5">
        <Small label="이름" value={name} onChange={setName} placeholder="기념일" />
        <Small
          label="폴더"
          value={key}
          onChange={(v) => setKey(v.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
          placeholder="holiday"
          mono
        />
      </div>
      <button
        type="button"
        disabled={busy}
        onClick={() => void make()}
        className="mt-2.5 rounded-[11px] bg-accent px-4 py-2.5 text-[12px] font-medium text-white disabled:opacity-60"
      >
        {busy ? '만드는 중…' : '만들기'}
      </button>
      <p className="mt-2 text-[10.5px] leading-[1.5] text-ink3">
        폴더는 <b className="font-medium text-ink2">한 번 정하면 안 바뀌어요</b> — 그림이 그 이름
        밑에 쌓여요. 영어 소문자로 시작해 소문자·숫자·붙임표만.
      </p>
    </div>
  );
}

/** 세트 짓기 — **열쇠는 안 받는다.** `s000001`부터 번호표로 딴다. */
function NewSeason({
  family,
  famName,
  onClose,
  onDone,
}: {
  family: string;
  famName: string;
  onClose: () => void;
  onDone: (key: string) => Promise<void>;
}) {
  const [name, setName] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  const make = async () => {
    if (!name.trim()) return toast('세트 이름을 적어주세요');
    if (!family) return toast('중분류를 먼저 골라주세요');
    setBusy(true);
    try {
      const key = await createSeason({ family, name: name.trim(), note: note.trim() });
      toast('세트를 지었어요');
      await onDone(key);
      onClose();
    } catch (e) {
      toast(e instanceof Error ? e.message : '못 지었어요');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-2.5 rounded-[14px] bg-sunk p-3">
      <Small label="이름" value={name} onChange={setName} placeholder="장마 세트" />
      <div className="mt-2.5">
        <Small
          label="한 줄 설명"
          value={note}
          onChange={setNote}
          placeholder="비 오는 날의 곰돌이"
        />
      </div>
      <button
        type="button"
        disabled={busy}
        onClick={() => void make()}
        className="mt-2.5 rounded-[11px] bg-accent px-4 py-2.5 text-[12px] font-medium text-white disabled:opacity-60"
      >
        {busy ? '짓는 중…' : '만들기'}
      </button>
      <p className="mt-2 text-[10.5px] leading-[1.5] text-ink3">
        고른 <b className="font-medium text-ink2">{famName}</b> 밑에 서요. 이름은 언제든 고칠 수
        있어요 — 열쇠가 이름과 상관없는 번호라서요.
      </p>
    </div>
  );
}

function Small({
  label,
  value,
  onChange,
  placeholder,
  mono,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  mono?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-[5px] block text-[10.5px] text-ink3">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`w-full rounded-xl bg-card px-[11px] py-[9px] text-[12.5px] text-ink shadow-[0_0_0_1.4px_var(--line)] placeholder:text-faint focus:shadow-[0_0_0_1.6px_var(--accent-soft)] focus:outline-none ${
          mono ? 'font-mono' : ''
        }`}
      />
    </label>
  );
}

function Hint({ children }: { children: React.ReactNode }) {
  return <p className="mt-[7px] text-[11px] leading-[1.5] text-ink3">{children}</p>;
}

function Select({
  value,
  onChange,
  children,
}: {
  value: string;
  onChange: (v: string) => void;
  children: React.ReactNode;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full appearance-none rounded-xl bg-card bg-[right_12px_center] bg-no-repeat py-[11px] pl-3 pr-9 text-[13.5px] text-ink shadow-[0_0_0_1.4px_var(--line)] focus:outline-none"
      style={{
        backgroundImage:
          "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%238c8078' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><path d='M6 9l6 6 6-6'/></svg>\")",
        backgroundSize: '16px',
      }}
    >
      {children}
    </select>
  );
}
