## Objective
Fix the `GovernorInvalidSignature` (0x94ab6c07) revert caused by an EIP-712 hash collision between the silent signer and the on-chain Governor contract.

## Root Cause
In `src/services/governanceService.ts` at line 648, the EIP-712 typed-data `value` object passes `proposalId` as a JavaScript string (via `.toString()`), while the `Ballot` type declares `proposalId` as `uint256`:

```typescript
const value = { proposalId: BigInt(proposalId).toString(), support };
```

Ethers hashes the string characters, but the Governor contract reconstructs the digest using the strict 32-byte integer encoding. The resulting hashes never match, so signature recovery yields the wrong address and the contract reverts with `GovernorInvalidSignature`.

## Fix
Change line 648 to pass the raw `BigInt` value so ethers encodes it as a proper `uint256`:

```typescript
const value = { proposalId: BigInt(proposalId), support };
```

## Impact
- The silent wallet's EIP-712 digest will now exactly match the digest reconstructed by the OpenZeppelin v5 Governor on Base Mainnet.
- The relayer (0xd816D...) will broadcast successfully without `estimateGas` reverts.
- No other files are affected. The JSON relay payload (`proposalId.toString()` at line 702) can remain a string because it is not part of the cryptographic signing path.

## Verification
After the change, a gasless vote should proceed through estimateGas, broadcast, and confirmation without hitting `0x94ab6c07`.