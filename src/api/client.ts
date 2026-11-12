// Typed client for the portal backend (portal_api/openapi.yaml). The UI calls nothing else.
import createClient from "openapi-fetch";
import type { components, paths } from "./schema";

export type Schemas = components["schemas"];
export type Problem = Schemas["Problem"];
export type FieldError = Schemas["FieldError"];

export const ANALYST: string = import.meta.env.VITE_ANALYST ?? "analyst";

export const api = createClient<paths>({
  baseUrl: new URL("/api", window.location.origin).toString(),
  // resolved per call, so test interceptors installed after import still apply
  fetch: (request: Request) => globalThis.fetch(request),
});

/** A refused or failed call. status 0 means the request never got an answer. */
export class ApiError extends Error {
  constructor(
    public status: number,
    public problem?: Problem,
    public fieldErrors?: FieldError[],
  ) {
    super(problem?.message ?? problem?.error ?? `request failed (${status})`);
  }

  get unavailable(): boolean {
    return this.status === 0 || this.status === 502 || this.status === 503 || this.status === 504;
  }
}

type Result<T> = { data?: T; error?: unknown; response: Response };

export async function unwrap<T>(call: Promise<Result<T>>): Promise<T> {
  let result: Result<T>;
  try {
    result = await call;
  } catch (exc) {
    throw new ApiError(0, { error: "unreachable", message: String(exc) });
  }
  const { data, error, response } = result;
  if (!response.ok || error !== undefined) {
    const body = (error ?? {}) as Partial<Problem> & { errors?: FieldError[] };
    throw new ApiError(response.status, body.error ? (body as Problem) : undefined, body.errors);
  }
  return data as T;
}
