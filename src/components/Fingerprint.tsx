/** A SHA-256 hex hash in 16 groups of four, so an analyst can compare it by eye. */
export function Fingerprint({ hash, label }: { hash: string; label: string }) {
  const groups = hash.match(/.{1,4}/g) ?? [hash];
  return (
    <div className="fingerprint" aria-label={`${label} ${hash}`} title={hash}>
      {groups.map((g, i) => <span key={i}>{g}</span>)}
    </div>
  );
}
