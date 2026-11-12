import type { Schemas } from "../../api/client";

export function actionText(a: Schemas["RuleDefinition"]["action"]): string {
  if (a.type === "auto_close") return `Auto-close as ${a.verdict ?? "?"}`;
  if (a.type === "set_severity") return `Raise severity to at least ${a.severity ?? "?"}`;
  return "Always send to triage";
}
