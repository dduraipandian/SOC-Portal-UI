// A rule's conditions as plain sentences ("every host = build-01").
import type { Schemas } from "../../api/client";

type Group = Schemas["Group"];
type Condition = Schemas["Condition"];

const FIELD: Record<string, string> = {
  "entities.hosts": "host", "entities.users": "user", "entities.ips": "IP", "entities.host": "host",
  "entities.user": "user", "entities.ip": "IP", "process.cmd": "process command", "process.user": "process user",
  "process.parent_cmd": "parent command", "process.ancestors.cmd": "ancestor command",
  "process.ancestors.user": "ancestor user", "file.path": "file path", "file.mode": "file access",
  "network.dst_ip": "destination IP", "network.dst_port": "destination port",
  "history.duplicate_within_5m": "repeat of a benign alert within 5 minutes",
};
const OP: Record<string, string> = { eq: "=", ne: "≠", in: "is one of", regex: "matches", cidr: "is in", gte: "≥", lte: "≤" };

function value(v: unknown): string {
  if (Array.isArray(v)) return v.map(value).join(", ");
  return typeof v === "string" ? v : JSON.stringify(v);
}

export function sentence(c: Condition): string {
  const field = FIELD[c.field] ?? c.field.replace(/[._]/g, " ");
  const quant = c.quantifier === "all" ? "every " : c.quantifier === "any" ? "any " : "";
  return `${quant}${field} ${OP[c.op] ?? c.op} ${value(c.value)}`;
}

function isGroup(x: Condition | Group): x is Group {
  return !("field" in x);
}

export function ConditionList({ group }: { group: Group }) {
  const mode = group.all ? "all" : "any";
  const items = (group.all ?? group.any ?? []) as (Condition | Group)[];
  return (
    <>
      {mode === "any" && <span className="muted">any of:</span>}
      <ul className="conditions">
        {items.map((item, i) => (
          <li key={i}>{isGroup(item) ? <ConditionList group={item} /> : sentence(item)}</li>
        ))}
      </ul>
    </>
  );
}
