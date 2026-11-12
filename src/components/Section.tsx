import { useId, type ReactNode } from "react";

/** A titled region: the heading names it for assistive technology and for tests. */
export function Section({ title, children, className }: { title: string; children: ReactNode; className?: string }) {
  const id = useId();
  return (
    <section aria-labelledby={id} className={className}>
      <h2 id={id}>{title}</h2>
      {children}
    </section>
  );
}
