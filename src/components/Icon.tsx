export type IconName = "queue" | "proposals" | "rules" | "health";

const PATHS: Record<IconName, JSX.Element> = {
  queue: (<><path d="M4 6h16M4 12h16M4 18h10" /></>),
  proposals: (<><path d="M5 12l4 4 10-10" /><path d="M5 20h14" /></>),
  rules: (<><path d="M4 7h10M18 7h2M4 17h2M10 17h10" /><circle cx="16" cy="7" r="2" /><circle cx="8" cy="17" r="2" /></>),
  health: (<><path d="M3 12h4l3-7 4 14 3-7h4" /></>),
};

/** Decorative: the link text already names the destination. */
export function Icon({ name }: { name: IconName }) {
  return (
    <svg className="icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
         strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      {PATHS[name]}
    </svg>
  );
}
