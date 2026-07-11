import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  ListObjectsV2Command,
} from "@aws-sdk/client-s3";
import { mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { R2 } from "@/factory/config";

let client: S3Client | null = null;

export function r2(): S3Client {
  if (client) return client;
  const endpoint = process.env.R2_ENDPOINT;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  if (!endpoint || !accessKeyId || !secretAccessKey) throw new Error("R2 creds not set");
  client = new S3Client({
    region: "auto",
    endpoint,
    credentials: { accessKeyId, secretAccessKey },
  });
  return client;
}

const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript",
  ".mjs": "application/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".otf": "font/otf",
  ".map": "application/json",
  ".txt": "text/plain",
  ".webp": "image/webp",
};

export function contentType(path: string): string {
  const ext = path.slice(path.lastIndexOf(".")).toLowerCase();
  return MIME[ext] ?? "application/octet-stream";
}

/** Recursively upload a directory to R2 under `prefix`. Returns file count. */
export async function uploadDir(localDir: string, prefix: string): Promise<number> {
  const s3 = r2();
  let count = 0;
  const walk = async (dir: string, rel: string) => {
    for (const name of readdirSync(dir)) {
      const p = join(dir, name);
      const key = rel ? `${rel}/${name}` : name;
      if (statSync(p).isDirectory()) await walk(p, key);
      else {
        await s3.send(
          new PutObjectCommand({
            Bucket: R2.bucket,
            Key: `${prefix}/${key}`,
            Body: readFileSync(p),
            ContentType: contentType(name),
          }),
        );
        count++;
      }
    }
  };
  await walk(localDir, "");
  return count;
}

export async function uploadFile(localPath: string, key: string) {
  await r2().send(
    new PutObjectCommand({
      Bucket: R2.bucket,
      Key: key,
      Body: readFileSync(localPath),
      ContentType: contentType(localPath),
    }),
  );
}

export async function listKeys(prefix: string): Promise<string[]> {
  const res = await r2().send(
    new ListObjectsV2Command({ Bucket: R2.bucket, Prefix: prefix, MaxKeys: 500 }),
  );
  return (res.Contents ?? []).map((o) => o.Key!).filter(Boolean);
}

/** Download all objects under `prefix` into localDir (flattened by basename). */
export async function downloadPrefix(prefix: string, localDir: string): Promise<string[]> {
  mkdirSync(localDir, { recursive: true });
  const keys = await listKeys(prefix);
  const out: string[] = [];
  for (const key of keys) {
    const res = await r2().send(new GetObjectCommand({ Bucket: R2.bucket, Key: key }));
    const bytes = await res.Body?.transformToByteArray();
    if (!bytes) continue;
    const local = join(localDir, key.slice(prefix.length).replace(/^\//, "").replace(/\//g, "_"));
    mkdirSync(dirname(local), { recursive: true });
    writeFileSync(local, Buffer.from(bytes));
    out.push(local);
  }
  return out;
}

export async function getObjectText(key: string): Promise<string | null> {
  try {
    const res = await r2().send(new GetObjectCommand({ Bucket: R2.bucket, Key: key }));
    return (await res.Body?.transformToString()) ?? null;
  } catch {
    return null;
  }
}
