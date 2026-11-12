import { ApiError } from "../api/client";
import { formatAge } from "./time";

/** A failed load. Shown next to the last good data (if any), never instead of a blank page. */
export function ErrorState({ error, onRetry, lastUpdated }: {
  error: unknown;
  onRetry?: () => void;
  lastUpdated?: number;
}) {
  const unavailable = !(error instanceof ApiError) || error.unavailable;
  const what = unavailable
    ? "The portal backend is not answering."
    : `The portal backend refused the request: ${(error as ApiError).message}.`;
  return (
    <div role="alert" className="error-state">
      <p>
        {what}
        {lastUpdated ? ` Showing data from ${formatAge(new Date(lastUpdated).toISOString())}.` : ""} It retries on
        its own.
      </p>
      {onRetry && (
        <button type="button" className="button quiet" onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  );
}
