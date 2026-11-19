import { useId, type ReactNode } from "react";

/** A titled region: the heading names it for assistive technology and for tests. `count` adds a small pill beside it. */
export function Section({ title, children, className, count }: {
  title: string; children: ReactNode; className?: string; count?: number;
}) {
  const id = useId();
  return (
    <section aria-labelledby={id} className={className}>
      {count === undefined ? (
        <h2 id={id}>{title}</h2>
      ) : (
        <div className="section-head"><h2 id={id}>{title}</h2><span className="count">{count}</span></div>
      )}
      {children}
    </section>
  );
}
