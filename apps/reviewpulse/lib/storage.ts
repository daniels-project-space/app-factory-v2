import { supabase } from "./supabase";
import * as FileSystem from "expo-file-system";

const AVATARS_BUCKET = "avatars";

export async function uploadAvatar(userId: string, uri: string): Promise<string> {
  const ext = uri.split(".").pop() || "jpg";
  const path = `${userId}/avatar.${ext}`;
  const base64 = await FileSystem.readAsStringAsync(uri, { encoding: "base64" });
  const { error } = await supabase.storage
    .from(AVATARS_BUCKET)
    .upload(path, decode(base64), { contentType: `image/${ext}`, upsert: true });
  if (error) throw error;
  const { data } = supabase.storage.from(AVATARS_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

export async function uploadFile(bucket: string, path: string, uri: string): Promise<string> {
  const base64 = await FileSystem.readAsStringAsync(uri, { encoding: "base64" });
  const ext = uri.split(".").pop() || "bin";
  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, decode(base64), { contentType: getMimeType(ext), upsert: true });
  if (error) throw error;
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

export function getPublicUrl(bucket: string, path: string): string {
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

export async function deleteFile(bucket: string, paths: string[]): Promise<void> {
  const { error } = await supabase.storage.from(bucket).remove(paths);
  if (error) throw error;
}

function decode(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

function getMimeType(ext: string): string {
  const map: Record<string, string> = {
    jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", gif: "image/gif",
    webp: "image/webp", pdf: "application/pdf", mp4: "video/mp4", mp3: "audio/mpeg",
  };
  return map[ext.toLowerCase()] || "application/octet-stream";
}
