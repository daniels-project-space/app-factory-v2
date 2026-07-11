/**
 * Minimal HTTP client for Convex, used from Trigger.dev tasks (server-side,
 * no websocket needed). Same transport remote-work-hub's dispatcher proved.
 */
const CONVEX_URL = () => {
  const url = process.env.FACTORY_CONVEX_URL ?? process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!url) throw new Error("FACTORY_CONVEX_URL not set");
  return url.replace(/\/$/, "");
};

async function call(kind: "query" | "mutation", path: string, args: Record<string, unknown>) {
  const res = await fetch(`${CONVEX_URL()}/api/${kind}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ path, args, format: "json" }),
  });
  const json = (await res.json()) as { status?: string; value?: unknown; errorMessage?: string };
  if (json.status === "error" || json.errorMessage) {
    throw new Error(`convex ${path}: ${json.errorMessage ?? "unknown error"}`);
  }
  return json.value;
}

export const cvxQuery = (path: string, args: Record<string, unknown> = {}) =>
  call("query", path, args);
export const cvxMutation = (path: string, args: Record<string, unknown> = {}) =>
  call("mutation", path, args);

export async function logEvent(
  appId: string | undefined,
  kind: string,
  message: string,
  data?: unknown,
) {
  await cvxMutation("pipeline:log", {
    ...(appId ? { appId } : {}),
    kind,
    message,
    ...(data !== undefined ? { data: JSON.stringify(data).slice(0, 8000) } : {}),
  }).catch(() => {});
}
