/**
 * Shared plain-language labels for the wallet authorization stages emitted by
 * walletService.authorizeExistingWallet / provisionNewWallet.
 */
export const AUTHORIZE_STAGE_LABEL: Record<string, string> = {
  idle: "Preparing…",
  requesting_drip: "Checking gas…",
  awaiting_gas: "Waiting for gas…",
  approving_usdc: "Authorizing relayer…",
  approving_vault: "Authorizing credits vault…",
  delegating_self: "Enabling voting power…",
  done: "Done",
  failed: "Failed",
};

export default AUTHORIZE_STAGE_LABEL;
