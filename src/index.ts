import { readFile } from "node:fs/promises";
import cors from "@elysiajs/cors";
import { Elysia, t } from "elysia";
import { authenticate } from "./auth.js";
import { config } from "./config.js";
import { allTags, createImage, deleteImage, getImage, listImages, removeUploadedFile, updateImage, uploadImage } from "./store.js";
import type { AuthUser } from "./types.js";

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
    backgroundUrl: config.supabaseUrl
      ? `${config.supabaseUrl}/storage/v1/object/public/${config.backgroundBucket}/${config.backgroundPath.split("/").map(encodeURIComponent).join("/")}`
      : "",
    backgroundVideoUrl: config.supabaseUrl && config.backgroundVideoPath
      ? `${config.supabaseUrl}/storage/v1/object/public/${config.backgroundBucket}/${config.backgroundVideoPath.split("/").map(encodeURIComponent).join("/")}`
      : "",
    faviconUrl: config.supabaseUrl
      ? `${config.supabaseUrl}/storage/v1/object/public/${config.backgroundBucket}/${config.faviconPath.split("/").map(encodeURIComponent).join("/")}`
      : "",
  }))
  .get("/images", ({ query }) => listImages(query.tag))
  .get("/images/:id", async ({ params, set }) => {
    const image = await getImage(params.id);
    if (!image) { set.status = 404; return { error: "Image not found" }; }
    return image;
  })
  .get("/search", ({ query }) => listImages(query.tag))
  .get("/tags", async () => allTags(await listImages()))
  .post("/images", async ({ body, user, set }) => {
    if (!user) { set.status = 401; return { error: "Unauthorized" }; }
    if (!(body.image instanceof File) || !body.image.type.startsWith("image/")) { set.status = 400; return { error: "An image file is required" }; }
    let uploaded: Awaited<ReturnType<typeof uploadImage>> | undefined;
    try {
      uploaded = await uploadImage(body.image);
      const filename = typeof body.filename === "string" && body.filename.trim() ? body.filename.trim() : body.image.name;
      return await createImage({ id: uploaded.id, filename, url: uploaded.url, storagePath: uploaded.storagePath, tags: parseTags(body.tags), uploaded_by: user.id, created_at: new Date().toISOString() });
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
  }, { body: t.Object({ filename: t.Optional(t.String()), tags: t.Optional(t.Array(t.String())) }) })
  .delete("/images/:id", async ({ params, user, set }) => {
    const image = await getImage(params.id);
    const status = permission(image, user);
    if (status) { set.status = status; return { error: status === 401 ? "Unauthorized" : status === 404 ? "Image not found" : "Forbidden" }; }
    await deleteImage(image!);
    return { success: true };
  })
  ;

if (!process.env.VERCEL) {
  const server = app.listen(config.port);
  console.log(`Booru API is running at http://${server.server?.hostname}:${server.server?.port}`);
}

function parseTags(value?: string) { return value ? [...new Set(value.split(",").map((tag) => tag.trim().toLowerCase()).filter(Boolean))] : []; }

function permission(image: { uploaded_by: string } | null, user: AuthUser | null) {
  if (!user) return 401;
  if (!image) return 404;
  if (user.role !== "admin" && image.uploaded_by !== user.id) return 403;
  return 0;
}


