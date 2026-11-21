import { useState } from "react";
import { useSaveReview } from "../../api/hooks";
import { refusalText } from "../../api/problems";

/** The human rationale review: is the reasoning right, not just the verdict. Saving again replaces it. */
export function ReviewForm({ runId, current }: { runId: string; current?: boolean }) {
  const [correct, setCorrect] = useState<boolean | undefined>(current);
  const [note, setNote] = useState("");
  const save = useSaveReview(runId);
  return (
    <form aria-label="Review" className="review-form"
          onSubmit={(e) => { e.preventDefault(); if (correct !== undefined) save.mutate({ correct, note: note.trim() }); }}>
      <h3>{current === undefined ? "Review the rationale" : "Change the review"}</h3>
      <div className="choices">
        <label><input type="radio" name="correct" checked={correct === true} onChange={() => setCorrect(true)} /> Correct</label>
        <label><input type="radio" name="correct" checked={correct === false} onChange={() => setCorrect(false)} /> Incorrect</label>
      </div>
      <label>Note<textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} /></label>
      <button type="submit" className="button" disabled={correct === undefined || save.isPending}>Save review</button>
      {save.error && <p role="alert" className="refusal">{refusalText(save.error)}</p>}
    </form>
  );
}
