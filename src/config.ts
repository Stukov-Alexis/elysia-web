export const config = {
  port: Number(process.env.PORT ?? 3000),
  supabaseUrl: process.env.SUPABASE_URL,
  supabaseAnonKey: process.env.SUPABASE_ANON_KEY,
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  storageBucket: process.env.SUPABASE_STORAGE_BUCKET ?? "images",
  backgroundBucket: process.env.SUPABASE_BACKGROUND_BUCKET ?? "server",
  backgroundPath: process.env.SUPABASE_BACKGROUND_PATH ?? "background.jpg",
  backgroundVideoPath: process.env.SUPABASE_BACKGROUND_VIDEO_PATH ?? "",
  faviconPath: process.env.SUPABASE_FAVICON_PATH ?? "favicon.png",
};

export const supabaseEnabled = Boolean(
  config.supabaseUrl &&
  config.supabaseServiceRoleKey &&
  !config.supabaseUrl.includes("your-project") &&
  !config.supabaseServiceRoleKey.includes("your-service-role-key"),
);
