import { config } from "./config.js";
import { supabase } from "./supabase.js";
import type { ImageRecord } from "./types.js";

const memoryImages: ImageRecord[] = [];

function fromDatabase(row: Record<string, unknown>): ImageRecord {
  return { ...row, storagePath: row.storage_path } as ImageRecord;
}

export async function listImages(tag?: string) {
  if (!supabase) return memoryImages.filter((image) => !tag || image.tags.includes(tag));
  let query = supabase.from("images").select("*").order("created_at", { ascending: false });
  if (tag) query = query.contains("tags", [tag]);
  const { data, error } = await query;
  if (error) throw error;
  return (data as Record<string, unknown>[]).map(fromDatabase);
}

export async function getImage(id: string) {
  if (!supabase) return memoryImages.find((image) => image.id === id) ?? null;
  const { data, error } = await supabase.from("images").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data ? fromDatabase(data as Record<string, unknown>) : null;
}

export async function createImage(image: ImageRecord) {
  if (!supabase) { memoryImages.unshift(image); return image; }
  const { storagePath, ...metadata } = image;
  const { data, error } = await supabase.from("images").insert({ ...metadata, storage_path: storagePath }).select().single();
  if (error) throw new Error(`Database insert failed: ${error.message}`);
  return fromDatabase(data as Record<string, unknown>);
}

export async function removeUploadedFile(storagePath: string) {
  if (!supabase) return;
  const { error } = await supabase.storage.from(config.storageBucket).remove([storagePath]);
  if (error) throw new Error(`Storage cleanup failed: ${error.message}`);
}

export async function updateImage(id: string, changes: { filename?: string; tags?: string[] }) {
  if (!supabase) {
    const image = memoryImages.find((item) => item.id === id);
    if (!image) return null;
    Object.assign(image, changes);
    return image;
  }
  const { data, error } = await supabase.from("images").update(changes).eq("id", id).select().single();
  if (error) throw new Error(`Database update failed: ${error.message}`);
  return fromDatabase(data as Record<string, unknown>);
}

export async function deleteImage(image: ImageRecord) {
  if (!supabase) { const index = memoryImages.findIndex((item) => item.id === image.id); if (index >= 0) memoryImages.splice(index, 1); return; }
  if (image.storagePath) {
    const result = await supabase.storage.from(config.storageBucket).remove([image.storagePath]);
    if (result.error) throw result.error;
  }
  const { error } = await supabase.from("images").delete().eq("id", image.id);
  if (error) throw new Error(`Database delete failed: ${error.message}`);
}

export async function uploadImage(file: File) {
  const id = crypto.randomUUID();
  const storagePath = `${id}-${file.name}`;
  if (!supabase) return { id, storagePath, url: `data:${file.type};base64,${Buffer.from(await file.arrayBuffer()).toString("base64")}` };
  const upload = await supabase.storage.from(config.storageBucket).upload(storagePath, file, { contentType: file.type });
  if (upload.error) throw new Error(`Storage upload failed: ${upload.error.message}`);
  const { data } = supabase.storage.from(config.storageBucket).getPublicUrl(storagePath);
  return { id, storagePath, url: data.publicUrl };
}

export function allTags(images: ImageRecord[]) { return [...new Set(images.flatMap((image) => image.tags))].sort(); }