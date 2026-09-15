/**
 * HubAuthorizationGate
 *
 * Answers the authorization hand-off from The IDIA Hub.
 *
 * The Hub sends the user here when the wallet they are buying Synapse Credits
 * with has never approved the relayer:
 *
 *   idialife://authorize-relayer?owner=0x…&relayer=0x…&return=<hub url>
 *   https://<life host>/?authorizeRelayer=1&owner=…&relayer=…&return=…
 *
 * Life runs its existing authorization routine on the wallet it already holds
 * and sends the user straight back to the Hub.
 *
 * Wallets are only ever added inside Life, so this screen never creates or
 * imports one — if there is no wallet it says so and returns to the Hub.
 */

import { useCallback, useEffect, useState } from "react";
import { ShieldCheck, CheckCircle2, AlertTriangle, Loader2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { walletService, type ProvisioningStage } from "@/services/walletService";
import { AUTHORIZE_STAGE_LABEL } from "@/lib/authorizeStages";

const TAG = "[HUB_AUTHZ]";
const PENDING_KEY = "idia_hub_authz_pending_v1";
const PENDING_TTL_MS = 15 * 60 * 1000;

export interface HubAuthorizationRequest {
  owner: string;
  relayer: string;
  returnUrl: string;
  receivedAt?: number;
}

const ALLOWED_RETURN_HOSTS = ["hub.thebigidia.com", "idia-hub.lovable.app"];

function isAllowedReturn(url: string): boolean {
  if (!url) return false;
  if (url.startsWith("idiahub://")) return true;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:") return false;
    return ALLOWED_RETURN_HOSTS.some(
      (h) => parsed.hostname === h || parsed.hostname.endsWith(`.${h}`),
    );
  } catch {
    return false;
  }
}

function buildReturnUrl(
  base: string,
  status: "granted" | "denied" | "error",
  owner: string,
  reason?: string,
): string {
  const sep = base.includes("?") ? "&" : "?";
  const params = new URLSearchParams({ authz: status, owner });
  if (reason) params.set("reason", reason);
  return `${base}${sep}${params.toString()}`;
}

/** Parse an incoming deep link / URL into a request payload. */
export function parseAuthorizationLink(rawUrl: string): HubAuthorizationRequest | null {
  try {
    const qIndex = rawUrl.indexOf("?");
    if (qIndex === -1) return null;
    const isScheme = rawUrl.startsWith("idialife://authorize-relayer");
    const params = new URLSearchParams(rawUrl.substring(qIndex + 1));
    if (!isScheme && params.get("authorizeRelayer") !== "1") return null;
    const owner = params.get("owner") || "";
    const relayer = params.get("relayer") || "";
    const returnUrl = params.get("return") || "";
    if (!owner) return null;
    return { owner, relayer, returnUrl, receivedAt: Date.now() };
  } catch {
    return null;
  }
}

type Phase = "checking" | "confirm" | "authorizing" | "success" | "error";

const HubAuthorizationGate = () => {
  const [request, setRequest] = useState<HubAuthorizationRequest | null>(null);
  const [phase, setPhase] = useState<Phase>("checking");
  const [stage, setStage] = useState<ProvisioningStage>("idle");
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [mismatch, setMismatch] = useState(false);
  const [message, setMessage] = useState<string>("");
  const [errorCode, setErrorCode] = useState<string>("");

  // ── Intake ──────────────────────────────────────────────────────────────
  const accept = useCallback((req: HubAuthorizationRequest) => {
    console.log(`${TAG}[RECEIVED] owner=${req.owner} relayer=${req.relayer} return=${req.returnUrl}`);
    setRequest(req);
    setPhase("checking");
  }, []);

  useEffect(() => {
    // 1. Current URL (web + iOS custom shell navigating in place)
    const fromUrl = parseAuthorizationLink(window.location.href);
    if (fromUrl) {
      accept(fromUrl);
      // Clean the query so a refresh doesn't replay it
      try {
        window.history.replaceState({}, "", window.location.pathname);
      } catch {}
      return;
    }

    // 2. A request parked before sign-in
    try {
      const raw = localStorage.getItem(PENDING_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as HubAuthorizationRequest;
        if (parsed?.owner && Date.now() - (parsed.receivedAt ?? 0) < PENDING_TTL_MS) {
          localStorage.removeItem(PENDING_KEY);
          accept(parsed);
          return;
        }
        localStorage.removeItem(PENDING_KEY);
      }
    } catch {}
  }, [accept]);

  useEffect(() => {
    // 3. Native deep link arriving while the app is already open
    const onDeepLink = (e: Event) => {
      const url = (e as CustomEvent).detail?.url as string | undefined;
      if (!url) return;
      const parsed = parseAuthorizationLink(url);
      if (parsed) accept(parsed);
    };
    window.addEventListener("idia:authorize-relayer", onDeepLink as EventListener);
    return () => window.removeEventListener("idia:authorize-relayer", onDeepLink as EventListener);
  }, [accept]);

  // ── Preflight: session + wallet ─────────────────────────────────────────
  useEffect(() => {
    if (!request || phase !== "checking") return;
    let cancelled = false;

    (async () => {
      const { data } = await supabase.auth.getSession();
      if (cancelled) return;

      if (!data.session) {
        console.log(`${TAG}[AUTH_REQUIRED] parking request and routing to sign-in`);
        try {
          localStorage.setItem(PENDING_KEY, JSON.stringify(request));
        } catch {}
        window.location.assign("/auth");
        return;
      }

      let address: string | null = null;
      try {
        const info = (await walletService.hasWallet()) ? await walletService.loadWallet() : null;
        address = info?.address ?? null;
      } catch (e: any) {
        console.warn(`${TAG}[WALLET_LOAD_FAILED] ${e?.message ?? e}`);
      }
      if (cancelled) return;

      if (!address) {
        console.log(`${TAG}[NO_WALLET]`);
        setErrorCode("no_wallet");
        setMessage("There's no wallet in IDIA Life on this device yet. Open the Wallet tab to add one, then try your purchase again.");
        setPhase("error");
        return;
      }

      setWalletAddress(address);
      setMismatch(address.toLowerCase() !== request.owner.toLowerCase());

      // Already authorized? Return immediately.
      try {
        const status = await walletService.getAuthorizationStatus();
        if (cancelled) return;
        if (status.authorized && !status.indeterminate) {
          console.log(`${TAG}[ALREADY_AUTHORIZED]`);
          setMessage("This wallet is already authorized.");
          setPhase("success");
          return;
        }
      } catch (e: any) {
        console.warn(`${TAG}[STATUS_FAILED] ${e?.message ?? e}`);
      }
      if (cancelled) return;
      setPhase("confirm");
    })();

    return () => {
      cancelled = true;
    };
  }, [request, phase]);

  // ── Return to the Hub ───────────────────────────────────────────────────
  const goBack = useCallback(
    (status: "granted" | "denied" | "error", reason?: string) => {
      const base = request?.returnUrl ?? "";
      const owner = walletAddress ?? request?.owner ?? "";
      if (!isAllowedReturn(base)) {
        console.warn(`${TAG}[RETURN_BLOCKED] ${base || "(none)"}`);
        setRequest(null);
        return;
      }
      const url = buildReturnUrl(base, status, owner, reason);
      console.log(`${TAG}[RETURN] ${url}`);
      window.location.assign(url);
    },
    [request, walletAddress],
  );

  // Auto-return shortly after success so the purchase can continue.
  useEffect(() => {
    if (phase !== "success") return;
    const t = setTimeout(() => goBack("granted"), 1500);
    return () => clearTimeout(t);
  }, [phase, goBack]);

  // ── Authorize ───────────────────────────────────────────────────────────
  const authorize = async () => {
    if (!request) return;
    setPhase("authorizing");
    setStage("idle");
    setMessage("");
    setErrorCode("");
    console.log(`${TAG}[AUTHORIZING] wallet=${walletAddress}`);

    try {
      // Refuse to approve a spender the Hub named but our relayer isn't.
      if (request.relayer) {
        const status = await walletService.getAuthorizationStatus();
        if (
          status.relayerAddress &&
          status.relayerAddress.toLowerCase() !== request.relayer.toLowerCase()
        ) {
          console.error(`${TAG}[MISMATCH] link relayer=${request.relayer} actual=${status.relayerAddress}`);
          setErrorCode("relayer_mismatch");
          setMessage("This authorization request doesn't match IDIA's payment account, so it was refused.");
          setPhase("error");
          return;
        }
      }

      await walletService.authorizeExistingWallet((s) => setStage(s));

      const verified = await walletService.getAuthorizationStatus();
      if (!verified.authorized) {
        throw new Error("Authorization did not take effect. Please try again.");
      }

      console.log(`${TAG}[VERIFIED]`);
      setMessage("Your wallet is authorized.");
      setPhase("success");
    } catch (e: any) {
      const raw = e?.message ?? String(e);
      console.error(`${TAG}[FAILED] ${raw}`);
      setErrorCode(raw.includes("NO_GAS") ? "no_gas" : "failed");
      setMessage(
        raw.includes("NO_GAS")
          ? "This wallet needs a small amount of ETH on Base to complete authorization."
          : raw.replace(/^NO_GAS:\s*/, ""),
      );
      setPhase("error");
    }
  };

  if (!request) return null;

  const shortAddr = (a?: string | null) => (a ? `${a.slice(0, 6)}…${a.slice(-4)}` : "—");

  return (
    <div className="fixed inset-0 z-[80] bg-background/95 backdrop-blur-sm flex items-center justify-center p-5">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-5 shadow-xl space-y-4">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-primary" />
          <h2 className="text-base font-semibold">Authorize your wallet</h2>
        </div>

        {phase === "checking" && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-6">
            <Loader2 className="w-4 h-4 animate-spin" />
            Checking your wallet…
          </div>
        )}

        {phase === "confirm" && (
          <>
            <p className="text-sm text-muted-foreground">
              The IDIA Hub needs a one-time approval before this wallet can buy Synapse Credits.
            </p>
            <div className="rounded-lg bg-muted/50 p-3 text-xs font-mono break-all">
              {walletAddress}
            </div>
            {mismatch && (
              <div className="rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/40 p-3 text-xs text-amber-900 dark:text-amber-100">
                <p className="font-semibold mb-1">Different wallet requested</p>
                <p>
                  The Hub asked about {shortAddr(request.owner)}, but this device holds{" "}
                  {shortAddr(walletAddress)}. Continuing will authorize the wallet on this device.
                </p>
              </div>
            )}
            <Button className="w-full" onClick={authorize}>
              <ShieldCheck className="w-4 h-4 mr-2" />
              Authorize
            </Button>
            <button
              className="w-full text-xs text-muted-foreground underline"
              onClick={() => goBack("denied", "cancelled")}
            >
              Back to the Hub
            </button>
          </>
        )}

        {phase === "authorizing" && (
          <div className="py-6 space-y-3">
            <div className="flex items-center gap-2 text-sm">
              <Loader2 className="w-4 h-4 animate-spin text-primary" />
              {AUTHORIZE_STAGE_LABEL[stage] ?? "Authorizing…"}
            </div>
            <p className="text-xs text-muted-foreground">
              Keep this screen open — it only takes a few seconds.
            </p>
          </div>
        )}

        {phase === "success" && (
          <div className="py-4 space-y-3">
            <div className="flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
              {message || "Your wallet is authorized."}
            </div>
            <p className="text-xs text-muted-foreground">Taking you back to The IDIA Hub…</p>
            <Button variant="outline" className="w-full" onClick={() => goBack("granted")}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to the Hub
            </Button>
          </div>
        )}

        {phase === "error" && (
          <div className="py-2 space-y-3">
            <div className="flex items-start gap-2 text-sm text-amber-700 dark:text-amber-300">
              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{message || "Authorization failed."}</span>
            </div>
            {errorCode !== "no_wallet" && errorCode !== "relayer_mismatch" && (
              <Button className="w-full" onClick={authorize}>
                Try again
              </Button>
            )}
            <button
              className="w-full text-xs text-muted-foreground underline"
              onClick={() => goBack("error", errorCode || "failed")}
            >
              Back to the Hub
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default HubAuthorizationGate;
