// Analyst wording for every refusal the portal backend can return (409 Problem codes, 400 field errors).
import { ApiError, type Problem } from "./client";

export function problemMessage(problem: Problem): string {
  switch (problem.error) {
    case "case_changed":
      return "The case changed since this proposal was made. A new proposal will follow.";
    case "investigation_changed":
      return "A newer investigation replaced this one.";
    case "expired":
      return "This proposal expired (60 minutes).";
    case "hash_mismatch":
      return "This proposal changed since you opened it. Review it again.";
    case "already_decided":
      return "Someone already decided this proposal.";
    case "not_undoable":
      return "Only a succeeded action can be undone.";
    case "version_changed":
      return `This changed since you loaded it (now v${problem.current_version ?? "?"}). Reload and try again.`;
    case "not_open":
      return "This case is no longer open." + (problem.merged_into ? ` It was merged into #${problem.merged_into}.` : "");
    case "invalid_state":
      return `This rule is ${problem.status ?? "in another state"} now, so that action no longer applies.`;
    case "simulation_required":
      return "Run a fresh simulation before renewing.";
    case "not_found":
      return "It no longer exists.";
    case "already_investigating":
      return "The agent is already investigating this case.";
    default:
      return `The request was refused (${problem.error}).`;
  }
}

/** One sentence for any failed decision. */
export function refusalText(error: unknown): string {
  if (!(error instanceof ApiError)) return "Something went wrong. Try again.";
  if (error.unavailable) return "The portal backend is not answering. Nothing was changed; try again.";
  if (error.fieldErrors?.length) return error.fieldErrors.map((e) => `${e.loc}: ${e.msg}`).join("; ");
  if (error.problem) return problemMessage(error.problem);
  return `The request failed (${error.status}).`;
}
