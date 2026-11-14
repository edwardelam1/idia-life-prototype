import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

Deno.serve(async (req) => {
  const respond = (data: unknown, status = 200) => new Response(JSON.stringify(data), {
    status, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return respond({ error: "Method not allowed" }, 405);
  console.log("[APNS_CONFIG][BEGIN]");
  try {
    const url = Deno.env.get("SUPABASE_URL");
    const anon = Deno.env.get("SUPABASE_ANON_KEY");
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !anon || !service) return respond({ error: "Server configuration unavailable" }, 503);
    const authorization = req.headers.get("Authorization");
    if (!authorization?.startsWith("Bearer ")) return respond({ error: "Unauthorized" }, 401);
    const client = createClient(url, anon);
    const { data, error } = await client.auth.getUser(authorization.slice(7));
    if (error || !data.user) return respond({ error: "Unauthorized" }, 401);
    const admin = createClient(url, service);
    const { data: role, error: roleError } = await admin.from("user_roles")
      .select("id").eq("user_id", data.user.id).eq("role", "admin").maybeSingle();
    if (roleError || !role) return respond({ error: "Administrator access required" }, 403);
    const names = ["APNS_KEY_ID", "APNS_TEAM_ID", "APNS_BUNDLE_ID", "APNS_PRIVATE_KEY", "APNS_ENVIRONMENT"];
    return respond({ configured: names.filter((name) => Boolean(Deno.env.get(name))),
      missing: names.filter((name) => !Deno.env.get(name)) });
  } catch {
    return respond({ error: "Configuration check failed" }, 500);
  } finally {
    console.log("[APNS_CONFIG][END]");
  }
});