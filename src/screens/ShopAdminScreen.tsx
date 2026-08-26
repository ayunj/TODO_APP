'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import PageBar from '@/components/PageBar';
import Coin from './store/Coin';
import { familiesOf, shopPath } from '@/lib/costumes';
import { DEFAULT_SCALE, fitBear, fitScene, type Fitted } from '@/lib/fit';
import { useGomdori } from '@/lib/gomdori';
import { pullShop, saveShopItem, setShopItemActive, uploadShopImage } from '@/lib/repo/remote';
import { shopImageUrl } from '@/lib/supabase';
import { toast } from '@/lib/toast';
import type { Costume, Shop } from '@/lib/types';

/**
 * 상점 채우기 — [시안](../../design/관리자.html).
 *
 * **여는 사람은 `shop_admins`에 든 사람뿐이다.** 명단에 넣는 길은 앱에 없다 —
 * SQL Editor에서 손으로 넣는다(관리자 하나가 새면 상점 전체가 샌다).
 *
 *   insert into shop_admins (user_id)
 *   select id from auth.users where email = '내메일@example.com'
 *   on conflict do nothing;
 *
 * **이 화면이 지키는 것은 없다.** 통과 값표를 막는 것은 RLS(`is_shop_admin()`)라,
 * 화면을 억지로 열어도 올리는 데서 막힌다. 여기서 감추는 것은 **안 쓸 사람에게
 * 안 보이게** 하는 것뿐이다.
 *
 * ─── 채우는 순서 ───────────────────────────────────────────────
 *
 *   1. **넣는다** — 분류·이름·값. 열쇠는 서버가 번호표로 딴다(`0000001`)
 *   2. **그림을 올린다** — 자리는 분류와 열쇠로 저절로 정해진다
 *   3. **켠다** — 그래야 상점에 뜬다
 *
 * 새로 넣는 것이 **숨김으로 들어오는 까닭**이 이 순서에 있다. 넣자마자 켜지면
 * 그림 없는 칸이 상점에 뜨고, 그건 `아직 안 그렸어요`가 아니라 파는 물건으로 읽힌다.
 */
export default function ShopAdminScreen() {
  const { admin } = useGomdori();
  const [shop, setShop] = useState<Shop | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      /*
        관리자에게는 **숨긴 것까지 내려온다**(값표 정책이 `active or is_shop_admin()`).
        상점 화면이 쓰는 것과 같은 함수라 따로 부를 것이 없다.
      */
      setShop(await pullShop());
    } catch {
      toast('상점을 못 읽었어요');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (!admin) {
    return (
      <>
        <PageBar title="상점 채우기" />
        <div className="rounded-card bg-card px-[18px] py-10 text-center text-[13px] leading-[1.7] text-ink3 shadow-card">
          <b className="mb-1.5 block font-round text-[15px] font-medium text-ink2">
            채울 수 있는 계정이 아니에요
          </b>
          명단은 앱에서 못 늘려요. Supabase SQL Editor에서 넣습니다.
        </div>
      </>
    );
  }

  if (!shop) {
    return (
      <>
        <PageBar title="상점 채우기" />
        <p className="py-10 text-center text-[13px] text-ink3">불러오는 중…</p>
      </>
    );
  }

  /* 대분류를 가로질러 중분류마다 한 무더기. 파는 것이 서는 자리와 같은 순서다. */
  const fams = [...familiesOf(shop, 'deco'), ...familiesOf(shop, 'season')];
  const roomFam = shop.families.find((f) => f.key === 'room');
  const groups = roomFam && !fams.includes(roomFam) ? [...fams, roomFam] : fams;

  return (
    <>
      <PageBar title="상점 채우기" />

      <p className="mb-4 rounded-[14px] bg-sunk px-3.5 py-3 text-[11.5px] leading-[1.6] text-ink2">
        <b>넣고 → 그림 올리고 → 켠다.</b> 새로 넣은 것은 숨김으로 들어와요 —
        그림 없는 칸이 상점에 뜨면 파는 물건으로 읽혀서예요.
      </p>

      {groups.map((f) => (
        <section key={f.key} className="mb-5">
          <div className="mb-2.5 flex items-baseline gap-1.5">
            <b className="text-[13px] font-medium text-ink2">{f.name}</b>
            <em className="font-mono text-[10.5px] not-italic text-ink3">{f.key}</em>
          </div>
          <div className="flex flex-col gap-2">
            {shop.items
              .filter((c) => c.family === f.key)
              .map((c) => (
                <ItemRow
                  key={c.key}
                  item={c}
                  shop={shop}
                  busy={busy === c.key}
                  onBusy={setBusy}
                  onDone={load}
                />
              ))}
            {shop.items.every((c) => c.family !== f.key) && (
              <p className="rounded-2xl border-[1.5px] border-dashed border-edge px-3.5 py-5 text-center text-[11.5px] text-ink3">
                아직 없어요
              </p>
            )}
          </div>
        </section>
      ))}

      <NewItem shop={shop} onDone={load} />
    </>
  );
}

/** 파는 것 한 줄 — 그림 올리기와 켜고 끄기 */
function ItemRow({
  item,
  shop,
  busy,
  onBusy,
  onDone,
}: {
  item: Costume;
  shop: Shop;
  busy: boolean;
  onBusy: (key: string | null) => void;
  onDone: () => Promise<void>;
}) {
  const pick = useRef<HTMLInputElement>(null);
  const [fitted, setFitted] = useState<Fitted | null>(null);
  const [scale, setScale] = useState(DEFAULT_SCALE);
  const [file, setFile] = useState<File | null>(null);

  const roomly = item.kind === 'room';
  const at = shopPath(item, shop.families);
  /*
    **막 올린 그림이 바로 보이게** 시간을 붙인다. 같은 주소에 덮어썼으니
    브라우저는 물려둔 것을 그대로 다시 쓴다 — 채우는 사람은 올린 것을 봐야 안다.
  */
  const [stamp, setStamp] = useState(0);
  const shown = fitted?.url ?? (at ? `${shopImageUrl(at)}${stamp ? `?t=${stamp}` : ''}` : item.img);

  /* 손잡이를 밀면 다시 담는다 — 올리기 전에 보고 고르는 값이다 */
  useEffect(() => {
    if (!file || roomly) return;
    let dead = false;
    void fitBear(file, scale).then((next) => {
      if (dead) URL.revokeObjectURL(next.url);
      else setFitted(next);
    });
    return () => {
      dead = true;
    };
  }, [file, scale, roomly]);

  const take = async (f: File) => {
    setFile(f);
    if (roomly) setFitted(await fitScene(f));
  };

  const put = async () => {
    if (!fitted) return;
    onBusy(item.key);
    try {
      await uploadShopImage(item, shop.families, fitted.blob);
      URL.revokeObjectURL(fitted.url);
      setFitted(null);
      setFile(null);
      setStamp(Date.now());
      toast('올렸어요');
      await onDone();
    } catch (e) {
      // 거의 다 관리자가 아니라서 막힌 것이다 — 서버가 한 말을 그대로 보여준다
      toast(e instanceof Error ? e.message : '올리지 못했어요');
    } finally {
      onBusy(null);
    }
  };

  const flip = async () => {
    onBusy(item.key);
    try {
      await setShopItemActive(item.key, !item.active);
      await onDone();
    } catch (e) {
      toast(e instanceof Error ? e.message : '못 바꿨어요');
    } finally {
      onBusy(null);
    }
  };

  return (
    <div className="rounded-2xl bg-card p-3 shadow-card">
      <div className="flex items-start gap-3">
        <span className="grid h-[74px] w-[74px] flex-none place-items-center overflow-hidden rounded-xl bg-sunk">
          {shown ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={shown}
              alt=""
              aria-hidden="true"
              className={
                roomly ? 'h-full w-full object-cover object-bottom' : 'max-h-full max-w-full'
              }
            />
          ) : (
            <em className="text-[10px] not-italic text-ink3">없음</em>
          )}
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <b className="min-w-0 flex-1 truncate font-round text-[15px] font-medium">{item.name}</b>
            <button
              type="button"
              disabled={busy}
              onClick={() => void flip()}
              className={`flex-none rounded-full px-3 py-1 text-[11px] font-medium disabled:opacity-50 ${
                item.active
                  ? 'bg-accent text-white'
                  : 'bg-card text-ink3 shadow-[0_0_0_1.3px_var(--line)]'
              }`}
            >
              {item.active ? '파는 중' : '숨김'}
            </button>
          </div>
          <p className="mt-0.5 flex items-center gap-1.5 font-mono text-[11px] text-ink3">
            <Coin className="!h-[13px] !w-[13px] !text-[8px]" />
            {item.price}
            <span className="text-line">·</span>
            {item.key}
          </p>
          {at && <p className="mt-0.5 truncate font-mono text-[10px] text-ink3">{at}</p>}
        </div>
      </div>

      <input
        ref={pick}
        type="file"
        accept="image/png,image/webp,image/jpeg"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void take(f);
          e.target.value = '';
        }}
      />

      {/* 담고 나서야 올린다 — 걸쳐보고 사는 것과 같은 얼개다 */}
      {fitted ? (
        <>
          {!roomly && (
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
          <div className="mt-2 flex gap-1.5">
            <button
              type="button"
              disabled={busy}
              onClick={() => void put()}
              className="flex-1 rounded-[12px] bg-accent px-3 py-2.5 text-[12.5px] font-medium text-white disabled:opacity-60"
            >
              {busy ? '올리는 중…' : `이대로 올리기 · ${(fitted.bytes / 1024).toFixed(0)}KB`}
            </button>
            <button
              type="button"
              onClick={() => {
                URL.revokeObjectURL(fitted.url);
                setFitted(null);
                setFile(null);
              }}
              className="flex-none rounded-[12px] bg-sunk px-3.5 py-2.5 text-[12.5px] text-ink2"
            >
              그만
            </button>
          </div>
        </>
      ) : (
        <button
          type="button"
          onClick={() => pick.current?.click()}
          className="mt-2.5 w-full rounded-[12px] bg-sunk px-3 py-2.5 text-[12.5px] font-medium text-ink2"
        >
          그림 고르기
        </button>
      )}
    </div>
  );
}

/** 새로 넣기 — 열쇠는 안 받는다. 서버가 번호표로 딴다. */
function NewItem({ shop, onDone }: { shop: Shop; onDone: () => Promise<void> }) {
  const fams = useMemo(
    () => shop.families.filter((f) => f.key !== 'seasonal' && f.key !== 'holiday'),
    [shop],
  );
  const [family, setFamily] = useState(fams[0]?.key ?? 'costume');
  const [kind, setKind] = useState<Costume['kind']>('bear');
  const [name, setName] = useState('');
  const [price, setPrice] = useState('300');
  const [busy, setBusy] = useState(false);

  const add = async () => {
    if (!name.trim()) return toast('이름을 적어주세요');
    setBusy(true);
    try {
      await saveShopItem({ kind, name: name.trim(), price: Number(price) || 0, family });
      setName('');
      toast('넣었어요. 그림을 올리고 켜면 상점에 떠요');
      await onDone();
    } catch (e) {
      toast(e instanceof Error ? e.message : '못 넣었어요');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="mb-8 rounded-card bg-card p-3.5 shadow-card">
      <b className="mb-3 block text-[13px] font-medium text-ink2">새로 넣기</b>

      <div className="flex flex-col gap-2">
        <label className="flex items-center gap-2 text-[12px] text-ink3">
          <span className="w-14 flex-none">분류</span>
          <select
            value={family}
            onChange={(e) => setFamily(e.target.value)}
            className="min-w-0 flex-1 rounded-[10px] bg-sunk px-2.5 py-2 text-[13px] text-ink"
          >
            {fams.map((f) => (
              <option key={f.key} value={f.key}>
                {f.name}
              </option>
            ))}
          </select>
        </label>

        <label className="flex items-center gap-2 text-[12px] text-ink3">
          <span className="w-14 flex-none">종류</span>
          <select
            value={kind}
            onChange={(e) => setKind(e.target.value as Costume['kind'])}
            className="min-w-0 flex-1 rounded-[10px] bg-sunk px-2.5 py-2 text-[13px] text-ink"
          >
            <option value="bear">곰 스타일</option>
            <option value="room">방 테마</option>
          </select>
        </label>

        <label className="flex items-center gap-2 text-[12px] text-ink3">
          <span className="w-14 flex-none">이름</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="곰드래곤"
            maxLength={8}
            className="min-w-0 flex-1 rounded-[10px] bg-sunk px-2.5 py-2 text-[13px] text-ink"
          />
        </label>

        <label className="flex items-center gap-2 text-[12px] text-ink3">
          <span className="w-14 flex-none">값</span>
          <input
            value={price}
            onChange={(e) => setPrice(e.target.value.replace(/\D/g, ''))}
            inputMode="numeric"
            className="min-w-0 flex-1 rounded-[10px] bg-sunk px-2.5 py-2 font-mono text-[13px] text-ink"
          />
        </label>
      </div>

      <button
        type="button"
        disabled={busy}
        onClick={() => void add()}
        className="mt-3 w-full rounded-[14px] bg-accent p-[13px] text-[13.5px] font-medium text-white disabled:opacity-60"
      >
        {busy ? '넣는 중…' : '넣기'}
      </button>

      <p className="mt-2.5 text-[11px] leading-[1.6] text-ink3">
        이름은 여덟 자까지. 넘기면 상점 카드에서 잘려요.
        <br />
        시즌 세트는 아직 여기서 못 짓습니다 — 세트를 먼저 만들어야 해서예요.
      </p>
    </section>
  );
}
