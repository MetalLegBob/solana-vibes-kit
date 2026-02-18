---
pack: solana
topic: "Agentic Wallet Architecture"
decision: "How should I design wallet infrastructure for autonomous AI agents on Solana?"
confidence: 8/10
sources_checked: 34
last_updated: "2026-02-18"
---

# Agentic Wallet Architecture

> **Decision:** How should I design wallet infrastructure for autonomous AI agents on Solana?

## Context

AI agents are transitioning from advisory tools to autonomous actors that spend, earn, and trade digital assets without human intervention. This creates a fundamental infrastructure challenge: agents need wallets to operate on-chain, but giving an AI model unrestricted access to a private key is a security disaster waiting to happen. The agent could be prompt-injected, its hosting environment could be compromised, or it could simply make a catastrophic misjudgment. Unlike human users who hold their own keys and accept the consequences, agents act on behalf of users, creating a triangle of competing needs: the platform cannot be custodial, the owner must retain ultimate control, and the agent must be able to act autonomously.

Solana is uniquely suited for agentic wallets due to its sub-second finality, negligible transaction costs (roughly $0.00025 per transaction), and native program composability via Cross-Program Invocations (CPIs). An agent monitoring markets and executing trades might submit hundreds of transactions daily -- on Ethereum mainnet that operational tempo could cost thousands in gas, on Solana it costs pennies. Additionally, Solana's Program Derived Addresses (PDAs) provide a native on-chain primitive for building agent vaults that are controlled by program logic rather than private keys, enabling delegation patterns that are not possible on account-model chains without smart contract wallets.

The wallet architecture landscape for AI agents has matured rapidly in late 2025 and early 2026. Coinbase launched purpose-built Agentic Wallets in February 2026. Crossmint pioneered the dual-key architecture combining smart wallets with TEE-secured agent keys. Turnkey provides API-driven key management with a policy engine running inside AWS Nitro Enclaves. Squads Protocol v4 offers multisig-based agent wallets with spending limits and roles. This guide provides a deep comparison of these approaches, with practical implementation guidance for Solana developers.

## Options

### Option A: Coinbase Agentic Wallets

**What:** A standalone wallet infrastructure built specifically for AI agents, launched February 2026. Agents authenticate via email OTP, hold USDC, and send, trade, or pay for services on Base -- without ever touching private keys. Integrates with the x402 protocol for machine-to-machine payments.

**Architecture:**
- **Authentication:** Email-based OTP flow. Agent calls `npx awal auth login <email>`, receives a flow ID, then verifies with `npx awal auth verify <flowId> <otp>`.
- **Key isolation:** Private keys remain inside Coinbase infrastructure. The agent never sees or handles key material.
- **Spending controls:** Configurable per-session and per-transaction spending limits enforced server-side before any transaction executes.
- **KYT screening:** Automatic Know-Your-Transaction screening blocks high-risk interactions.
- **x402 integration:** Native support for HTTP 402 Payment Required protocol -- agents can both consume and provide paid APIs.
- **Skill system:** Capabilities installed via `npx skills add coinbase/agentic-wallet-skills`, including authenticate, fund, send-usdc, trade, search-for-service, pay-for-service, and monetize-service.

**Pros:**
- Fastest time-to-integration: wallet running in under 2 minutes
- Zero key management burden -- Coinbase handles custody
- Built-in compliance (KYT screening, audit trails)
- Gasless trading on Base
- Native x402 for agent-to-agent commerce
- MCP server support for Claude and other MCP-compatible models

**Cons:**
- Currently Base-only (no native Solana support yet)
- Custodial dependency on Coinbase infrastructure
- Limited to USDC and Base tokens (ETH, WETH)
- No custom smart contract interactions
- Centralization risk -- Coinbase controls the wallet infrastructure

**Best for:** Teams that want instant agent wallet capabilities without managing keys, especially for x402-powered agent commerce and API payment use cases.

**Code Example:**

```typescript
// Coinbase Agentic Wallet -- CLI-based integration
// Agents invoke these commands programmatically or via MCP skills

// 1. Install agentic wallet skills
// $ npx skills add coinbase/agentic-wallet-skills

// 2. Authenticate (agent triggers email OTP)
// $ npx awal auth login agent@myproject.com
// $ npx awal auth verify <flowId> <otp-code>

// 3. Check status and balance
// $ npx awal status
// $ npx awal balance

// 4. Send USDC
// $ npx awal send 10 vitalik.eth

// 5. Trade tokens on Base
// $ npx awal trade 5 usdc eth

// 6. Pay for an API via x402
// $ npx awal x402 bazaar search "weather API"
// $ npx awal x402 pay https://api.example.com/weather

// Programmatic usage via AgentKit (for deeper integration)
import { CdpAgentkit } from "@coinbase/cdp-agentkit-core";
import { CdpToolkit } from "@coinbase/cdp-langchain";
import { ChatOpenAI } from "@langchain/openai";
import { createReactAgent } from "@langchain/langgraph/prebuilt";

const agentkit = await CdpAgentkit.configureWithWallet();
const toolkit = new CdpToolkit(agentkit);
const tools = toolkit.getTools();

const llm = new ChatOpenAI({ model: "gpt-4o" });
const agent = createReactAgent({ llm, tools });

const result = await agent.invoke({
  messages: [{ role: "user", content: "Send 5 USDC to alice.eth" }],
});
```

### Option B: Crossmint Dual-Key Architecture

**What:** A smart wallet controlled by two independent keys -- one held by the asset owner (user) and one held by the agent running inside a Trusted Execution Environment (TEE). Neither key alone is sufficient to compromise the wallet, and the platform never has access to either key.

**Architecture:**
- **Smart wallet:** An on-chain smart contract wallet (account abstraction) that accepts signatures from two authorized signers.
- **Owner key:** Held by the user who deployed the agent. Provides ultimate control -- can revoke agent access, withdraw funds, and update wallet configuration.
- **Agent key:** Generated inside a TEE (e.g., Phala Network). The key never leaves the enclave. Only the agent process running inside the TEE can use it.
- **Platform isolation:** The launchpad/platform never has access to either key, making it non-custodial by design. This is critical for regulatory compliance.
- **Chain support:** EVM chains and Solana smart wallets (using Crossmint's Solana Smart Wallet infrastructure).

**How the dual-key model solves the trust triangle:**
1. **Platform cannot control wallet** -- neither key is accessible to the platform
2. **Owner controls the wallet** -- owner key provides override authority
3. **Agent can act autonomously** -- agent key inside TEE enables independent operation

**Pros:**
- Non-custodial for all parties (platform, user, and infrastructure provider)
- TEE guarantees agent key cannot be extracted or tampered with
- Owner retains kill-switch capability
- Works across EVM and Solana
- Open-source reference implementation (agent-launchpad-starter-kit)
- Regulatory compliance built into the architecture

**Cons:**
- More complex setup than managed solutions
- Requires TEE deployment infrastructure (Phala Network, Marlin, etc.)
- Smart wallet gas costs (mitigated on Solana by low fees)
- TEE provider becomes a dependency
- Beta-stage -- no formal security audits yet

**Best for:** Agent launchpads and platforms that host agents on behalf of users, where non-custodial architecture is a regulatory requirement.

**Code Example:**

```typescript
// Crossmint Dual-Key Architecture -- Solana Smart Wallet setup
// From the agent-launchpad-starter-kit

// 1. Generate agent keypair inside TEE (runs in enclave)
import { Keypair } from "@solana/web3.js";

// This keypair is generated INSIDE the TEE -- never leaves the enclave
const agentKeypair = Keypair.generate();
const agentPublicKey = agentKeypair.publicKey.toBase58();

// 2. Create Crossmint smart wallet with dual signers
import { CrossmintClient } from "@crossmint/server-sdk";

const crossmint = new CrossmintClient({
  apiKey: process.env.CROSSMINT_SERVER_API_KEY!,
});

// Create a smart wallet linked to the agent's owner
const wallet = await crossmint.wallets.create({
  type: "solana-smart-wallet",
  config: {
    // Owner signer -- the user who deployed the agent
    adminSigner: {
      type: "solana-keypair",
      address: ownerPublicKey,
    },
    // Agent signer -- the TEE-secured key
    delegatedSigner: {
      type: "solana-keypair",
      address: agentPublicKey,
    },
  },
});

console.log("Smart wallet address:", wallet.address);

// 3. Agent signs transactions inside the TEE
import { Transaction, SystemProgram, LAMPORTS_PER_SOL } from "@solana/web3.js";

async function agentTransfer(recipient: string, amountSol: number) {
  const tx = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: wallet.address,
      toPubkey: new PublicKey(recipient),
      lamports: amountSol * LAMPORTS_PER_SOL,
    })
  );

  // Agent signs with its TEE-secured key
  tx.sign(agentKeypair);

  // Submit via Crossmint for smart wallet execution
  const result = await crossmint.wallets.signAndSendTransaction({
    walletAddress: wallet.address,
    transaction: tx.serialize().toString("base64"),
  });

  return result;
}
```

### Option C: Turnkey Policy Engine with TEE Infrastructure

**What:** API-based wallet management where private keys are generated and stored inside AWS Nitro Enclaves. A policy engine evaluates every transaction request against configurable rules before signing is permitted. Supports Solana natively with granular transaction-level policies.

**Architecture:**
- **Enclave applications:** Five types of enclave run inside AWS Nitro: TLS Fetcher (secure external connectivity), Parser (transaction metadata extraction), Signer (key creation and signing), Notarizer (data integrity), and Policy Engine (authentication and authorization).
- **Threat model:** Only enclave applications and their Quorum Sets are trusted. Everything else -- including AWS admins, Turnkey admins, and the database -- is considered untrusted.
- **Policy language:** JSON-based policies with an expression language that evaluates to boolean. Supports `effect` (ALLOW/DENY), `consensus` (which users can approve), and `condition` (when the policy applies).
- **Solana policy engine:** Parses Solana transaction metadata including instruction call data, SOL transfers, program keys, token transfers (SPL), and address table lookups.
- **Delegated access:** Create scoped API-only users within sub-organizations that can only perform specific actions (e.g., sign transactions to whitelisted addresses).
- **Signing speed:** 50-100x faster than MPC solutions due to TEE-based architecture.

**Pros:**
- Non-custodial -- Turnkey cannot access keys even with database access
- Granular Solana-specific policies (program allowlists, transfer limits, instruction filtering)
- Formally verifiable security model (reproducible builds via StageX, QuorumOS)
- Production-proven at scale (powers Moonshot, Magic Eden, Azura)
- Supports passkeys, API keys, and delegated access
- Near-instant signing latency

**Cons:**
- Requires Turnkey account and API setup
- Policy language has a learning curve
- Managed service dependency
- Costs scale with transaction volume
- More setup complexity than simple private key approach

**Best for:** Production applications managing significant funds that need granular, programmatic control over what agents can and cannot do on Solana.

**Code Example:**

```typescript
// Turnkey -- Solana Policy Engine configuration

// Policy: Allow agent to send SOL only to whitelisted addresses
const allowlistPolicy = {
  policyName: "Agent can only send to treasury and operator",
  effect: "EFFECT_ALLOW",
  consensus:
    "approvers.any(user, user.id == '<AGENT_USER_ID>')",
  condition:
    "solana.tx.transfers.all(transfer, " +
    "transfer.to == '<TREASURY_ADDRESS>' || " +
    "transfer.to == '<OPERATOR_ADDRESS>')",
};

// Policy: Block interactions with unknown programs
const programAllowlistPolicy = {
  policyName: "Only allow known Solana programs",
  effect: "EFFECT_ALLOW",
  condition:
    "solana.tx.program_keys.all(p, " +
    "p == '11111111111111111111111111111111' || " +  // System Program
    "p == 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA' || " +  // Token Program
    "p == 'JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4')",  // Jupiter
};

// Policy: Deny address table lookups (anti-obfuscation)
const denyLookupTablesPolicy = {
  policyName: "Deny transactions using address table lookups",
  effect: "EFFECT_DENY",
  condition: "solana.tx.address_table_lookups.count() > 0",
};

// Turnkey SDK integration for agent wallet
import { Turnkey } from "@turnkey/sdk-server";
import { TurnkeySigner } from "@turnkey/solana";

const turnkey = new Turnkey({
  apiBaseUrl: "https://api.turnkey.com",
  apiPrivateKey: process.env.TURNKEY_API_PRIVATE_KEY!,
  apiPublicKey: process.env.TURNKEY_API_PUBLIC_KEY!,
  defaultOrganizationId: process.env.TURNKEY_ORG_ID!,
});

// Create a delegated user for the agent with scoped permissions
const agentUser = await turnkey.apiClient().createApiOnlyUsers({
  apiOnlyUsers: [{
    userName: "trading-agent-v1",
    apiKeys: [{
      apiKeyName: "agent-signing-key",
      publicKey: agentPublicKeyHex,
    }],
  }],
});

// Create policies for the agent user
await turnkey.apiClient().createPolicy({
  policyName: "Agent transfer allowlist",
  effect: "EFFECT_ALLOW",
  consensus:
    `approvers.any(user, user.id == '${agentUser.userIds[0]}')`,
  condition:
    "solana.tx.transfers.all(transfer, " +
    `transfer.to == '${TREASURY_ADDRESS}')`,
});

// Agent signs transactions -- policies enforced automatically
const signer = new TurnkeySigner({
  organizationId: process.env.TURNKEY_ORG_ID!,
  client: turnkey.apiClient(),
});

const signedTx = await signer.signTransaction(
  unsignedTransaction,
  agentWalletAddress,
);
```

### Option D: Squads Multisig as Agent Wallet

**What:** Using Squads Protocol v4 multisig on Solana as an agent wallet where the agent is one signer and a human (or set of humans) are co-signers. Squads v4 adds spending limits, roles (Proposer/Voter/Executor), time locks, and sub-accounts -- making it well-suited for agent delegation patterns.

**Architecture:**
- **Multisig vault:** A PDA-based smart account on Solana controlled by multiple signers with configurable threshold.
- **Roles:** Proposer (can create transactions), Voter (can approve), Executor (can execute approved transactions). An agent can be assigned Proposer + Executor while humans are Voters.
- **Spending limits:** v4 introduces native spending limits per member, enabling agents to have capped autonomous authority.
- **Sub-accounts:** Separate vault accounts for different purposes (e.g., agent operating funds vs. long-term treasury).
- **Time locks:** Configurable delay between proposal and execution, giving humans time to review.
- **Program:** Deployed at `SQDS4ep65T869zMMBKyuUq6aD6EgTu8psMjkvj52pCf` on both mainnet and devnet.

**Agent patterns with Squads:**
1. **Agent as Proposer:** Agent proposes transactions, humans approve. Fully supervised.
2. **Agent with spending limit:** Agent can autonomously execute transactions below a spending limit without additional approvals.
3. **Agent + human co-signer:** 2-of-2 multisig where both agent and one human must sign. Balanced autonomy.
4. **Agent as Executor only:** Agent can only execute transactions that have already been approved by human voters.

**Pros:**
- Fully on-chain, formally verified, immutable program
- Native Solana -- no bridge to external infrastructure
- $15B+ in assets secured by Squads Protocol
- Spending limits and roles provide granular delegation
- Sub-accounts enable fund isolation
- Open source (AGPL-3.0)
- No external service dependency beyond Solana itself

**Cons:**
- Agent still needs a private key (just scoped with roles)
- Transaction overhead for multisig proposal/approval/execution flow
- Less flexible than programmable policy engines for complex conditions
- No built-in TEE support -- agent key security is your responsibility
- UI (Squads app) designed for humans, not agents

**Best for:** Teams that want fully on-chain agent authorization, need human co-signing for high-value operations, or already use Squads for treasury management.

**Code Example:**

```typescript
// Squads v4 -- Agent as Proposer with spending limit
import * as multisig from "@sqds/multisig";
import {
  Connection,
  Keypair,
  PublicKey,
  TransactionMessage,
  SystemProgram,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";

const connection = new Connection(process.env.SOLANA_RPC_URL!);
const agentKeypair = Keypair.fromSecretKey(/* agent key */);

// Derive the multisig PDA
const [multisigPda] = multisig.getMultisigPda({
  createKey: createKeypair.publicKey,
});

// Derive the vault PDA (default vault index 0)
const [vaultPda] = multisig.getVaultPda({
  multisigPda,
  index: 0,
});

// Agent creates a transfer proposal
const transactionIndex = await multisig.getNextTransactionIndex(
  connection,
  multisigPda,
);

const transferIx = SystemProgram.transfer({
  fromPubkey: vaultPda,
  toPubkey: new PublicKey("RecipientAddress..."),
  lamports: 0.5 * LAMPORTS_PER_SOL,
});

const transferMessage = new TransactionMessage({
  payerKey: vaultPda,
  recentBlockhash: (await connection.getLatestBlockhash()).blockhash,
  instructions: [transferIx],
});

// Step 1: Agent creates the vault transaction
await multisig.rpc.vaultTransactionCreate({
  connection,
  feePayer: agentKeypair,       // Agent pays fees
  multisigPda,
  transactionIndex: BigInt(transactionIndex),
  creator: agentKeypair.publicKey,
  vaultIndex: 0,
  ephemeralSigners: 0,
  transactionMessage: transferMessage,
});

// Step 2: Agent votes to approve (if agent has Voter role)
await multisig.rpc.proposalApprove({
  connection,
  feePayer: agentKeypair,
  multisigPda,
  transactionIndex: BigInt(transactionIndex),
  member: agentKeypair.publicKey,
});

// Step 3: Once threshold is met (human also approved),
// agent executes the transaction
await multisig.rpc.vaultTransactionExecute({
  connection,
  feePayer: agentKeypair,
  multisigPda,
  transactionIndex: BigInt(transactionIndex),
  member: agentKeypair.publicKey,
});
```

### Option E: Solana-Native PDA Vaults with CPI Delegation

**What:** Building agent wallet infrastructure directly on Solana using Program Derived Addresses (PDAs) as agent vaults. The program logic itself enforces spending rules, and the agent interacts via CPI. No external services required.

**Architecture:**
- **PDA vault:** A PDA owned by your program acts as the agent's wallet. Since PDAs have no private key, funds can only be moved by the program that derived the address.
- **CPI signing:** Your program "signs" for the PDA via `invoke_signed`, providing the seeds used to derive the address. This extends signer privileges from your program to the called program (e.g., System Program for SOL transfers, Token Program for SPL transfers).
- **On-chain policy:** Spending rules, allowlists, time locks, and rate limits are encoded directly in the program. No off-chain policy engine needed.
- **Agent authority:** The agent holds a regular keypair that is registered as an authorized operator in the program's state. The program checks `agent_authority` on every instruction.
- **Owner override:** A separate `owner` authority can revoke agent access, withdraw funds, or update policy parameters.

**Pros:**
- Fully decentralized -- no external service dependencies
- Customizable to exact requirements
- Lowest possible latency (single transaction, no off-chain checks)
- Composable with any Solana program via CPI
- Transparent -- all logic is on-chain and auditable
- No ongoing service costs beyond Solana transaction fees

**Cons:**
- Requires Solana program development expertise (Anchor/Rust)
- Must build and audit your own security logic
- No pre-built UI or management tools
- Policy updates require program upgrades (unless designed for dynamic config)
- Higher upfront development cost

**Best for:** Teams with Solana program expertise building custom agent infrastructure, protocols that need agents as first-class on-chain participants, or applications where external service dependencies are unacceptable.

**Code Example:**

```rust
// Anchor program -- PDA-based agent vault with spending controls

use anchor_lang::prelude::*;

declare_id!("AgntVau1t11111111111111111111111111111111");

#[program]
pub mod agent_vault {
    use super::*;

    /// Initialize a new agent vault with owner and agent authority
    pub fn initialize(
        ctx: Context<Initialize>,
        daily_limit_lamports: u64,
        per_tx_limit_lamports: u64,
    ) -> Result<()> {
        let vault_config = &mut ctx.accounts.vault_config;
        vault_config.owner = ctx.accounts.owner.key();
        vault_config.agent = ctx.accounts.agent.key();
        vault_config.daily_limit = daily_limit_lamports;
        vault_config.per_tx_limit = per_tx_limit_lamports;
        vault_config.spent_today = 0;
        vault_config.last_reset_slot = Clock::get()?.slot;
        vault_config.bump = ctx.bumps.vault;
        Ok(())
    }

    /// Agent-initiated transfer with spending limit enforcement
    pub fn agent_transfer(
        ctx: Context<AgentTransfer>,
        lamports: u64,
    ) -> Result<()> {
        let config = &mut ctx.accounts.vault_config;
        let clock = Clock::get()?;

        // Reset daily counter if new day (~216,000 slots per day)
        if clock.slot - config.last_reset_slot > 216_000 {
            config.spent_today = 0;
            config.last_reset_slot = clock.slot;
        }

        // Enforce per-transaction limit
        require!(
            lamports <= config.per_tx_limit,
            VaultError::ExceedsPerTxLimit
        );

        // Enforce daily limit
        require!(
            config.spent_today + lamports <= config.daily_limit,
            VaultError::ExceedsDailyLimit
        );

        config.spent_today += lamports;

        // CPI: transfer SOL from vault PDA
        let seeds = &[
            b"vault",
            config.owner.as_ref(),
            &[config.bump],
        ];
        let signer_seeds = &[&seeds[..]];

        anchor_lang::system_program::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.system_program.to_account_info(),
                anchor_lang::system_program::Transfer {
                    from: ctx.accounts.vault.to_account_info(),
                    to: ctx.accounts.recipient.to_account_info(),
                },
                signer_seeds,
            ),
            lamports,
        )?;

        Ok(())
    }

    /// Owner can revoke agent access
    pub fn revoke_agent(ctx: Context<OwnerAction>) -> Result<()> {
        ctx.accounts.vault_config.agent = Pubkey::default();
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,
    /// CHECK: agent authority, does not need to sign init
    pub agent: UncheckedAccount<'info>,
    #[account(
        init,
        payer = owner,
        space = 8 + VaultConfig::INIT_SPACE,
        seeds = [b"config", owner.key().as_ref()],
        bump
    )]
    pub vault_config: Account<'info, VaultConfig>,
    /// CHECK: PDA vault that holds funds
    #[account(
        seeds = [b"vault", owner.key().as_ref()],
        bump
    )]
    pub vault: UncheckedAccount<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct AgentTransfer<'info> {
    pub agent: Signer<'info>,
    #[account(
        mut,
        has_one = agent,
        seeds = [b"config", vault_config.owner.as_ref()],
        bump
    )]
    pub vault_config: Account<'info, VaultConfig>,
    /// CHECK: PDA vault
    #[account(
        mut,
        seeds = [b"vault", vault_config.owner.as_ref()],
        bump = vault_config.bump
    )]
    pub vault: UncheckedAccount<'info>,
    /// CHECK: recipient of funds
    #[account(mut)]
    pub recipient: UncheckedAccount<'info>,
    pub system_program: Program<'info, System>,
}

#[account]
#[derive(InitSpace)]
pub struct VaultConfig {
    pub owner: Pubkey,
    pub agent: Pubkey,
    pub daily_limit: u64,
    pub per_tx_limit: u64,
    pub spent_today: u64,
    pub last_reset_slot: u64,
    pub bump: u8,
}

#[error_code]
pub enum VaultError {
    #[msg("Transfer exceeds per-transaction limit")]
    ExceedsPerTxLimit,
    #[msg("Transfer exceeds daily spending limit")]
    ExceedsDailyLimit,
}
```

**TypeScript client for the PDA vault:**

```typescript
// Client-side: Agent interacting with the PDA vault
import { Program, AnchorProvider, BN } from "@coral-xyz/anchor";
import { Connection, Keypair, PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { AgentVault } from "./idl/agent_vault";

const connection = new Connection(process.env.SOLANA_RPC_URL!);
const agentKeypair = Keypair.fromSecretKey(/* loaded from secure storage */);
const ownerPubkey = new PublicKey("OwnerPubkeyHere...");

const provider = new AnchorProvider(connection, agentWallet, {});
const program = new Program<AgentVault>(idl, provider);

// Derive PDAs
const [vaultConfig] = PublicKey.findProgramAddressSync(
  [Buffer.from("config"), ownerPubkey.toBuffer()],
  program.programId,
);
const [vault] = PublicKey.findProgramAddressSync(
  [Buffer.from("vault"), ownerPubkey.toBuffer()],
  program.programId,
);

// Agent sends 0.1 SOL to a recipient
const tx = await program.methods
  .agentTransfer(new BN(0.1 * LAMPORTS_PER_SOL))
  .accounts({
    agent: agentKeypair.publicKey,
    vaultConfig,
    vault,
    recipient: new PublicKey("RecipientAddress..."),
    systemProgram: SystemProgram.programId,
  })
  .signers([agentKeypair])
  .rpc();

console.log("Agent transfer signature:", tx);
```

### Option F: Session Keys / Delegated Authority

**What:** Temporary, scoped keypairs that grant an agent limited permissions for a defined period. The agent receives a session key that can sign specific transaction types until it expires, without ever holding the master key.

**Architecture:**
- **Session creation:** The owner creates a temporary keypair and registers it on-chain (or with a wallet provider) with constraints: valid-until timestamp, allowed programs, spending cap, allowed recipients.
- **Scoped signing:** The session key can only sign transactions that match its constraints. Any transaction outside scope is rejected.
- **Auto-expiry:** Session keys become invalid after their TTL, requiring the owner to issue a new session.
- **Revocation:** Owner can revoke a session key at any time by updating the on-chain state or calling the provider API.

**Implementation approaches on Solana:**
1. **Turnkey delegated access:** Create an API-only user with time-scoped policies. The delegated user can only sign specific transaction types.
2. **On-chain session account:** Store session parameters in a PDA; the program checks `Clock::get()?.unix_timestamp < session.expires_at` before allowing the agent to act.
3. **Crossmint delegated signers:** Add a temporary delegated signer to a smart wallet with scoped permissions.

**Pros:**
- Minimal blast radius -- compromised session key has limited scope and TTL
- Clean separation between long-lived owner key and short-lived agent key
- Easy to audit -- session constraints are explicit
- Natural fit for task-specific agents (e.g., "rebalance my portfolio for the next 4 hours")

**Cons:**
- Session renewal adds operational complexity
- On-chain session accounts cost rent
- No standardized session key protocol on Solana (unlike ERC-4337/7702 on Ethereum)
- Agent must handle session expiry gracefully

**Best for:** Task-specific agents that need temporary authority, applications with strict time-bounded operations, or any case where the principle of least privilege is paramount.

**Code Example:**

```typescript
// Session key pattern -- on-chain session with Anchor

// On-chain session account structure (Rust)
// #[account]
// pub struct AgentSession {
//     pub vault: Pubkey,
//     pub session_key: Pubkey,
//     pub expires_at: i64,        // Unix timestamp
//     pub spending_cap: u64,       // Max lamports for this session
//     pub spent: u64,              // Lamports spent so far
//     pub allowed_programs: Vec<Pubkey>,
// }

// TypeScript: Owner creates a session for the agent
import { Keypair, PublicKey } from "@solana/web3.js";

const sessionKeypair = Keypair.generate();
const FOUR_HOURS = 4 * 60 * 60; // seconds

const tx = await program.methods
  .createSession({
    sessionKey: sessionKeypair.publicKey,
    expiresAt: new BN(Math.floor(Date.now() / 1000) + FOUR_HOURS),
    spendingCap: new BN(2 * LAMPORTS_PER_SOL),    // 2 SOL max
    allowedPrograms: [
      SystemProgram.programId,
      TOKEN_PROGRAM_ID,
      new PublicKey("JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4"), // Jupiter
    ],
  })
  .accounts({
    owner: ownerKeypair.publicKey,
    sessionAccount: sessionPda,
    vault: vaultPda,
  })
  .signers([ownerKeypair])
  .rpc();

// Agent uses the session key (within scope and TTL)
const agentTx = await program.methods
  .sessionTransfer(new BN(0.5 * LAMPORTS_PER_SOL))
  .accounts({
    sessionKey: sessionKeypair.publicKey,
    sessionAccount: sessionPda,
    vault: vaultPda,
    recipient: recipientPubkey,
  })
  .signers([sessionKeypair])
  .rpc();

// Owner revokes session early if needed
const revokeTx = await program.methods
  .revokeSession()
  .accounts({
    owner: ownerKeypair.publicKey,
    sessionAccount: sessionPda,
  })
  .signers([ownerKeypair])
  .rpc();
```

## Trusted Execution Environments (TEEs) Deep Dive

TEEs are foundational to modern agentic wallet security. They deserve dedicated coverage because they solve the hardest problem in agent key management: how do you give an agent a key it can use but nobody (including the agent's operator) can extract?

### What is a TEE?

A Trusted Execution Environment is a hardware-isolated area within a processor where code and data are protected from the host operating system, hypervisor, and even physical access to the machine. The key properties:

1. **Isolation:** Code and memory inside the enclave are encrypted and inaccessible to the host.
2. **Integrity:** The enclave guarantees code has not been tampered with.
3. **Attestation:** Remote parties can cryptographically verify what code is running inside the enclave.

### TEE Implementations Compared

| Property | Intel SGX | AWS Nitro Enclaves | ARM TrustZone |
|---|---|---|---|
| **Isolation model** | Process-level enclave | VM-level enclave | CPU world separation |
| **Memory encryption** | Yes (MEE) | Yes (full VM) | Partial |
| **Remote attestation** | Yes (DCAP/EPID) | Yes (PCR-based) | Limited |
| **Max enclave memory** | 256 MB (SGX1), larger with SGX2 | Configurable (GBs) | Varies |
| **Cloud availability** | Azure, some bare metal | AWS only | Edge devices |
| **Best for** | Process-level key operations | Full application isolation | Mobile/IoT |

### Why Turnkey Chose AWS Nitro Enclaves

Turnkey runs its entire signing infrastructure inside AWS Nitro Enclaves. Their rationale:

- **VM-level isolation:** Nitro Enclaves run as separate VMs with no persistent storage, no external networking, and no interactive access. Not even AWS administrators can access the enclave.
- **Scalability:** Unlike SGX's memory limitations, Nitro Enclaves can allocate gigabytes of memory, enabling full application stacks.
- **Reproducible builds:** Combined with StageX (reproducible build system) and QuorumOS (secure base OS), Turnkey can prove exactly what code is running.
- **No side-channel history:** SGX has faced multiple side-channel attacks (Foreshadow, Plundervolt). Nitro's VM-level isolation has a cleaner security track record.

### TEE + Agent Wallet Pattern

```
[Agent Process]  <-->  [TEE Enclave]  <-->  [Blockchain]
     |                      |
     |  Requests action     |  Holds private key
     |  (e.g., "swap 1 SOL |  Signs transactions
     |   for USDC")         |  Enforces policies
     |                      |  Returns signed tx
     |  <-- signed tx ---   |
     |                      |
     v                      v
[LLM reasoning]      [Key never leaves
 happens outside       the enclave]
 the enclave]
```

The critical insight: the LLM reasoning (which may be vulnerable to prompt injection) runs *outside* the TEE. Only the signing logic runs *inside* the TEE with the private key. Even if the LLM is compromised, the TEE's policy engine rejects transactions that violate constraints.

## Policy Engine Design Patterns

Regardless of which wallet architecture you choose, a policy engine is essential. Here are the key patterns:

### Spending Limits

```typescript
interface SpendingPolicy {
  perTransaction: number;     // Max lamports per single tx
  perSession: number;         // Max lamports per agent session
  perDay: number;             // Max lamports per 24-hour window
  perWeek: number;            // Max lamports per 7-day window
}

// Example: conservative DeFi agent
const conservativePolicy: SpendingPolicy = {
  perTransaction: 1 * LAMPORTS_PER_SOL,      // 1 SOL max per tx
  perSession: 5 * LAMPORTS_PER_SOL,          // 5 SOL per session
  perDay: 10 * LAMPORTS_PER_SOL,             // 10 SOL per day
  perWeek: 25 * LAMPORTS_PER_SOL,            // 25 SOL per week
};
```

### Asset Allowlists

```typescript
// Only allow interaction with known, audited tokens
const ALLOWED_MINTS: PublicKey[] = [
  new PublicKey("So11111111111111111111111111111111111111112"),     // SOL
  new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"), // USDC
  new PublicKey("Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB"),  // USDT
  new PublicKey("mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So"),  // mSOL
  new PublicKey("J1toso1uCk3RLmjorhTtrVwY9HJ7X8V9yYac6Y7kGCPn"), // jitoSOL
];

function validateTokenTransfer(mint: PublicKey): boolean {
  return ALLOWED_MINTS.some(allowed => allowed.equals(mint));
}
```

### Protocol Restrictions

```typescript
// Turnkey policy: only allow Jupiter and System Program
const jupiterOnlyPolicy = {
  policyName: "Agent restricted to Jupiter swaps and SOL transfers",
  effect: "EFFECT_ALLOW",
  condition:
    "solana.tx.program_keys.all(p, " +
    "p == '11111111111111111111111111111111' || " +
    "p == 'JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4' || " +
    "p == 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA' || " +
    "p == 'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL')",
};
```

### Time-Based Controls

```typescript
// Agent can only operate during business hours (UTC)
function isWithinOperatingHours(): boolean {
  const hour = new Date().getUTCHours();
  return hour >= 8 && hour <= 20; // 8 AM - 8 PM UTC
}

// Agent has different limits for different times
function getDynamicLimit(): number {
  const hour = new Date().getUTCHours();
  if (hour >= 22 || hour <= 6) {
    return 0.1 * LAMPORTS_PER_SOL;  // Minimal limit overnight
  }
  return 5 * LAMPORTS_PER_SOL;      // Normal limit during day
}
```

## The x402 Protocol: Machine-to-Machine Payments

The x402 protocol is tightly coupled with agentic wallets because it provides the payment rail that agents use to pay for services autonomously. Understanding x402 is essential for designing agent wallet infrastructure.

**How it works:**
1. Agent sends HTTP request to a paid API
2. Server responds with `402 Payment Required` and a price header
3. Agent's wallet signs a stablecoin payment for the exact amount
4. Agent re-sends the request with payment proof in the header
5. Server verifies payment on-chain and serves the response

**Why it matters for wallet architecture:**
- Agents need pre-funded wallets with USDC to make x402 payments
- Spending limits must account for x402 micropayments (often $0.001 - $0.10 per call)
- x402 payments happen at API-call frequency, so signing must be fast
- Agent wallets need to support both large transfers and high-frequency micropayments

```typescript
// x402 payment flow from agent's perspective
async function callPaidApi(url: string, agentWallet: AgentWallet) {
  // First request -- will get 402
  const response = await fetch(url);

  if (response.status === 402) {
    const price = response.headers.get("X-Payment-Amount");
    const payTo = response.headers.get("X-Payment-Address");

    // Agent wallet signs payment
    const paymentProof = await agentWallet.signPayment({
      amount: price,
      recipient: payTo,
      memo: `x402:${url}`,
    });

    // Retry with payment
    const paidResponse = await fetch(url, {
      headers: {
        "X-Payment-Proof": paymentProof,
      },
    });

    return paidResponse.json();
  }

  return response.json();
}
```

## Key Trade-offs

| Dimension | Coinbase Agentic | Crossmint Dual-Key | Turnkey Policy | Squads Multisig | PDA Vault | Session Keys |
|---|---|---|---|---|---|---|
| **Setup time** | Minutes | Hours | Hours | 30 min | Days (dev) | Hours (dev) |
| **Solana native** | No (Base only) | Yes | Yes | Yes | Yes | Yes |
| **Key custody** | Coinbase | User + TEE | Turnkey TEE | User-held | On-chain PDA | User-held |
| **Policy granularity** | Per-session limits | Delegated signer scope | Full expression language | Roles + limits | Custom program logic | TTL + caps + allowlist |
| **External dependency** | Coinbase | Crossmint + TEE provider | Turnkey | None (Solana only) | None | None |
| **Non-custodial** | No (Coinbase holds keys) | Yes | Yes (verifiable) | Yes | Yes | Yes |
| **TEE support** | N/A | Built-in (Phala) | Built-in (Nitro) | No | No | Optional |
| **x402 support** | Native | No | No | No | Custom | No |
| **Cost model** | Free (beta) | API fees | Per-signing fees | Solana tx fees only | Solana tx fees only | Solana tx fees only |
| **Maturity** | New (Feb 2026) | Beta | Production | Production ($15B secured) | Custom | Varies |
| **Composability** | Limited (Base) | Multi-chain | Multi-chain | Full Solana CPI | Full Solana CPI | Full Solana CPI |

## Recommendation

**There is no single best architecture** -- the right choice depends on your threat model, regulatory requirements, and team capabilities.

**Use Coinbase Agentic Wallets if** you want the fastest path to giving agents payment capabilities and are building on Base / EVM. Ideal for x402-powered agent commerce, API payments, and rapid prototyping. Not yet suitable for Solana-native applications.

**Use Crossmint Dual-Key if** you are building an agent launchpad or platform where non-custodial architecture is a regulatory requirement. The TEE-secured agent key + user owner key pattern provides the strongest compliance posture. Supports Solana smart wallets.

**Use Turnkey if** you need production-grade, granular policy enforcement on Solana with a formally verifiable security model. The Solana Policy Engine provides the most expressive transaction-level controls available. Best for applications managing significant funds.

**Use Squads Multisig if** you want fully on-chain agent authorization native to Solana with no external dependencies. Spending limits, roles, and time locks in v4 make it viable for agent delegation. Best for teams already in the Solana ecosystem.

**Use PDA Vaults if** you have Solana program expertise and need fully custom, fully decentralized agent wallet logic with zero external dependencies. Highest upfront cost but maximum flexibility and minimum trust assumptions.

**Use Session Keys if** you need time-bounded, task-specific agent authority. Combine with any of the above for defense-in-depth.

**For most Solana projects in 2026**, the recommended approach is a layered architecture:

1. **Turnkey or Crossmint** for key management and signing (TEE-secured keys)
2. **On-chain spending limits** via Squads v4 or custom PDA vault (defense-in-depth)
3. **Session keys** for time-bounded operations (principle of least privilege)
4. **Human-in-the-loop** for transactions above a threshold (safety net)

This layered approach means that even if one layer is compromised, the others prevent catastrophic loss.

## Sources

- [Coinbase: Introducing Agentic Wallets](https://www.coinbase.com/developer-platform/discover/launches/agentic-wallets)
- [Coinbase Agentic Wallet Docs](https://docs.cdp.coinbase.com/agentic-wallet/welcome)
- [Coinbase Agentic Wallet Quickstart](https://docs.cdp.coinbase.com/agentic-wallet/quickstart)
- [Coinbase Agentic Wallet Skills (GitHub)](https://github.com/coinbase/agentic-wallet-skills)
- [Crossmint: The AI Agent Wallet Problem -- Why Your Architecture Needs Dual Keys](https://blog.crossmint.com/ai-agent-wallet-architecture/)
- [Crossmint: How to Create an AI Agent App on Solana](https://blog.crossmint.com/solana-ai-agent-app/)
- [Crossmint Agent Launchpad Starter Kit (GitHub)](https://github.com/Crossmint/agent-launchpad-starter-kit)
- [Helius: What are Solana Smart Wallets?](https://www.helius.dev/blog/solana-smart-wallets)
- [Turnkey: AI Agents Solution](https://www.turnkey.com/solutions/ai-agents)
- [Turnkey: Introducing Solana Policy Engine](https://www.turnkey.com/blog/introducing-solana-policy-engine)
- [Turnkey: Solana Policy Examples](https://docs.turnkey.com/concepts/policies/examples/solana)
- [Turnkey: Policy Overview](https://docs.turnkey.com/concepts/policies/overview)
- [Turnkey: Architecture Whitepaper](https://whitepaper.turnkey.com/architecture)
- [Turnkey: Programmable Key Management](https://www.turnkey.com/blog/programmable-key-management-transforms-wallets)
- [Turnkey: Secure Enclaves vs Other TEEs](https://www.turnkey.com/blog/secure-enclaves-vs-other-tees)
- [Turnkey: Policy Engine Guardrails](https://www.turnkey.com/blog/turnkey-policy-engine-guardrails-web3-transactions)
- [Squads Protocol v4 (GitHub)](https://github.com/Squads-Protocol/v4)
- [Squads Protocol Docs](https://docs.squads.so)
- [Squads: Permissions and Roles](https://squads.xyz/blog/permissions-roles-in-multisig)
- [Squads: v4 and the Brand New Squads App](https://squads.so/blog/v4-and-new-squads-app)
- [QuickNode: MultiSig with Squads](https://www.quicknode.com/guides/solana-development/3rd-party-integrations/multisig-with-squads)
- [Solana Docs: Program Derived Addresses](https://solana.com/docs/core/pda)
- [Solana Docs: Cross Program Invocations](https://solana.com/docs/intro/quick-start/cross-program-invocation)
- [x402 Protocol Documentation](https://docs.x402.org/)
- [x402 Whitepaper](https://www.x402.org/x402-whitepaper.pdf)
- [QuickNode: How to Implement x402 Payment Protocol](https://www.quicknode.com/guides/infrastructure/how-to-use-x402-payment-required)
- [Phala: Build Trustworthy Fintech AI Agents With TEE](https://phala.com/posts/Build-Trustworthy-Fintech-AI-Agents-With-TEE)
- [AWS: Secure Blockchain Key Management with Nitro Enclaves](https://aws.amazon.com/solutions/guidance/secure-blockchain-key-management-with-aws-nitro-enclaves)
- [Coinbase: Agentic Wallets Launch (The Block)](https://www.theblock.co/post/389524/coinbase-rolls-out-ai-tool-to-give-any-agent-a-wallet)
- [Decrypt: Coinbase Launches Wallet for AI Agents](https://decrypt.co/357813/coinbase-launches-wallet-ai-agents-built-in-guardrails)
- [Alchemy: How to Build Solana AI Agents in 2026](https://www.alchemy.com/blog/how-to-build-solana-ai-agents-in-2026)
- [Blockaid: Cosigner for Multisig Security](https://blockaid.io/cosigner)
- [Safeheron: Open-Source Intel SGX TEE Architecture](https://safeheron.com/blog/open-source-tee-architecture/)
- [ERC-4337 Docs: Session Keys and Delegation](https://docs.erc4337.io/smart-accounts/session-keys-and-delegation.html)

## Gaps & Caveats

**What is uncertain:**
- **Coinbase Agentic Wallets are brand new** (launched Feb 11, 2026). Long-term reliability, pricing model, and Solana support timeline are unknown.
- **TEE security guarantees** depend on hardware vendors. Intel SGX has had side-channel vulnerabilities (Foreshadow, Plundervolt, AEPIC Leak). AWS Nitro Enclaves have a cleaner record but are younger technology.
- **Regulatory classification** of agent wallets is unsettled. Whether a platform hosting agents with wallets constitutes "custodial" behavior varies by jurisdiction and is actively being debated by regulators.
- **Crossmint's Solana smart wallet integration** is beta and has not undergone formal security audits.
- **Session key standards** do not exist on Solana the way ERC-4337/EIP-7702 provide them on Ethereum. Implementations are custom and non-interoperable.

**What is rapidly changing:**
- Coinbase is likely to expand Agentic Wallets beyond Base (Solana support is a natural next step given their AgentKit already supports Solana).
- Squads Protocol is building Grid (stablecoin rails) and Fuse (consumer smart wallet), which may include first-class agent delegation.
- The x402 protocol is evolving quickly -- Solana accounted for 77% of x402 transaction volume in December 2025, suggesting Solana-native x402 support is a priority.
- TEE providers (Phala, Marlin, Lit Protocol) are competing to become the default agent execution environment.

**What this guide does not cover:**
- Multi-agent coordination (swarms of agents sharing wallet access)
- Cross-chain agent wallets (bridging agent authority across Solana and EVM)
- Insurance and recovery mechanisms for agent wallet losses
- Legal and compliance frameworks for specific jurisdictions
- MPC (Multi-Party Computation) wallet architectures, which are a separate paradigm from TEE-based approaches

**Confidence rationale (8/10):**
This assessment draws from 34 sources including official documentation from Coinbase, Crossmint, Turnkey, and Squads Protocol, the x402 whitepaper, Solana developer documentation, TEE security research, and production implementations. The 8/10 confidence reflects strong certainty about the current technical landscape (all architectures described have working implementations) but acknowledges that this is a fast-moving space where new products, security discoveries, and regulatory decisions could meaningfully change recommendations within months. The Coinbase Agentic Wallet and Crossmint dual-key architecture are particularly new and may evolve significantly.

