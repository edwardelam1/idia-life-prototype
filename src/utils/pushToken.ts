import { supabase } from "@/integrations/supabase/client";
import { requireActiveSession } from "@/lib/authUser";

const pending = new Map<string, Promise<boolean>>();

export async function persistPushToken(token: string, platform: "ios" | "android"): Promise<boolean> {
  if (!token || token.length > 4096 || (platform === "ios" && !/^[a-f0-9]+$/i.test(token))) {
    throw new Error("Invalid device registration");
  }
  const user = await requireActiveSession("push.register");
  if (!user) return false;
  const key = `${user.id}:${platform}:${token}`;
  const existing = pending.get(key);
  if (existing) return existing;
  const task = (async () => {
    console.log("[PUSH_REGISTER][BEGIN]");
    try {
      const { data, error } = await supabase.from("push_tokens").select("id")
        .eq("user_id", user.id).eq("token", token).maybeSingle();
      if (error) throw new Error("Could not check device registration");
      const result = data
        ? await supabase.from("push_tokens").update({ platform, updated_at: new Date().toISOString() })
            .eq("id", data.id).eq("user_id", user.id)
        : await supabase.from("push_tokens").insert({ user_id: user.id, platform, token });
      if (result.error) throw new Error("Could not save device registration");
      return true;
    } finally {
      console.log("[PUSH_REGISTER][END]");
    }
  })();
  pending.set(key, task);
  try { return await task; } finally { pending.delete(key); }
}