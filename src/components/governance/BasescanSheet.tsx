import { openExternalLink } from "@/lib/openExternalLink";

// Isolated Basescan router — does not share the Hub handover channel.
export const openBasescan = (addressOrTx: string, type: "address" | "tx" = "address") => {
  const baseUrl = "https://basescan.org";
  const url = `${baseUrl}/${type}/${addressOrTx}`;
  openExternalLink(url);
};
