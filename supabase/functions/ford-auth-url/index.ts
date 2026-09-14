import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authorization = req.headers.get("Authorization");
    if (!authorization) {
      return new Response(JSON.stringify({ error: "Authentication is required" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const authClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authorization } },
    });
    const { data: { user }, error: authError } = await authClient.auth.getUser();

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Invalid session" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const clientId = Deno.env.get("FORD_CLIENT_ID");
    if (!clientId || !serviceRoleKey) {
      return new Response(JSON.stringify({ error: "Ford server configuration is incomplete" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const redirectUri = `https://zxyngqciipcvveigrzqt.supabase.co/functions/v1/ford-oauth-callback`;

    const stateBytes = crypto.getRandomValues(new Uint8Array(8));
    const state = Array.from(stateBytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    const serviceClient = createClient(supabaseUrl, serviceRoleKey);

    await serviceClient.from("ford_oauth_states").delete().lt("expires_at", new Date().toISOString());
    const { error: stateError } = await serviceClient.from("ford_oauth_states").insert({
      state,
      user_id: user.id,
      expires_at: expiresAt,
    });

    if (stateError) {
      console.error("[ERROR: Ford.AuthUrl] Failed to store OAuth state", stateError);
      return new Response(JSON.stringify({ error: "Could not start Ford sign-in" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const authorizeUrl = new URL("https://api.vehicle.ford.com/fcon-public/v1/auth/init");
    authorizeUrl.search = new URLSearchParams({
      response_type: "code",
      client_id: clientId,
      redirect_uri: redirectUri,
      state,
    }).toString();
    const oauthUrl = authorizeUrl.toString();

    console.log(
      `[INFO: Ford.AuthUrl] Built login URL host=api.vehicle.ford.com state_length=${state.length} redirect_uri=${redirectUri} client_id=***${clientId.slice(-4)}`,
    );

    return new Response(JSON.stringify({ oauthUrl }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error generating Ford OAuth URL:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
