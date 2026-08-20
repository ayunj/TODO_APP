import Tomato, { type Pose } from './Tomato';

export default function EmptyBox({
  title,
  pose,
  children,
}: {
  title: string;
  /** 빈 자리마다 어울리는 컷. 안 주면 지금까지처럼 글자만 나온다. */
  pose?: Pose;
  children?: React.ReactNode;
}) {
  return (
    <div
      className={`rounded-card bg-card px-[18px] text-center text-[13px] leading-[1.7] text-ink3 shadow-card ${
        // 그림이 자리를 채우므로 위아래 여백을 덜 준다
        pose ? 'pb-9 pt-7' : 'py-10'
      }`}
    >
      {pose && <Tomato pose={pose} size={104} className="mx-auto mb-3.5" />}
      <b className="mb-1.5 block font-round text-[15px] font-medium text-ink2">{title}</b>
      {children}
    </div>
  );
}
