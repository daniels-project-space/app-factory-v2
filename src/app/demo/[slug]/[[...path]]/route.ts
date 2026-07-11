import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { fetchQuery } from "convex/nextjs";
import { api } from "@/../convex/_generated/api";

/**
 * Serves an app's web-export demo straight out of R2:
 *   /demo/<slug>/<path...>  →  s3://app-factory-v2/<demoBuildKey>/<path...>
 * SPA fallback to index.html; assets cached 5 min, index never.
 */

const BUCKET = "app-factory-v2";

let s3: S3Client | null = null;
function client(): S3Client | null {
  const { R2_ENDPOINT, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY } = process.env;
  if (!R2_ENDPOINT || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) return null;
  if (!s3) {
    s3 = new S3Client({
      region: "auto",
      endpoint: R2_ENDPOINT,
      credentials: {
        accessKeyId: R2_ACCESS_KEY_ID,
        secretAccessKey: R2_SECRET_ACCESS_KEY,
      },
    });
  }
  return s3;
}

/* demoBuildKey lookup, cached 60s per slug */
const keyCache = new Map<string, { key: string | null; at: number }>();
const CACHE_MS = 60_000;

async function demoKey(slug: string): Promise<string | null> {
  const hit = keyCache.get(slug);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.key;
  let key: string | null = null;
  try {
    const app = await fetchQuery(api.apps.bySlug, { slug });
    key = app?.demoBuildKey ?? null;
  } catch {
    // convex unreachable — treat as no demo, but don't poison the cache long
    keyCache.set(slug, { key: null, at: Date.now() - CACHE_MS + 5_000 });
    return null;
  }
  keyCache.set(slug, { key, at: Date.now() });
  return key;
}

const MIME: Record<string, string> = {
  html: "text/html; charset=utf-8",
  js: "text/javascript; charset=utf-8",
  mjs: "text/javascript; charset=utf-8",
  css: "text/css; charset=utf-8",
  json: "application/json; charset=utf-8",
  map: "application/json; charset=utf-8",
  txt: "text/plain; charset=utf-8",
  svg: "image/svg+xml",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  avif: "image/avif",
  ico: "image/x-icon",
  woff: "font/woff",
  woff2: "font/woff2",
  ttf: "font/ttf",
  otf: "font/otf",
  eot: "application/vnd.ms-fontobject",
  mp4: "video/mp4",
  webm: "video/webm",
  mp3: "audio/mpeg",
  wav: "audio/wav",
  wasm: "application/wasm",
  pdf: "application/pdf",
};

function contentType(path: string): string {
  const ext = path.split(".").pop()?.toLowerCase() ?? "";
  return MIME[ext] ?? "application/octet-stream";
}

async function fetchObject(
  s3c: S3Client,
  key: string,
): Promise<Response | null> {
  try {
    const res = await s3c.send(
      new GetObjectCommand({ Bucket: BUCKET, Key: key }),
    );
    if (!res.Body) return null;
    const isIndex = key.endsWith("index.html");
    const body = res.Body.transformToWebStream() as unknown as BodyInit;
    return new Response(body, {
      status: 200,
      headers: {
        "content-type": res.ContentType ?? contentType(key),
        "cache-control": isIndex ? "no-store" : "public, max-age=300",
        ...(res.ContentLength !== undefined && {
          "content-length": String(res.ContentLength),
        }),
        "x-robots-tag": "noindex",
      },
    });
  } catch {
    return null;
  }
}

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ slug: string; path?: string[] }> },
) {
  const { slug, path } = await ctx.params;

  const s3c = client();
  if (!s3c) {
    return new Response("demo storage not configured", { status: 503 });
  }

  const buildKey = await demoKey(slug);
  if (!buildKey) {
    return new Response("no demo available for this app yet", {
      status: 404,
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  }

  const rel = (path ?? []).map(decodeURIComponent).join("/");
  // extension-less paths are SPA routes → index.html
  const wantsIndex = rel === "" || !/\.[a-zA-Z0-9]+$/.test(rel);
  const objectKey = wantsIndex ? `${buildKey}/index.html` : `${buildKey}/${rel}`;

  let res = await fetchObject(s3c, objectKey);
  // SPA fallback: missing asset path → serve the shell
  if (!res && !wantsIndex) {
    res = await fetchObject(s3c, `${buildKey}/index.html`);
  }
  if (!res) {
    return new Response("not found", { status: 404 });
  }
  return res;
}
