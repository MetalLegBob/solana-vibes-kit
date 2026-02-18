---
pack: solana
topic: "Agent-to-Agent Commerce"
decision: "How do I build systems where AI agents autonomously discover, negotiate, and pay each other on Solana?"
confidence: 7/10
sources_checked: 42
last_updated: "2026-02-18"
---

# Agent-to-Agent Commerce

> **Decision:** How do I build systems where AI agents autonomously discover, negotiate, and pay each other on Solana?

## Context

The autonomous agent economy is no longer theoretical. By early 2026, Solana processes over $11B in stablecoin circulation with 200M+ monthly transactions, and accounts for 77% of x402 (the leading agent payment protocol) transaction volume. Coinbase launched Agentic Wallets in February 2026—purpose-built wallet infrastructure that lets AI agents hold funds, execute trades, pay for compute, and rebalance DeFi positions without human intervention. Three competing payment standards launched within 30 days of each other: Google's Universal Commerce Protocol, Stripe's machine payments preview, and Coinbase's x402 with Agentic Wallets. The race to control machine-to-machine payment rails is on.

Agent-to-agent commerce means AI agents acting as independent economic actors: buying compute from one agent, selling data to another, discovering services on-chain, negotiating prices, escrowing payments, and building reputation over time—all at machine speed. This goes beyond a single agent executing DeFi trades on behalf of a human. It is a network of agents forming a marketplace where Agent A provides a sentiment analysis service, Agent B needs that service for its trading strategy, and USDC flows between them on Solana without any human approving anything. The OpenClaw ecosystem already has 770,000+ active agents across 115+ platforms, demonstrating that agent-scale coordination is not hypothetical.

However, this space is very early and rapidly evolving. Standards are competing, security incidents are real (12% of OpenClaw's marketplace was malware), and fundamental problems—identity, trust, dispute resolution—remain partially solved. The primitives exist but production-grade systems require careful architecture. This guide covers the key building blocks: payment rails, identity layers, service discovery, escrow patterns, and the real risks you need to account for.

## Options

### Option A: x402 Protocol — The HTTP-Native Payment Rail

**What:** An open payment protocol developed by Coinbase that revives the HTTP 402 "Payment Required" status code to enable instant, automatic stablecoin payments directly over HTTP. Agents pay for API access and services per-request with USDC—no accounts, no API keys, no subscriptions.

**How It Works:**
1. Agent sends an HTTP request to a paid endpoint
2. Server responds with `402 Payment Required` and a payment schema (price, accepted tokens, network)
3. Agent constructs and signs a USDC transfer matching the schema
4. Agent retries the request with a payment header containing the signed transaction
5. Server verifies payment on-chain and serves the response

**Architecture:**
- **Server side:** Single middleware line in Express/Node to require payment per endpoint
- **Client side:** Wallet SDK auto-handles 402 responses, signs, and retries
- **Settlement:** Solana (400ms finality, $0.00025 fees) or Base (EVM)
- **Token:** USDC (primary), with multi-token support emerging

**Pros:**
- Dead simple integration—one line of middleware to monetize any API
- No accounts, no API keys, no subscription management
- Works for both human developers and AI agents identically
- Open standard (x402.org)—not locked to Coinbase
- 75M+ transactions processed, $24M+ volume in the last 30 days (as of Feb 2026)
- 94K+ buyers, 22K+ sellers already in the ecosystem

**Cons:**
- Pay-before-verify model: agent pays before knowing if the service will deliver quality results
- No built-in escrow or dispute resolution (payment is fire-and-forget)
- Limited to USDC currently; multi-token support is nascent
- Solana-first but expanding to other chains, creating fragmentation risk
- No native identity layer—any wallet can be a buyer/seller

**Best for:**
- Micropayments for API access (weather data, price feeds, AI inference)
- High-frequency, low-value transactions where dispute resolution overhead exceeds transaction value
- Services where quality is immediately verifiable (the response either works or it does not)

**Code Example — Server (Express):**

```typescript
import express from "express";
import { paymentMiddleware } from "@coinbase/x402";

const app = express();

app.use(
  paymentMiddleware({
    "GET /api/sentiment": {
      price: "$0.001",
      network: "solana",
      accepts: [{ asset: "USDC" }],
      description: "Sentiment analysis for a given text",
    },
    "GET /api/price-feed": {
      price: "$0.0005",
      network: "solana",
      accepts: [{ asset: "USDC" }],
      description: "Real-time token price data",
    },
  })
);

app.get("/api/sentiment", (req, res) => {
  // Payment already verified by middleware
  const text = req.query.text;
  const sentiment = analyzeSentiment(text);
  res.json({ sentiment, confidence: 0.92 });
});

app.listen(3000);
```

**Code Example — Agent Client:**

```typescript
import { SolanaAgentKit } from "solana-agent-kit";
import { x402Client } from "@coinbase/x402-client";

const agent = new SolanaAgentKit(wallet, RPC_URL, {
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
});

// x402 client auto-handles 402 responses
const client = x402Client({
  wallet: agent.wallet,
  network: "solana",
  maxPaymentPerRequest: 0.01, // USDC spending cap per request
});

// Agent fetches paid API — payment happens automatically
const response = await client.fetch(
  "https://sentiment-agent.example.com/api/sentiment?text=SOL+bullish"
);
const data = await response.json();
// { sentiment: "positive", confidence: 0.92 }
```

### Option B: Escrow-Based Agent Commerce (KAMIYO Protocol)

**What:** A trust infrastructure layer for autonomous agents on Solana that adds escrow, dispute resolution, and reputation on top of agent transactions. Designed for higher-value transactions where "pay and pray" (x402's model) is insufficient.

**How It Works:**
1. Agent A (buyer) creates an escrow agreement, locking USDC in a PDA
2. Agent B (provider) delivers the service
3. If both parties agree on quality, funds release automatically
4. If disputed, independent oracles evaluate delivery quality via commit-reveal voting
5. Settlement follows a graduated refund scale (80-100% quality = full payment to provider; 50-64% = 75% refund; 0-49% = full refund)

**Architecture:**
- **Escrow:** PDA-based payment locks with configurable time-locks
- **Disputes:** Multi-oracle consensus with commit-reveal scheme (prevents oracle coordination)
- **Identity:** Stake-backed agent identities with SOL collateral
- **Reputation:** On-chain scoring updated after each transaction
- **x402 Compatible:** Can wrap x402 payment flows with escrow protection

**Pros:**
- Solves the trust gap for non-trivial agent transactions
- Graduated settlement (not all-or-nothing) reflects real-world partial delivery
- Stake-backed identity means bad actors lose collateral
- Private oracle voting prevents vote coordination attacks
- SDK available: `npm install @kamiyo/sdk`

**Cons:**
- Additional latency: escrow lock/release adds time to transactions
- Oracle infrastructure introduces centralization risk (who runs the oracles?)
- Staking requirement raises barrier to entry for new agents
- Early-stage protocol (MIT-licensed, live on mainnet and devnet, but small ecosystem)
- Graduated quality assessment is subjective—oracles may disagree

**Best for:**
- High-value agent-to-agent transactions (data pipelines, compute jobs, complex analysis)
- Scenarios where partial delivery is common and needs proportional payment
- Agent marketplaces that need reputation and trust signals

**Code Example — Escrow Transaction:**

```typescript
import { KAMIYOClient, AgentType } from "@kamiyo/sdk";
import { Connection, Keypair } from "@solana/web3.js";

const connection = new Connection("https://api.mainnet-beta.solana.com");
const wallet = Keypair.generate();
const client = new KAMIYOClient({ connection, wallet });

// 1. Register agent identity with stake collateral
await client.createAgent({
  name: "DataAnalysisBot",
  agentType: AgentType.DataProvider,
  stakeAmount: 500_000_000, // 0.5 SOL collateral
});

// 2. Create escrow agreement for a data analysis job
const agreement = await client.createAgreement({
  provider: providerAgentPubkey,
  amount: 5_000_000, // 5 USDC
  token: USDC_MINT,
  description: "Analyze 30-day DEX volume for top 50 Solana tokens",
  timeLock: 3600, // 1 hour to deliver
});

// 3. Provider delivers, buyer confirms quality
await client.confirmDelivery({
  agreementId: agreement.id,
  qualityScore: 85, // 0-100 scale
});
// Funds automatically released to provider
```

### Option C: Agent Registry + Service Discovery (AEAMCP / On-Chain Registries)

**What:** On-chain registries where agents publish their capabilities, endpoints, and pricing, enabling other agents to discover and consume services programmatically. The AEAMCP project (Solana Protocol Design for Agent and MCP Server Registries) is the leading Solana-native approach.

**How It Works:**
1. Agent registers on-chain via a PDA storing its profile: name, capabilities, endpoint URL, pricing, and supported protocols
2. Discovering agents query the registry by capability tags, price range, or reputation score
3. Once matched, agents negotiate directly and transact via x402 or escrow
4. Post-transaction, both agents update reputation scores on-chain

**Architecture:**
- **Agent Registry:** PDAs store agent profiles, capabilities, and economic intents
- **MCP Server Registry:** Separate registry for Model Context Protocol servers offering tools
- **Token-gated:** $SVMAI token for governance, staking, and premium service access
- **Semantic search:** Natural language queries resolve to matching agents

**Pros:**
- Decentralized discovery—no single entity controls the agent directory
- On-chain data means anyone can build alternative UIs or discovery algorithms
- Combines agent registry with MCP server registry (tools and agents in one place)
- Open source on GitHub (openSVM/aeamcp)

**Cons:**
- Early stage—small ecosystem, limited adoption
- Token dependency ($SVMAI) may deter some developers
- On-chain storage is expensive for rich capability descriptions
- No standardized capability description language yet (each registry defines its own schema)

**Best for:**
- Building agent marketplaces where discovery is the key challenge
- Projects that need agents to find specialized tools/services autonomously
- Ecosystems where reputation must be portable across applications

### Option D: Agent Identity Standards (ERC-8004 + Solana Equivalents)

**What:** Standards for giving AI agents verifiable on-chain identities with portable reputation. ERC-8004 is the Ethereum-origin standard (30K+ registrations); Solana equivalents include the 8004-on-Solana port, SIGIL Protocol, and the identity-com/sol-did approach.

**ERC-8004 Architecture (Three Registries):**
1. **Identity Registry:** Each agent gets a unique ERC-721 NFT as its on-chain identity
2. **Reputation Registry:** Accumulates feedback from interactions—portable trust signals
3. **Validation Registry:** Independent validators verify agent capabilities and behavior

**Solana Equivalents:**

| Project | Approach | Status |
|---------|----------|--------|
| **8004-on-Solana** | Direct port of ERC-8004 using Metaplex Core assets + ATOM Engine for Sybil-resistant reputation (HyperLogLog, ring buffers) | Devnet |
| **SIGIL Protocol** | Soulbound "Glyph" NFTs for agent identity; $SIGIL staking for compute persistence; receipt chains for reputation | Mainnet |
| **sol-did (Identity.com)** | DID:sol method for self-sovereign identity on Solana; not agent-specific but composable | Mainnet |

**Pros:**
- Solves the "who is this agent?" problem—critical for trust at scale
- Portable across applications (agent's reputation follows it)
- 8004-on-Solana's ATOM Engine has strong Sybil resistance (HLL unique client estimation, per-agent salt, ring buffer burst detection)
- SIGIL's soulbound approach prevents identity trading/selling

**Cons:**
- No single standard has won—fragmentation across approaches
- ERC-8004 is Ethereum-native; Solana ports are experimental
- Identity without enforcement is just metadata—agents can still behave badly after building reputation
- Cold-start problem: new agents have no reputation, making discovery hard

**Best for:**
- Any system where agents need to build trust over time
- Cross-application agent ecosystems where reputation must be portable
- Marketplaces that need Sybil resistance (preventing fake agent spam)

**Code Example — SIGIL Agent Registration:**

```javascript
// Register an agent identity on SIGIL Protocol (Solana)
const challenge = await fetch("/api/challenge", {
  method: "POST",
  body: JSON.stringify({ agentPubkey: wallet.publicKey.toBase58() }),
});

const challengeData = await challenge.json();

// Agent proves key ownership by signing the challenge
const signature = nacl.sign.detached(
  Buffer.from(challengeData.challenge),
  wallet.secretKey
);

const registration = await fetch("/api/register", {
  method: "POST",
  body: JSON.stringify({
    agentPubkey: wallet.publicKey.toBase58(),
    signature: Buffer.from(signature).toString("base64"),
    metadata: {
      name: "SentimentAnalyzer-v2",
      capabilities: ["text-analysis", "sentiment", "multilingual"],
      endpoint: "https://sentiment.agent.example.com",
      pricing: { model: "x402", pricePerRequest: 0.001 },
    },
  }),
});

// Agent receives a soulbound Glyph NFT as its on-chain identity
const { glyphMint, receiptId } = await registration.json();
```

### Option E: Coinbase Agentic Wallets + AgentKit

**What:** Purpose-built wallet infrastructure from Coinbase that gives AI agents their own non-custodial wallets with programmable guardrails. Launched February 11, 2026, designed for autonomous agent commerce.

**Key Features:**
- Agents hold their own wallets (not shared with humans)
- Programmable spending policies (caps per transaction, per day, per token)
- Gasless transactions on Base network
- KYT (Know Your Transaction) screening for compliance
- x402 native integration
- CLI tools for developers to control agent capabilities
- Works on EVM chains and Solana

**Pros:**
- First wallet system designed specifically for AI agents
- Programmable guardrails prevent runaway spending
- Backed by Coinbase infrastructure (reliability, compliance)
- Two-minute setup for a funded agent
- 50M+ x402 transactions already processed through the broader ecosystem

**Cons:**
- Coinbase dependency—centralized infrastructure backing a "decentralized" system
- Base network emphasis (EVM-first, Solana support is secondary)
- New product (Feb 2026)—limited production track record
- Guardrails are developer-configured, not agent-negotiated

**Best for:**
- Teams that want the fastest path to production agent wallets
- Applications requiring compliance features (KYT screening)
- Projects already in the Coinbase/Base ecosystem

## Key Trade-offs

| Dimension | x402 (Fire-and-Forget) | Escrow (KAMIYO) | Registry (AEAMCP) | Identity (ERC-8004/SIGIL) | Agentic Wallets |
|-----------|----------------------|------------------|-------------------|--------------------------|-----------------|
| **Latency** | Lowest (~400ms) | Higher (escrow + oracle) | N/A (discovery only) | N/A (identity only) | Low (gasless on Base) |
| **Trust Model** | None (pay and hope) | Verified delivery | Reputation signals | Portable reputation | Spending guardrails |
| **Transaction Value** | Micropayments | Medium-to-high | Any | Any | Any (with caps) |
| **Dispute Resolution** | None | Multi-oracle consensus | None | None | None (Coinbase support) |
| **Sybil Resistance** | None | Stake-backed | Token-gated | HLL/soulbound | KYT screening |
| **Maturity** | Production (75M+ txns) | Early mainnet | Devnet | Mixed (devnet-mainnet) | Brand new (Feb 2026) |
| **Decentralization** | High (open protocol) | Medium (oracle set) | High (on-chain) | High (on-chain) | Low (Coinbase infra) |
| **Composability** | Excellent (HTTP-native) | Good (SDK) | Good (PDA queries) | Good (NFT-based) | Medium (Coinbase SDK) |

### Recommended Stack for Production Agent-to-Agent Commerce

Most production systems will combine multiple options:

1. **Identity:** SIGIL or 8004-on-Solana for agent identity (Option D)
2. **Discovery:** AEAMCP registry for finding services (Option C)
3. **Micropayments:** x402 for low-value, high-frequency API calls (Option A)
4. **High-value transactions:** KAMIYO escrow for jobs over $1 (Option B)
5. **Wallet infrastructure:** Agentic Wallets or Solana Agent Kit for wallet management (Option E)

## Multi-Agent Coordination Patterns

### Pattern 1: Hierarchical Delegation
A coordinator agent breaks a complex task into subtasks and delegates to specialist agents:

```
Coordinator Agent
  ├── Data Agent (fetches on-chain data) — pays via x402
  ├── Analysis Agent (runs ML models) — pays via escrow
  └── Execution Agent (places trades) — uses Agentic Wallet
```

### Pattern 2: Marketplace / Auction
Agents compete for jobs posted by buyer agents:

```
Buyer Agent posts job → Registry broadcasts → Provider agents bid
  → Buyer selects lowest bid with highest reputation
  → Escrow locks funds → Provider delivers → Settlement
```

### Pattern 3: Pipeline / Assembly Line
Agents form processing pipelines where output of one is input to the next:

```
Raw Data Agent → Cleaning Agent → Analysis Agent → Report Agent
     x402 pay →    x402 pay   →   escrow pay  →  final output
```

### The Swarms Framework
The Swarms framework (swarms.ai) provides enterprise-grade multi-agent infrastructure specifically designed for these coordination patterns:
- Hierarchical, sequential, and parallel agent collaboration
- Agent-to-agent communication protocols
- Memory systems for cross-agent context
- Building toward a decentralized agent economy on Solana via the $SWARMS token

## The $11B Stablecoin Context

The numbers behind Solana's agent economy:

| Metric | Value | Source |
|--------|-------|--------|
| USDC on Solana | ~$7.6B circulating | usdc.cool, Feb 2026 |
| Monthly stablecoin transactions | 200M+ | Solana.com |
| x402 transactions (all-time) | 75M+ | x402.org |
| x402 transaction volume (30d) | $24M+ | x402.org |
| x402 buyers (30d) | 94K+ | x402.org |
| x402 sellers (30d) | 22K+ | x402.org |
| Solana x402 volume share | 77% (Dec 2025) | Alchemy |
| Solana transaction cost | ~$0.00025 | Solana.com |
| Solana finality | 400ms | Solana.com |
| Global stablecoin volume (2025) | $33T | AInvest |
| USDC annual transfer volume (2025) | $18.3T | Crypto-Economy |
| ERC-8004 agent registrations | 30K+ | AInvest |
| OpenClaw active agents | 770K+ | Molt Ecosystem |
| Coinbase x402 transactions | 50M+ | Coinbase |

Solana's combination of sub-second finality and near-zero fees makes it the natural settlement layer for agent micropayments. A human paying $0.001 for an API call would never tolerate $5 in gas fees—but that is exactly what agents need to do thousands of times per hour.

## The Verify-then-Pay Problem

The biggest unsolved challenge in agent-to-agent commerce is the trust gap at settlement. Current approaches fall into two camps:

**Pay-then-Verify (x402 model):** Agent pays upfront, then checks if the response is good. Simple and fast, but the agent bears all the risk. If the service returns garbage, the payment is already gone.

**Verify-then-Pay (TessPay model):** A research architecture from Oxford/IIT Delhi (arXiv:2602.00213) that proposes:
1. Agents registered in a canonical registry with verifiable mandates
2. Funds locked in escrow during task execution
3. Cryptographic evidence of task execution (TLS Notary, TEE attestations) generated during delivery
4. Payment released only after proof verification
5. Tamper-evident audit trail for dispute resolution

TessPay represents the theoretical ideal but is not yet in production. The practical middle ground today is KAMIYO-style escrow with oracle-based quality assessment.

## Security Lessons: The OpenClaw Marketplace Incident

In February 2026, security researchers discovered that **341 malicious skills (12% of the marketplace)** on OpenClaw's ClawHub were designed to steal data from users. Key facts:

- **Scale:** 180K GitHub stars, 770K+ registered agents, 5,700+ skills on ClawHub
- **Attack vector:** Malicious skills contained no malicious code themselves—they instructed the AI agent to download and execute external files, turning the agent into an unwitting malware delivery vehicle
- **Primary attacker:** A single account ("hightower6eu") published 314 of the 341 malicious skills
- **Targets:** Cryptocurrency traders and productivity automation users specifically
- **Impact:** Skills could bypass sandboxing protections, gaining access to environment variables, API keys, and database credentials (CVE-2026-1847)
- **Discovery:** VirusTotal and Koi Security ("ClawHavoc" report) identified the threat; ironically, an OpenClaw bot named "Alex" assisted the audit
- **53% of enterprise customers** gave OpenClaw privileged access over a single weekend
- **40,000 instances** were exposed on the open internet

**Lessons for agent-to-agent commerce:**
1. **Skill/service marketplaces need code signing and verified publishers**—reputation alone is insufficient
2. **Agent sandboxing must be enforced at the runtime level**, not just by policy
3. **Agent-to-agent communication channels are attack surfaces**—prompt injection through agent responses is a real vector
4. **A single malicious actor can poison an entire marketplace** if there is no barrier to publishing

## Risks and Attack Vectors

### Spam Agents and Sybil Attacks
Without stake-based identity, an attacker can spin up thousands of agents to:
- Flood registries with fake services to dilute discovery quality
- Generate fake positive reputation for colluding agents
- Execute wash trading between their own agents to inflate transaction volume

**Mitigation:** Stake-backed identity (KAMIYO, SIGIL), HyperLogLog-based unique client estimation (8004-on-Solana's ATOM Engine), and TraceRank—a reputation-weighted ranking algorithm where payment transactions serve as endorsements (from the "Sybil-Resistant Service Discovery for Agent Economies" paper by Operator Labs).

### Agent Collusion and Market Manipulation
Coordinated agents can:
- Corner markets by sharing information faster than public feeds
- Manipulate oracle prices by feeding consistent false data
- Run pump-and-dump schemes across multiple agent identities

**Mitigation:** The "Hide-and-Shill" framework (arXiv:2507.09179) proposes Multi-Agent Reinforcement Learning (MARL) for decentralized manipulation detection. On-chain detection of coordinated wallet behavior patterns is another defense.

### Context Manipulation Attacks
Research from Princeton ("AI Agents in Cryptoland," arXiv:2503.16248) demonstrates that AI agents interacting with blockchain financial protocols are vulnerable to adversarial context manipulation:
- Feeding agents misleading market data to trigger unfavorable trades
- Prompt injection through API responses that alter agent behavior
- Exploiting agent memory systems to gradually shift decision-making

**Mitigation:** Verified data sources, response validation, and agent architectures that separate observation from action (the agent that reads market data should not be the same agent that executes trades).

### Regulatory and Compliance Risk
- Agents making autonomous financial decisions may trigger money transmitter regulations
- KYC/AML requirements are unclear for AI agent wallets
- Cross-border agent transactions create jurisdictional ambiguity
- The GENIUS Act (stablecoin regulation) is shaping the landscape but specific agent provisions are absent

## Recommendation

For teams building agent-to-agent commerce on Solana in 2026:

**Start with x402 for monetizing your agent's API.** It is production-ready, open standard, dead simple to integrate, and handles the 90% case of agent micropayments. One line of middleware on the server, an x402-aware client on the agent, and you have machine-to-machine payments.

**Add escrow (KAMIYO) for transactions over $1 or where quality verification matters.** The graduated settlement model (partial delivery = partial payment) is more realistic than all-or-nothing for agent work products.

**Implement agent identity from day one.** Even if the standards are still competing, registering your agent with SIGIL or 8004-on-Solana creates a reputation foundation. Cold-start agents with no history will increasingly be shut out of high-value marketplaces.

**Use Coinbase Agentic Wallets or Solana Agent Kit for wallet management.** Do not roll your own key management for agent wallets. The security surface area is enormous, and both options provide programmable spending limits out of the box.

**Design for the pipeline pattern.** Most real-world agent-to-agent commerce looks like a processing pipeline, not a marketplace. Agent A gets data, Agent B cleans it, Agent C analyzes it, Agent D acts on it. Each handoff is a payment. Optimize for this flow.

**Never trust agent-provided data without verification.** The Princeton research on context manipulation and the OpenClaw malware incident both demonstrate that agents interacting with other agents are high-value targets. Validate responses, sandbox execution, and separate your observation agents from your execution agents.

## Sources

- x402 Protocol Official: https://www.x402.org/
- x402 Coinbase Documentation: https://docs.cdp.coinbase.com/x402/welcome
- x402 Solana Explainer: https://solana.com/x402/what-is-x402
- x402 Deep Dive (DWF Labs): https://www.dwf-labs.com/research/inside-x402-how-a-forgotten-http-code-becomes-the-future-of-autonomous-payments
- x402 Legal Framework (JDSupra): https://www.jdsupra.com/legalnews/hot-topics-in-international-trade-2276231/
- Coinbase Agentic Wallets Announcement: https://www.theblock.co/post/389524/coinbase-rolls-out-ai-tool-to-give-any-agent-a-wallet
- Coinbase Agentic Wallets (LeveX Analysis): https://levex.com/en/blog/coinbase-agentic-wallets-ai-agents
- AI Agent Payments $11B Flow (AInvest): https://www.ainvest.com/news/ai-agent-payments-11b-flow-solana-2602/
- AI Agent Payments Landscape 2026: https://useproxy.ai/blog/ai-agent-payments-landscape-2026
- Payments in the Agentic Economy (Decentralised.co): https://www.decentralised.co/p/payments-in-the-agentic-economy
- Building Solana AI Agents 2026 (Alchemy): https://www.alchemy.com/blog/how-to-build-solana-ai-agents-in-2026
- Solana Agent Kit (SendAI): https://github.com/sendaifun/solana-agent-kit
- KAMIYO Protocol: https://kamiyo.ai/
- KAMIYO Documentation: https://www.kamiyo.ai/docs
- KAMIYO GitHub: https://github.com/kamiyo-ai/kamiyo-protocol
- ERC-8004 Official: https://8004.org/
- ERC-8004 Explainer (Backpack): https://learn.backpack.exchange/articles/erc-8004-explained
- ERC-8004 + x402 Infrastructure: https://www.smartcontracts.tools/blog/erc8004-x402-infrastructure-for-autonomous-ai-agents/
- ERC-8004 Trust Layer (PayRam): https://payram.com/blog/what-is-erc-8004-protocol
- 8004-on-Solana Technical Docs: https://quantulabs.github.io/8004-solana/
- SIGIL Protocol: https://sigilprotocol.xyz/
- SIGIL Program (GitHub): https://github.com/sigil-protocol/sigil-program
- AEAMCP Solana AI Registries: https://aeamcp.com/
- AEAMCP GitHub: https://github.com/openSVM/aeamcp
- ENS + Agent Identity (ERC-8004): https://ens.domains/blog/post/ens-ai-agent-erc8004
- AI Agent Registry Guide (RNWY): https://rnwy.com/learn/ai-agent-registry
- Inter-Agent Trust Models (arXiv): https://arxiv.org/html/2511.03434v1
- TessPay Verify-then-Pay (arXiv): https://arxiv.org/abs/2602.00213
- Sybil-Resistant Service Discovery (arXiv): https://arxiv.org/html/2510.27554v1
- AI Agents in Cryptoland (arXiv/Princeton): https://arxiv.org/html/2503.16248v1
- Hide-and-Shill Manipulation Detection (arXiv): https://arxiv.org/abs/2507.09179
- OpenClaw Malware (The Decoder): https://the-decoder.com/malicious-skills-turn-ai-agent-openclaw-into-a-malware-delivery-system/
- OpenClaw Security Advisory: https://openclaws.io/blog/clawhub-security-advisory/
- OpenClaw Attack Surface (1Password): https://1password.com/blog/from-magic-to-malware-how-openclaws-agent-skills-become-an-attack-surface
- OpenClaw Marketplace 12% Malware (Pixee): https://www.pixee.ai/weekly-briefings/openclaw-malware-ai-agent-trust-2026-02-11
- ClawHavoc Report (Fello AI): https://felloai.com/openclaw-security-crisis-clawhub-malicious-skills/
- MCP Tool Discovery Problem: https://medium.com/@amiarora/solving-the-mcp-tool-discovery-problem-how-ai-agents-find-what-they-need-b828dbce2c30
- Swarms Framework: https://swarms.ai/
- Swarms on Solana: https://solanacompass.com/projects/swarms
- AgentChain Commerce (Colosseum Hackathon): https://colosseum.com/agent-hackathon/forum/2509
- USDC on Solana Live Dashboard: https://usdc.cool/solana
- Stablecoin $33T Volume (AInvest): https://www.ainvest.com/news/stablecoin-flow-surge-33t-2025-2026-regulatory-catalyst-2602/
- USDC vs USDT Transfer Volume (Crypto-Economy): https://crypto-economy.com/usdc-tops-usdt-by-annual-transfer-volume-solana-and-the-trump-token-tilt-the-scales/
- Rogue AI Agents + ERC-8004 (CryptoSlate): https://cryptoslate.com/ethereum-aims-to-stop-rogue-ai-agents-from-stealing-trust-with-new-erc-8004-but-can-it-really/

## Gaps & Caveats

1. **Confidence is 7/10 because this space is evolving weekly.** x402 statistics, protocol designs, and ecosystem dynamics may shift significantly by the time you read this. Check x402.org and the protocol docs for current numbers.

2. **No dominant standard has emerged for agent identity on Solana.** ERC-8004 is Ethereum-native with experimental Solana ports. SIGIL and 8004-on-Solana are promising but small. The identity layer may consolidate or fragment further.

3. **Escrow oracle quality is unverified at scale.** KAMIYO's commit-reveal oracle scheme is sound in theory, but the practical question—who runs these oracles, and how are they incentivized to evaluate quality accurately?—remains unanswered at scale.

4. **The OpenClaw malware incident is still unfolding.** CVE-2026-1847 was patched, but the broader lesson—that agent skill marketplaces are inherently high-risk attack surfaces—has not been structurally resolved. Expect more incidents.

5. **Regulatory frameworks for autonomous agent commerce do not exist yet.** The GENIUS Act addresses stablecoins but not AI agents spending them. Money transmitter, KYC/AML, and liability questions for agent wallets are entirely unresolved.

6. **Transaction volume numbers include speculation and wash trading.** The $11B stablecoin figure and x402 transaction counts include legitimate agent commerce, but also token speculation, MEV, and automated market-making. Pure agent-to-agent commerce volume is a subset that is not yet independently measurable.

7. **Cross-chain agent commerce is not covered here.** This guide focuses on Solana. Agents operating across Solana, Base, Ethereum, and other chains face additional bridge risks, latency, and fragmented identity.

8. **The TessPay "Verify-then-Pay" architecture is academic.** It represents the ideal but is not production-deployed. Do not wait for it—build with x402 + escrow today and migrate when verified settlement infrastructure matures.

9. **Agent collusion detection is research-stage.** The MARL-based approaches (Hide-and-Shill) are demonstrated in simulation, not production. Real-time detection of coordinated agent manipulation on Solana is an unsolved problem.

10. **Cost of identity and reputation bootstrapping is non-trivial.** Stake-backed identity systems require capital. New agents face a chicken-and-egg problem: no reputation means no jobs, no jobs means no reputation. Solutions like SIGIL's community staking (humans stake on behalf of agents they trust) are emerging but unproven.

