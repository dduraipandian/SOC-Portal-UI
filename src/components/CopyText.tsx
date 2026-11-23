import { useEffect, useState } from "react";

/** A value shown in full (monospace) with a button that copies it, e.g. an id to paste into the CLI. */
export function CopyText({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(t);
  }, [copied]);

  return (
    <span className="copy-text">
      <code>{value}</code>
      <button type="button" className="button quiet small" aria-label={label}
              onClick={() => navigator.clipboard.writeText(value).then(() => setCopied(true), () => setCopied(false))}>
        {copied ? "Copied" : "Copy"}
      </button>
    </span>
  );
}
