'use client';

import PageBar from '@/components/PageBar';
import { formatCode, useRooms } from '@/lib/rooms';
import { toast } from '@/lib/toast';

/**
 * 코드가 든 **문구 한 덩이**를 복사하거나 그대로 보낸다.
 * 링크가 아니라 글이라 앱링크 설정이 필요 없다 — 받는 쪽은 앱에서 코드를 넣는다.
 */
export default function InviteScreen({ id }: { id: string }) {
  const { rooms } = useRooms();
  const room = rooms.find((r) => r.id === id) ?? null;

  if (!room) {
    return (
      <>
        <PageBar title="초대하기" />
        <p className="ml-1 text-[13px] text-ink3">방을 찾을 수 없어요.</p>
      </>
    );
  }

  // 넷씩 끊어 보낸다 — 받는 쪽이 손으로 옮겨 적는 것이라 눈이 끊어주는 자리가 있어야 한다
  const code = formatCode(room.code);
  const text = `'${room.name}' 방에 초대합니다.\n앱을 열고 아래 코드를 넣어주세요.\n\n${code}`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      toast('복사했어요');
    } catch {
      toast('복사하지 못했습니다.');
    }
  };

  const send = async () => {
    // 시스템 공유 시트(카톡·문자·메일). 없으면 복사로 대신한다.
    if (typeof navigator !== 'undefined' && 'share' in navigator) {
      try {
        await navigator.share({ title: `${room.name} 초대`, text });
        return;
      } catch {
        /* 사용자가 닫았거나 막힌 경우 — 복사로 대신 */
      }
    }
    await copy();
  };

  return (
    <>
      <PageBar title="초대하기" />

      <div className="mb-3 rounded-card bg-card p-4 leading-[1.75] shadow-card">
        <b className="text-[14.5px]">같이 쓰기 초대장</b>
        <br />
        <span className="text-ink2">
          &lsquo;{room.name}&rsquo; 방에 초대합니다.
          <br />
          앱을 열고 아래 코드를 넣어주세요.
        </span>
        <br />
        <span className="break-all font-mono text-[15px] tracking-wide text-accent">{code}</span>
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={copy}
          className="flex-1 rounded-2xl border-[1.6px] border-edge py-[15px] text-center text-[13.5px] font-medium text-ink active:bg-sunk"
        >
          복사
        </button>
        <button
          type="button"
          onClick={send}
          className="flex-1 rounded-2xl bg-accent py-[15px] text-center text-[13.5px] font-medium text-white shadow-fab active:scale-[.99]"
        >
          보내기
        </button>
      </div>

      <p className="mt-3 ml-1 text-[11.5px] leading-[1.6] text-ink3">
        기한은 없어요. 코드를 아는 사람은 누구나 들어옵니다. 찜찜하면 방 설정에서{' '}
        <b>코드 새로 만들기</b>로 그전 것을 막습니다.
      </p>
    </>
  );
}
