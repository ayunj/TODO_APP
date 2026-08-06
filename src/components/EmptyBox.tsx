export default function EmptyBox({
  title,
  children,
}: {
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="rounded-card bg-card px-[18px] py-10 text-center text-[13px] leading-[1.7] text-ink3 shadow-card">
      <b className="mb-1.5 block font-round text-[15px] font-medium text-ink2">{title}</b>
      {children}
    </div>
  );
}
