import { saying } from '@/lib/constants';

/**
 * 그날 할 일 개수만큼 차오르는 막대.
 *
 * **여기에 그림을 두지 않는다.** 문구·숫자·막대 셋이면 하루 상태는 다 읽힌다 —
 * 캐릭터는 홈 한 자리에서만 산다.
 */
export default function ProgressStrip({ done, total }: { done: number; total: number }) {
  const pct = total ? Math.round((done / total) * 100) : 0;

  return (
    <div className="mb-[11px] rounded-card bg-card px-[17px] pb-[17px] pt-4 shadow-card">
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
  );
}
