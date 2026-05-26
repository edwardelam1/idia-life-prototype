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
    
    // Decoupled calls to prevent individual contract method crashes from aborting the whole sync
    const [
      votingDelay, votingPeriod, proposalThreshold,
      minVotingDelay, maxVotingDelay,
      minVotingPeriod, maxVotingPeriod,
      isPaused,
    ] = await Promise.all([
      gov.votingDelay(),
      gov.votingPeriod(),
      gov.proposalThreshold(),
      gov.minVotingDelay(),
      gov.maxVotingDelay(),
      gov.minVotingPeriod(),
      gov.maxVotingPeriod(),
      gov.proposalsPaused(),
    ]);

    // Defensively handle quorum methods which may not exist on your specific contract deployment
    let quorumNumerator = 0;
    let quorumDenominator = 1;

    try {
      if (typeof gov.quorumNumerator === 'function') {
        quorumNumerator = Number(await gov.quorumNumerator());
      }
      if (typeof gov['QUORUM_DENOMINATOR'] === 'function') {
        quorumDenominator = Number(await gov['QUORUM_DENOMINATOR']());
      }
    } catch (e) {
      console.warn("[GovernanceService] Quorum numerator/denominator methods unavailable on contract.");
    }

    return {
      votingDelay: Number(votingDelay),
      votingPeriod: Number(votingPeriod),
      proposalThreshold: ethers.formatEther(proposalThreshold),
      quorumNumerator,
      quorumDenominator,
      minVotingDelay: Number(minVotingDelay),
      maxVotingDelay: Number(maxVotingDelay),
      minVotingPeriod: Number(minVotingPeriod),
      maxVotingPeriod: Number(maxVotingPeriod),
      isPaused,
    };
  }
  
  // ── Read: Current quorum requirement ──────────────────────

  async getCurrentQuorum(): Promise<string> {
    const gov = this.getGovernorReadOnly();
    const provider = this.getProvider();
    const blockNumber = await provider.getBlockNumber();
    try {
      // Some versions of Governor use quorum(blockNumber), others use quorum(timestamp)
      // or simply don't have a public quorum function.
      const quorum = await gov.quorum(blockNumber - 1);
      return ethers.formatEther(quorum);
    } catch {
      return '0';
    }
  }

  // ── Read: Exact Proposal Quorum ───────────────────────────

  async getProposalQuorum(proposalId: string): Promise<string> {
    const gov = this.getGovernorReadOnly();
    try {
      // 1. Fetch the exact block where the voting power snapshot was taken
      const snapshotBlock = await gov.proposalSnapshot(proposalId);
      
      // 2. Query the exact quorum evaluated at that historical block
      const quorum = await gov.quorum(snapshotBlock);
      return ethers.formatEther(quorum);
    } catch (error) {
      console.error(`[GovernanceService] Quorum fetch failed for proposal ${proposalId}:`, error);
      return '0';
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
      token.balanceOf(address),
      token.getVotes(address),
      token.delegates(address),
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
          allLogs = allLogs.concat(logs);
        }
      } catch (e: any) {
        console.warn(`[GovernanceService] Chunk ${i + 1}/${chunks} failed: ${e.message}`);
      }
    }

    if (allLogs.length === 0) {
      return [];
    }

    const proposals: ProposalOnChain[] = [];

    for (const log of allLogs) {
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
          gov.state(proposalId),
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

  async getProposalState(proposalId: string): Promise<{
    state: number;
    stateName: string;
    forVotes: string;
    againstVotes: string;
    abstainVotes: string;
  }> {
    const gov = this.getGovernorReadOnly();
    const [state, votes] = await Promise.all([
      gov.state(proposalId),
      gov.proposalVotes(proposalId),
    ]);

    return {
      state: Number(state),
      stateName: PROPOSAL_STATES[Number(state)] || 'Unknown',
      againstVotes: ethers.formatEther(votes[0]),
      forVotes: ethers.formatEther(votes[1]),
      abstainVotes: ethers.formatEther(votes[2]),
    };
  }

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

  private extractProposalIdFromReceipt(receipt: ethers.TransactionReceipt): string | undefined {
    try {
      const govInterface = new ethers.Interface(GOVERNOR_ABI);
      for (const log of receipt.logs) {
        try {
          const parsed = govInterface.parseLog({ topics: log.topics as string[], data: log.data });
          if (parsed?.name === 'ProposalCreated') {
            return parsed.args[0].toString();
          }
        } catch { /* not our event */ }
      }
    } catch { /* parse failed */ }
    return undefined;
  }
}

export const governanceService = new GovernanceService();