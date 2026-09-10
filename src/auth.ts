import { supabase } from "./supabase.js";
import type { AuthUser } from "./types.js";

export async function authenticate(authorization?: string): Promise<AuthUser | null> {
  if (!supabase || !authorization?.startsWith("Bearer ")) return null;
  const { data, error } = await supabase.auth.getUser(authorization.slice(7));
  if (error || !data.user) return null;
  const role = data.user.app_metadata?.role ?? data.user.user_metadata?.role;
  return { id: data.user.id, email: data.user.email, role: role === "admin" ? "admin" : "user" };
}
