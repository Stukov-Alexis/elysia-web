export const config = {
  port: Number(Bun.env.PORT ?? 3000),
  supabaseUrl: Bun.env.SUPABASE_URL,
  supabaseAnonKey: Bun.env.SUPABASE_ANON_KEY,
  supabaseServiceRoleKey: Bun.env.SUPABASE_SERVICE_ROLE_KEY,
  storageBucket: Bun.env.SUPABASE_STORAGE_BUCKET ?? "images",
  backgroundBucket: Bun.env.SUPABASE_BACKGROUND_BUCKET ?? "server",
  backgroundPath: Bun.env.SUPABASE_BACKGROUND_PATH ?? "background.jpg",
  backgroundVideoPath: Bun.env.SUPABASE_BACKGROUND_VIDEO_PATH ?? "",
  faviconPath: Bun.env.SUPABASE_FAVICON_PATH ?? "favicon.png",
};

export const supabaseEnabled = Boolean(
  config.supabaseUrl &&
  config.supabaseServiceRoleKey &&
  !config.supabaseUrl.includes("your-project") &&
  !config.supabaseServiceRoleKey.includes("your-service-role-key"),
);
