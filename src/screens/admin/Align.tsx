'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { BUNDLED, DEFAULT_BEAR, DEFAULT_ROOM } from '@/lib/costumes';
import {
  BODY,
  NO_FIT,
  at,
  fitBear,
  readArt,
  readFit,
  readout,
  readSpec,
  type Art,
  type Fit,
  type Fitted,
  type Spec,
} from '@/lib/fit';
import { toast } from '@/lib/toast';

/**
 * 곰돌이 크기 맞추기 — [design/bear_align.html](../../../design/bear_align.html)의 앱 판.
 *
 * **맞출 자는 기본 곰이다.** 숫자를 박아두지 않고 그 그림을 재서 쓴다
 * (`readSpec`) — 그러면 기본 곰을 다시 그려도 자가 저절로 따라온다.
 *
 * ─── 무엇을 보고 맞추나 ────────────────────────────────────────
 *
 *   방       크기가 맞나는 **방을 깔아야** 보인다. 곰돌이는 방 위에 서는 것이다
 *   기본 곰   연하게 겹친다. **견줄 자가 그것뿐이다**
 *   눈금     발바닥 선 · 머리 끝 선 · 가운데 선. 그 위는 모자와 귀 자리다
 *   수치     발바닥 y · 최상단 y · 중심 x. 눈으로 못 가리는 2px을 여기서 본다
 *
 * ─── 발바닥이 기준점이라 ───────────────────────────────────────
 *
 * **크기를 밀어도 발이 안 뜬다.** 그래서 크기 → 좌우 → 상하를 한 번씩만 만지면 끝난다.
 * 왼쪽 위를 기준으로 두면 줄이는 순간 곰돌이가 공중에 떠서 손잡이 둘을 번갈아 만지게 된다.
 */
export default function Align({
  /** 고르기 전이면 `null`. 올려둔 것을 고치는 중이면 그 주소 */
  had,
  onFitted,
}: {
  had?: string;
  onFitted: (f: Fitted | null) => void;
}) {
  const [spec, setSpec] = useState<Spec | null>(null);
  const [art, setArt] = useState<Art | null>(null);
  const [fit, setFit] = useState<Fit>(NO_FIT);
  const [white, setWhite] = useState(true);
  const [ghost, setGhost] = useState(true);
  const [lines, setLines] = useState(true);
  const [stuck, setStuck] = useState(false);
  const [file, setFile] = useState<File | null>(null);

  const pick = useRef<HTMLInputElement>(null);
  const box = useRef<HTMLDivElement>(null);
  const drag = useRef<{ on: boolean; x: number; y: number }>({ on: false, x: 0, y: 0 });

  const room = BUNDLED.find((c) => c.key === DEFAULT_ROOM)?.img;
  const baseArt = BUNDLED.find((c) => c.key === DEFAULT_BEAR)?.img;

  /* 자를 먼저 잰다. 이것 없이는 아무것도 놓을 수 없다. */
  useEffect(() => {
    if (!baseArt) return;
    readSpec(baseArt)
      .then(setSpec)
      .catch(() => toast('기본 곰을 못 읽었어요'));
  }, [baseArt]);

  /*
    **고치러 들어왔으면 올려둔 그림을 원본으로 끌어온다.**
    맞춘 값은 그림에 박혀 있으니 **그림에서 되읽어** 손잡이의 시작점으로 놓는다 —
    안 그러면 칸을 열기만 해도 크기가 튀어서 고치러 들어간 것이 고쳐지고 만다.

    되읽을 때는 **흰 배경을 안 지운다.** 우리가 담은 것은 이미 투명하고,
    지우려 들면 주둥이 둘레가 한 겹 깎인다.
  */
  useEffect(() => {
    if (file || !had || !spec) return;
    let dead = false;
    readArt(had, false)
      .then((next) => {
        if (dead) return;
        const back = readFit(next, spec);
        if (back) setFit(back);
        setArt(next);
        setWhite(false);
      })
      .catch(() => {
        // 통이 막거나(CORS) 파일이 없으면 못 끌어온다 — 앨범에서 다시 고르면 된다
        if (!dead) setStuck(true);
      });
    return () => {
      dead = true;
    };
  }, [file, had, spec]);

  /* 앨범에서 고른 것 · 흰 배경 스위치 — 다시 재고 손잡이를 처음으로 돌린다 */
  useEffect(() => {
    if (!file) return;
    let dead = false;
    readArt(file, white)
      .then((next) => {
        if (!dead) setArt(next);
      })
      .catch(() => {
        if (!dead) toast('그림을 못 읽었어요');
      });
    return () => {
      dead = true;
    };
  }, [file, white]);

  /* 맞춘 대로 담아 위로 올려준다 — 저장은 폼이 한다 */
  useEffect(() => {
    if (!art || !spec) return;
    let dead = false;
    void fitBear(art, spec, fit).then((next) => {
      if (dead) URL.revokeObjectURL(next.url);
      else onFitted(next);
    });
    return () => {
      dead = true;
    };
    // onFitted는 폼이 매번 새로 만들어 넘겨도 다시 담을 까닭이 없다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [art, spec, fit]);

  const move = useCallback((e: React.PointerEvent) => {
    if (!drag.current.on || !box.current) return;
    const r = box.current.getBoundingClientRect();
    const k = BODY / r.width;
    setFit((f) => ({
      ...f,
      dx: Math.round(f.dx + (e.clientX - drag.current.x) * k),
      dy: Math.round(f.dy + (e.clientY - drag.current.y) * k),
    }));
    drag.current.x = e.clientX;
    drag.current.y = e.clientY;
  }, []);

  if (!art) {
    return (
      <>
        <button
          type="button"
          onClick={() => pick.current?.click()}
          className="grid aspect-[5/4] w-full place-items-center rounded-[18px] border-[1.6px] border-dashed border-edge bg-sunk p-5 text-center"
        >
          <span>
            <span className="block text-[12.5px] text-ink2">앨범에서 고르기</span>
            <span className="mt-[5px] block font-mono text-[11px] text-ink3">
              PNG · 배경 투명 · 세로로 긴 한 장
            </span>
          </span>
        </button>
        <Picker el={pick} onFile={setFile} />
        {stuck && (
          <p className="mt-2.5 rounded-xl bg-sunk px-3 py-2.5 text-[11px] leading-[1.5] text-ink3">
            올려둔 그림을 불러오지 못했어요. 앨범에서 다시 고르면 맞출 수 있어요.
          </p>
        )}
      </>
    );
  }

  const pos = spec ? at(art, spec, fit) : null;
  const num = spec ? readout(art, spec, fit) : null;
  const pc = (v: number) => `${(v / BODY) * 100}%`;

  return (
    <>
      {/*
        맞추는 칸 — **상점 걸쳐보는 칸과 같은 비율**이다.
        여기서 맞춘 대로 거기 선다. 칸 안을 끌면 옮겨진다 — 폰에서는 손잡이보다 이게 빠르다.
      */}
      <div
        ref={box}
        onPointerDown={(e) => {
          drag.current = { on: true, x: e.clientX, y: e.clientY };
          box.current?.setPointerCapture(e.pointerId);
        }}
        onPointerMove={move}
        onPointerUp={() => {
          drag.current.on = false;
        }}
        onPointerCancel={() => {
          drag.current.on = false;
        }}
        className="relative aspect-square w-full touch-none overflow-hidden rounded-[18px] bg-sunk"
      >
        {room && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={room}
            alt=""
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 h-full w-full object-cover object-bottom"
          />
        )}

        {/*
          **기본 곰을 연하게 겹친다.** 담긴 그대로의 정사각 한 장이라 칸을 꽉 채워 얹으면
          자와 딱 맞는다 — 따로 셈할 것이 없다. 위에 얹는 까닭은 밑에 두면
          새 옷이 클 때 가려져서 견줄 수가 없어서다.
        */}
        {ghost && baseArt && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={baseArt}
            alt=""
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 z-[2] h-full w-full opacity-30"
          />
        )}

        {pos && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={art.canvas.toDataURL()}
            alt=""
            aria-hidden="true"
            className="pointer-events-none absolute z-[1]"
            style={{ left: pc(pos.x), top: pc(pos.y), width: pc(pos.w), height: pc(pos.h) }}
          />
        )}

        {lines && spec && (
          <span className="pointer-events-none absolute inset-0 z-[3] block">
            {/* 머리 끝 위는 모자와 귀 자리다 — 띠로 덮어 그 뜻을 보인다 */}
            <i
              className="absolute left-0 right-0 top-0 block bg-cycle/10"
              style={{ height: pc(spec.head) }}
            />
            <Line y={pc(spec.head)} tone="border-cycle/70" label="모자 · 귀 자리" up />
            <Line y={pc(spec.foot)} tone="border-accent/70" label="발바닥" />
            <i
              className="absolute bottom-0 left-1/2 top-0 block border-l border-dashed border-accent/40"
              style={{ left: pc(spec.cx) }}
            />
          </span>
        )}

        <button
          type="button"
          onClick={() => pick.current?.click()}
          className="absolute right-2.5 top-2.5 z-[4] rounded-full bg-white/92 px-2.5 py-[5px] text-[11px] text-ink2 shadow-card"
        >
          바꾸기
        </button>
      </div>
      <Picker el={pick} onFile={setFile} />

      {/* ── 맞추기 ── */}
      <div className="mt-3 rounded-[14px] bg-card p-3">
        <p className="mb-1.5 text-[11px] font-medium text-ink3">맞추기</p>
        <Knob
          label="크기"
          min={30}
          max={200}
          step={0.5}
          value={fit.scale * 100}
          onChange={(v) => setFit((f) => ({ ...f, scale: v / 100 }))}
          show={`${Math.round(fit.scale * 100)}%`}
        />
        <Knob
          label="좌우"
          min={-240}
          max={240}
          step={1}
          value={fit.dx}
          onChange={(v) => setFit((f) => ({ ...f, dx: Math.round(v) }))}
          show={`${fit.dx > 0 ? '+' : ''}${fit.dx}px`}
        />
        <Knob
          label="상하"
          min={-240}
          max={240}
          step={1}
          value={fit.dy}
          onChange={(v) => setFit((f) => ({ ...f, dy: Math.round(v) }))}
          show={`${fit.dy > 0 ? '+' : ''}${fit.dy}px`}
        />

        <button
          type="button"
          onClick={() => setFit((f) => ({ ...f, dx: 0, dy: 0 }))}
          className="mt-2 w-full rounded-[12px] bg-accent py-3 text-[12.5px] font-medium text-white"
        >
          발바닥 · 중앙 자동 정렬
        </button>
        <div className="mt-2 flex gap-2">
          <button
            type="button"
            onClick={() => setFit((f) => ({ ...f, scale: 1 }))}
            className="flex-1 rounded-[12px] bg-sunk py-2.5 text-[12px] text-ink2"
          >
            크기 초기화
          </button>
          <button
            type="button"
            onClick={() => setFit(NO_FIT)}
            className="flex-1 rounded-[12px] bg-sunk py-2.5 text-[12px] text-ink2"
          >
            전체 되돌리기
          </button>
        </div>

        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 border-t border-line pt-2.5">
          <Toggle on={white} set={setWhite} label="흰 배경 지우기" />
          <Toggle on={ghost} set={setGhost} label="기본 곰 겹쳐 보기" />
          <Toggle on={lines} set={setLines} label="눈금 보기" />
        </div>
      </div>

      {/*
        **수치를 적어준다.** 발바닥이 2px 떠 있는 것은 눈으로 안 보인다 —
        그런데 상점 격자에서는 스물아홉 칸이 나란히 서서 그 2px이 보인다.
      */}
      {num && spec && (
        <div className="mt-2 rounded-[14px] bg-sunk px-3 py-2.5">
          <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 font-mono text-[10.5px] text-ink3">
            <dt>발바닥 y</dt>
            <dd className="text-right text-ink2">
              {num.foot}
              <em className="ml-1 not-italic text-ink3">/ {spec.foot}</em>
            </dd>
            <dt>최상단 y</dt>
            <dd className="text-right text-ink2">{num.top}</dd>
            <dt>중심 x</dt>
            <dd className="text-right text-ink2">
              {num.cx}
              <em className="ml-1 not-italic text-ink3">/ {Math.round(spec.cx)}</em>
            </dd>
            <dt>폭 × 높이</dt>
            <dd className="text-right text-ink2">
              {num.w} × {num.h}
            </dd>
          </dl>
          <span
            className={`mt-2 inline-block rounded-full px-2.5 py-1 text-[10.5px] font-medium ${
              num.ok ? 'bg-accent-tint text-accent' : 'bg-card text-ink3'
            }`}
          >
            {num.ok ? '✓ 자에 맞음' : '· 자동 정렬 필요'}
          </span>
        </div>
      )}
    </>
  );
}

function Picker({
  el,
  onFile,
}: {
  el: React.RefObject<HTMLInputElement | null>;
  onFile: (f: File) => void;
}) {
  return (
    <input
      ref={el}
      type="file"
      accept="image/png,image/webp,image/jpeg"
      hidden
      onChange={(e) => {
        const f = e.target.files?.[0];
        if (f) onFile(f);
        e.target.value = '';
      }}
    />
  );
}

/** 눈금 한 줄 — 이름을 선 위나 아래에 붙인다 */
function Line({
  y,
  tone,
  label,
  up,
}: {
  y: string;
  tone: string;
  label: string;
  up?: boolean;
}) {
  return (
    <i className={`absolute left-0 right-0 block border-t border-dashed ${tone}`} style={{ top: y }}>
      <em
        className={`absolute left-1.5 font-mono text-[9px] not-italic ${
          up ? 'bottom-1 text-cycle' : 'top-1 text-accent'
        }`}
      >
        {label}
      </em>
    </i>
  );
}

function Knob({
  label,
  min,
  max,
  step,
  value,
  onChange,
  show,
}: {
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (v: number) => void;
  show: string;
}) {
  return (
    <label className="block py-1">
      <span className="mb-1 flex items-baseline text-[11px] text-ink3">
        <b className="flex-1 font-medium text-ink2">{label}</b>
        <span className="font-mono">{show}</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-[var(--accent)]"
      />
    </label>
  );
}

function Toggle({
  on,
  set,
  label,
}: {
  on: boolean;
  set: (v: boolean) => void;
  label: string;
}) {
  return (
    <label className="flex items-center gap-1.5 text-[11px] text-ink3">
      <input
        type="checkbox"
        checked={on}
        onChange={(e) => set(e.target.checked)}
        className="accent-[var(--accent)]"
      />
      {label}
    </label>
  );
}
