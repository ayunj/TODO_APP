'use client';

import { useCallback, useEffect, useState } from 'react';
import PageBar from '@/components/PageBar';
import Switch from './admin/Switch';
import { ask } from '@/lib/ask';
import { useGomdori } from '@/lib/gomdori';
import { pullNotices, removeNotice, saveNotice, setNoticeActive } from '@/lib/repo/remote';
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
                <button
                  type="button"
                  onClick={() => setEditing(n)}
                  className="min-w-0 flex-1 text-left"
                >
                  <b className="block truncate text-[13.5px] font-medium text-ink">
                    {n.title || '이름 없는 공지'}
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

  const save = async () => {
    if (!title.trim()) return toast('제목을 적어주세요');
    setBusy(true);
    try {
      await saveNotice({ id: notice?.id, title: title.trim(), body: body.trim() });
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
        <h2 className="font-round text-[17px] leading-[1.4]">{title || '제목'}</h2>
        {body && (
          <p className="mt-2.5 whitespace-pre-line text-[13px] leading-[1.7] text-ink2">{body}</p>
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
