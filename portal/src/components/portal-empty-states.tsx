import type {ReactNode} from "react";

export function EmptyPage({
  eyebrow,
  title,
  children,
}: {
  eyebrow?: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <div>
      {eyebrow ? <p className="text-sm text-[#6d7b8a]">{eyebrow}</p> : null}
      <h1 className="mt-1 text-3xl font-black tracking-[-0.04em] sm:text-4xl">{title}</h1>
      <div className="mt-4 max-w-xl text-sm leading-6 text-[#3c4a5c]">{children}</div>
    </div>
  );
}
