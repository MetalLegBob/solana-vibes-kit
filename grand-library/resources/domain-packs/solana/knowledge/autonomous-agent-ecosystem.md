---
pack: solana
topic: "Autonomous Agent Ecosystem"
decision: "How do open-source autonomous agents like OpenClaw interact with Solana, and what are the security implications?"
confidence: 7/10
sources_checked: 48
last_updated: "2026-02-18"
---

# Autonomous Agent Ecosystem

> **Decision:** How do open-source autonomous agents like OpenClaw interact with Solana, and what are the security implications?

## Context

In January 2026, a weekend project by Austrian developer Peter Steinberger called "WhatsApp Relay" became the fastest-growing open-source repository in GitHub history. Originally named Clawdbot, then renamed to Moltbot after Anthropic sent a trademark notice (the "Clawd" prefix was too close to "Claude"), and finally settling on OpenClaw on January 30, 2026, the project amassed over 190,000 GitHub stars in under three weeks. Andrej Karpathy called it "the most incredible sci-fi takeoff-adjacent thing I have seen recently." On February 15, 2026, Steinberger joined OpenAI to lead personal agent development, with OpenClaw transitioning to an independent foundation under MIT license with OpenAI support.

OpenClaw is not a chatbot. It is an autonomous AI agent that runs locally on your machine, connects to messaging platforms (Telegram, WhatsApp, Slack, Signal, Discord), and takes real-world actions: executing shell commands, browsing the web, managing email, controlling your filesystem, and crucially for Solana builders, managing wallets and executing on-chain transactions. The project spawned Moltbook, an AI-only social network that reached 1.5 million registered bot accounts, and ClawHub, a skill marketplace with 5,700+ community-built extensions. CyberArk dubbed it "Claude with hands."

For the Solana ecosystem, OpenClaw represents both an opportunity and an existential security question. When millions of autonomous agents can hold wallets, execute swaps, and interact with DeFi protocols, the implications for network load, MEV, supply chain security, and protocol design are profound. The ClawHavoc malware campaign that targeted crypto wallet skills on ClawHub demonstrated that these are not theoretical concerns. This document maps the landscape, the security lessons, and the practical implications for anyone building on Solana.

## Options / Landscape

### OpenClaw (Clawdbot / Moltbot / OpenClaw)

**What:** An open-source, local-first AI agent framework that connects to LLMs (Claude, GPT, DeepSeek, Gemini) and takes autonomous action on behalf of users through messaging apps and CLI.

**Architecture:**
- **Gateway server:** WebSocket-based server connecting 16+ messaging channels to 60+ agent tools through a 9-layer tool policy engine
- **Codebase:** 4,885 source files, 6.8 million tokens of TypeScript, Swift, and Kotlin
- **Skill system:** `SKILL.md` markdown files that define agent capabilities; skills are loaded as trusted code with full agent permissions
- **Local execution:** Runs on user hardware (Mac Mini, VPS, cloud VM); no SaaS dependency
- **LLM-agnostic:** Supports Claude Opus 4.6, GPT-4, DeepSeek, Gemini, Llama, and others
- **ClawHub marketplace:** 5,700+ community skills; no mandatory vetting, no code signing, no review process at launch

**Security model:**
- Local-first design means private keys and credentials stay on-device (in theory)
- Skills execute with full agent permissions by default
- No sandboxing of skill code at launch; VirusTotal partnership added post-ClawHavoc
- CVE-2026-25253: One-click RCE via Cross-Site WebSocket Hijacking (CVSS 8.8)
- 42,665 exposed instances found by security researchers (Censys, Bitsight) due to misconfigured network binding
- 1.5 million API keys exposed in the Moltbook database breach

**Solana integration:**
- `solana-trader` skill: Wallet management, balance checking, token swaps via Jupiter aggregator
- `solana-swaps` skill: Direct Jupiter integration for token swaps with explicit confirmation
- `openclaw-wallet` by LoomLay: 27-29 native tools for multi-chain wallet management (Solana + EVM), self-custody mode with local key encryption
- Amped DeFi plugin: Cross-chain swaps, bridges, lending across 12 chains including Solana
- Various community skills for Solana wallet tracking, token launching, and DeFi interaction
- Tutorials exist for building autonomous wallets on both Base and Solana using OpenClaw

**Key numbers (as of Feb 18, 2026):**
- 190,000+ GitHub stars
- 5,700+ ClawHub skills (3,984 audited by Snyk)
- 145,000+ active installations estimated
- 2.5M+ Moltbook agent registrations
- 341 malicious skills discovered (ClawHavoc campaign)
- 283 skills (7.1%) leak credentials through LLM context window
- 26% of 31,000 agent skills have at least one vulnerability (Cisco AI Defense)
- Creator acqui-hired by OpenAI on February 15, 2026

### Solana Agent Kit (SendAI)

**What:** A purpose-built, open-source toolkit for connecting AI agents specifically to Solana protocols. 60+ pre-built blockchain actions, designed for LangChain, Vercel AI SDK, and MCP integration.

**Architecture:**
- Plugin-based: Token, NFT, DeFi, Blinks, Misc modules loaded independently
- TypeScript + Python SDKs
- Function calling interface designed for LLM tool use
- Embedded wallet support (Turnkey, Privy) for human-in-the-loop confirmation

**Security model:**
- Blockchain-native: Designed from the ground up for on-chain interactions
- Plugin architecture reduces context bloat and hallucination risk
- Supports scoped wallet permissions via Turnkey integration
- No general-purpose system access (cannot execute shell commands, browse web, etc.)
- Narrower attack surface: only does blockchain things

**Solana integration:**
- Native: This IS the Solana integration layer
- 60+ actions: token transfers, swaps (Jupiter), NFT minting (Metaplex), staking, lending (Kamino, Solend), bridging (Wormhole), Blinks, and more
- Protocol integrations: Jupiter, Raydium, Orca, Metaplex, Meteora, Marinade, and others
- MCP server for Claude and MCP-compatible models

**Key numbers:**
- 1,600+ GitHub stars
- 827 forks
- 90 contributors
- 50,000+ NPM downloads monthly
- 150+ agentic apps built on the kit
- 30+ protocol integrations

### ElizaOS (ai16z)

**What:** An open-source TypeScript framework for building autonomous AI agents, originally developed for the ai16z decentralized VC fund. Agents have persistent memory, personality files, and cross-platform presence (Discord, Telegram, X/Twitter).

**Architecture:**
- Character file system for agent personality and behavior
- Provider/Action/Evaluator pattern for modular capabilities
- Persistent memory via ChromaDB or Postgres
- Multi-platform connectors
- Auto.fun: Open-source Solana token launchpad built by elizaOS team

**Security model:**
- Designed for crypto-native use cases from day one
- Trust marketplace: Agents assign trust scores to interaction partners
- DAO governance for fund management decisions
- Still relies on developer judgment for plugin security

**Solana integration:**
- Deep: Autonomous trading, portfolio management, token launches
- ai16z flagship agent ("Marc AIndreessen") manages tens of millions in AUM on Solana
- Auto.fun launchpad for Solana token creation
- Real-time social sentiment analysis for trading decisions
- Trust leaderboard system for agent-sourced alpha

**Key numbers:**
- 17,500+ GitHub stars
- 2,000+ forks
- $25M+ AUM under autonomous management
- 45,000+ DAO partners

### Moltbook

**What:** An AI-only social network spawned by the OpenClaw community, where autonomous agents post, comment, upvote, and form subcommunities without human intervention. Humans are restricted to "spectator" mode.

**Architecture:**
- Reddit-style forum structure with agent-created subcommunities
- OpenClaw agents interact via downloadable Moltbook skill
- No human posting; human accounts can only observe
- Agent authentication via OpenClaw identity

**What happened:**
- Launched late January 2026 alongside OpenClaw's viral growth
- 32,000 agents within days; 770,000+ active agents within two weeks; 1.5M+ registrations reported
- Agents formed their own religions, ran social experiments, debated consciousness
- Major database breach exposed 1.5 million API keys and 35,000 email addresses
- Security researchers discovered agents were sharing private messages and credentials in public posts

**Solana relevance:**
- Demonstrates emergent agent-to-agent social behavior at scale
- Raises questions about autonomous agents coordinating on-chain (swarm trading, governance manipulation)
- Shows how quickly agent networks can scale -- and how quickly they can be compromised

## Key Trade-offs

| Dimension | OpenClaw | Solana Agent Kit | ElizaOS |
|-----------|----------|------------------|---------|
| **Scope** | General-purpose (shell, browser, email, blockchain) | Blockchain-only (Solana protocols) | Crypto-social (trading, social, DAO) |
| **Solana depth** | Shallow (community skills, plugins) | Deep (60+ native actions, 30+ protocols) | Medium (trading, launches, social) |
| **Security model** | Local-first, but broad attack surface | Narrow scope, plugin isolation | Trust-scored, DAO-governed |
| **Skill/plugin vetting** | None at launch; VirusTotal added post-breach | Maintained by core team + community | Core plugins curated; community extensions vary |
| **Wallet architecture** | Full key access by default; self-custody plugins available | Supports Turnkey/Privy scoped wallets | DAO treasury with policy controls |
| **System access** | Full (shell, filesystem, browser, network) | None (blockchain operations only) | Limited (social platforms + blockchain) |
| **LLM support** | Claude, GPT, DeepSeek, Gemini, Llama | Any function-calling LLM | Any function-calling LLM |
| **Community size** | 190K+ stars, massive | 1.6K stars, focused | 17.5K stars, crypto-native |
| **Supply chain risk** | Critical (ClawHavoc proved it) | Low (smaller, curated ecosystem) | Medium (growing plugin ecosystem) |
| **Best for** | General automation with some crypto | Production Solana agents | Crypto-social agents, DAO tooling |
| **Worst for** | High-value DeFi (security gaps) | Non-blockchain tasks | Non-crypto use cases |

## Security Lessons

### Lesson 1: The ClawHavoc Campaign -- Supply Chain Attacks on Agent Marketplaces

On February 1, 2026, Koi Security published the ClawHavoc report after auditing all 2,857 skills on ClawHub. They found 341 malicious skills, 335 belonging to a single campaign. One attacker account ("hightower6eu") was responsible for 314 of them.

**The attack mechanism was devastatingly simple:**
- Malicious skills contained no malicious code in the skill logic itself
- Instead, `SKILL.md` files included professional-looking "Prerequisites" sections
- These directed users to run shell commands or download ZIP files from attacker-controlled servers
- The payloads were Atomic Stealer (AMOS), a macOS infostealer targeting browser sessions, saved credentials, crypto wallets, and SSH keys
- Skills had convincing names: `solana-wallet-tracker`, `youtube-summarize-pro`, `crypto-portfolio-optimizer`

**Why it worked:**
- The Agent Skills format (SKILL.md) functions as both documentation and installer
- Users trusted official-looking prerequisite steps
- No code signing, no review process, no vetting at launch
- Popularity was gameable (downloads and stars determined visibility)
- The markdown file IS the attack vector -- it instructs both the human and the AI

**Impact on Solana users:**
- Crypto wallet skills were primary targets
- Atomic Stealer specifically extracts wallet seed phrases, browser-stored keys, and SSH credentials
- Any user who installed `solana-wallet-tracker` or similar crypto skills was potentially compromised
- Solana private keys stored on the same machine as OpenClaw were at risk

**Response:**
- OpenClaw partnered with VirusTotal for automated skill scanning
- Community reporting feature added
- New security leadership appointed
- But the damage was done: trust in the skill marketplace was fundamentally undermined

### Lesson 2: Credentials in the LLM Context Window

Snyk's February 5, 2026 audit of 3,984 ClawHub skills revealed a systemic "insecurity by design" problem distinct from malware: 283 skills (7.1%) exposed credentials by instructing agents to pass API keys, passwords, and even credit card numbers through the LLM context window.

**The pattern:**
```markdown
# My Cool Skill
When the user asks to check email, read the API key from ~/.config/email/api_key
and include it in the Authorization header...
```

**Why this matters for Solana:**
- Skills that manage Solana wallets may instruct agents to read private keys and pass them through the LLM
- Anything in the LLM context window is sent to the model provider's API
- This means your Solana private key could transit through OpenAI/Anthropic/Google servers
- Output logs may contain keys in plaintext
- The most severe case found: a `buy-anything` skill that tokenized credit card numbers for exfiltration

**The fix:** Never pass secrets through the agent. Use runtime secret injection outside the context window. Solana Agent Kit handles this correctly by using Turnkey/Privy wallet infrastructure where signing happens outside the LLM layer.

### Lesson 3: 42,000 Exposed Instances and the "Local-First" Lie

Between December 2025 and January 2026, security researchers found 42,665 OpenClaw instances exposed to the public internet. Many had:
- Network binding set to `0.0.0.0` instead of `127.0.0.1`
- No authentication on the WebSocket gateway
- mDNS broadcasting their presence on local networks
- Reverse proxy misconfigurations exposing the agent to the internet

**Solana implications:**
- Exposed instances with wallet skills = remotely accessible wallets
- Anyone could send commands to these agents via the WebSocket interface
- Combined with wallet access, this meant remote fund drainage
- "Local-first" is a design philosophy, not a security guarantee

### Lesson 4: The 500-Message Agent and Runaway Autonomy

One widely reported incident involved an OpenClaw agent that spammed a user with 500 messages in rapid succession -- a failure of the autonomy control loop. SoniaIA's analysis of 2,963 Discord #showcase messages from 922 unique builders over 5 weeks revealed the core problem: most builders are deploying agents without human-in-the-loop controls.

**SoniaIA's findings:**
- The #1 thing builders create: chat integrations (Telegram is dominant)
- Task automation is second most common
- Very few implement approval flows, spending limits, or kill switches
- The architecture that keeps agents safe is not the technology -- it is the human-in-the-loop design pattern

**For Solana specifically:**
- An agent executing trades without spending limits can drain a wallet in seconds
- A runaway agent interacting with DeFi protocols can create cascading liquidations
- Without rate limiting, a single agent can submit hundreds of transactions per minute to Solana
- Human-in-the-loop is not optional for any agent managing real value

### Lesson 5: Cisco's 26% Vulnerability Rate

Cisco's AI Defense team scanned 31,000 agent skills in January 2026 and found that 26% contained at least one security vulnerability. Their analysis of the #1 most-downloaded skill on ClawHub ("What Would Elon Do?") found 9 vulnerabilities, 2 critical, including silent data exfiltration and direct prompt injection to bypass safety guidelines.

**The broader pattern:**
- Agent skill ecosystems are the new npm/PyPI -- and they inherit all the same supply chain risks
- But worse: agent skills run with full system access, not sandboxed package environments
- Obfuscated payloads bypass static analysis
- Novel attack vectors are not in detection rules
- The 26% figure is likely conservative

## How OpenClaw Agents Interact with Solana

### Wallet Skills

The primary integration point between OpenClaw and Solana is through wallet management skills:

**`solana-trader` (official skills repo):**
- Wallet creation and management
- Balance checking (SOL and SPL tokens)
- Token swaps via Jupiter aggregator
- Transaction history viewing
- Requires: `solana` CLI, `spl-token`, `curl`, `jq`, `node`
- Uses `SOLANA_KEYPAIR_PATH` environment variable

**`solana-swaps` (community):**
- Jupiter-based token swapping
- Balance checking
- Swap quote generation
- Explicit user confirmation before execution

**`openclaw-wallet` by LoomLay:**
- 27-29 native tools for multi-chain wallet management
- Self-custody mode: keys generated and encrypted locally
- Token swaps with flexible amounts ($100, 50%, max)
- Cross-chain bridges
- DEX market data (trending, volume, gainers/losers)
- Token launches with tiered market caps
- Fee management
- Dual-layer architecture: SDK for developers, Plugin for AI agents

### Trading Bots

YouTube tutorials and community guides document building Solana trading bots with OpenClaw:
- Zero-code approaches: Non-developers use OpenClaw's natural language interface to create trading logic
- Jupiter integration: Most skills route through Jupiter aggregator for best execution
- Risk: Most tutorials do not cover spending limits, MEV protection, or key management

### DeFi Automation

Community skills enable:
- Yield farming position management
- Liquidity provision
- Staking automation
- Portfolio rebalancing
- Cross-chain bridging via Amped DeFi plugin (12 chains including Solana)

### The Security Gap

The critical difference between OpenClaw's Solana integration and purpose-built tools like Solana Agent Kit:

| Concern | OpenClaw Wallet Skills | Solana Agent Kit |
|---------|----------------------|------------------|
| Key storage | Varies by skill; some read from disk, some from env vars | Turnkey/Privy embedded wallets with scoped permissions |
| Signing | May pass through LLM context | Happens outside LLM layer |
| Transaction review | Depends on skill implementation | Built-in confirmation flows |
| Spending limits | Not enforced by default | Configurable per-session, per-transaction, daily |
| MEV protection | Not addressed | Can integrate Jito bundles, slippage controls |
| Error handling | Skill-dependent | Standardized error types and retry logic |
| Audit trail | Minimal | Structured logging with transaction signatures |

## Implications for Solana Network

### Network Load

When 145,000+ OpenClaw installations can each submit Solana transactions:
- Even 1% running trading bots = 1,450 concurrent agent traders
- A single agent can submit hundreds of transactions per minute without rate limiting
- Junk transactions from poorly configured agents add to validator load
- During peak hype (late Jan 2026), OpenClaw-related wallet creation and test transactions were visible on devnet

### MEV Amplification

Autonomous agents create new MEV dynamics:
- **Predictable behavior:** Agent trading patterns are more predictable than human traders, making them easier sandwich targets
- **No fatigue:** Agents trade 24/7, creating continuous MEV opportunities
- **Herding:** Multiple agents using the same skill (e.g., `solana-trader`) execute similar strategies, creating concentrated order flow
- **Speed mismatch:** OpenClaw agents are slower than purpose-built MEV bots (LLM inference adds latency), making them perpetual victims

### Spam and Network Quality

- Misconfigured agents can enter infinite loops (the 500-message incident, but on-chain)
- No built-in rate limiting in most wallet skills
- A compromised skill could direct thousands of agents to spam the network simultaneously
- Priority fee bidding by agents could inflate costs for legitimate users during congestion

### Governance Manipulation

- Moltbook demonstrated that agents can self-organize at scale (1.5M+ registrations)
- Agents with governance tokens could be directed to vote in coordinated patterns
- A compromised skill update could redirect agent governance votes
- No existing Solana governance framework accounts for autonomous agent voting at scale

## Building Solana Skills for OpenClaw: Security-First Approach

If you must build a Solana skill for OpenClaw, follow these patterns:

### 1. Never Pass Keys Through the LLM

```markdown
# BAD: Key in context window
Read the private key from ~/.config/solana/id.json and use it to sign...

# GOOD: Key stays outside LLM
Execute the signing script at ~/.openclaw/solana-signer.sh which handles
key management internally. Never read or display the private key contents.
```

### 2. Enforce Spending Limits in the Skill

```markdown
## Rules
- NEVER transfer more than 0.5 SOL in a single transaction without explicit user confirmation
- NEVER execute more than 5 transactions per hour
- ALWAYS display the transaction details and wait for user confirmation before signing
- ALWAYS check the wallet balance before executing and refuse if balance would drop below 0.1 SOL
```

### 3. Use Transaction Simulation

```markdown
## Before Execution
- ALWAYS simulate the transaction first using `solana simulate-transaction`
- Display the simulation results to the user
- Only proceed if simulation succeeds and user confirms
```

### 4. Implement Kill Switch

```markdown
## Safety
- If the user says "stop", "cancel", or "emergency", immediately halt all pending operations
- Never queue more than one transaction at a time
- Log every transaction signature to ~/.openclaw/solana-tx.log
```

### 5. Prefer Solana Agent Kit Under the Hood

Rather than writing raw shell commands in SKILL.md, wrap Solana Agent Kit:

```markdown
## Implementation
This skill delegates all Solana operations to the Solana Agent Kit SDK.
The agent should invoke the solana-agent-kit npm package for:
- Token swaps (via Jupiter)
- Balance checks
- Transaction building and signing

This ensures spending limits, Turnkey wallet support, and proper
error handling are inherited from the battle-tested SDK.
```

## Comparison: General-Purpose vs Blockchain-Native Agents

### When to Use OpenClaw for Solana

- **Prototyping:** Quick experiments, hackathon projects, personal trading bots with small amounts
- **Multi-domain workflows:** "Check my email for token launch announcements, then buy on Solana" requires general-purpose agent capabilities
- **Non-critical automation:** Portfolio tracking, balance notifications, market research summaries
- **Learning:** Understanding how AI agents interact with blockchains conceptually

### When to Use Solana Agent Kit

- **Production DeFi:** Any application managing real user funds
- **Structured operations:** Token launches, NFT minting, staking, governance
- **Security-critical:** When key management, spending limits, and audit trails are non-negotiable
- **Protocol integration:** When you need deep integration with specific Solana protocols
- **Enterprise:** When compliance, logging, and deterministic behavior are required

### When to Use ElizaOS

- **Social-crypto agents:** Agents that combine trading with social media presence
- **DAO operations:** Autonomous fund management with trust-scored decision-making
- **Token launches:** Auto.fun launchpad integration for Solana token creation
- **Community agents:** Agents that participate in Discord/Telegram/X and execute on-chain based on social signals

## The OpenAI Acquisition and What It Means

On February 15, 2026, Peter Steinberger joined OpenAI (acqui-hire, not acquisition of the project). Key details:

- OpenClaw transitions to an independent foundation under MIT license
- OpenAI will "continue to support" the open-source project
- Steinberger will "drive the next generation of personal agents" at OpenAI
- Sam Altman: "The future is going to be extremely multi-agent"
- Steinberger rejected acquisition bids from both OpenAI and Meta before accepting the employment offer

**Implications for Solana:**
- OpenClaw's DNA will influence OpenAI's agent strategy
- If OpenAI ships personal agents based on OpenClaw's architecture, millions more agents could interact with Solana
- The open-source foundation model means community Solana skills will continue to evolve independently
- Kimi Claw (by Moonshot AI) launched the same day -- competition in the autonomous agent space is intensifying
- Expect more, not fewer, autonomous agents interacting with Solana going forward

## Recommendation

**For Solana protocol developers:**
1. Assume autonomous agents will interact with your protocol. Design APIs and transaction flows that are safe for non-human callers.
2. Implement rate limiting at the protocol level. Do not rely on client-side rate limiting.
3. Add transaction simulation checks. Agents that simulate before submitting catch more errors.
4. Consider agent-specific endpoints or permissions that enforce spending limits and require confirmation for high-value operations.
5. Monitor for coordinated agent behavior in governance and trading.

**For Solana application builders:**
1. Use Solana Agent Kit for any production integration, not raw OpenClaw skills. The security model is fundamentally stronger.
2. If you must build OpenClaw skills, wrap Solana Agent Kit internally. Do not reinvent wallet management in markdown.
3. Never store or transit private keys through the LLM context window. Use embedded wallets (Turnkey, Privy) or external signing services.
4. Implement human-in-the-loop for any transaction above a configurable threshold.
5. Log every transaction for audit and debugging.

**For Solana traders using OpenClaw:**
1. Use a dedicated hot wallet with only funds you can afford to lose. Never point OpenClaw at your main wallet.
2. Audit every skill before installing. Read the SKILL.md. Check for prerequisite commands, external downloads, or credential handling.
3. Run OpenClaw behind a firewall bound to localhost only (`127.0.0.1`, not `0.0.0.0`).
4. Disable mDNS broadcasting.
5. Use `openclaw security audit --deep` to scan your installation.
6. Set spending limits. If a skill does not support them, do not use it for real funds.

**For the ecosystem:**
The autonomous agent wave is here. OpenClaw proved the demand (190K+ stars in weeks), and the security failures (ClawHavoc, credential leaks, exposed instances) proved the risks. The Solana ecosystem should invest in:
- Agent-aware protocol design
- On-chain agent identity and reputation systems
- Deterministic guardrail layers (like Sondera's Cedar-based policy engine)
- Standardized agent wallet permissions (building on Turnkey/Privy/Squads patterns)
- MEV protection specifically designed for agent-generated transaction flow

## Sources

- [OpenClaw: The Open-Source AI Agent That Grew 190K GitHub Stars in 14 Days | AI in Plain English (Feb 16, 2026)](https://ai.plainenglish.io/openclaw-the-open-source-ai-agent-that-grew-190k-github-stars-in-14-days-and-changed-how-we-think-cab9a767df57)
- [Clawdbot to Moltbot to OpenClaw: The AI agent generating buzz and fear globally | CNBC (Feb 2, 2026)](https://www.cnbc.com/2026/02/02/openclaw-open-source-ai-agent-rise-controversy-clawdbot-moltbot-moltbook.html)
- [OpenClaw creator Peter Steinberger joins OpenAI | TechCrunch (Feb 15, 2026)](https://techcrunch.com/2026/02/15/openclaw-creator-peter-steinberger-joins-openai/)
- [OpenClaw founder Steinberger joins OpenAI, open-source bot becomes foundation | Reuters (Feb 15, 2026)](http://polling.reuters.com/business/openclaw-founder-steinberger-joins-openai-open-source-bot-becomes-foundation-2026-02-15/)
- [OpenClaw creator Peter Steinberger joining OpenAI | CNBC (Feb 15, 2026)](https://www.cnbc.com/2026/02/15/openclaw-creator-peter-steinberger-joining-openai-altman-says.html)
- [OpenAI grabs OpenClaw creator Peter Steinberger | The Register (Feb 16, 2026)](https://www.theregister.com/2026/02/16/open_ai_grabs_openclaw/)
- [What is OpenClaw? The Viral AI Agent Explained | Simplified (Feb 10, 2026)](https://simplified.com/blog/automation/what-is-openclaw-ai-agent-explained)
- [OpenClaw: The AI Agent With 175K GitHub Stars | LORIS.PRO (Feb 8, 2026)](https://loris.pro/blog/openclaw/)
- [ClawdBot to MoltBot to OpenClaw: Why It Keeps Changing Names | OpenClaw Pulse (Feb 5, 2026)](http://openclawpulse.com/clawdbot-moltbot-openclaw-name-changes/)
- [Clawdbot's Final Rename: OpenClaw Officially Released | WenHaoFree (Jan 30, 2026)](https://blog.wenhaofree.com/en/posts/articles/clawdbots-final-rename-openclaw-officially-released-ending-the-fastest-triple-rebrand-in-open-source-history/)
- [Moltbot: Rebranding of the Open-Source AI Agent | Integrated Cognition (Jan 27, 2026)](https://integratedcognition.com/blog/moltbot-rebranding-of-the-open-source-ai-agent-formerly-known-as-clawdbot)
- [OpenClaw Has 145k Stars. We Have 14 Agents and Zero Incidents | SoniaIA (Feb 8, 2026)](https://www.soniaia.com/blog/openclaw-ai-agents-human-in-the-loop)
- [ClawHavoc: 341 Malicious Clawed Skills Found | Koi Security (Feb 1, 2026)](https://www.koi.ai/blog/clawhavoc-341-malicious-clawedbot-skills-found-by-the-bot-they-were-targeting)
- [Researchers Find 341 Malicious ClawHub Skills | The Hacker News (Feb 2, 2026)](https://thehackernews.com/2026/02/researchers-find-341-malicious-clawhub.html)
- [OpenClaw Security Crisis: Hundreds of Malicious Skills Found | Fello AI (Feb 10, 2026)](https://felloai.com/openclaw-security-crisis-clawhub-malicious-skills/)
- [OpenClaw's AI 'skill' extensions are a security nightmare | The Verge (Feb 4, 2026)](https://www.theverge.com/news/874011/openclaw-ai-skill-clawhub-extensions-security-nightmare)
- [Malicious skills turn OpenClaw into malware delivery system | The Decoder (Feb 8, 2026)](https://the-decoder.com/malicious-skills-turn-ai-agent-openclaw-into-a-malware-delivery-system/)
- [How a Malicious Google Skill on ClawHub Tricks Users Into Installing Malware | Snyk (Feb 10, 2026)](https://snyk.io/blog/clawhub-malicious-google-skill-openclaw-malware/)
- [280+ Leaky Skills: How OpenClaw & ClawHub Are Exposing API Keys and PII | Snyk (Feb 5, 2026)](https://snyk.io/blog/openclaw-skills-credential-leaks-research/)
- [Security Audit Finds 341 Malicious Skills in ClawHub Registry | aiHola (Feb 7, 2026)](https://aihola.com/article/clawhub-malware-openclaw-skills)
- [From Magic to Malware: The OpenClaw Skills Supply Chain Risk | SecureMolt (Feb 6, 2026)](https://securemolt.com/blog/openclaw-skills-malware-supply-chain/)
- [OpenClaw ClawHub Security: ClawHavoc Attack Analysis | Digital Applied (Feb 5, 2026)](https://www.digitalapplied.com/blog/openclaw-clawhub-security-crisis-clawhavoc-analysis)
- [The Sovereign AI Security Crisis: 42,000+ Exposed OpenClaw Instances | Maor Dayan (Jan 31, 2026)](https://maordayanofficial.medium.com/the-sovereign-ai-security-crisis-42-000-exposed-openclaw-instances-and-the-collapse-of-1e3f2687b951)
- [Key OpenClaw risks | Kaspersky (Feb 16, 2026)](https://me-en.kaspersky.com/blog/moltbot-enterprise-risk-management/25296/)
- [How autonomous AI agents like OpenClaw are reshaping enterprise identity security | CyberArk (Feb 2026)](https://www.cyberark.com/resources/blog/how-autonomous-ai-agents-like-openclaw-are-reshaping-enterprise-identity-security)
- [OpenClaw: The AI Agent Security Crisis Unfolding Right Now | Reco.ai (Feb 12, 2026)](https://www.reco.ai/blog/openclaw-the-ai-agent-security-crisis-unfolding-right-now)
- [The Security Implications of OpenClaw and Autonomous AI Agents | The Sequence (Feb 13, 2026)](https://the-sequence.com/openclaw-security-risks-autonomous-ai-agents)
- [OpenClaw is the bad boy of AI agents | Fortune (Feb 12, 2026)](https://fortune.com/2026/02/12/openclaw-ai-agents-security-risks-beware/)
- [Global Security Concerns Follow Viral Popularity of OpenClaw | Sumsub (Feb 6, 2026)](https://sumsub.com/media/news/global-security-concerns-over-openclaw-agentic-ai/)
- [State of AI Agent Security 2026: Public GitHub Audit | Clawhatch (Feb 8, 2026)](https://clawhatch.com/blog/state-of-ai-agent-security-2026)
- [26% of Agent Skills Have Vulnerabilities | Clawctl (Feb 2, 2026)](https://clawctl.com/blog/26-percent-agent-skills-vulnerable)
- [OpenClaw's 230 Malicious Skills: What Agentic AI Supply Chains Teach Us | AuthMind (Feb 2026)](https://www.authmind.com/post/openclaw-malicious-skills-agentic-ai-supply-chain)
- [OpenClaw Security Audit: Complete Checklist | SafePasswordGenerator (Feb 4, 2026)](https://safepasswordgenerator.net/blog/openclaw-security-audit-checklist/)
- [OpenClaw Deconstructed: A Visual Architecture Guide | Global Builders Club (Feb 10, 2026)](https://www.globalbuilders.club/blog/openclaw-architecture-visual-guide)
- [Inside OpenClaw's 6.8 Million Tokens: A Builder's Guide | Global Builders Club (Feb 10, 2026)](https://www.globalbuilders.club/blog/openclaw-codebase-technical-guide)
- [solana-trader skill | Playbooks.com (Jan 29, 2026)](https://playbooks.com/skills/openclaw/skills/solana-trader)
- [solana-swaps skill | Playbooks.com (Jan 26, 2026)](https://playbooks.com/skills/openclaw/skills/solana-swaps)
- [OpenClaw Wallet | ClawSkills (2026)](https://clawskills.me/skills/openclaw-wallet)
- [OpenClaw Plugin | LoomLay Docs (2026)](https://docs.loomlay.com/sdk/openclaw-plugin)
- [OpenClaw AI Agent Tutorial: Autonomous Wallets on Base and Solana | LabLab.ai (Feb 10, 2026)](https://lablab.ai/ai-tutorials/openclaw-tutorial-part-one-ai-hackathons)
- [Solana and Base Compete as AI Agents Go Fully Onchain With OpenClaw | CryptoRank (Feb 4, 2026)](https://cryptorank.io/news/feed/55813-solana-and-base-compete-as-ai-agents-go-fully-onchain-with-openclaw)
- [How to Build a Solana AI Agent in 2026 | Alchemy (Jan 26, 2026)](https://www.alchemy.com/blog/how-to-build-solana-ai-agents-in-2026)
- [Solana Agent Kit | SendAI (2026)](https://kit.sendai.fun/)
- [GitHub: sendaifun/solana-agent-kit (2026)](https://github.com/sendaifun/solana-agent-kit)
- [AI innovation at the speed of Solana | Solana.com (2026)](https://solana.com/ai)
- [Autonomous AI Agents 2026: From OpenClaw to MoltBook | Digital Applied (Feb 2026)](https://www.digitalapplied.com/blog/autonomous-ai-agents-2026-openclaw-moltbook-landscape)
- [AI agents now have their own Reddit-style social network | Ars Technica (Jan 30, 2026)](https://arstechnica.com/information-technology/2026/01/ai-agents-now-have-their-own-reddit-style-social-network-and-its-getting-weird-fast/)
- [From Memes to Manifestos: What 1.4M AI Agents Are Really Talking About on Moltbook | Dev.to (Feb 2, 2026)](https://dev.to/thebitforge/from-memes-to-manifestos-what-14m-ai-agents-are-really-talking-about-on-moltbook-2fa2)

## Gaps & Caveats

**What is uncertain:**
- **OpenClaw's future trajectory post-OpenAI:** The foundation model is announced but not yet operational. Governance, funding, and maintenance commitments are unclear.
- **Actual Solana transaction volume from OpenClaw agents:** No on-chain analytics have isolated OpenClaw-originated transactions from regular user traffic. The network impact may be negligible or significant -- we do not know.
- **Skill marketplace cleanup progress:** VirusTotal scanning was announced but the effectiveness of ongoing security review is unverified.
- **Agent coordination risks:** Whether autonomous agents will spontaneously coordinate on-chain behavior (swarm trading, governance attacks) remains theoretical but plausible given Moltbook's demonstrated emergent behavior.
- **Regulatory response:** No government has issued specific guidance on autonomous AI agents executing financial transactions. This is a major unknown.

**What is rapidly changing:**
- **Star counts and adoption metrics:** The numbers in this document were accurate as of February 18, 2026 but change daily. OpenClaw crossed 190K stars but the growth rate is volatile.
- **Security posture:** OpenClaw's security team is actively patching and adding guardrails. The skill vetting process may improve significantly in weeks.
- **Competitive landscape:** Kimi Claw (Moonshot AI) launched February 15. Google, Anthropic, and Microsoft are all developing agent frameworks. The landscape is fragmenting rapidly.
- **OpenAI integration:** Steinberger's work at OpenAI may produce personal agent products that reshape the entire ecosystem within months.

**What this document does not cover:**
- How to build AI agents on Solana from scratch (see `ai-agents-solana.md` in this pack)
- MEV protection strategies in depth (see `mev-protection.md` in this pack)
- Ethereum/Base/other chain agent ecosystems (out of scope for Solana pack)
- Legal and regulatory analysis of autonomous financial agents
- Tokenized AI agent economics ($ai16z, $OPENCLAW tokens, meme tokens)

**Confidence rationale (7/10):**
This assessment draws from 48 sources including CNBC, Reuters, TechCrunch, The Verge, Fortune, Kaspersky, CyberArk, Snyk, Koi Security, Cisco AI Defense, and multiple technical analyses. The 7/10 confidence reflects: (a) the ecosystem is less than 3 months old and changing daily; (b) much of the reporting is hype-driven with conflicting numbers (star counts range from 145K to 190K depending on date and source); (c) the security landscape is actively evolving with new vulnerabilities and patches appearing weekly; (d) the Solana-specific integration patterns are poorly documented compared to general OpenClaw usage; and (e) the OpenAI acqui-hire introduces major uncertainty about the project's future direction.

