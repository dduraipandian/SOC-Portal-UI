import { formatAge, formatUtc } from "./time";

/** "12 min ago", with the exact UTC time on hover. */
export function Age({ at }: { at: string }) {
  return (
    <time dateTime={at} title={formatUtc(at)} className="age">
      {formatAge(at)}
    </time>
  );
}
