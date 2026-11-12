/** A status word. Final and refused states are styled by `data-status`, not by colour alone. */
export function StatusBadge({ status, label }: { status: string; label?: string }) {
  return (
    <span className="status" data-status={status}>
      {label ?? status.replace(/_/g, " ")}
    </span>
  );
}
