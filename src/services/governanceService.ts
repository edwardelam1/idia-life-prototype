/**
 * Governance Service — On-chain Governor interaction layer.
 *
 * Reads proposal state from the IDIAGovernor contract and provides
 * write functions for proposing and voting. Write operations require
 * a connected signer from walletService.
 */

import { ethers } from 'ethers';
import { walletService, NETWORKS } from './walletService';
import {
  PROTOCOL,
  ACTIVE_DEPLOYMENT,
  GOVERNOR_ABI,
  IDIA_TOKEN_ABI,
  PROPOSAL_STATES,
  BLOCKS_PER_DAY,
} from '../config/contracts';

// ── Types ────────────────────────────────────────────────────────────

export interface ProposalOnChain {
  proposalId: string;
  proposer: string;
  description: string;
  state: number;
  stateName: string;
  forVotes: string;
  againstVotes: string;
  abstainVotes: string;
  voteStart: number;
  voteEnd: number;
  hasVoted: boolean;
  targets: string[];
  values: string[];
  calldatas: string[];
}

export interface GovernorParams {
  votingDelay: number;
  votingPeriod: number;
  proposalThreshold: string;
  quorumNumerator: number;
  quorumDenominator: number;
  minVotingDelay: number;
  maxVotingDelay: number;
  minVotingPeriod: number;
  maxVotingPeriod: number;
  isPaused: boolean;
}

// ── Service ──────────────────────────────────────────────────────────

class GovernanceService {

  private getProvider(): ethers.JsonRpcProvider {
    const networkKey = ACTIVE_DEPLOYMENT === 'mainnet' ? 'base' : 'baseSepolia';
    const network = NETWORKS[networkKey];
    return new ethers.JsonRpcProvider(network.rpcUrl, network.chainId);
  }

  private getGovernorReadOnly(): ethers.Contract {
    return new ethers.Contract(PROTOCOL.governor, GOVERNOR_ABI, this.getProvider());
  }

  private getTokenReadOnly(): ethers.Contract {
    return new ethers.Contract(PROTOCOL.idiaToken, IDIA_TOKEN_ABI, this.getProvider());
  }

  // ── Read: Governor Parameters ─────────────────────────────

  async getGovernorParams(): Promise<GovernorParams> {
    const gov = this.getGovernorReadOnly();
    
    // Explicit, independent resolution to prevent individual contract method crashes
    let votingDelay = 0;
    let votingPeriod = 0;
    let proposalThreshold = 0n;
    let quorumNumerator = 0;
    let quorumDenominator = 1;
    let minVotingDelay = 0;
    let maxVotingDelay = 0;
    let minVotingPeriod = 0;
    let maxVotingPeriod = 0;
    let isPaused = false;

    try { votingDelay = Number(await gov.votingDelay()); } catch (e) { console.warn("[GovernanceService] votingDelay missing"); }
    try { votingPeriod = Number(await gov.votingPeriod()); } catch (e) { console.warn("[GovernanceService] votingPeriod missing"); }
    try { proposalThreshold = await gov.proposalThreshold(); } catch (e) { console.warn("[GovernanceService] proposalThreshold missing"); }
    try { quorumNumerator = Number(await gov.quorumNumerator()); } catch (e) { console.warn("[GovernanceService] quorumNumerator missing"); }
    try { quorumDenominator = Number(await gov['QUORUM_DENOMINATOR']()); } catch (e) { console.warn("[GovernanceService] QUORUM_DENOMINATOR missing"); }
    try { minVotingDelay = Number(await gov.minVotingDelay()); } catch (e) { console.warn("[GovernanceService] minVotingDelay missing"); }
    try { maxVotingDelay = Number(await gov.maxVotingDelay()); } catch (e) { console.warn("[GovernanceService] maxVotingDelay missing"); }
    try { minVotingPeriod = Number(await gov.minVotingPeriod()); } catch (e) { console.warn("[GovernanceService] minVotingPeriod missing"); }
    try { maxVotingPeriod = Number(await gov.maxVotingPeriod()); } catch (e) { console.warn("[GovernanceService] maxVotingPeriod missing"); }
    try { isPaused = await gov.proposalsPaused(); } catch (e) { console.warn("[GovernanceService] proposalsPaused missing"); }

    return {
      votingDelay,
      votingPeriod,
      proposalThreshold: ethers.formatEther(proposalThreshold),
      quorumNumerator,
      quorumDenominator,
      minVotingDelay,
      maxVotingDelay,
      minVotingPeriod,
      maxVotingPeriod,
      isPaused,
    };
  }
  
  // Add this method to GovernanceService to replace the failing direct calls
private async callRaw(methodName: string, params: any[] = []): Promise<any> {
  const iface = new ethers.Interface(GOVERNOR_ABI);
  const data = iface.encodeFunctionData(methodName, params);
  const provider = this.getProvider();
  
  try {
    const result = await provider.call({
      to: PROTOCOL.governor,
      data: data
    });
    return iface.decodeFunctionResult(methodName, result)[0];
  } catch (e) {
    console.error(`[GovernanceService] Raw call error for ${methodName}:`, e);
    return null;
  }
}

// Computes quorum as numerator * totalSupply / denominator, matching the Governor's internal math.
private async computeQuorumFromSupply(): Promise<bigint | null> {
  try {
    const provider = this.getProvider();
    const TOKEN_ABI = [
      "function totalSupply() view returns (uint256)",
    ];
    const token = new ethers.Contract(PROTOCOL.idiaToken, TOKEN_ABI, provider);

    const [numeratorRaw, denominatorRaw, supply] = await Promise.all([
      this.callRaw("quorumNumerator", []).catch(() => null),
      this.callRaw("QUORUM_DENOMINATOR", []).catch(() => null),
      token.totalSupply().catch(() => 0n),
    ]);

    const numerator = numeratorRaw != null ? BigInt(numeratorRaw) : 4n;
    const denominator = denominatorRaw != null ? BigInt(denominatorRaw) : 100n;

    if (supply === 0n || denominator === 0n) return null;
    const q = (BigInt(supply) * numerator) / denominator;
    console.log(`[QUORUM_FALLBACK] supply=${supply} num=${numerator} den=${denominator} → quorum=${q}`);
    return q;
  } catch (e) {
    console.warn("[QUORUM_FALLBACK] computeQuorumFromSupply failed", e);
    return null;
  }
}

// Update getCurrentQuorum to use the new raw caller, with deterministic fallback.
async getCurrentQuorum(): Promise<string> {
  const provider = this.getProvider();
  try {
    const blockNumber = await provider.getBlockNumber();
    const quorum = await this.callRaw("quorum", [blockNumber - 1]);
    if (quorum && BigInt(quorum) > 0n) {
      return ethers.formatEther(quorum);
    }
    console.warn("[QUORUM_FALLBACK] Governor.quorum() returned 0 — computing from totalSupply");
    const computed = await this.computeQuorumFromSupply();
    return computed ? ethers.formatEther(computed) : '0';
  } catch (e) {
    console.warn("[GovernanceService] getCurrentQuorum failed", e);
    const computed = await this.computeQuorumFromSupply();
    return computed ? ethers.formatEther(computed) : '0';
  }
}

  // ── Read: Exact Proposal Quorum ───────────────────────────

  async getProposalQuorum(proposalId: string): Promise<string> {
    const gov = this.getGovernorReadOnly();
    try {
      const snapshotBlock = await gov.proposalSnapshot(proposalId);
      if (Number(snapshotBlock) === 0) {
        const computed = await this.computeQuorumFromSupply();
        return computed ? ethers.formatEther(computed) : '0';
      }

      const quorum = await gov.quorum(snapshotBlock);
      if (BigInt(quorum) > 0n) return ethers.formatEther(quorum);

      console.warn(`[QUORUM_FALLBACK] proposal ${proposalId} quorum=0 — falling back to supply math`);
      const computed = await this.computeQuorumFromSupply();
      return computed ? ethers.formatEther(computed) : '0';
    } catch (error) {
      console.error(`[GovernanceService] Quorum fetch failed for proposal ${proposalId}:`, error);
      const computed = await this.computeQuorumFromSupply();
      return computed ? ethers.formatEther(computed) : '0';
    }
  }

  // ── Read: Delegation info ─────────────────────────────────

  async getDelegationInfo(address: string): Promise<{
    balance: string;
    votingPower: string;
    delegatee: string;
    isDelegated: boolean;
    isSelfDelegated: boolean;
  }> {
    const token = this.getTokenReadOnly();
    const [balance, votes, delegatee] = await Promise.all([
      token.balanceOf(address).catch(() => 0n),
      token.getVotes(address).catch(() => 0n),
      token.delegates(address).catch(() => ethers.ZeroAddress),
    ]);

    const isDelegated = delegatee !== ethers.ZeroAddress;
    const isSelfDelegated = delegatee.toLowerCase() === address.toLowerCase();

    return {
      balance: ethers.formatEther(balance),
      votingPower: ethers.formatEther(votes),
      delegatee,
      isDelegated,
      isSelfDelegated,
    };
  }

  // ── Read: Proposals from events ───────────────────────────

  private static readonly GOVERNOR_DEPLOY_BLOCK = ACTIVE_DEPLOYMENT === 'mainnet' ? 46303500 : 0;
  private static readonly MAX_LOG_RANGE = 9999;

  async getRecentProposals(address: string, fromBlock?: number): Promise<ProposalOnChain[]> {
    const provider = this.getProvider();
    const gov = this.getGovernorReadOnly();
    const govInterface = new ethers.Interface(GOVERNOR_ABI);

    const currentBlock = await provider.getBlockNumber();
    const startBlock = fromBlock || GovernanceService.GOVERNOR_DEPLOY_BLOCK;

    const topic0 = ethers.id('ProposalCreated(uint256,address,address[],uint256[],string[],bytes[],uint256,uint256,string)');

    const totalBlocks = currentBlock - startBlock;
    const chunks = Math.ceil(totalBlocks / GovernanceService.MAX_LOG_RANGE);
    
    console.log(`[GovernanceService] Scanning ${totalBlocks} blocks in ${chunks} chunks (${startBlock} → ${currentBlock}) on ${PROTOCOL.governor}`);

    let allLogs: ethers.Log[] = [];

    for (let i = 0; i < chunks; i++) {
      const chunkFrom = startBlock + (i * GovernanceService.MAX_LOG_RANGE);
      const chunkTo = Math.min(chunkFrom + GovernanceService.MAX_LOG_RANGE, currentBlock);

      try {
        const logs = await provider.getLogs({
          address: PROTOCOL.governor,
          topics: [topic0],
          fromBlock: chunkFrom,
          toBlock: chunkTo,
        });

        if (logs.length > 0) {
          console.log(`[GovernanceService] Chunk ${i + 1}/${chunks}: found ${logs.length} events (blocks ${chunkFrom}-${chunkTo})`);
          allLogs = allLogs.concat(logs);
        }
      } catch (e: any) {
        console.warn(`[GovernanceService] Chunk ${i + 1}/${chunks} failed: ${e.message}`);
      }
    }

    console.log(`[GovernanceService] Total ProposalCreated events found: ${allLogs.length}`);

    if (allLogs.length === 0) {
      return [];
    }

    const proposals: ProposalOnChain[] = [];
    const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

    for (let i = 0; i < allLogs.length; i++) {
      const log = allLogs[i];
      if (i > 0) await delay(250); // throttle to avoid RPC 429s
      try {
        const parsed = govInterface.parseLog({ topics: log.topics as string[], data: log.data });
        if (!parsed) continue;

        const proposalId = parsed.args[0].toString();
        const proposer = parsed.args[1];
        const targets = parsed.args[2];
        const values = parsed.args[3].map((v: bigint) => v.toString());
        const calldatas = parsed.args[5];
        const voteStart = Number(parsed.args[6]);
        const voteEnd = Number(parsed.args[7]);
        const description = parsed.args[8];

        const [state, votesResult, hasVoted] = await Promise.all([
          gov.state(proposalId).catch(() => 0),
          gov.proposalVotes(proposalId).catch(() => [0n, 0n, 0n]),
          address ? gov.hasVoted(proposalId, address).catch(() => false) : false,
        ]);

        proposals.push({
          proposalId,
          proposer,
          description,
          state: Number(state),
          stateName: PROPOSAL_STATES[Number(state)] || 'Unknown',
          againstVotes: ethers.formatEther(votesResult[0]),
          forVotes: ethers.formatEther(votesResult[1]),
          abstainVotes: ethers.formatEther(votesResult[2]),
          voteStart,
          voteEnd,
          hasVoted,
          targets,
          values,
          calldatas,
        });
      } catch (e) {
        console.warn('[GovernanceService] Failed to parse proposal event:', e);
      }
    }

    return proposals.reverse();
  }

  // ── Read: Single proposal state ───────────────────────────

  async getProposalState(proposalId: string): Promise<{
    state: number;
    stateName: string;
    forVotes: string;
    againstVotes: string;
    abstainVotes: string;
  }> {
    const gov = this.getGovernorReadOnly();
    const [state, votes] = await Promise.all([
      gov.state(proposalId).catch(() => 0),
      gov.proposalVotes(proposalId).catch(() => [0n, 0n, 0n]),
    ]);

    return {
      state: Number(state),
      stateName: PROPOSAL_STATES[Number(state)] || 'Unknown',
      againstVotes: ethers.formatEther(votes[0]),
      forVotes: ethers.formatEther(votes[1]),
      abstainVotes: ethers.formatEther(votes[2]),
    };
  }

  // ── Write: Create proposal ───────────────────────────────

  async propose(
    description: string,
    targets: string[] = [PROTOCOL.idiaToken],
    values: string[] = ['0'],
    calldatas: string[] = ['0x'],
  ): Promise<{ hash: string; proposalId?: string }> {
    const signer = walletService.getConnectedSigner();
    if (!signer) throw new Error('Wallet not connected');

    const gov = new ethers.Contract(PROTOCOL.governor, GOVERNOR_ABI, signer);
    const tx = await gov.propose(
      targets,
      values.map(v => BigInt(v)),
      calldatas,
      description,
    );
    const receipt = await tx.wait();

    const proposalId = this.extractProposalIdFromReceipt(receipt);

    return { hash: tx.hash, proposalId };
  }

  // ── Write: Create proposal with custom timing ─────────────

  async proposeWithTiming(
    description: string,
    customDelay: number,
    customPeriod: number,
    targets: string[] = [PROTOCOL.idiaToken],
    values: string[] = ['0'],
    calldatas: string[] = ['0x'],
  ): Promise<{ hash: string; proposalId?: string }> {
    const signer = walletService.getConnectedSigner();
    if (!signer) throw new Error('Wallet not connected');

    const gov = new ethers.Contract(PROTOCOL.governor, GOVERNOR_ABI, signer);
    const tx = await gov.proposeWithTiming(
      targets,
      values.map(v => BigInt(v)),
      calldatas,
      description,
      customDelay,
      customPeriod,
    );
    const receipt = await tx.wait();
    const proposalId = this.extractProposalIdFromReceipt(receipt);

    return { hash: tx.hash, proposalId };
  }

  // ── Write: Cast vote ──────────────────────────────────────

  async castVote(
    proposalId: string,
    support: 0 | 1 | 2,
    reason?: string,
  ): Promise<{ hash: string }> {
    const signer = walletService.getConnectedSigner();
    if (!signer) throw new Error('Wallet not connected');

    const gov = new ethers.Contract(PROTOCOL.governor, GOVERNOR_ABI, signer);

    const tx = reason
      ? await gov.castVoteWithReason(proposalId, support, reason)
      : await gov.castVote(proposalId, support);

    await tx.wait();
    return { hash: tx.hash };
  }

  // ── Write: Delegate ───────────────────────────────────────

  async delegate(delegatee: string): Promise<{ hash: string }> {
    const signer = walletService.getConnectedSigner();
    if (!signer) throw new Error('Wallet not connected');

    const token = new ethers.Contract(PROTOCOL.idiaToken, IDIA_TOKEN_ABI, signer);
    const tx = await token.delegate(delegatee);
    await tx.wait();
    return { hash: tx.hash };
  }

  async selfDelegate(): Promise<{ hash: string }> {
    const address = walletService.getAddress();
    if (!address) throw new Error('Wallet not connected');
    return this.delegate(address);
  }

  async undelegate(): Promise<{ hash: string }> {
    return this.delegate(ethers.ZeroAddress);
  }

  // ── Helpers ───────────────────────────────────────────────

  private extractProposalIdFromReceipt(receipt: ethers.TransactionReceipt): string | undefined {
    try {
      const govInterface = new ethers.Interface(GOVERNOR_ABI);
      for (const log of receipt.logs) {
        try {
          const parsed = govInterface.parseLog({ topics: log.topics as string[], data: log.data });
          console.log("[DEBUG_TX_LOGS] Event Parsed:", parsed?.name);
          if (parsed?.name === 'ProposalCreated') {
            console.log("[DEBUG_TX_LOGS] ProposalCreated Arg0:", parsed.args[0].toString());
            return parsed.args[0].toString();
          }
        } catch { /* not our event */ }
      }
    } catch (e) {
      console.error("[DEBUG_TX_LOGS] Parse failed:", e);
    }
    return undefined;
  }
}

export const governanceService = new GovernanceService();