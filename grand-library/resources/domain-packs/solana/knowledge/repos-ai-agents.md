---
pack: solana
topic: "Forkable Repos — AI Agents & Tools"
type: repo-catalogue
confidence: 7/10
sources_checked: 42
last_verified: "2026-02-18"
---

# AI Agents & Tools — Forkable Repo Catalogue

> **Verification status:** Live-verified on 2026-02-18 via GitHub API and Exa web search. Star/fork counts are approximate (+/-5%). License information confirmed against GitHub's license detection.

---

## Agent Frameworks

### Solana Agent Kit (SendAI)

- **URL:** https://github.com/sendaifun/solana-agent-kit
- **Framework:** TypeScript (Node.js)
- **License:** Apache 2.0
- **Use cases:** Fork candidate, Reusable SDK, Reference implementation
- **Category tags:** AI agent, Solana actions, LangChain, multi-protocol

**Trust signals:**
- ~1,600 stars, ~827 forks. 90+ contributors. 18 releases (latest v2.0.9, July 2025).
- Actively maintained — default branch is `v2`, last push January 2026.
- No known security incidents targeting the kit itself.
- Backed by SendAI (sendai.fun). Plugin architecture with growing ecosystem.

**Builder notes:**
> The dominant Solana agent toolkit. Provides 60+ pre-built "actions" — token swaps (Jupiter), token launches (Pump.fun, Raydium LaunchLab), NFT minting (Metaplex, 3.Land), lending, staking, bridging (Wormhole), and compressed airdrops (Light Protocol + Helius). LangChain integration is first-class, but also works with OpenAI's Agents SDK and Vercel AI SDK. The v2 architecture uses a plugin system (`plugin-defi`, `plugin-misc`, etc.) that keeps the core slim. For builders: fork the whole kit if you need custom protocol integrations, or install individual plugins via npm if using it as a dependency. The `create-solana-agent` CLI (`npx create-solana-agent@latest`) scaffolds a Next.js chat UI in seconds — excellent for hackathons. Watch for the MCP server integration added in v2.0.9. **Key limitation:** TypeScript-only; for Rust, see solagent.rs below.

**Complexity:** Medium — plugin architecture is clean, but 60+ actions means large surface area
**Confidence:** 9/10
**Last verified:** 2026-02-18

---

### GOAT SDK (Great Onchain Agent Toolkit)

- **URL:** https://github.com/goat-sdk/goat
- **Framework:** TypeScript (78%), Python (21%)
- **License:** MIT
- **Use cases:** Fork candidate, Reusable SDK
- **Category tags:** AI agent, agentic finance, multi-chain, multi-framework

**Trust signals:**
- ~951 stars, ~286 forks. 70+ contributors. 689+ commits.
- Active development — last push January 2026.
- Sponsored by Crossmint. Multi-chain (not Solana-exclusive).
- No known security incidents.

**Builder notes:**
> Positions itself as "the largest agentic finance toolkit" with 200+ tool integrations. Key differentiator from Solana Agent Kit: GOAT is chain-agnostic (EVM + Solana + more) and framework-agnostic (LangChain, Vercel AI SDK, Eliza, and others). The architecture is modular — install only the plugins you need (`@goat-sdk/plugin-jupiter`, `@goat-sdk/wallet-solana`, etc.). Both TypeScript and Python SDKs available. For Solana builders, GOAT is the better choice if you also need EVM chain support or if you prefer MIT over Apache 2.0. The wallet abstraction layer is well-designed — swap wallet providers without changing action code. Crossmint sponsorship means tight integration with Crossmint smart wallets. **Trade-off vs. Solana Agent Kit:** broader chain coverage but shallower Solana-specific protocol depth. The Solana Agent Kit has more Solana-native actions; GOAT has more cross-chain breadth.

**Complexity:** Medium — modular plugin system, dual TypeScript/Python
**Confidence:** 8/10
**Last verified:** 2026-02-18

---

### solagent.rs

- **URL:** https://github.com/zTgx/solagent
- **Framework:** Rust
- **License:** Apache 2.0
- **Use cases:** Fork candidate, Reference implementation
- **Category tags:** AI agent, Rust, Solana, rig framework

**Trust signals:**
- ~48 stars, ~8 forks. Single primary maintainer (zTgx).
- Published on crates.io as `solagent` (v0.1.12). ~9,350 total downloads (147 in last 90 days).
- Built on the `rig-core` Rust AI framework.
- Companion platform at solagent.dev offers TEE hosting, analytics, and multi-language SDKs.

**Builder notes:**
> The only Rust-native AI agent framework for Solana worth tracking. Built on `rig-core` (Rust AI framework analogous to LangChain). Supports Jupiter swaps, Pump.fun launches, SPL token deployment, NFT minting, and basic DeFi operations. The modular architecture uses separate crates: `solagent-core`, `solagent-wallet-solana`, `solagent-plugins`, and `solagent-adapters/rig`. For Rust developers who want native performance and type safety over TypeScript convenience, this is currently the only viable option. **Caveat:** much smaller ecosystem than Solana Agent Kit — fewer protocol integrations, less documentation, single maintainer. The 2.56% documentation coverage on docs.rs is a real limitation. Best for: Rust-native projects that need direct Solana integration without crossing the TypeScript FFI boundary. The solagent.dev platform adds TEE infrastructure, but that is a separate commercial offering.

**Complexity:** Medium — Rust adds inherent complexity, but the crate structure is clean
**Confidence:** 5/10 (small community, single maintainer, low docs coverage)
**Last verified:** 2026-02-18

---

### SAM Framework (Solana Agent Middleware)

- **URL:** https://github.com/prfagit/sam-framework
- **Website:** https://getsam.xyz
- **Framework:** Python
- **License:** "Other" per GitHub detection — **verify LICENSE file manually before forking.**
- **Use cases:** Fork candidate, Reference implementation
- **Category tags:** AI agent, Python, trading bot, Solana middleware

**Trust signals:**
- ~30 stars, ~8 forks. Single primary contributor.
- 26+ production tools. Last push January 2026.
- Integrations: Pump.fun, Jupiter, Aster Futures, DexScreener, Brave Search.
- Multi-LLM: OpenAI, Anthropic, xAI, local providers.
- **Warning:** Has an associated $SAM token (market cap ~$29K). Token projects carry additional trust risk.

**Builder notes:**
> A Python-first alternative to the TypeScript-dominant agent kits. Event-driven architecture with plugin support, persistent memory (SQLite), Fernet encryption for key management, and rate limiting. The tool registry pattern is well-designed — 26+ tools across trading, wallet management, market data, and web search. Good fit for Python AI/ML developers who want to add Solana trading capabilities. The Aster Futures integration (perpetuals) is unique among agent frameworks. **Concerns:** single maintainer, associated token ($SAM) introduces misaligned incentives, unclear license. The project feels more like an advanced trading bot framework than a general-purpose agent toolkit. For production use, audit the encryption and key management code carefully.

**Complexity:** Medium — straightforward Python, well-organized tool registry
**Confidence:** 4/10 (single maintainer, token association, unclear license)
**Last verified:** 2026-02-18

---

## Wallet Infrastructure

### Coinbase AgentKit

- **URL:** https://github.com/coinbase/agentkit
- **Docs:** https://docs.cdp.coinbase.com/agentkit/docs/welcome
- **Framework:** TypeScript, Python
- **License:** Custom (view LICENSE.md) — **not standard Apache/MIT. Verify before commercial use.**
- **Use cases:** Reusable SDK, Reference implementation
- **Category tags:** Agent wallet, Coinbase, multi-chain, key management

**Trust signals:**
- ~1,000+ stars, ~598 forks. 503+ commits. Backed by Coinbase.
- 20,000+ agents deployed, 600,000+ transactions executed (per Coinbase Q1 2025 report).
- 50+ third-party integrations. 120+ community contributions.
- Built on Coinbase Developer Platform (CDP) SDK.
- Solana support added at MTNDAO hackathon (early 2025).

**Builder notes:**
> The corporate-backed standard for giving AI agents wallets. Provides secure wallet creation, token transfers, swaps, smart contract deployment, and staking. Framework-agnostic — works with LangChain, Eliza, Vercel AI SDK, OpenAI Agents SDK. The architecture separates wallet providers (CDP, EVM, Solana) from action providers, making it extensible. Solana support is production-ready. The TypeScript CLI (`npx create-agentkit`) scaffolds a Next.js app or MCP server. **Key advantage:** Coinbase's institutional reputation and compliance infrastructure. **Key limitation:** dependency on Coinbase's CDP platform for wallet management — you're building on Coinbase's infrastructure, not self-hosting keys. For self-custodied agent wallets, look at Turnkey or Crossmint's dual-key architecture instead.

**Complexity:** Low-Medium — clean SDK, well-documented quickstarts
**Confidence:** 8/10
**Last verified:** 2026-02-18

---

### Turnkey SDK

- **URL:** https://github.com/tkhq/sdk
- **Website:** https://turnkey.com/solutions/ai-agents
- **Framework:** TypeScript
- **License:** Apache 2.0
- **Use cases:** Reusable SDK
- **Category tags:** Agent wallet, TEE, key management, infrastructure, multi-chain

**Trust signals:**
- ~94 stars, ~50 forks. 3,861+ commits. Active development.
- Used by Polymarket, Magic Eden, Alchemy, Squads, Moonshot.
- TEE-based key storage (hardware security, not software-only).
- Signing speeds 50-100x faster than MPC solutions (per Turnkey).
- Also has Go SDK (`tkhq/go-sdk`, 14 stars) and Swift SDK (`tkhq/swift-sdk`).

**Builder notes:**
> Turnkey is infrastructure, not a framework — it provides the secure key management layer that agent frameworks build on top of. The value proposition for AI agents: create wallets via API, store keys in TEEs (Trusted Execution Environments), set transaction policies, and delegate access with flexible ownership controls. Lower latency than MPC-based alternatives. The SDK itself is a TypeScript monorepo with examples for Solana, EVM, and more. **For builders:** if you're building an agent platform and need to manage many agent wallets securely without being custodial, Turnkey is the institutional-grade option. Integrates well with Coinbase AgentKit and GOAT SDK. **Trade-off:** more infrastructure setup than a simple private-key-in-env approach, but dramatically more secure for production.

**Complexity:** Medium — straightforward SDK, but requires understanding TEE architecture and policy model
**Confidence:** 7/10
**Last verified:** 2026-02-18

---

### Crossmint Wallets SDK

- **URL:** https://github.com/Crossmint/crossmint-sdk
- **Agent-specific:** https://github.com/Crossmint/crossmint-agentic-finance
- **Agent Launchpad:** https://github.com/Crossmint/agent-launchpad-starter-kit
- **Framework:** TypeScript
- **License:** Apache 2.0 (crossmint-sdk)
- **Use cases:** Reusable SDK, Fork candidate (starter kit)
- **Category tags:** Smart wallet, agent wallet, TEE, agentic finance, multi-chain

**Trust signals:**
- crossmint-sdk: ~44 stars, ~30 forks. Actively maintained. 7.2K weekly npm downloads (`@crossmint/wallets-sdk`).
- agent-launchpad-starter-kit: ~32 stars, ~14 forks. Beta software — no formal security audit yet.
- Sponsors GOAT SDK. Dual-key architecture pattern (owner key + agent key in TEE).
- Supports 50+ chains (EVM, Solana, Stellar).

**Builder notes:**
> Crossmint's approach to agent wallets is the most architecturally opinionated: a dual-key smart contract wallet where the owner holds one key and the agent's key lives in a TEE. This eliminates the "honeypot" problem of platforms holding all agent keys. The `agent-launchpad-starter-kit` is a Next.js template that deploys agents with non-custodial wallets — excellent starting point for an agent launchpad. The `crossmint-agentic-finance` repo has demos for A2A (agent-to-agent) protocols, Cloudflare Workers agents, and commerce integrations. The Wallets SDK (`@crossmint/wallets-sdk`) handles wallet creation, transfers, gas sponsorship, bridging, staking, and AML compliance in single-line API calls. **Unique feature:** agentic checkout API lets agents purchase 1B+ real-world items (Amazon, Shopify). **Limitation:** the starter kit is explicitly beta and unaudited — do not deploy to production without your own security review.

**Complexity:** Low-Medium — well-documented APIs, starter kit gets you running fast
**Confidence:** 7/10 (beta status on starter kit reduces confidence)
**Last verified:** 2026-02-18

---

## MCP Servers (Model Context Protocol)

### Solana MCP Official (Solana Foundation)

- **URL:** https://github.com/solana-foundation/solana-mcp-official
- **Website:** https://mcp.solana.com
- **Framework:** TypeScript
- **License:** Not explicitly detected — **verify before commercial use.**
- **Use cases:** Reusable integration, Reference implementation
- **Category tags:** MCP, Solana, developer tools, AI-assisted development

**Trust signals:**
- ~69 stars, ~13 forks. 69 commits. Official Solana Foundation project.
- Hosted at mcp.solana.com — production deployment with remote MCP support.
- Integrates Solana documentation, Anchor framework expertise, and code generation.

**Builder notes:**
> The official Solana Foundation MCP server, deployed at mcp.solana.com. Designed to be added to any IDE (Claude Code, Cursor, Windsurf) as a remote MCP server — no local installation needed. Provides AI-powered Solana development assistance: Anchor framework expert queries, Solana documentation search, and code generation. This is NOT for on-chain agent actions (use Solana Agent Kit for that) — it is for developer productivity when building Solana programs. The `claude mcp add --transport http solana-mcp-server https://mcp.solana.com/mcp` one-liner makes setup trivial. **Best for:** Solana developers who want their AI coding assistant to have deep Solana/Anchor knowledge. **Not for:** runtime agent-to-blockchain interactions.

> **Note:** Solana Foundation also has `solana-dev-mcp` (42 stars, MIT, demo/reference) — an earlier MCP demo. The `solana-mcp-official` repo supersedes it as the production offering.

**Complexity:** Low — remote MCP, no local setup required
**Confidence:** 8/10
**Last verified:** 2026-02-18

---

### OpenSVM Solana MCP Server

- **URL:** https://github.com/openSVM/solana-mcp-server
- **Docs:** https://opensvm.github.io/solana-mcp-server/
- **Framework:** Rust (63%), HTML, Shell
- **License:** Not explicitly detected — **verify before commercial use.**
- **Use cases:** Fork candidate, Reusable integration
- **Category tags:** MCP, Solana RPC, multi-network, infrastructure

**Trust signals:**
- ~56 stars, ~10 forks. 4 releases (latest v1.1.1, August 2025).
- 73+ Solana RPC methods implemented across accounts, blocks, transactions, tokens, and system operations.
- Multi-network support (multiple SVM-compatible chains simultaneously).
- Flexible deployment: stdio (Claude Desktop), HTTP, serverless (AWS Lambda, Vercel), Docker/Kubernetes.

**Builder notes:**
> The most comprehensive Solana RPC MCP server. Unlike the Solana Foundation's MCP (which focuses on developer documentation and code assistance), OpenSVM's server provides direct blockchain data access — account balances, transaction history, token data, block information. Written in Rust for performance. Supports both stdio mode (for Claude Desktop integration) and web service mode (for HTTP API access). The one-liner installer (`curl -fsSL ... | bash`) auto-configures Claude Desktop. Includes Prometheus metrics, health checks, connection pooling, and rate limiting for production use. **Best for:** building AI agents or assistants that need to query Solana blockchain state in real time. The multi-network feature lets you query mainnet, devnet, and other SVM chains simultaneously. **Caveat:** small contributor base (4 contributors, including Copilot and Cursor agent).

**Complexity:** Medium — Rust codebase, but installation is streamlined
**Confidence:** 6/10 (small team, no license detected)
**Last verified:** 2026-02-18

---

### Chainstack RPC Nodes MCP

- **URL:** https://github.com/chainstacklabs/rpc-nodes-mcp
- **Docs:** https://docs.chainstack.com/docs/mcp-servers-introduction
- **Framework:** TypeScript
- **License:** Apache 2.0
- **Use cases:** Reusable integration
- **Category tags:** MCP, multi-chain, RPC, EVM, Solana, infrastructure

**Trust signals:**
- ~15 stars, ~1 fork. 102 commits. Backed by Chainstack (SOC2-certified infrastructure provider).
- Supports both EVM and Solana MCP servers.
- Requires Chainstack RPC endpoint — ties into their managed node infrastructure.

**Builder notes:**
> A minimal, fast MCP server for interacting with JSON-RPC blockchain nodes. Chainstack provides both an EVM MCP server and a Solana MCP server in the same repository. For Solana: account balances, transaction lookups, block data, token operations, and program interactions. The key difference from OpenSVM's server is that this is designed specifically to work with Chainstack's infrastructure — you need a Chainstack endpoint. **Advantage:** Chainstack provides managed, high-availability nodes with enterprise SLAs, so the MCP server benefits from that reliability. **Limitation:** vendor lock-in to Chainstack RPC endpoints. If you want a self-hosted or vendor-neutral MCP solution, use OpenSVM's server instead. For enterprise teams already on Chainstack, this is the cleanest integration path.

**Complexity:** Low — TypeScript, straightforward configuration
**Confidence:** 7/10
**Last verified:** 2026-02-18

---

## Autonomous Agent Platforms

### OpenClaw (formerly Clawdbot / Moltbot)

- **URL:** https://github.com/openclaw/openclaw
- **Website:** https://openclaw.ai
- **Framework:** TypeScript (multi-platform: macOS, iOS, Android, Linux)
- **License:** MIT
- **Use cases:** Reference implementation, Fork candidate (skills/plugins)
- **Category tags:** Autonomous agent, personal assistant, local-first, multi-channel

**Trust signals:**
- ~180,000+ stars (fastest-growing open-source project in GitHub history as of Feb 2026).
- Created by Peter Steinberger (founder of PSPDFKit, sold for ~100M EUR). Steinberger joined OpenAI in Feb 2026; project transferred to independent foundation.
- Model-agnostic: Claude, GPT, DeepSeek, local models.
- 100+ AgentSkills. Integrates with WhatsApp, Telegram, Discord, Slack, Signal, iMessage.
- **WARNING: Security concerns.** Malware discovered in ClawHub (skills marketplace) within weeks of launch. An agent spammed a user with 500 messages (Bloomberg report). 21,639 exposed instances reported. The Feb 2026 security update patched 40+ vulnerabilities.
- **WARNING: Not Solana-specific.** General-purpose autonomous agent — Solana integration requires custom skills.

**Builder notes:**
> OpenClaw is not a Solana project — it is included here because it represents the frontier of autonomous AI agents and is increasingly being integrated with crypto wallets and on-chain actions. The local-first architecture (memory stored as Markdown files on your disk) is a compelling pattern for agent data sovereignty. The AgentSkill format is portable and community-extensible. Real-world agent feats include negotiating $4,200 off a car purchase via email and filing legal rebuttals to insurance denials autonomously. For Solana builders: the opportunity is writing OpenClaw skills that use Solana Agent Kit or GOAT SDK to give OpenClaw agents on-chain capabilities. **Critical security note:** the rapid growth has outpaced security review. The ClawHub marketplace had malware. Steinberger himself was running $20K/month in infrastructure costs before OpenAI stepped in. Do NOT run OpenClaw with agent wallets holding significant value without extensive security hardening. The project is exciting but immature from a security standpoint.

**Complexity:** Medium — well-designed skill system, but the full platform is large
**Confidence:** 5/10 (security incidents, not Solana-native, rapidly evolving)
**Last verified:** 2026-02-18

---

## AI Compute (DePIN)

> **Note:** DePIN (Decentralized Physical Infrastructure Network) projects in the AI compute space are primarily infrastructure services, not forkable code repositories. The entries below document the ecosystem for builders who need GPU compute for AI workloads on Solana. GitHub repos listed are for SDKs, CLIs, and node software — the core compute infrastructure is not open source.

### io.net

- **URL:** https://github.com/ionet-official
- **Website:** https://io.net
- **Framework:** Shell, Python (setup scripts and tools)
- **License:** Varies by repo (setup scripts are public, core infrastructure is proprietary)
- **Use cases:** GPU compute provider, AI inference and training infrastructure
- **Category tags:** DePIN, GPU cloud, AI compute, Solana

**Trust signals:**
- Verified GitHub organization. 9 public repos (primarily setup scripts and tooling).
- io_launch_binaries: ~75 stars, 49 forks. io-net-official-setup-script: ~44 stars, 35 forks.
- 30,000+ GPUs available. H100s from $2.19/hr (vs. AWS $12.29/hr — up to 70% savings claimed).
- Major customers: Leonardo.Ai (14K to 19M users while cutting GPU costs 50%), Wondera ($2.48M saved vs. AWS), Frodobots/UC Berkeley (92.8% cost savings).
- Token: $IO on Solana.
- **Not open-source infrastructure** — the platform is proprietary. Public repos are setup scripts.

**Builder notes:**
> io.net is the largest Solana-native decentralized GPU cloud. The value for AI agent builders: affordable GPU compute for training and inference without AWS/GCP contracts. Deploy GPU clusters in minutes via the io.cloud interface or io.intelligence API. Supports Ray, PyTorch FSDP, Kubernetes. The `io_launch_binaries` repo contains worker node setup scripts if you want to contribute GPU power. For consuming compute: use the platform API directly — there is no forkable SDK. io.net also provides TEE (Trusted Execution Environment) support via Intel TDX and NVIDIA H200 confidential computing. **Best for:** AI teams that need affordable GPU burst capacity for model training or inference, especially teams already building on Solana. **Not for:** builders who need open-source GPU scheduling software to self-host.

**Complexity:** Low (consuming) / Medium (contributing nodes)
**Confidence:** 6/10 (proprietary platform, limited open-source code)
**Last verified:** 2026-02-18

---

### Render Network

- **URL:** https://github.com/rendernetwork
- **Website:** https://rendernetwork.com
- **Framework:** Governance only (RNPs repo)
- **License:** N/A (governance proposals, not software)
- **Use cases:** GPU rendering infrastructure, AI inference (via compute subnet)
- **Category tags:** DePIN, GPU rendering, AI compute, OTOY

**Trust signals:**
- rendernetwork/RNPs (governance): ~44 stars, ~5 forks. 107 commits.
- 60+ million image frames rendered. Powers Las Vegas Sphere, Super Bowl concerts, NASA projects.
- Token: $RENDER (migrated from Ethereum to Solana in Nov 2023).
- Advisory board: Ari Emanuel (WME), Beeple, Brendan Eich (Brave).
- Compute Subnet (RNP-008) approved — Nosana is a compute client.
- Spun out of OTOY, Inc. in 2023 as independent foundation.

**Builder notes:**
> Render Network is primarily a GPU rendering marketplace, not a general-purpose AI compute platform — but it is expanding into AI via the Compute Subnet initiative. The network connects GPU providers with creators/AI teams needing rendering and compute. RNP-008 (Nosana Compute Client) bridges Render's GPU supply to AI inference workloads. For Solana builders: Render is relevant as the highest-profile DePIN project on Solana and as potential infrastructure for AI rendering workloads (3D assets, generative visual content). **No forkable code** — the GitHub presence is limited to governance proposals (RNPs) and a Cinema 4D plugin. The rendering software itself (OctaneRender) is proprietary OTOY technology. Use Render as a service, not as code to build on.

**Complexity:** N/A (service, not forkable software)
**Confidence:** 6/10 (no open-source code, service-only)
**Last verified:** 2026-02-18

---

### Nosana

- **URL:** https://github.com/nosana-ci
- **Website:** https://nosana.io
- **Framework:** TypeScript (CLI, SDK, programs), Solana programs
- **License:** Varies by repo — check individual repos
- **Use cases:** Reusable SDK (nosana-cli, nosana-kit), Reference implementation (nosana-programs)
- **Category tags:** DePIN, AI inference, GPU compute, Solana-native

**Trust signals:**
- GitHub org: 34 public repos, 177 followers.
- nosana-kit: ~140 stars. nosana-cli: ~134 stars. nosana-programs: ~32 stars, 11 forks.
- 985,000 jobs completed in 2024. 29.7M NOS staked (31% of supply).
- Mainnet launched Q1 2025. Consumer GPU support (not just data-center GPUs).
- Up to 2.5x cost savings vs. traditional cloud providers.
- Token: $NOS on Solana. Headquartered in Netherlands.

**Builder notes:**
> The most Solana-native AI compute project. Unlike io.net (proprietary platform) and Render (rendering-focused), Nosana publishes actual Solana programs and a usable SDK. The `nosana-cli` lets you post inference jobs directly to the Solana blockchain. The `nosana-kit` (formerly `nosana-sdk`) provides the programmatic interface: upload job definitions to IPFS, post jobs with market addresses, wait for completion, retrieve results. The `nosana-programs` repo contains the on-chain Solana programs (TypeScript tests, Anchor IDL). Pipeline templates in `pipeline-templates` show how to run Stable Diffusion, LLMs, and custom inference. **For builders:** Nosana is the best option if you want permissionless, Solana-native AI inference without vendor lock-in. Post a job, a GPU node picks it up, results come back via IPFS. The cost model is transparent — pay per job, no minimum. **Limitation:** smaller GPU fleet than io.net. Focused exclusively on inference, not training.

**Complexity:** Medium — clean CLI/SDK, but understanding the job-posting-to-IPFS workflow takes time
**Confidence:** 7/10
**Last verified:** 2026-02-18

---

## Quick Reference: Best Pick by Use Case

| If you need... | Use this | Why |
|---|---|---|
| Solana-native AI agent actions | Solana Agent Kit | 60+ actions, largest Solana-specific ecosystem, Apache 2.0 |
| Multi-chain agent actions | GOAT SDK | 200+ tools, EVM + Solana, MIT license |
| Rust AI agent framework | solagent.rs | Only Rust-native option, built on rig-core |
| Python trading agent | SAM Framework | Python-first, 26+ tools, Pump.fun/Jupiter/Aster |
| Institutional agent wallets | Coinbase AgentKit | Coinbase-backed, 20K+ agents deployed |
| Self-custodied agent wallets (TEE) | Turnkey SDK | TEE-based, Apache 2.0, fastest signing |
| Agent launchpad with smart wallets | Crossmint | Dual-key architecture, starter kit, Apache 2.0 |
| Solana dev assistance (MCP) | Solana MCP Official | Official Solana Foundation, remote setup |
| Solana blockchain data (MCP) | OpenSVM MCP Server | 73+ RPC methods, Rust, multi-network |
| Multi-chain RPC (MCP) | Chainstack RPC Nodes MCP | EVM + Solana, Apache 2.0, enterprise SLA |
| Autonomous personal agent | OpenClaw | 180K+ stars, MIT, model-agnostic (security caveats) |
| Cheap GPU inference (Solana-native) | Nosana | Permissionless, pay-per-job, SDK available |
| Large-scale GPU cloud | io.net | 30K+ GPUs, up to 70% savings vs. AWS |

## License Summary

| License | Repos | Fork-Friendly? |
|---|---|---|
| Apache 2.0 | Solana Agent Kit, solagent.rs, Turnkey SDK, Crossmint SDK, Chainstack MCP | **Yes** |
| MIT | GOAT SDK, OpenClaw | **Yes** |
| Custom/Undetected | Coinbase AgentKit, Solana MCP Official, OpenSVM MCP, SAM Framework | **Verify** — check LICENSE files |
| Proprietary | io.net (platform), Render Network (OctaneRender) | **No** — service only |
| Varies | Nosana (check per-repo) | **Check** each repo individually |

## Security Notes

> **AI agent wallet security is a nascent field.** No agent wallet framework has undergone the same level of auditing as established DeFi protocols. Key risks to evaluate:
>
> 1. **Key management:** How are agent private keys stored? TEE > encrypted file > plaintext env var.
> 2. **Action scope:** Can the agent drain the wallet, or are there transaction limits/whitelists?
> 3. **Prompt injection:** Can malicious input cause the agent to execute unintended transactions?
> 4. **Marketplace trust:** OpenClaw's ClawHub had malware within weeks of launch. Vet all third-party skills/plugins.
> 5. **Custodial risk:** Understand whether the platform (not just the user) can access agent wallet keys.
>
> For production deployments with real funds, the Crossmint dual-key architecture (owner key + agent key in TEE) is currently the most security-conscious pattern documented in this catalogue.

