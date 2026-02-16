---
pack: solana
topic: "AI Agents on Solana"
decision: "How do I build AI agents that interact with Solana?"
confidence: 8/10
sources_checked: 25
last_updated: "2026-02-16"
---

# AI Agents on Solana

> **Decision:** How do I build AI agents that interact with Solana?

## Context

AI agents that can autonomously interact with blockchains represent one of the most significant developments in crypto since DeFi. In 2025, Solana emerged as the dominant blockchain for AI agent development, accounting for 77% of AI agent transaction volume by December 2025. This isn't coincidental—Solana's sub-second finality, negligible transaction costs, and mature ecosystem make it uniquely suited for agentic applications.

Traditional blockchain interactions require human intervention at every step: deciding which tokens to buy, when to stake, or which governance proposals to vote on. AI agents change this paradigm by enabling autonomous decision-making. An agent can monitor market conditions, execute trades, rebalance portfolios, participate in governance, mint NFTs, and interact with DeFi protocols—all through natural language commands or programmatic rules.

The breakthrough came with frameworks like **Solana Agent Kit** (by SendAI), which provides 60+ pre-built actions for token operations, NFT minting, DeFi interactions, and more. These frameworks integrate cleanly with popular AI development tools like LangChain and Vercel AI SDK, enabling any AI model (OpenAI, Anthropic, Llama, etc.) to interact with Solana.

However, autonomous agents introduce unique security challenges. An AI agent with unlimited wallet access can cause unlimited damage if compromised or if it makes incorrect decisions. The industry is rapidly developing patterns for controlled delegation: spending limits, approval flows, scoped permissions, and human-in-the-loop systems.

This guide covers how to build secure, production-ready AI agents on Solana in 2026.

## Options

### Option A: Solana Agent Kit (SendAI)

**What:** An open-source toolkit that connects AI agents to Solana protocols via 60+ pre-built actions and tool integrations.

**Architecture:**
- **Core SDK:** TypeScript library with wallet management, transaction building, and protocol integrations
- **Plugin system:** Modular approach—install only what you need (Token, NFT, DeFi, Blinks plugins)
- **LLM integration:** Tools designed for function calling with OpenAI, Anthropic, Gemini, etc.
- **MCP server:** Model Context Protocol server for Claude and other MCP-compatible models

**Pros:**
- **Comprehensive:** 60+ actions covering token transfers, swaps, NFT minting, staking, lending, bridging, and more
- **Framework-agnostic:** Works with any LLM that supports function calling
- **Production-ready:** Battle-tested by major projects; actively maintained by SendAI
- **Developer-friendly:** Clear documentation, TypeScript support, extensive examples
- **Modular:** Plugin system lets you load only needed functionality
- **Ecosystem integrations:** Native support for Jupiter, Raydium, Metaplex, Meteora, and major Solana protocols

**Cons:**
- **Abstraction overhead:** High-level API may not expose all low-level control
- **Dependency management:** Multiple protocol integrations mean more dependencies to maintain
- **Learning curve:** Requires understanding both AI framework concepts and Solana specifics
- **Rate limits:** Some integrated protocols have their own rate limits and quotas

**Best for:**
- Teams building multi-function AI agents (trading + NFT + DeFi)
- Developers who want pre-built integrations with major Solana protocols
- Projects that need rapid development velocity
- Applications requiring multiple blockchain actions per agent

**Code Example:**

```typescript
import { SolanaAgentKit, createSolanaTools } from "solana-agent-kit";
import { ChatOpenAI } from "@langchain/openai";
import { createReactAgent } from "@langchain/langgraph/prebuilt";

// Initialize agent with private key and RPC
const agent = new SolanaAgentKit(
  process.env.SOLANA_PRIVATE_KEY!,
  process.env.SOLANA_RPC_URL!,
  process.env.OPENAI_API_KEY!
);

// Create LangChain tools from agent
const tools = createSolanaTools(agent);

// Initialize LLM
const llm = new ChatOpenAI({
  modelName: "gpt-4",
  temperature: 0,
});

// Create agent executor
const agentExecutor = createReactAgent({
  llm,
  tools,
});

// Execute natural language command
const result = await agentExecutor.invoke({
  messages: [
    {
      role: "user",
      content: "Swap 1 SOL for USDC using Jupiter and then stake half of the USDC on Marinade",
    },
  ],
});

console.log(result);
```

**Available Actions (v2 Plugins):**

**Token Plugin:**
- Transfer SOL/SPL tokens
- Swap tokens via Jupiter aggregator
- Bridge tokens cross-chain (Wormhole, AllBridge)
- Create new SPL tokens
- Manage token metadata

**NFT Plugin:**
- Mint NFTs (Metaplex)
- Transfer NFTs
- Update NFT metadata
- Create collections
- Manage royalties

**DeFi Plugin:**
- Stake SOL (validators, liquid staking)
- Lend/borrow (Solend, Kamino)
- Provide liquidity (Raydium, Orca)
- Manage yield positions
- Flash loans

**Blinks Plugin:**
- Create Solana Actions
- Encode Blinks
- Generate payment links
- Arcade games integration

**Misc Plugin:**
- Compressed airdrops
- Price feeds (Pyth, Switchboard)
- Domain name resolution (.sol domains)
- Transaction monitoring

### Option B: Custom Agent with web3.js

**What:** Building an AI agent from scratch using @solana/web3.js and AI SDK of choice, with custom tool definitions.

**Pros:**
- **Full control:** Complete visibility into every transaction detail
- **Minimal dependencies:** Only install what you actually use
- **Custom optimization:** Tailor transaction building for your specific use case
- **Security flexibility:** Implement exactly the security model you need
- **No framework lock-in:** Easy to swap AI providers or Solana libraries

**Cons:**
- **More code:** 5-10x more code to write and maintain vs using Solana Agent Kit
- **Protocol integration effort:** Must implement each protocol integration manually
- **Security responsibility:** All validation and safety checks are your responsibility
- **Slower development:** Building from scratch takes significantly longer
- **Testing burden:** Must test every integration independently

**Best for:**
- Single-purpose agents (e.g., only trading, only governance)
- Teams with deep Solana expertise
- Projects with unique security requirements
- Applications where minimal dependencies matter

**Code Example:**

```typescript
import { Connection, PublicKey, Transaction, SystemProgram } from "@solana/web3.js";
import { ChatOpenAI } from "@langchain/openai";
import { DynamicStructuredTool } from "@langchain/core/tools";

// Define custom tool for SOL transfer
const transferSolTool = new DynamicStructuredTool({
  name: "transfer_sol",
  description: "Transfer SOL from agent wallet to another address",
  schema: z.object({
    recipient: z.string().describe("Recipient's Solana address"),
    amount: z.number().describe("Amount of SOL to transfer"),
  }),
  func: async ({ recipient, amount }) => {
    const connection = new Connection(process.env.SOLANA_RPC_URL!);
    const sender = loadWalletFromPrivateKey(process.env.PRIVATE_KEY!);

    // Validate recipient
    let recipientPubkey: PublicKey;
    try {
      recipientPubkey = new PublicKey(recipient);
    } catch {
      return "Error: Invalid recipient address";
    }

    // Build transaction
    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: sender.publicKey,
        toPubkey: recipientPubkey,
        lamports: amount * 1e9, // Convert SOL to lamports
      })
    );

    // Send transaction
    const signature = await connection.sendTransaction(transaction, [sender]);
    await connection.confirmTransaction(signature);

    return `Transferred ${amount} SOL to ${recipient}. Signature: ${signature}`;
  },
});

// Initialize LLM with tools
const llm = new ChatOpenAI({
  modelName: "gpt-4",
  temperature: 0,
}).bindTools([transferSolTool]);

// Use agent
const response = await llm.invoke("Send 0.5 SOL to GDH8...xyz");
```

### Option C: Agentic Wallets (Turnkey, Coinbase)

**What:** Specialized wallet infrastructure designed for AI agents with built-in security policies, spending limits, and approval flows.

**Key Features:**
- **Policy-based permissions:** Define exactly what agent can do (spending limits, asset types, time locks)
- **Separate key architecture:** Agent has limited-permission key; owner retains full control
- **Audit trails:** Every agent action is logged for monitoring
- **Recovery mechanisms:** Owner can revoke agent access at any time
- **MPC security:** Threshold signatures and distributed key management

**Providers:**

**Turnkey:**
- API-based wallet management
- Scoped API keys for agents
- Spending limits per key
- Webhook notifications for agent actions
- No custody of master keys

**Coinbase Agentic Wallets:**
- Give any agent a wallet in minutes
- Programmable spending controls
- Per-session spending limits
- High-risk transaction screening
- Integration with Coinbase infrastructure

**Pros:**
- **Security-first:** Built for autonomous operation from ground up
- **Compliance-friendly:** Audit trails and access controls
- **Professional tooling:** Monitoring, alerting, and revocation
- **Lower risk:** Reduced chance of catastrophic loss

**Cons:**
- **Additional service:** Depends on third-party infrastructure
- **Cost:** May have fees beyond basic RPC costs
- **Setup complexity:** More configuration than simple private key approach
- **Centralization:** Relies on wallet provider's uptime

**Best for:**
- Production applications with significant funds at risk
- Regulated environments requiring audit trails
- Teams prioritizing security over simplicity
- Applications where autonomous operation is core feature

## Function Calling Architecture

AI agents interact with blockchains via **function calling** (also called tool use). Here's how it works:

### 1. Tool Definition
Define available blockchain actions as functions with structured parameters:

```typescript
const tools = [
  {
    type: "function",
    function: {
      name: "swap_tokens",
      description: "Swap one token for another using Jupiter aggregator",
      parameters: {
        type: "object",
        properties: {
          from_token: {
            type: "string",
            description: "Symbol of token to swap from (e.g., SOL, USDC)",
          },
          to_token: {
            type: "string",
            description: "Symbol of token to swap to",
          },
          amount: {
            type: "number",
            description: "Amount to swap in decimal form",
          },
          slippage_bps: {
            type: "number",
            description: "Slippage tolerance in basis points (100 = 1%)",
          },
        },
        required: ["from_token", "to_token", "amount"],
      },
    },
  },
];
```

### 2. LLM Decision
The AI model analyzes the user's request and decides which tool to call:

```typescript
// User prompt: "Swap 2 SOL for USDC with 1% slippage"

// LLM returns:
{
  "tool_calls": [
    {
      "id": "call_123",
      "type": "function",
      "function": {
        "name": "swap_tokens",
        "arguments": "{\"from_token\":\"SOL\",\"to_token\":\"USDC\",\"amount\":2,\"slippage_bps\":100}"
      }
    }
  ]
}
```

### 3. Tool Execution
Your code intercepts the function call and executes the blockchain action:

```typescript
// Parse arguments
const args = JSON.parse(tool_call.function.arguments);

// Execute blockchain transaction
const result = await jupiterSwap(
  agent.wallet,
  args.from_token,
  args.to_token,
  args.amount,
  args.slippage_bps
);

// Return result to LLM
return `Swapped ${args.amount} ${args.from_token} for ${result.output_amount} ${args.to_token}. Signature: ${result.signature}`;
```

### 4. LLM Response
The model incorporates the execution result into its response:

```typescript
// LLM final response to user:
"I've successfully swapped 2 SOL for 185.43 USDC with 1% slippage. The transaction signature is 5zXY...abc."
```

### Multi-Step Reasoning

AI agents can chain multiple blockchain actions:

```typescript
// User: "Find the best yield opportunity for my SOL and stake it"

// Step 1: LLM calls get_yield_opportunities()
const opportunities = await getYieldOpportunities("SOL");

// Step 2: LLM analyzes results and decides
// "Marinade liquid staking offers 6.8% APY, best option"

// Step 3: LLM calls stake_sol()
const result = await stakeSol(amount, "marinade");

// Step 4: LLM confirms to user
"I staked your SOL on Marinade Finance for 6.8% APY..."
```

## Security and Spending Limits

### Threat Model

**Risks of autonomous agents:**
1. **Incorrect decisions:** AI makes wrong trade, sends to wrong address
2. **Prompt injection:** Malicious user tricks agent into unauthorized actions
3. **Compromised API keys:** Attacker gains access to agent's capabilities
4. **Smart contract bugs:** Agent interacts with vulnerable protocol
5. **Unlimited access:** Agent drains wallet due to lack of controls

### Security Patterns

#### 1. Spending Limits

**Per-transaction limits:**
```typescript
const MAX_TRANSFER_AMOUNT = 1.0; // Max 1 SOL per transaction

async function transferSol(recipient: string, amount: number) {
  if (amount > MAX_TRANSFER_AMOUNT) {
    throw new Error(`Amount ${amount} exceeds limit of ${MAX_TRANSFER_AMOUNT}`);
  }
  // Proceed with transfer
}
```

**Daily spending limits:**
```typescript
class SpendingTracker {
  private dailySpent = 0;
  private lastReset = Date.now();
  private readonly DAILY_LIMIT = 10.0; // 10 SOL per day

  async checkAndRecord(amount: number) {
    // Reset if new day
    if (Date.now() - this.lastReset > 24 * 60 * 60 * 1000) {
      this.dailySpent = 0;
      this.lastReset = Date.now();
    }

    // Check limit
    if (this.dailySpent + amount > this.DAILY_LIMIT) {
      throw new Error(`Daily limit exceeded. Spent: ${this.dailySpent}, Limit: ${this.DAILY_LIMIT}`);
    }

    this.dailySpent += amount;
  }
}
```

**Per-session limits:**
```typescript
// For conversational agents, limit spending per chat session
class SessionTracker {
  private sessionSpending = new Map<string, number>();
  private readonly SESSION_LIMIT = 0.5; // 0.5 SOL per session

  async checkLimit(sessionId: string, amount: number) {
    const current = this.sessionSpending.get(sessionId) || 0;
    if (current + amount > this.SESSION_LIMIT) {
      throw new Error("Session spending limit reached. Please start new session.");
    }
    this.sessionSpending.set(sessionId, current + amount);
  }
}
```

#### 2. Approval Flows

**Human-in-the-loop for high-value transactions:**
```typescript
const APPROVAL_THRESHOLD = 5.0; // Require approval for >5 SOL

async function transferWithApproval(recipient: string, amount: number) {
  if (amount > APPROVAL_THRESHOLD) {
    // Send approval request to owner
    const approval = await requestApproval({
      action: "transfer",
      recipient,
      amount,
      reason: "High-value transaction requires approval",
    });

    if (!approval.approved) {
      throw new Error("Transfer rejected by owner");
    }
  }

  // Proceed with transfer
  await executeSolTransfer(recipient, amount);
}
```

**Notification system:**
```typescript
// Notify owner of all agent actions
async function executeAndNotify(action: string, details: any) {
  try {
    const result = await executeAction(action, details);

    await sendNotification({
      type: "action_completed",
      action,
      details,
      result,
      timestamp: Date.now(),
    });

    return result;
  } catch (error) {
    await sendNotification({
      type: "action_failed",
      action,
      details,
      error: error.message,
      timestamp: Date.now(),
    });
    throw error;
  }
}
```

#### 3. Asset Class Restrictions

**Allowlist approach:**
```typescript
const ALLOWED_TOKENS = [
  "So11111111111111111111111111111111111111112", // SOL
  "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", // USDC
  "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB", // USDT
];

async function swapTokens(from: string, to: string, amount: number) {
  if (!ALLOWED_TOKENS.includes(from) || !ALLOWED_TOKENS.includes(to)) {
    throw new Error("Token not in approved list");
  }
  // Proceed with swap
}
```

**Protocol restrictions:**
```typescript
const TRUSTED_PROGRAMS = [
  "JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4", // Jupiter
  "whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc", // Orca Whirlpool
];

async function interactWithProtocol(programId: string, instruction: any) {
  if (!TRUSTED_PROGRAMS.includes(programId)) {
    throw new Error("Untrusted program. Interaction blocked.");
  }
  // Proceed
}
```

#### 4. Rate Limiting

**Prevent rapid-fire transactions:**
```typescript
class RateLimiter {
  private lastAction = 0;
  private readonly MIN_DELAY_MS = 5000; // 5 seconds between actions

  async checkRateLimit() {
    const now = Date.now();
    const timeSince = now - this.lastAction;

    if (timeSince < this.MIN_DELAY_MS) {
      const waitTime = this.MIN_DELAY_MS - timeSince;
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }

    this.lastAction = Date.now();
  }
}
```

#### 5. Wallet Isolation

**Agent wallet pattern:**
```typescript
// Separate wallets: one for agent, one for main funds
class AgentWalletManager {
  agentWallet: Keypair;
  mainWallet: PublicKey;

  async topUpAgent() {
    // Periodically fund agent wallet with limited amount
    const balance = await connection.getBalance(this.agentWallet.publicKey);
    const TARGET_BALANCE = 1.0 * LAMPORTS_PER_SOL;

    if (balance < TARGET_BALANCE) {
      // Transfer from main wallet to agent wallet
      await transferFromMain(TARGET_BALANCE - balance);
    }
  }

  async sweepExcess() {
    // Move excess funds back to main wallet
    const balance = await connection.getBalance(this.agentWallet.publicKey);
    const OPERATING_BALANCE = 0.5 * LAMPORTS_PER_SOL;

    if (balance > OPERATING_BALANCE + 0.1 * LAMPORTS_PER_SOL) {
      await transferToMain(balance - OPERATING_BALANCE);
    }
  }
}
```

### Turnkey Integration Example

```typescript
import { Turnkey } from "@turnkey/sdk-server";

const turnkey = new Turnkey({
  apiBaseUrl: "https://api.turnkey.com",
  apiPrivateKey: process.env.TURNKEY_API_PRIVATE_KEY!,
  apiPublicKey: process.env.TURNKEY_API_PUBLIC_KEY!,
});

// Create scoped API key for agent
const agentApiKey = await turnkey.createApiKey({
  organizationId: ORG_ID,
  policies: [
    {
      effect: "ALLOW",
      consensus: "SINGLE",
      resources: [
        `wallets/${AGENT_WALLET_ID}/sign`, // Can sign transactions
      ],
      conditions: {
        maxTransactionValue: "5000000000", // 5 SOL in lamports
        timeWindow: "24h",
      },
    },
  ],
});

// Agent uses scoped key
const agentTurnkey = new Turnkey({
  apiBaseUrl: "https://api.turnkey.com",
  apiPrivateKey: agentApiKey.privateKey,
  apiPublicKey: agentApiKey.publicKey,
});

// Attempt transaction - automatically enforces policies
const signature = await agentTurnkey.signTransaction({
  walletId: AGENT_WALLET_ID,
  transaction: serializedTransaction,
});
```

## Real AI Agent Projects on Solana

### 1. Trading Bots (Most Common)
**Description:** Autonomous agents that execute trading strategies based on market conditions.

**Capabilities:**
- Monitor token prices across DEXs
- Execute arbitrage opportunities
- DCA (Dollar Cost Averaging) strategies
- Portfolio rebalancing
- MEV protection via Jito bundles

**Example Stack:**
- Solana Agent Kit for swaps
- Jupiter aggregator integration
- GPT-4 for strategy decisions
- Helius RPC for fast data

**Security:**
- Max 2% of portfolio per trade
- Daily loss limits
- Whitelist of trusted tokens only
- Human approval for >$1000 trades

### 2. Yield Optimizers
**Description:** Agents that continuously monitor and optimize yield farming positions.

**Capabilities:**
- Compare yields across lending protocols (Solend, Kamino, MarginFi)
- Automatically migrate funds to highest yield
- Compound rewards
- Monitor liquidation risk

**Example:**
```typescript
// Pseudocode for yield optimizer agent
async function optimizeYield() {
  const yields = await Promise.all([
    getKaminoAPY("USDC"),
    getSolendAPY("USDC"),
    getMarginFiAPY("USDC"),
  ]);

  const best = yields.sort((a, b) => b.apy - a.apy)[0];

  // If current position isn't best, migrate
  if (currentPosition.protocol !== best.protocol) {
    await withdrawFrom(currentPosition);
    await depositTo(best);
  }
}
```

### 3. NFT Sniping Bots
**Description:** Agents that monitor NFT listings and auto-purchase based on criteria.

**Capabilities:**
- Monitor Magic Eden, Tensor, and other marketplaces
- Evaluate floor price, rarity, traits
- Execute instant purchases when criteria met
- Resell for profit

**Security:**
- Max purchase price limits
- Verified collections only
- Rate limiting to prevent spam bids

### 4. Governance Participation Agents
**Description:** Agents that vote on DAO proposals based on policy preferences.

**Capabilities:**
- Monitor Realms governance proposals
- Analyze proposal content
- Vote according to predefined principles
- Delegate voting power

**Example:**
```typescript
// Agent that votes based on alignment with DAO values
async function evaluateProposal(proposal: Proposal) {
  const analysis = await llm.invoke(`
    Analyze this DAO proposal and determine if it aligns with these principles:
    1. Decentralization over centralization
    2. Community benefit over individual profit
    3. Long-term sustainability over short-term gains

    Proposal: ${proposal.description}
  `);

  if (analysis.recommendation === "FOR") {
    await voteOnProposal(proposal.id, "FOR");
  } else {
    await voteOnProposal(proposal.id, "AGAINST");
  }
}
```

### 5. Social Bots (Token Launches, Airdrops)
**Description:** Agents that interact with Pump.fun token launches or claim airdrops automatically.

**Capabilities:**
- Monitor Pump.fun for new token launches
- Analyze social sentiment
- Execute early buys
- Claim airdrops from multiple protocols

**Security Concerns:**
- High risk—many rug pulls
- Strict spending limits essential
- Whitelist of trusted deployers

### 6. DeFi Portfolio Managers
**Description:** Comprehensive agents that manage entire portfolio strategies.

**Capabilities:**
- Asset allocation across DeFi positions
- Risk management (hedging, stop-losses)
- Tax-loss harvesting
- Liquidity provision to AMMs
- Automated reinvestment

**Example Stack:**
- Multi-protocol integration (Kamino, Drift, Jupiter)
- GPT-4 for strategy decisions
- Historical data analysis via Helius Geyser
- Daily reporting to user

### 7. Subscription Management Agents
**Description:** Agents that handle recurring payments and subscriptions.

**Capabilities:**
- Pay monthly subscriptions automatically
- Cancel unused subscriptions
- Negotiate better rates
- Track spending across services

## Production Best Practices

### 1. Start with Testnet
Always develop on devnet/testnet before mainnet:
```typescript
// Development configuration
const config = {
  network: process.env.NODE_ENV === "production" ? "mainnet-beta" : "devnet",
  rpcUrl: process.env.NODE_ENV === "production"
    ? process.env.MAINNET_RPC_URL
    : "https://api.devnet.solana.com",
};
```

### 2. Comprehensive Logging
Log every agent decision and action:
```typescript
import winston from "winston";

const logger = winston.createLogger({
  level: "info",
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: "agent-actions.log" }),
  ],
});

async function executeAction(action: string, params: any) {
  logger.info("Agent action initiated", {
    action,
    params,
    timestamp: new Date().toISOString(),
  });

  try {
    const result = await performAction(action, params);
    logger.info("Agent action completed", { action, result });
    return result;
  } catch (error) {
    logger.error("Agent action failed", { action, params, error: error.message });
    throw error;
  }
}
```

### 3. Graceful Degradation
Handle RPC failures and API errors:
```typescript
async function resilientTransaction(transaction: Transaction) {
  const rpcs = [
    process.env.PRIMARY_RPC_URL,
    process.env.FALLBACK_RPC_URL,
    "https://api.mainnet-beta.solana.com",
  ];

  for (const rpc of rpcs) {
    try {
      const connection = new Connection(rpc);
      const signature = await connection.sendTransaction(transaction);
      return signature;
    } catch (error) {
      console.warn(`RPC ${rpc} failed, trying next...`);
      continue;
    }
  }

  throw new Error("All RPC endpoints failed");
}
```

### 4. Transaction Simulation
Always simulate before sending:
```typescript
async function safeExecute(transaction: Transaction) {
  // Simulate first
  const simulation = await connection.simulateTransaction(transaction);

  if (simulation.value.err) {
    throw new Error(`Simulation failed: ${JSON.stringify(simulation.value.err)}`);
  }

  // Log expected changes
  logger.info("Transaction simulation successful", {
    logs: simulation.value.logs,
    unitsConsumed: simulation.value.unitsConsumed,
  });

  // If simulation passes, send real transaction
  const signature = await connection.sendTransaction(transaction);
  return signature;
}
```

### 5. Monitoring and Alerts
Set up real-time monitoring:
```typescript
// Alert on anomalous behavior
async function monitorAgent() {
  setInterval(async () => {
    const balance = await connection.getBalance(agentWallet.publicKey);

    // Alert if balance drops below threshold
    if (balance < 0.1 * LAMPORTS_PER_SOL) {
      await sendAlert("CRITICAL: Agent wallet balance low!");
    }

    // Alert if too many recent failures
    const recentFailures = await getRecentFailures(1000 * 60 * 60); // Last hour
    if (recentFailures > 10) {
      await sendAlert(`WARNING: ${recentFailures} failures in last hour`);
    }
  }, 60000); // Check every minute
}
```

## Sources

- [Unlocking Solana with AI: A Deep Dive into the Solana Agent Kit MCP Server | Skywork AI](https://skywork.ai/skypage/en/unlocking-solana-ai-agent-kit/1980821743311065088)
- [GitHub - sendaifun/solana-agent-kit: connect any ai agents to solana protocols](https://github.com/sendaifun/solana-agent-kit)
- [How to Build a Solana AI Agent in 2026 | Alchemy](https://www.alchemy.com/blog/how-to-build-solana-ai-agents-in-2026)
- [How to get started with AI tools on Solana | Solana Developers](https://solana.com/developers/guides/getstarted/intro-to-ai)
- [How to Build a Secure AI Agent on Solana | Helius](https://www.helius.dev/blog/how-to-build-a-secure-ai-agent-on-solana)
- [Metaplex Spotlight: SendAI](https://www.metaplex.foundation/blog/articles/spotlight-series-sendai)
- [AI innovation at the speed of Solana | Solana](https://solana.com/ai)
- [How Solana is Powering the Rise of Tokenized AI Agents | Codezeros | Coinmonks](https://medium.com/coinmonks/how-solana-is-powering-the-rise-of-tokenized-ai-agents-a0fbe8fd6f43)
- [Coinbase Launches Agentic Wallets for AI Agents, Solana Follows Suit | KuCoin](https://www.kucoin.com/news/flash/coinbase-launches-agentic-wallets-for-ai-agents-solana-follows-suit)
- [What are Solana Smart Wallets? | Helius](https://www.helius.dev/blog/solana-smart-wallets)
- [Squads: From Zero to the Multisig Protocol Securing $10B on Solana | Fystack](https://fystack.io/blog/squads-from-zero-to-the-multisig-protocol-securing-10b-on-solana)

## Gaps & Caveats

**What's uncertain:**
- **Long-term AI decision quality:** It's unclear how well AI agents will perform over months/years without human oversight
- **Regulatory landscape:** Governments haven't clarified how autonomous financial agents will be regulated
- **Model reliability:** LLMs can hallucinate or make poor decisions under edge cases
- **Insurance mechanisms:** No established patterns for insuring against agent errors

**What's rapidly changing:**
- **Framework maturity:** Solana Agent Kit and alternatives are evolving rapidly with weekly releases
- **Security standards:** Best practices for agent security are still being established
- **Integration ecosystem:** New protocols adding native agent support regularly
- **Wallet infrastructure:** Agentic wallet providers (Turnkey, Coinbase) launching new features frequently

**What this guide doesn't cover:**
- Non-Solana blockchain agents (Ethereum, Base, etc.)
- Advanced multi-agent coordination (swarm intelligence)
- Machine learning model training for agent behavior
- Tax implications of autonomous trading

**Confidence rationale (8/10):**
This assessment draws from 25+ sources including official Solana Agent Kit documentation, security provider guides, and production implementations by major projects. The 8/10 confidence reflects strong certainty about current technical patterns (verified by working code and deployed agents) but acknowledges uncertainty around long-term agent reliability, evolving security standards, and regulatory developments. The security patterns are battle-tested but the ecosystem is young (2024-2026), so best practices continue to evolve.
