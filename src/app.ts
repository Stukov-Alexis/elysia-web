import { readFile } from "node:fs/promises";
import cors from "@elysiajs/cors";
import { Elysia, t } from "elysia";
import { authenticate } from "./auth.js";
import { config } from "./config.js";
import { allTags, createImage, deleteImage, getImage, listImages, removeUploadedFile, searchImages, updateImage, uploadImage } from "./store.js";
import type { AuthUser } from "./types.js";
import type { IncomingMessage, ServerResponse } from "node:http";

export const app = new Elysia()
  .use(cors())
  .derive(async ({ headers }) => ({ user: await authenticate(headers.authorization) }))
  .get("/", async ({ set }) => {
    set.headers["content-type"] = "text/html; charset=utf-8";
    const page = new URL("../public/index.html", import.meta.url);
    return new Response(await readFile(page));
  })
  .get("/me", ({ user, set }) => {
    if (!user) { set.status = 401; return { error: "Unauthorized" }; }
    return user;
  })
  .get("/config", () => ({
    supabaseUrl: config.supabaseUrl ?? "",
    supabaseAnonKey: config.supabaseAnonKey ?? "",
    backgroundUrl: config.supabaseUrl ? publicAssetUrl(config.backgroundBucket, config.backgroundPath) : "",
    backgroundVideoUrl: config.supabaseUrl && config.backgroundVideoPath ? publicAssetUrl(config.backgroundBucket, config.backgroundVideoPath) : "",
    faviconUrl: config.supabaseUrl ? publicAssetUrl(config.backgroundBucket, config.faviconPath) : "",
  }))
  .get("/favicon.svg", async ({ set }) => {
    if (config.supabaseUrl) {
      const response = await fetch(publicAssetUrl(config.backgroundBucket, config.faviconPath));
      if (response.ok) {
        set.headers["cache-control"] = "no-store";
        return new Response(await response.arrayBuffer(), { headers: { "content-type": "image/svg+xml" } });
      }
    }
    set.headers["content-type"] = "image/svg+xml";
    return new Response(await readFile(new URL("../public/favicon.svg", import.meta.url)));
  })
  .get("/images", ({ query }) => listImages(query.tag))
  .get("/images/:id", async ({ params, set }) => {
    const image = await getImage(params.id);
    if (!image) { set.status = 404; return { error: "Image not found" }; }
    return image;
  })
  .get("/search", ({ query }) => searchImages(query.q ?? query.tag ?? ""))
  .get("/tags", async () => allTags(await listImages()))
  .post("/images", async ({ body, user, set }) => {
    if (!user) { set.status = 401; return { error: "Unauthorized" }; }
    if (!(body.image instanceof File) || !body.image.type.startsWith("image/")) { set.status = 400; return { error: "An image file is required" }; }
    let uploaded: Awaited<ReturnType<typeof uploadImage>> | undefined;
    try {
      uploaded = await uploadImage(body.image);
      const filename = typeof body.filename === "string" && body.filename.trim() ? body.filename.trim() : body.image.name;
      const description = typeof body.description === "string" ? body.description.trim() : "";
      return await createImage({ id: uploaded.id, filename, description, url: uploaded.url, storagePath: uploaded.storagePath, tags: parseTags(body.tags), uploaded_by: user.id, created_at: new Date().toISOString() });
    } catch (error) {
      if (uploaded?.storagePath) {
        try { await removeUploadedFile(uploaded.storagePath); } catch { /* keep original error */ }
      }
      set.status = 500;
      return { error: error instanceof Error ? error.message : "Upload failed" };
    }
  }, { body: t.Any() })
  .patch("/images/:id", async ({ params, body, user, set }) => {
    const image = await getImage(params.id);
    const status = permission(image, user);
    if (status) { set.status = status; return { error: status === 401 ? "Unauthorized" : status === 404 ? "Image not found" : "Forbidden" }; }
    return updateImage(params.id, body);
  }, { body: t.Object({ filename: t.Optional(t.String()), description: t.Optional(t.String()), tags: t.Optional(t.Array(t.String())) }) })
  .delete("/images/:id", async ({ params, user, set }) => {
    const image = await getImage(params.id);
    const status = permission(image, user);
    if (status) { set.status = status; return { error: status === 401 ? "Unauthorized" : status === 404 ? "Image not found" : "Forbidden" }; }
    await deleteImage(image!);
    return { success: true };
  });

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  const protocol = req.headers["x-forwarded-proto"] ?? "https";
  const host = req.headers.host ?? "localhost";
  const method = req.method ?? "GET";
  const requestInit = {
    method,
    headers: new Headers(req.headers as Record<string, string>),
    body: method === "GET" || method === "HEAD" ? undefined : (req as unknown as ReadableStream),
    duplex: "half",
  } as RequestInit & { duplex: "half" };
  const response = await app.handle(new Request(`${protocol}://${host}${req.url ?? "/"}`, requestInit));
  res.statusCode = response.status;
  response.headers.forEach((value, key) => res.setHeader(key, value));
  res.end(Buffer.from(await response.arrayBuffer()));
}

function publicAssetUrl(bucket: string, path: string) {
  return `${config.supabaseUrl}/storage/v1/object/public/${bucket}/${path.split("/").map(encodeURIComponent).join("/")}`;
}

function parseTags(value?: string) { return value ? [...new Set(value.split(",").map((tag) => tag.trim().toLowerCase()).filter(Boolean))] : []; }

function permission(image: { uploaded_by: string } | null, user: AuthUser | null) {
  if (!user) return 401;
  if (!image) return 404;
  if (user.role !== "admin" && image.uploaded_by !== user.id) return 403;
  return 0;
}
