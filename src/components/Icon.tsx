export type IconName = "queue" | "proposals" | "rules" | "health" | "evals" | "expand" | "collapse";

const PATHS: Record<IconName, JSX.Element> = {
  expand: (<><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" /></>),
  collapse: (<><path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5" /></>),
  queue: (<><path d="M4 6h16M4 12h16M4 18h10" /></>),
  proposals: (<><path d="M5 12l4 4 10-10" /><path d="M5 20h14" /></>),
  rules: (<><path d="M4 7h10M18 7h2M4 17h2M10 17h10" /><circle cx="16" cy="7" r="2" /><circle cx="8" cy="17" r="2" /></>),
  health: (<><path d="M3 12h4l3-7 4 14 3-7h4" /></>),
  evals: (<><path d="M4 6l2 2 3-3M4 13l2 2 3-3" /><path d="M12 7h8M12 14h8M4 20h16" /></>),
};

/** Decorative: the link or button around it carries the accessible name. */
export function Icon({ name }: { name: IconName }) {
  return (
    <svg className="icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
         strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      {PATHS[name]}
    </svg>
  );
}
