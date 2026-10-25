import React from "react";
import { Capacitor } from "@capacitor/core";
import { MessageCircle, ExternalLink } from "lucide-react";
import { toast } from "sonner";

export const DISCORD_INVITE_URL = "https://discord.gg/DnaR3e24kw";

const openDiscord = () => {
  console.log("[DISCORD_LINK][START]");
  if (Capacitor.isNativePlatform()) {
    void import("@capacitor/browser")
      .then(({ Browser }) => Browser.open({ url: DISCORD_INVITE_URL }))
      .catch(() => toast.error("Discord could not be opened. Please try again."));
  } else {
    const tab = window.open(DISCORD_INVITE_URL, "_blank", "noopener,noreferrer");
    if (!tab) window.location.href = DISCORD_INVITE_URL;
  }
  console.log("[DISCORD_LINK][END]");
};

const DiscordCommunityCard: React.FC<{ compact?: boolean }> = ({ compact }) => (
  <button
    onClick={openDiscord}
    className="w-full flex items-center gap-3 rounded-2xl border border-teal-100/70 dark:border-teal-900/60 bg-teal-50/60 dark:bg-teal-950/40 backdrop-blur-md p-4 text-left hover:bg-teal-100/60 dark:hover:bg-teal-900/40 transition-colors"
  >
    <div className="h-10 w-10 shrink-0 rounded-full bg-[hsl(178,42%,32%)] flex items-center justify-center">
      <MessageCircle size={18} className="text-primary-foreground" />
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-sm font-bold text-foreground">
        {compact ? "Open Community Discord" : "Join the Community Discord"}
      </p>
      <p className="text-xs text-muted-foreground">
        {compact
          ? "See what the community is discussing."
          : "Where non-committee members discuss the IDIA Protocol."}
      </p>
    </div>
    <ExternalLink size={16} className="text-muted-foreground shrink-0" />
  </button>
);

export default DiscordCommunityCard;
