import { useState } from "react";
import { useSetVerdict } from "../../api/hooks";
import { refusalText } from "../../api/problems";
import type { Case } from "./types";

type Verdict = "malicious" | "benign" | "false_positive";

export function VerdictForm({ c }: { c: Case }) {
  const [verdict, setVerdict] = useState<Verdict>("malicious");
  const [note, setNote] = useState("");
  const close = useSetVerdict(c.case_id);
  const open = c.status === "open";
  return (
    <form
      aria-label="Analyst verdict"
      className="panel"
      onSubmit={(e) => {
        e.preventDefault();
        close.mutate({ verdict, note, expectedVersion: c.version });
      }}
    >
      <h2>Analyst verdict</h2>
      {!open && (
        <p className="muted">
          {c.verdict ? `Closed as ${c.verdict} by ${c.closed_by ?? "unknown"}.` : `This case is ${c.status}.`}
        </p>
      )}
      {close.isError && (
        <div role="alert" className="refusal"><p>{refusalText(close.error)}</p></div>
      )}
      <label>
        Verdict
        <select value={verdict} onChange={(e) => setVerdict(e.target.value as Verdict)} disabled={!open}>
          <option value="malicious">Malicious</option>
          <option value="benign">Benign</option>
          <option value="false_positive">False positive</option>
        </select>
      </label>{" "}
      <label style={{ width: "100%", marginTop: 8 }}>
        Note
        <textarea value={note} onChange={(e) => setNote(e.target.value)} disabled={!open} />
      </label>
      <div className="actions">
        <button type="submit" className="button" disabled={!open || close.isPending}>
          Close case with this verdict
        </button>
        <span className="muted">Closes version v{c.version}.</span>
      </div>
    </form>
  );
}
