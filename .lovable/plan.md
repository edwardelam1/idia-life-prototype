# Wallet Awareness & Live Receive Detection

Three related UX gaps where users don't realize wallet state. All work is frontend-only (no schema changes); on-chain receives are detected client-side from the Base RPC and surfaced through the existing Sovereign Receipt overlay and History tab.

## 1. Post-login "No Wallet" dismissible popup

**New component:** `src/components/wallet/NoWalletNudge.tsx`
- Glassmorphic Trust-Blue/Amber card, centered modal with backdrop blur, single dismiss (X) + two CTAs: "Create Wallet" (jumps to Wallet tab → Security sub-tab) and "Later".
- Copy: "You don't have a Sovereign Vault yet. Create one from Wallet → Security to start receiving ETH, IDIA, and USDC."
- Dismissal persisted per-user in `localStorage` under `idia_wallet_nudge_dismissed_v1:<user_id>` so it stops nagging within a session but reappears in a fresh session as long as no wallet exists.

**Wire-up in `src/components/MainApp.tsx`:**
- After `WelcomeSequence` completes and `profileLoading === false`, check `!isProvisioned.wallet && !wallet?.address` (read via `useWallet`) and `!dismissed`.
- On "Create Wallet" click: `setActiveTab("wallet")` and `window.dispatchEvent(new CustomEvent("wallet:open-security", { detail: { mode: "create" } }))`.
- `EnhancedWalletDashboard` listens for `wallet:open-security`, sets `activeTab="security"` and opens the setup modal in the requested mode.

## 2. Success toast on wallet create / import

**In `src/components/enhanced/EnhancedWalletDashboard.tsx`:**
- In `handleCreateWallet`: on success, fire `toast({ title: "Sovereign Vault created", description: "<short address> is now linked. Back up your recovery phrase." })` and dispatch `window.dispatchEvent(new CustomEvent("vault-linked", { detail: { address }}))` (event already consumed by `MainApp`).
- In `handleImportWallet`: on success, fire `toast({ title: "Wallet linked", description: "<short address> connected to this device." })` and same `vault-linked` dispatch.
- Both toasts use the existing sonner stack (`@/hooks/use-toast`).

## 3. Live on-chain receive detection → auto Sovereign Receipt + History row

**New hook:** `src/hooks/useChainReceiveWatcher.ts`
- Inputs: `walletAddress`, optional `onReceive(receipt)` callback.
- Polls Base RPC every 30s for the connected wallet via `ethers.JsonRpcProvider` (reuses the same `BASE_RPC_URL` resolver pattern as `useWalletBalance`).
- Tracks last-seen balances for ETH, IDIA, USDC in a `useRef` + `localStorage` key `idia_chain_seen_v1:<address>` (first run primes baseline silently — never fires on initial load).
- When any asset balance **increases** (`new > previous`), emits one `ChainReceipt` per asset:
  ```ts
  { asset: "ETH" | "IDIA" | "USDC", amount: number, address, observed_at }
  ```
- Implementation note: Plain RPC `balanceOf` deltas only — no Transfer-log scanning (keeps free-tier RPC stable, matches the existing 400ms-spaced sequential pattern). Outgoing sends are ignored (already shown via existing transaction flow).

**Wire-up in `EnhancedWalletDashboard`:**
- Call `useChainReceiveWatcher(displayAddress)` with an `onReceive` handler that:
  1. Builds a synthetic `Transaction` row: `transaction_type: "chain_receive"`, `source: asset`, positive `amount`, `description: "Received <asset>"`, `metadata: { onchain: true, address }`.
  2. Prepends it into the `transactions` state (so it appears in History immediately).
  3. Calls `setSelectedTransaction(syntheticTx)` — this reuses the existing Sovereign Receipt `<Dialog>` (lines 854–901) with zero new UI.
  4. Calls `refreshBalances()` to update the headline balance card.
- Existing History tab merge (`transactions` + `synapse_credit_ledger`) is preserved — synthetic chain rows simply join the same list. No schema write; receipts are session-local until any real DB row arrives.

**Icon mapping:** extend `getTransactionIcon` to map `transaction_type === "chain_receive"` → `ArrowDownLeft`, and `formatAmount` already handles USDC/IDIA labels (ETH gets a new branch returning `+0.0004 ETH`).

## Out of scope
- No Supabase schema changes, no edge function, no contract changes.
- No backfill of historical on-chain transfers — only deltas observed while the app is open.
- No changes to `governance`, `synapse_credit_ledger`, or `WalletSetupModal` internals.

## Files touched
- **new** `src/components/wallet/NoWalletNudge.tsx`
- **new** `src/hooks/useChainReceiveWatcher.ts`
- **edit** `src/components/MainApp.tsx` (mount nudge + listen for tab-jump)
- **edit** `src/components/enhanced/EnhancedWalletDashboard.tsx` (success toasts, mount watcher, handle `wallet:open-security`, extend icon/format helpers)
