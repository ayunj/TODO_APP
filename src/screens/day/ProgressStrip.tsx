import Tomato, { type Pose } from '@/components/Tomato';
import { saying } from '@/lib/constants';

/**
 * 그날 할 일 개수만큼 차오르는 막대.
 *
 * 토마토가 진행에 따라 표정을 바꾼다 — 이 자리 하나가 하루 상태를 다 안다.
 * 아직 아무것도 안 했을 때만 개수를 본다. 다섯 개 넘게 쌓였으면 땀 흘리는 컷이다.
 */
const poseFor = (done: number, total: number): Pose =>
  done === total ? 'all' : done > 0 ? 'one' : total >= 5 ? 'busy' : 'cheer';

export default function ProgressStrip({ done, total }: { done: number; total: number }) {
  const pct = total ? Math.round((done / total) * 100) : 0;

  return (
    <div className="mb-[11px] flex items-center gap-3 rounded-card bg-card px-[17px] pb-[17px] pt-4 shadow-card">
      <Tomato pose={poseFor(done, total)} size={62} className="-my-1 flex-none" />

      <div className="min-w-0 flex-1">
        <div className="mb-[11px] flex items-baseline justify-between gap-2.5">
          <span className="font-round text-[14px] text-accent">{saying(done, total)}</span>
          <span className="font-mono text-[12.5px] font-medium text-ink2">
            <b className="text-[15px] font-medium text-accent">{done}</b> / {total}
          </span>
        </div>
        <span className="block h-[9px] overflow-hidden rounded-full bg-track">
          <i
            className="block h-full rounded-full bg-accent transition-[width] duration-300"
            style={{ width: `${pct}%` }}
          />
        </span>
      </div>
    </div>
  );
}
