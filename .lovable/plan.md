## Scope (STRICT)

Only `src/components/DataDashboard.tsx` is edited. No other files, no schema changes, no hook changes. The Wallet page (`WalletDashboard.tsx`) and its hook (`useWalletBalance`) are read-only references.

## Change 1 — Replace "Cash Account" card with the USDC card

The teal gradient header on the Data tab currently shows `Cash Account` + `$X USD` from `wallets.cash_balance`. Replace it with the **USDC tile** mirroring the Wallet page (`balance.usdc_balance` from `useWalletBalance`), while preserving the existing connection sync badge (Idle / Synced Recently / No Data Found / Checking…).

Specifically:
- Import `useWalletBalance` and pull `balance` (drop the `wallets.cash_balance` fetch + `setTotalEarnings` + the `wallets` realtime channel — they are no longer rendered).
- Replace the label `Cash Account` with `USDC` and the figure `${totalEarnings.toFixed(2)} USD` with `${balance.usdc_balance.toFixed(2)}` (matching Wallet page formatting).
- Keep the same teal gradient `Card`, the same right-side circular icon (swap `DollarSign` for a USDC-appropriate look — keep `DollarSign` for visual consistency with Wallet, since Wallet doesn't use a separate USDC icon).
- Keep `getSyncStatusBadge()` rendered next to the label exactly as today.
- Subtitle text updates to: "USDC balance from connected sources" (connected) / "Connect data sources to start earning USDC" (none).

## Change 2 — Move tabs above the USDC card and restyle to match Wallet

Move the `Tabs` component so the `TabsList` (Connections / Transactions) renders **above** the USDC card (between the page top / header and the card). The card and the tab panels stay inside the same `<Tabs>` wrapper so state is preserved; the USDC card sits inside `TabsContent` for both tabs OR is hoisted above and the Tabs wrap only the list + panels.

Chosen approach: **hoist the `TabsList` above the card**, keep `Tabs` wrapping everything, and place the USDC card between `TabsList` and `TabsContent`. This matches the requested order: header → tabs → USDC card → tab content.

Restyle `TabsList` / `TabsTrigger` to mirror the Wallet's `EnhancedWalletDashboard` styling for consistency:

```tsx
<TabsList className="grid grid-cols-2 w-full bg-muted/20 shrink-0">
  <TabsTrigger value="connections" className="text-[11px] px-1">Connections</TabsTrigger>
  <TabsTrigger value="audit" className="text-[11px] px-1">Transactions</TabsTrigger>
</TabsList>
```

The `FileKey` icon inside the Transactions trigger is removed to match the Wallet's text-only triggers.

## Resulting layout

```text
[ Header (untouched) ]
[ Tabs:  Connections | Transactions ]   ← restyled, moved up
[ USDC teal card + sync badge ]         ← was Cash Account
[ Tab panel: Connections list  OR  Audit Log ]
```

## Out of scope

- No edits to `WalletDashboard`, `useWalletBalance`, header, nav, other tabs, Pro, Vote, Settings, Profile, Friend AI.
- No DB / RLS / edge function changes.
- No removal of the audit log panel or Apple Health modal wiring.