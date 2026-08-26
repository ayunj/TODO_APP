'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import PageBar from '@/components/PageBar';
import Switch from './admin/Switch';
import { ask } from '@/lib/ask';
import { useGomdori } from '@/lib/gomdori';
import { fitScene, type Fitted } from '@/lib/fit';
import {
  pullNotices,
  removeNotice,
  saveNotice,
  setNoticeActive,
  setNoticeImage,
  uploadNoticeImage,
} from '@/lib/repo/remote';
import { toast } from '@/lib/toast';
import type { Notice } from '@/lib/types';

/**
 * 공지 — 앱을 열면 한 번 뜨는 팝업을 쓰는 자리.
 *
 * **[상점 채우기](ShopAdminScreen.tsx)와 같은 명단으로 열린다**(`shop_admins`).
 * 명단을 따로 두지 않았다 — 표를 하나 더 만들면 관리자를 두 군데에 넣어야 하고,
 * 한 군데를 잊는 날이 온다.
 *
 * ─── 켜진 것은 하나다 ──────────────────────────────────────────
 *
 * 여럿 켜두면 **제일 새것만 뜬다.** 그런데 목록에서는 둘 다 켜져 보여서
 * 어느 것이 뜨는지 알 수가 없다 — 그래서 켤 때 나머지가 내려간다.
 *
 * 쌓아 띄우지 않는 까닭은, 팝업이 둘 뜨면 **첫째를 닫는 손이 둘째도 닫는다.**
 * 읽히지도 않고 닫혔다는 셈만 남는다.
 */
export default function NoticeScreen() {
  const { admin } = useGomdori();
  const [list, setList] = useState<Notice[] | null>(null);
  const [editing, setEditing] = useState<Notice | 'new' | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setList(await pullNotices());
    } catch {
      toast('공지를 못 읽었어요');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (!admin) {
    return (
      <>
        <PageBar title="공지" />
        <div className="rounded-card bg-card px-[18px] py-10 text-center text-[13px] leading-[1.7] text-ink3 shadow-card">
          <b className="mb-1.5 block font-round text-[15px] font-medium text-ink2">
            쓸 수 있는 계정이 아니에요
          </b>
          명단은 앱에서 못 늘려요. Supabase SQL Editor에서 넣습니다.
        </div>
      </>
    );
  }

  if (editing) {
    return (
      <Editor
        notice={editing === 'new' ? null : editing}
        onClose={() => setEditing(null)}
        onDone={load}
      />
    );
  }

  const flip = async (n: Notice) => {
    setBusy(n.id);
    try {
      await setNoticeActive(n.id, !n.active);
      await load();
    } catch (e) {
      toast(e instanceof Error ? e.message : '못 바꿨어요');
    } finally {
      setBusy(null);
    }
  };

  const drop = async (n: Notice) => {
    const yes = await ask({
      title: `${n.title || '이름 없는 공지'}를 지울까요?`,
      loses: '되돌릴 수 없어요.',
      go: '지우기',
    });
    if (!yes) return;
    setBusy(n.id);
    try {
      await removeNotice(n.id);
      await load();
    } catch (e) {
      toast(e instanceof Error ? e.message : '못 지웠어요');
    } finally {
      setBusy(null);
    }
  };

  return (
    <>
      <PageBar title="공지" />

      <p className="mb-4 rounded-[14px] bg-sunk px-3.5 py-3 text-[11.5px] leading-[1.6] text-ink2">
        <b>쓰고 → 켠다.</b> 새로 쓴 것은 안 띄우고 들어와요.{' '}
        <b>켜진 것은 하나뿐</b>이라, 하나를 켜면 나머지가 내려가요.
      </p>

      {list === null ? (
        <p className="py-10 text-center text-[13px] text-ink3">불러오는 중…</p>
      ) : (
        <div className="mb-4 flex flex-col gap-2">
          {list.map((n) => (
            <div
              key={n.id}
              className="rounded-2xl bg-card px-3.5 py-3 shadow-[0_0_0_1.2px_var(--line)]"
            >
              <div className="flex items-center gap-2.5">
                {n.image && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={n.image}
                    alt=""
                    aria-hidden="true"
                    className="h-10 w-10 flex-none rounded-lg bg-sunk object-cover"
                  />
                )}
                <button
                  type="button"
                  onClick={() => setEditing(n)}
                  className="min-w-0 flex-1 text-left"
                >
                  <b className="block truncate text-[13.5px] font-medium text-ink">
                    {n.title || (n.image ? '사진 공지' : '이름 없는 공지')}
                  </b>
                  {n.body && (
                    <span className="mt-0.5 block truncate text-[11.5px] text-ink3">{n.body}</span>
                  )}
                </button>
                <Switch on={n.active} busy={busy === n.id} onFlip={() => void flip(n)} />
              </div>
              {/*
                지우기를 **글자로만** 둔다. 스위치 옆에 또 하나 알약을 세우면
                손가락으로 잘못 누르고, 잘못 누르면 되돌릴 수 없는 쪽이다.
              */}
              <button
                type="button"
                onClick={() => void drop(n)}
                className="mt-1.5 text-[11px] text-ink3 active:text-accent"
              >
                지우기
              </button>
            </div>
          ))}
          {list.length === 0 && (
            <p className="rounded-2xl border-[1.5px] border-dashed border-edge px-3.5 py-8 text-center text-[11.5px] text-ink3">
              아직 없어요
            </p>
          )}
        </div>
      )}

      <button
        type="button"
        onClick={() => setEditing('new')}
        className="mb-6 w-full rounded-[14px] bg-accent p-[13px] text-[13.5px] font-medium text-white"
      >
        ＋ 새 공지
      </button>
    </>
  );
}

/** 쓰는 자리 — 제목과 내용 둘뿐이다 */
function Editor({
  notice,
  onClose,
  onDone,
}: {
  notice: Notice | null;
  onClose: () => void;
  onDone: () => Promise<void>;
}) {
  const [title, setTitle] = useState(notice?.title ?? '');
  const [body, setBody] = useState(notice?.body ?? '');
  const [busy, setBusy] = useState(false);

  const pick = useRef<HTMLInputElement>(null);
  /** 새로 고른 사진 — 저장할 때 올린다 */
  const [shot, setShot] = useState<Fitted | null>(null);
  /** 올려둔 사진을 쓸까. 지우기를 누르면 꺼진다 */
  const [keep, setKeep] = useState(Boolean(notice?.image));

  const shown = shot?.url ?? (keep ? notice?.image : undefined);

  const take = async (f: File) => {
    try {
      /*
        방 배경과 같은 손으로 담는다 — 자르지 않고 1000까지 줄인다.
        공지 사진은 세로로 길 수도 가로로 길 수도 있어서 **비를 안 건드린다.**
      */
      setShot(await fitScene(f));
      setKeep(true);
    } catch {
      toast('사진을 못 읽었어요');
    }
  };

  const save = async () => {
    /*
      **제목이 없어도 사진만으로 낸다.** 띠 한 장을 공지로 내는 일이 있어서다.
      둘 다 없으면 뜰 것이 없으니 그때만 막는다.
    */
    if (!title.trim() && !shown) return toast('제목이나 사진 하나는 있어야 해요');
    setBusy(true);
    try {
      /*
        **쓰는 것이 먼저다.** 사진 자리가 `notice/<id>.png`라서, 새 공지는
        `id`를 받아야 어디에 올릴지 정할 수 있다.
      */
      const id = await saveNotice({ id: notice?.id, title: title.trim(), body: body.trim() });
      if (shot) await uploadNoticeImage(id, shot.blob);
      /*
        표에는 **있나 없나**만 적는다. 새로 올렸으면 참, 지우기를 눌렀으면 거짓 —
        고른 것도 없고 지우지도 않았으면 건드릴 것이 없다.
      */
      const has = Boolean(shot) || keep;
      if (has !== Boolean(notice?.image)) await setNoticeImage(id, has);

      toast(notice ? '고쳤어요' : '썼어요. 켜면 떠요');
      await onDone();
      onClose();
    } catch (e) {
      toast(e instanceof Error ? e.message : '저장하지 못했어요');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageBar title={notice ? '공지 고치기' : '새 공지'} onBack={onClose} />

      {/*
        **사진이 맨 위다.** 팝업에서도 위에 뜨고, 사진 한 장으로 내는 공지가 있어서
        먼저 고르는 것이 순서에 맞다.
      */}
      <div className="mb-4">
        <span className="mb-[7px] flex items-baseline text-[11.5px] font-medium text-ink2">
          <span className="flex-1">사진</span>
          {shown && (
            <button
              type="button"
              onClick={() => {
                if (shot) URL.revokeObjectURL(shot.url);
                setShot(null);
                setKeep(false);
              }}
              className="text-[11px] font-normal text-accent"
            >
              지우기
            </button>
          )}
        </span>
        <button
          type="button"
          onClick={() => pick.current?.click()}
          className={`grid w-full place-items-center overflow-hidden rounded-[18px] ${
            shown
              ? 'bg-sunk shadow-[0_0_0_1.4px_var(--line)]'
              : 'aspect-[5/2] border-[1.6px] border-dashed border-edge bg-sunk p-5 text-center'
          }`}
        >
          {shown ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={shown} alt="" aria-hidden="true" className="max-h-[40vh] w-full object-contain" />
          ) : (
            <span>
              <span className="block text-[12.5px] text-ink2">앨범에서 고르기</span>
              <span className="mt-[5px] block text-[11px] text-ink3">
                없어도 돼요. 사진만으로 공지를 낼 수도 있어요
              </span>
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
            if (f) void take(f);
            e.target.value = '';
          }}
        />
      </div>

      <label className="mb-4 block">
        <span className="mb-[7px] block text-[11.5px] font-medium text-ink2">제목</span>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="새 옷이 들어왔어요"
          maxLength={40}
          className="w-full rounded-xl bg-card px-3 py-[11px] text-[13.5px] text-ink shadow-[0_0_0_1.4px_var(--line)] placeholder:text-faint focus:shadow-[0_0_0_1.6px_var(--accent-soft)] focus:outline-none"
        />
      </label>

      <label className="mb-4 block">
        <span className="mb-[7px] block text-[11.5px] font-medium text-ink2">내용</span>
        {/* 엔터를 친 대로 뜬다 — 팝업이 줄바꿈을 그대로 살린다 */}
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={6}
          placeholder={'마법사 곰과 곰토끼가 상점에 걸렸어요.\n할 일을 끝내고 모아보세요!'}
          className="w-full resize-none rounded-xl bg-card px-3 py-[11px] text-[13px] leading-[1.7] text-ink shadow-[0_0_0_1.4px_var(--line)] placeholder:text-faint focus:shadow-[0_0_0_1.6px_var(--accent-soft)] focus:outline-none"
        />
        <span className="mt-[7px] block text-[11px] text-ink3">
          엔터를 친 대로 뜨고, 길면 팝업 안에서 굴려 봐요.
        </span>
      </label>

      {/* ── 이렇게 떠요 ── */}
      <p className="mb-2 text-[11px] font-medium text-ink3">이렇게 떠요</p>
      <div className="mb-5 rounded-card bg-card p-5 shadow-card">
        {shown && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={shown}
            alt=""
            aria-hidden="true"
            className="mb-3.5 block max-h-[42vh] w-full rounded-2xl object-contain"
          />
        )}
        {(title || !shown) && (
          <h2 className="font-round text-[17px] leading-[1.4]">{title || '제목'}</h2>
        )}
        {body && (
          <p
            className={`whitespace-pre-line text-[13px] leading-[1.7] text-ink2 ${
              title || !shown ? 'mt-2.5' : ''
            }`}
          >
            {body}
          </p>
        )}
        <div className="mt-5 flex gap-2">
          <span className="flex-1 rounded-2xl bg-sunk py-[13px] text-center text-[12.5px] font-medium text-ink2">
            오늘 다시 열지 않기
          </span>
          <span className="flex-none rounded-2xl bg-accent px-6 py-[13px] text-[13.5px] font-medium text-white">
            닫기
          </span>
        </div>
      </div>

      <button
        type="button"
        disabled={busy}
        onClick={() => void save()}
        className="mb-6 w-full rounded-[14px] bg-accent p-[13px] text-[13.5px] font-medium text-white disabled:opacity-60"
      >
        {busy ? '저장 중…' : notice ? '저장' : '쓰기'}
      </button>

      {!notice && (
        <p className="-mt-3 mb-6 text-center text-[11px] text-ink3">
          쓴 뒤 목록에서 <b className="font-medium text-ink2">켜야</b> 떠요.
        </p>
      )}
    </>
  );
}
