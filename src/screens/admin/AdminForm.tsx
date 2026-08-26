'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Thumb from './Thumb';
import Coin from '../store/Coin';
import { shopPath } from '@/lib/costumes';
import { DEFAULT_SCALE, fitBear, fitScene, type Fitted } from '@/lib/fit';
import { saveShopItem, setShopItemActive, uploadShopImage } from '@/lib/repo/remote';
import { toast } from '@/lib/toast';
import type { Costume, Shop } from '@/lib/types';

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
 * ─── 여기서 못 하는 것 ─────────────────────────────────────────
 *
 * 시안에는 **중분류 늘리기**와 **세트 짓기**가 같이 있다. 아직 안 넣었다 —
 * 둘 다 표에 줄을 하나 더 만드는 일이라 값표를 채우는 것과 결이 다르고,
 * 지금은 새 중분류도 새 세트도 없다. 시즌 물건을 넣으려면 세트가 먼저 있어야 해서
 * **대분류는 `꾸미기`로 잠가뒀다.**
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

  const [file, setFile] = useState<File | null>(null);
  const [fitted, setFitted] = useState<Fitted | null>(null);
  const [scale, setScale] = useState(DEFAULT_SCALE);
  const pick = useRef<HTMLInputElement>(null);

  /* 시즌 물건은 세트가 먼저 있어야 한다 — 여기서 세트를 못 지으니 꾸미기만 고른다 */
  const fams = useMemo(
    () => shop.families.filter((f) => f.group === 'deco'),
    [shop],
  );
  useEffect(() => {
    if (!fams.some((f) => f.key === family)) setFamily(fams[0]?.key ?? 'costume');
  }, [fams, family]);

  /*
    **경로를 손으로 안 적는다.** 종류와 중분류를 고르면 거기서 나온다
    (서버의 `shop_folder()`와 같은 규칙). 안 보여주면 올린 뒤에
    어느 폴더에 들어갔는지 알 길이 없다.

    새로 넣는 것은 코드가 아직 없다 — 저장할 때 번호표가 붙어서, 그 자리를 `?`로 둔다.
  */
  const draft: Costume = { key: itemKey ?? '?', name, price: 0, kind, family };
  const at = shopPath(draft, shop.families);

  /* 손잡이를 밀면 다시 담는다 — 올리기 전에 보고 고르는 값이다 */
  useEffect(() => {
    if (!file) return;
    let dead = false;
    const job = kind === 'room' ? fitScene(file) : fitBear(file, scale);
    void job.then((next) => {
      if (dead) URL.revokeObjectURL(next.url);
      else setFitted(next);
    });
    return () => {
      dead = true;
    };
  }, [file, scale, kind]);

  const spec =
    kind === 'room'
      ? 'PNG · 정사각 · 배경까지 꽉 차게'
      : kind === 'pose'
        ? 'PNG · 배경 투명 · 소품까지 든 한 장'
        : 'PNG · 배경 투명 · 세로로 긴 한 장';

  const save = async (live: boolean) => {
    if (!name.trim()) return toast('이름을 적어주세요');
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
        family,
      });

      if (fitted) {
        await uploadShopImage({ ...draft, key }, shop.families, fitted.blob);
        URL.revokeObjectURL(fitted.url);
      }
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

  const shown = fitted?.url ?? was?.img;

  return (
    <>
      {/* ── 무엇인지 먼저 ── */}
      <section className="mb-4 rounded-[18px] bg-card p-3.5">
        <Row label="종류">
          <Select value={kind} onChange={(v) => setKind(v as Costume['kind'])}>
            <option value="bear">캐릭터 — 곰</option>
            <option value="room">배경 — 방</option>
            <option value="pose">소품 든 캐릭터</option>
          </Select>
        </Row>

        <Row label="대분류">
          {/* 시즌은 세트가 먼저 있어야 한다 — 여기서 세트를 못 지으니 잠가둔다 */}
          <div className="flex gap-1 rounded-[14px] bg-accent-tint p-1">
            <span className="flex-1 rounded-[11px] bg-card py-[9px] text-center text-[12.5px] font-medium text-accent shadow-[0_2px_8px_rgba(97,89,83,.07)]">
              꾸미기
            </span>
            <span className="flex-1 py-[9px] text-center text-[12.5px] text-ink3 opacity-40">
              시즌
            </span>
          </div>
          <Hint>
            시즌은 <b className="font-medium text-ink2">세트가 먼저 있어야</b> 해서 여기서 못 골라요.
          </Hint>
        </Row>

        <Row label="중분류" last>
          <Select value={family} onChange={setFamily}>
            {fams.map((f) => (
              <option key={f.key} value={f.key}>
                {f.name}
              </option>
            ))}
          </Select>
        </Row>
      </section>

      {/* ── 그림 ── */}
      <p className="mb-2 text-[11px] font-medium text-ink3">그림</p>
      <button
        type="button"
        onClick={() => pick.current?.click()}
        className={`grid aspect-[5/4] w-full place-items-center overflow-hidden rounded-[18px] text-center ${
          shown
            ? 'bg-card shadow-[0_0_0_1.6px_var(--line)]'
            : 'border-[1.6px] border-dashed border-edge bg-sunk p-5'
        }`}
      >
        {shown ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={shown}
            alt=""
            aria-hidden="true"
            className={
              kind === 'room'
                ? 'h-full w-full object-cover object-bottom'
                : 'max-h-[82%] max-w-[76%]'
            }
          />
        ) : (
          <span>
            <span className="block text-[12.5px] text-ink2">앨범에서 고르기</span>
            <span className="mt-[5px] block font-mono text-[11px] text-ink3">{spec}</span>
          </span>
        )}
      </button>
      <input
        ref={pick}
        type="file"
        accept="image/png,image/webp,image/jpeg"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) setFile(f);
          e.target.value = '';
        }}
      />

      {/*
        **크기 손잡이.** 그린 그림은 여백이 그때그때 달라서, 그대로 올리면
        갈아입을 때 곰돌이가 커졌다 작아졌다 한다. 방은 통째로 한 장이라 안 뜬다.
      */}
      {fitted && kind !== 'room' && (
        <label className="mt-2.5 flex items-center gap-2 text-[11px] text-ink3">
          크기
          <input
            type="range"
            min={0.5}
            max={1}
            step={0.01}
            value={scale}
            onChange={(e) => setScale(Number(e.target.value))}
            className="min-w-0 flex-1 accent-[var(--accent)]"
          />
          <span className="w-8 flex-none text-right font-mono">{scale.toFixed(2)}</span>
        </label>
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
              // 값이 없는 물건 — 칸을 비워두지 않고 **왜 없는지**를 그 자리에 적는다
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
      <div className="sticky bottom-0 -mx-4 mt-5 flex gap-2 border-t border-line bg-card px-4 pb-[calc(16px+env(safe-area-inset-bottom))] pt-3">
        <button
          type="button"
          disabled={busy}
          onClick={() => void save(false)}
          className="flex-1 rounded-[14px] bg-sunk py-[13px] text-[13.5px] font-medium text-ink2 disabled:opacity-60"
        >
          숨김
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => void save(true)}
          className="flex-[2] rounded-[14px] bg-accent py-[13px] text-[13.5px] font-medium text-white disabled:opacity-60"
        >
          {busy ? '저장 중…' : '저장하고 팔기'}
        </button>
      </div>
    </>
  );
}

/**
 * 상점에서 어떻게 보이나 — **격자 칸과 걸쳐보는 칸 둘.**
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
          <p className="mb-1.5 text-center text-[10px] text-ink3">걸쳐보는 칸 · 홈 칸</p>
          {/* 아래를 맞춰 자른다 — 가운데로 자르면 바닥이 먹혀 곰돌이가 벽에 붙어 선다 */}
          <div className="relative grid aspect-square w-full items-end justify-items-center overflow-hidden rounded-[14px] bg-sunk">
            {roomly ? (
              src ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={src} alt="" aria-hidden="true" className="absolute inset-0 h-full w-full object-cover object-bottom" />
              ) : null
            ) : (
              worn?.img && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={worn.img} alt="" aria-hidden="true" className="absolute inset-0 h-full w-full object-cover object-bottom" />
              )
            )}
            {!roomly && src && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={src}
                alt=""
                aria-hidden="true"
                className="relative z-[1] mb-[6%] block h-auto max-h-[74%] w-auto max-w-[58%]"
              />
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
  last,
  children,
}: {
  label: string;
  last?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={last ? '' : 'mb-4'}>
      <label className="mb-[7px] block text-[11.5px] font-medium text-ink2">{label}</label>
      {children}
    </div>
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
