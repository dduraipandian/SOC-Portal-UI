const NAMES = ["", "Info", "Low", "Medium", "High", "Critical"];

export function Severity({ level }: { level: number }) {
  return (
    <span className="severity" data-level={level} title={`Severity ${level}: ${NAMES[level] ?? ""}`}>
      <span className="severity-num">{level}</span> {NAMES[level]}
    </span>
  );
}
