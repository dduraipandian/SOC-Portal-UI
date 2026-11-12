import { useRef, useState, type ReactNode } from "react";

/** An inline confirmation that needs a reason. A second click while the first is in flight does nothing. */
export function ConfirmReason({ title, confirmLabel, pending, tone = "act", onConfirm, onCancel, children }: {
  title: string;
  confirmLabel: string;
  pending: boolean;
  tone?: "act" | "refuse";
  onConfirm: (reason: string) => void;
  onCancel: () => void;
  children?: ReactNode;
}) {
  const [reason, setReason] = useState("");
  const sent = useRef(false);
  const disabled = pending || sent.current || reason.trim() === "";
  return (
    <div role="dialog" aria-label={title} className="panel">
      <strong>{title}</strong>
      {children}
      <label style={{ width: "100%" }}>
        Reason
        <textarea value={reason} onChange={(e) => setReason(e.target.value)} autoFocus />
      </label>
      <div className="actions">
        <button
          type="button"
          className={tone === "act" ? "button" : "button refuse"}
          disabled={disabled}
          onClick={() => {
            if (sent.current) return;
            sent.current = true;
            onConfirm(reason.trim());
          }}
        >
          {confirmLabel}
        </button>
        <button type="button" className="button quiet" onClick={onCancel} disabled={pending}>Cancel</button>
      </div>
    </div>
  );
}
