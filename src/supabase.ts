import { createClient } from "@supabase/supabase-js";
import { config, supabaseEnabled } from "./config.js";

export const supabase = supabaseEnabled
  ? createClient(config.supabaseUrl!, config.supabaseServiceRoleKey!)
  : null;