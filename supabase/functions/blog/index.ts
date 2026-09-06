import { createClient } from "https://esm.sh/@supabase/supabase-js@2.115.0";
import { createBlogHandler } from "./handler.ts";

Deno.serve(
  createBlogHandler({
    client: () =>
      createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      ),
    adminKey: () => Deno.env.get("TUMAM_ADMIN_KEY") || "",
    allowedOrigins: (Deno.env.get("ALLOWED_ORIGINS") || "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean),
  }),
);
