---
pack: solana
topic: "AI-Assisted Solana Development"
decision: "How can I use AI tools to build Solana programs faster and more reliably?"
confidence: 8/10
sources_checked: 34
last_updated: "2026-02-18"
---

# AI-Assisted Solana Development

> **Decision:** How can I use AI tools to build Solana programs faster and more reliably?

## Context

AI-assisted development has become a standard part of modern software engineering, but
Solana development presents unique challenges that general-purpose AI tools handle poorly.
Solana's account-based model, Program Derived Addresses (PDAs), parallel transaction
execution via Sealevel, and Rust-based on-chain programs diverge significantly from the
Ethereum/EVM patterns that dominate LLM training data. As Helius documented in their
comprehensive guide, AI models routinely confuse Solana's account model with Ethereum's
contract storage, generate incorrect PDA derivations, produce deprecated `@solana/web3.js`
v1 code instead of the current `@solana/kit` (v2) SDK, and fail to account for compute
unit optimization. Without targeted tooling and careful prompting, AI-generated Solana code
often compiles but fails at runtime or introduces subtle security vulnerabilities.

The Solana ecosystem has responded with purpose-built infrastructure. The Solana Foundation
launched an official MCP (Model Context Protocol) server at `mcp.solana.com` that pipes
accurate, up-to-date Solana documentation directly into AI-powered IDEs. SendAI built the
Solana Agent Kit with an MCP server mode supporting 40+ on-chain protocol actions. Helius
ships its own MCP server for API documentation access. Meanwhile, academic research into
LLM-based vulnerability detection for Solana smart contracts has accelerated, with multiple
2025 papers exploring prompt engineering versus fine-tuning approaches for Rust-based
program auditing. The first Solana AI Hackathon (organized by SendAI in January 2025)
drew 400+ projects competing for $275,000+ in prizes, signaling strong ecosystem
investment in the AI-plus-Solana intersection.

This knowledge file focuses specifically on using AI as a development tool to write, test,
audit, debug, and document Solana programs — not on building AI agents that transact
on-chain (see `ai-agents-solana.md` for that topic).

## Options

### Option A: Solana MCP in IDEs (Recommended Starting Point)

**What it is:** The Solana Foundation maintains an official MCP server at
`https://mcp.solana.com/mcp` that integrates with Cursor, Windsurf, Claude Code, and
Claude Desktop. It exposes three specialized tools that give AI assistants access to
curated Solana knowledge:

- **Solana Expert: Ask For Help** — general Solana questions (concepts, APIs, SDKs, errors)
- **Solana Documentation Search** — searches the Solana documentation corpus
- **Ask Solana Anchor Framework Expert** — Anchor-specific APIs, patterns, and errors

The server is trained on Solana Stack Exchange Q&As, the official program examples
repository, Anchor Framework documentation, and the core Solana documentation.

**Pros:**
- Zero-cost, maintained by the Solana Foundation
- Provides accurate, up-to-date context that counteracts LLM hallucinations
- Works across multiple IDEs with a single remote endpoint
- No local installation required (HTTP transport via `mcp-remote`)

**Cons:**
- Read-only knowledge tool — cannot execute on-chain transactions
- Limited to documentation the Foundation has indexed
- Depends on network connectivity to `mcp.solana.com`
- Does not cover third-party protocol documentation (Jupiter, Marinade, etc.)

**Best for:** Every Solana developer using an AI-powered IDE. This should be the first
thing you configure.

**Setup — Claude Code:**
```bash
claude mcp add --transport http solana-mcp-server https://mcp.solana.com/mcp
```

**Setup — Cursor:**
Open Command Palette (`Cmd/Ctrl + Shift + P`) > `Cursor Settings` > `MCP` >
`Add new global MCP server`:
```json
{
  "mcpServers": {
    "solanaMcp": {
      "command": "npx",
      "args": ["mcp-remote", "https://mcp.solana.com/mcp"]
    }
  }
}
```

**Setup — Windsurf:**
Add to your MCP configuration:
```json
{
  "mcpServers": {
    "solanaMcp": {
      "command": "npx",
      "args": ["mcp-remote", "https://mcp.solana.com/mcp"]
    }
  }
}
```

**Recommended Cursor/Windsurf User Rules:**
Adding these rules to your IDE settings instructs the AI to proactively use MCP tools:
```xml
<MCP_USE_GUIDELINE>
  <INSTRUCTION>
    If you are working on a Solana-related project, make frequent use of
    the following MCP tools to accomplish your goals.
  </INSTRUCTION>
  <TOOLS>
    - "Solana Expert: Ask For Help": Ask detailed questions about Solana
      (how-to, concepts, APIs, SDKs, errors). Provide maximum context.
    - "Solana Documentation Search": Search the Solana documentation
      corpus for relevant information based on a query.
    - "Ask Solana Anchor Framework Expert": Anchor-specific questions
      including APIs, SDKs, and error handling.
  </TOOLS>
</MCP_USE_GUIDELINE>
```

### Option B: AI Code Generation for Anchor/Rust Programs

**What it is:** Using LLMs (Claude, GPT-4, Gemini, Copilot) to generate Solana program
code, primarily targeting the Anchor framework.

**Pros:**
- Dramatically speeds up boilerplate: account structs, instruction handlers, error enums
- Modern models (Claude Opus/Sonnet, GPT-4o) produce compilable Anchor code most of the time
- Iterative refinement with MCP context yields production-quality code
- Particularly effective for standard patterns: escrow, staking, token vaults

**Cons:**
- LLMs frequently confuse Solana's account model with Ethereum's contract storage
- PDA derivation is a common failure point — wrong seeds, missing bump, incorrect ownership
- Models default to `@solana/web3.js` v1 patterns (`Connection`, `PublicKey`) instead of
  `@solana/kit` v2 patterns (`createSolanaRpc`, `address`)
- Account constraints (`#[account(...)]` in Anchor) are often hallucinated or incomplete
- Compute unit optimization is almost never considered unprompted
- Parallel execution assumptions are usually wrong (sequential EVM thinking)

**Best for:** Experienced Solana developers who can review and correct AI output.
Dangerous for beginners who cannot spot the subtle errors.

**Effective Prompting for Anchor Programs:**

1. **Always specify the Anchor version:**
```
Use Anchor 0.31.x. Use the declare_program! macro for client generation.
Use LiteSVM for tests (not Bankrun, which is deprecated).
```

2. **Specify the SDK version:**
```
For client-side TypeScript, use @solana/kit (web3.js v2), NOT @solana/web3.js v1.
Use createSolanaRpc() not new Connection().
Use address() not new PublicKey().
```

3. **Be explicit about account constraints:**
```
For each instruction, list ALL accounts with their constraints:
- Which accounts are mut (writable)?
- Which accounts are signers?
- Which accounts are PDAs? What are the seeds?
- Which accounts need init, init_if_needed, or realloc?
- What is the space calculation for each initialized account?
```

4. **Request security checks explicitly:**
```
Add these security checks to every instruction:
- Verify account ownership (owner = program_id)
- Validate PDA seeds match expected derivation
- Check signer authority for privileged operations
- Validate that token accounts belong to expected mints
- Add has_one or constraint checks for related accounts
```

5. **Provide an example from your codebase:**
```
Here is an existing instruction handler from my program as a style reference:
[paste your code]

Generate a new instruction handler for [feature] following the same patterns.
```

### Option C: SendAI Solana Agent Kit MCP Server

**What it is:** An MCP server built on the Solana Agent Kit (`solana-mcp` by SendAI)
that exposes 40+ on-chain protocol actions to AI assistants. Unlike the Foundation's
read-only documentation server, this server can execute transactions.

**Pros:**
- Supports wallet management, token operations, NFT minting, DeFi interactions
- Works with Claude Desktop, Cursor, and other MCP-compatible clients
- Open-source (Apache 2.0), 148+ GitHub stars, actively maintained
- Useful for rapid prototyping and testing on devnet

**Cons:**
- Requires a Solana private key in configuration (security concern)
- Requires an RPC URL and optionally an OpenAI API key
- Transaction-executing MCP servers carry inherent risk
- Not suitable for production wallet management

**Best for:** Developers prototyping on devnet who want AI to execute on-chain actions
directly. Use a dedicated devnet wallet with limited funds.

**Setup — Claude Desktop:**
```json
{
  "mcpServers": {
    "solana-agent-kit": {
      "command": "npx",
      "args": ["solana-mcp"],
      "env": {
        "RPC_URL": "https://api.devnet.solana.com",
        "SOLANA_PRIVATE_KEY": "your_devnet_private_key_here",
        "OPENAI_API_KEY": "your_openai_api_key"
      }
    }
  }
}
```

### Option D: Helius MCP Server

**What it is:** Helius provides an MCP server that gives AI tools direct access to
Helius API documentation and specifications. Hosted at `https://docs.helius.dev/mcp`.

**Pros:**
- Real-time access to Helius API docs, methods, parameters, and code examples
- Covers DAS (Digital Asset Standard), webhooks, enhanced transactions, RPC optimization
- Automatically stays current with documentation changes
- Useful when building apps that use Helius-specific features

**Cons:**
- Helius-specific — does not cover general Solana or Anchor documentation
- Requires a Helius API key for the actual API calls your code will make

**Best for:** Developers building on Helius infrastructure who want AI to generate
correct Helius API integration code.

### Option E: AI-Assisted Security Auditing

**What it is:** Using LLMs to review Solana programs for security vulnerabilities,
either as a complement to professional audits or as continuous review during development.

**Pros:**
- Can catch common vulnerability patterns: missing signer checks, unchecked account
  ownership, arithmetic overflow, improper PDA validation, unsafe CPI calls
- Faster than manual review for initial triage
- Academic research (arXiv:2511.11250, November 2025) shows prompt-engineered LLMs
  can detect Solana-specific vulnerabilities with reasonable accuracy
- Useful as a "second pair of eyes" during code review
- A February 2026 Medium article described a practical editor-integrated workflow for
  continuous AI-assisted auditing of large Solana Rust codebases

**Cons:**
- Cannot replace professional security audits for production code
- High false-positive rate compared to specialized tools
- May miss complex cross-instruction or cross-program vulnerabilities
- LLMs lack the ability to formally verify invariants
- Tends to focus on surface-level patterns rather than deep logical flaws

**Best for:** Pre-audit triage, continuous development review, and catching low-hanging
fruit before sending code to professional auditors.

**AI Security Review Workflow:**

```
Step 1: Feed the AI your program with explicit instructions
─────────────────────────────────────────────────────────
Prompt: "Review this Anchor program for Solana-specific security issues.
Check for:
1. Missing signer verification on privileged instructions
2. Unchecked account ownership — accounts not validated as owned by
   the expected program
3. PDA seed collisions or incorrect derivation
4. Missing close constraints on accounts (rent-draining attacks)
5. Arithmetic overflow/underflow without checked_math
6. Unsafe cross-program invocations (CPI) — unchecked return values,
   privilege escalation
7. Token account validation — mint mismatch, authority mismatch
8. Re-initialization attacks — accounts that can be re-initialized
9. Missing rent-exemption checks
10. Improper use of remaining_accounts"

Step 2: Feed the IDL for structural validation
───────────────────────────────────────────────
Prompt: "Here is the program's IDL. Verify that all accounts in each
instruction have appropriate constraints. Flag any account that is
writable but has no ownership or authority check."

Step 3: Cross-reference with known exploit patterns
────────────────────────────────────────────────────
Prompt: "Compare this program against the Sealevel Attacks repository
(github.com/coral-xyz/sealevel-attacks). Which attack vectors apply?
Are any mitigations missing?"

Step 4: Generate a findings report
───────────────────────────────────
Prompt: "Produce a security findings report with severity levels
(Critical/High/Medium/Low/Info), affected code locations, and
recommended fixes with code snippets."
```

### Option F: AI-Assisted Test Generation

**What it is:** Using LLMs to generate test cases for Solana programs, targeting
LiteSVM (the current standard) or the `anchor test` workflow.

**Pros:**
- AI excels at generating boilerplate test setup: account creation, PDA derivation,
  token mint initialization
- Can enumerate edge cases and boundary conditions from instruction constraints
- Effective for generating both happy-path and error-path test cases
- Works well when given an existing test as a template

**Cons:**
- Often generates tests using deprecated Bankrun (deprecated March 2025) instead of
  LiteSVM — always specify the testing framework in your prompt
- May produce tests that pass but do not actually validate meaningful invariants
- Account setup code is frequently incorrect (wrong space calculations, missing
  system program accounts)

**Best for:** Generating test scaffolding that an experienced developer then refines.

**Effective Test Generation Prompt:**
```
Generate LiteSVM tests for the following Anchor program instruction.

Framework: Use anchor-litesvm (NOT Bankrun, which is deprecated).
Pattern: Follow the one-line setup pattern from anchor-litesvm docs.
Cover:
1. Happy path — instruction succeeds with valid inputs
2. Missing signer — should fail with expected error
3. Wrong PDA seeds — should fail with ConstraintSeeds error
4. Invalid token mint — should fail with ConstraintTokenMint error
5. Boundary values — test with u64::MAX, 0, and typical values
6. Account close — verify lamports are reclaimed correctly

Here is the instruction handler:
[paste code]

Here is the account struct:
[paste code]

Here is an existing test from this project as a style reference:
[paste code]
```

### Option G: AI-Assisted Debugging

**What it is:** Feeding Solana transaction logs, error codes, and program output to
AI for diagnosis. Particularly effective when combined with MCP tools.

**Pros:**
- AI can parse verbose Solana transaction logs and identify the failing instruction
- Can decode custom error codes against Anchor IDLs
- Effective at explaining compute budget failures and suggesting optimizations
- The Solana MCP server's "Ask For Help" tool can look up specific error codes

**Cons:**
- Transaction logs can be truncated for complex multi-instruction transactions
- AI may misidentify the root cause in multi-CPI chains
- Requires providing sufficient context (program code + transaction log + IDL)

**Best for:** Developers who encounter cryptic error codes or failing transactions
and need a quick explanation before diving into manual debugging.

**Debugging Prompt Template:**
```
This Solana transaction failed. Help me diagnose it.

Transaction signature: [signature]
Error: [error message from logs]
Network: devnet/mainnet

Here is the relevant instruction handler code:
[paste code]

Here are the transaction logs:
[paste logs from solana confirm -v or explorer]

Questions:
1. Which instruction failed and why?
2. What account or constraint caused the failure?
3. What is the fix?
```

### Option H: Documentation and IDL Generation

**What it is:** Using AI to generate human-readable documentation from Anchor IDLs,
program source code, and on-chain metadata.

**Pros:**
- IDL-to-documentation conversion is a well-defined transformation — low hallucination risk
- Can generate TypeScript client usage examples from IDL definitions
- Effective for generating README sections, API references, and integration guides

**Cons:**
- May invent behaviors not present in the code if not constrained to the IDL
- Client code examples may use deprecated SDK patterns without prompting

**Best for:** Generating initial documentation drafts that developers then review
and publish.

## The Solana AI Hackathon

In January 2025, SendAI organized the first Solana AI Hackathon, which became a landmark
event for the AI-plus-Solana ecosystem:

- **Scale:** 400+ projects submitted over 15 days
- **Prize pool:** $275,000+ from sponsors including a16z and Jupiter Exchange
- **Winners:** 21 projects selected across four tracks
- **Top 3 overall:**
  1. **The Hive** ($60,000) — composable on-chain AI agents for DeFi aggregation
  2. **FXN** ($30,000) — framework-agnostic connector for autonomous agent resource sharing
  3. **JailbreakMe** ($20,000) — AI security testing platform where users earn bounties
- **Notable track winners:**
  - DeFi & Trading: Cleopetra (autonomous DEX LP management), Project Plutus (AI trading)
  - Social/KOL: daVinci (dynamic AI agent), GIGAI Chad (3D tweet-reactive agent)
  - Meme Agents: Awe! (no-code AI builder), AgentRogue (degen news host)
  - Honorable mentions: Neur (AI DeFi/NFT interface), InfinityGround (AI-native gaming)

**Key takeaway:** The winning projects combined AI capabilities with Solana's
high-throughput, low-cost infrastructure. Most winners used the Solana Agent Kit or
similar tooling to bridge AI models with on-chain actions, validating the ecosystem's
investment in MCP-based integration.

## Key Trade-offs

| Approach | Accuracy | Speed Boost | Risk Level | Setup Effort | Best For |
|----------|----------|-------------|------------|--------------|----------|
| **Solana MCP (Foundation)** | High | Medium | Low | 2 minutes | Every developer |
| **Raw LLM code generation** | Medium | High | Medium-High | None | Experienced devs |
| **LLM + MCP context** | High | High | Medium | 5 minutes | Primary workflow |
| **SendAI Agent Kit MCP** | High (actions) | High | High | 10 minutes | Devnet prototyping |
| **Helius MCP** | High (Helius) | Medium | Low | 5 minutes | Helius users |
| **AI security review** | Medium | High | Medium | None | Pre-audit triage |
| **AI test generation** | Medium | High | Low | None | Test scaffolding |
| **AI debugging** | Medium-High | High | Low | None | Error diagnosis |
| **AI documentation** | High | High | Low | None | Doc generation |

## Limitations: Where AI Gets Solana Wrong

Understanding common AI failures is critical for effective use. These are the most
frequent and dangerous mistakes observed in practice:

### 1. Outdated SDK Usage (`@solana/web3.js` v1 vs `@solana/kit` v2)
The `@solana/web3.js` v1 SDK was deprecated when Anza released the v2.0 SDK (renamed
to `@solana/kit`) in November 2024. Most LLM training data predates this transition.

**What AI generates (wrong):**
```typescript
import { Connection, PublicKey, Keypair } from "@solana/web3.js";
const connection = new Connection("https://api.devnet.solana.com");
const pubkey = new PublicKey("...");
const balance = await connection.getBalance(pubkey);
```

**What you should use (correct):**
```typescript
import { address, createSolanaRpc } from "@solana/kit";
const rpc = createSolanaRpc("https://api.devnet.solana.com");
const pubkey = address("...");
const balance = await rpc.getBalance(pubkey).send();
```

### 2. Account Model Confusion
AI models trained primarily on Ethereum patterns assume programs own their data
internally. On Solana, programs are stateless — all state is stored in separate
accounts passed to instructions. AI frequently generates code that attempts to
store state inside the program or fails to pass required accounts.

### 3. PDA Derivation Errors
PDAs are one of Solana's most powerful features but a frequent source of AI errors:
- Wrong seeds (using account address instead of canonical seed strings)
- Missing the bump seed in `find_program_address` or Anchor's `seeds` constraint
- Not understanding that PDAs are deterministic (same seeds always produce same address)
- Confusing PDA derivation with keypair generation

### 4. Hallucinated Account Constraints
Anchor's `#[account(...)]` constraints are critical for security. AI models frequently:
- Omit `has_one` checks that validate account relationships
- Forget `mut` on accounts that need to be writable
- Miss `close` constraints for proper account cleanup
- Invent constraint names that do not exist in Anchor
- Use outdated constraint syntax from older Anchor versions

### 5. Compute Unit Blindness
AI-generated code almost never considers compute unit limits (default 200,000 per
instruction, max 1,400,000 per transaction). Complex operations may exceed limits
without any AI-generated warning or optimization.

### 6. Sequential Execution Assumptions
LLMs assume transactions execute sequentially (as in the EVM). Solana's Sealevel
runtime processes transactions in parallel when they touch different accounts. AI
rarely generates code optimized for parallelism or correctly specifies account locks.

### 7. Deprecated Patterns
Beyond web3.js v1, AI commonly suggests:
- Bankrun for testing (deprecated March 2025, use LiteSVM)
- `anchor init` workflows from Anchor 0.28-0.29 (current is 0.31)
- `solana-program` crate patterns instead of Anchor macros
- `Keypair.generate()` for PDAs (PDAs are not keypairs)

## Recommendation

**Set up a layered AI-assistance stack, starting with MCP and adding prompting
discipline:**

### Tier 1: Foundation (Do This First)
1. Install the Solana Foundation MCP server in your IDE (2-minute setup, see above)
2. If using Helius APIs, also add the Helius MCP server
3. Add the MCP user rules to your IDE so the AI proactively uses these tools

### Tier 2: Prompting Discipline (Ongoing Practice)
4. Always specify Anchor version (0.31.x), SDK version (`@solana/kit` v2), and
   testing framework (LiteSVM, not Bankrun) in your prompts
5. Provide existing code from your project as style references
6. Be explicit about account constraints and security requirements
7. Use the iterative workflow: generate one instruction at a time, review, test, then
   proceed to the next

### Tier 3: Advanced Workflows
8. Use AI for pre-audit security review with the structured workflow above
9. Generate test scaffolding with AI, then manually verify test assertions
10. Feed transaction logs and error codes to AI for debugging assistance
11. Use AI to generate documentation from your IDLs and source code

### Tier 4: Experimental (Devnet Only)
12. Set up SendAI's Solana Agent Kit MCP for rapid devnet prototyping
13. Use a dedicated devnet wallet with limited funds
14. Never expose mainnet private keys to any MCP server

### Context Files for Maximum Accuracy

Create a `.solana-context` or similar file in your project root and reference it
in prompts or IDE rules:

```markdown
# Project Solana Context

## Versions
- Anchor: 0.31.1
- Solana CLI: 2.1.x
- @solana/kit: 2.1.x (NOT @solana/web3.js v1)
- Rust: 1.83+
- Testing: LiteSVM + anchor-litesvm (NOT Bankrun)

## Program Architecture
- Program ID: [your program ID]
- Key PDAs and their seeds: [list them]
- External programs invoked via CPI: [list them]

## Conventions
- Error codes: Custom errors defined in errors.rs
- Account naming: snake_case for Rust, camelCase for TypeScript
- All token accounts validated with token_mint and authority constraints

## Common Patterns in This Codebase
- [Describe your patterns so AI follows them]
```

## Best Practices Summary

1. **Never trust AI output for account constraints** — always verify `#[account(...)]`
   attributes manually against Anchor documentation
2. **Always specify versions** — Anchor, SDK, testing framework, Rust edition
3. **Use MCP as your primary context source** — it is more accurate than LLM memory
4. **Generate incrementally** — one instruction at a time, not entire programs
5. **Provide examples** — a single real instruction from your codebase is worth a
   thousand words of prompting
6. **Run `anchor build` after every generation** — compilation catches many AI errors
7. **Test immediately** — `anchor test` or LiteSVM tests should be written alongside code
8. **Review security separately** — do not combine feature generation and security review
   in the same prompt
9. **Keep a "corrections log"** — track recurring AI mistakes to refine future prompts
10. **Stay current** — the Solana ecosystem moves fast; update your context files when
    dependencies change

## Sources

- Solana Foundation. "How to Get Started with AI Tools on Solana." solana.com/developers/guides/getstarted/intro-to-ai (January 2025)
  https://solana.com/developers/guides/getstarted/intro-to-ai

- Solana Developer MCP — Official Setup Guide. mcp.solana.com (2025)
  https://mcp.solana.com/

- Solana Foundation. "solana-dev-mcp" — GitHub Repository. (March 2025)
  https://github.com/solana-foundation/solana-dev-mcp

- Helius. "How to Use AI to Build Solana Apps." helius.dev/blog (January 2025)
  https://www.helius.dev/blog/how-to-use-ai-to-build-solana-apps

- Helius. "Helius MCP: AI-Powered Solana Development Documentation." helius.dev/docs (2025)
  https://helius.dev/docs/helius-mcp

- Helius. "How to Start Building with the Solana Web3.js 2.0 SDK." helius.dev/blog (November 2024)
  https://helius.dev/blog/how-to-start-building-with-the-solana-web3-js-2-0-sdk

- SendAI. "Solana Agent Kit MCP Server." GitHub Repository. (March 2025)
  https://github.com/sendaifun/solana-mcp

- SendAI. "Solana Agent Kit." GitHub Repository. (2024-2025)
  https://github.com/sendaifun/solana-agent-kit

- QuickNode. "How to Build a Solana MCP Server for LLM Integration." quicknode.com/guides (December 2025)
  https://www.quicknode.com/guides/ai/solana-mcp-server

- QuickNode. "How to Test Solana Programs with LiteSVM." quicknode.com/guides (November 2025)
  https://www.quicknode.com/guides/solana-development/tooling/litesvm

- QuickNode. "What is Bankrun and How to Use It." quicknode.com/guides (deprecated, January 2026)
  https://www.quicknode.com/guides/solana-development/legacy/bankrun

- anchor-litesvm crate documentation. docs.rs (December 2025)
  https://docs.rs/anchor-litesvm

- Boi, B. and Esposito, C. "Prompt Engineering vs. Fine-Tuning for LLM-Based Vulnerability Detection in Solana and Algorand Smart Contracts." arXiv:2511.11250 (November 2025)
  https://arxiv.org/abs/2511.11250

- Kevin, J. and Yugopuspito, P. "SmartLLM: Smart Contract Auditing using Custom Generative AI." arXiv:2502.13167 (February 2025)
  https://arxiv.org/abs/2502.13167

- Xia, S. et al. "SymGPT: Auditing Smart Contracts via Combining Symbolic Execution with Large Language Models." arXiv:2502.07644 (February 2025)
  https://arxiv.org/abs/2502.07644

- Xiao, Z. et al. "Logic Meets Magic: LLMs Cracking Smart Contract Vulnerabilities." arXiv:2501.07058 (January 2025)
  https://arxiv.org/abs/2501.07058

- Chang, S. et al. "CodeSpeak: Improving Smart Contract Vulnerability Detection via LLM-Assisted Code Analysis." Journal of Systems and Software, Vol 231 (January 2026)
  https://www.sciencedirect.com/science/article/abs/pii/S0164121225003048

- kawasak102. "A Practical Editor-Integrated Workflow for Auditing Large Solana Rust Codebases with Generative AI." Medium (February 2026)
  https://medium.com/@kawasak102/a-practical-editor-integrated-workflow-for-auditing-large-solana-rust-codebases-with-generative-ai-46b477a7b922

- SolanaFloor. "Meet the Hackathon Winners Powering Solana's AI Revolution." solanafloor.com (January 2025)
  https://solanafloor.com/news/from-ideas-to-impact-meet-the-hackathon-winners-powering-solana-s-ai-revolution

- ChainCatcher. "SendAI announces the results of the Solana AI Hackathon." chaincatcher.com (January 2025)
  https://www.chaincatcher.com/en/article/2162783

- CryptoNinjas. "Solana AI Hackathon Attracted Over 400 Projects." cryptoninjas.net (January 2025)
  https://www.cryptoninjas.net/news/solana-ai-hackathon-attracted-over-400-projects/

- Bitget News. "21 New AI Projects, Complete Breakdown of the Solana AI Hackathon." bitget.com (January 2025)
  https://www.bitget.com/news/detail/12560604501358

- LianPR. "A Quick Look at the 21 Winning Projects at Solana AI Hackathon." lianpr.com (January 2025)
  https://www.lianpr.com/en/news/detail/49323

- Chainstack. "MCP for Web3 Builders: Solana, EVM and Documentation Server." chainstack.com/blog (June 2025)
  https://chainstack.com/mcp-for-web3-builders-solana-evm-and-documentation-server-by-chainstack/

- Helius. "How to Build a Secure AI Agent on Solana." helius.dev/blog (February 2025)
  https://www.helius.dev/blog/how-to-build-a-secure-ai-agent-on-solana

- Hash Block. "Using Solana Logs and Transaction Simulations to Debug Production Failures." Medium (July 2025)
  https://medium.com/@connect.hashblock/using-solana-logs-and-transaction-simulations-to-debug-production-failures-128c6d366756

- Sidarth S. "Solana School Lesson 5: Best Dev, Debug Practices & Common Errors." Medium (August 2025)
  https://medium.com/@sidarths/solana-school-lesson-5-best-dev-debug-practices-common-errors-20cd32f3ba8c

- Metaplex. "How to Diagnose Transaction Errors on Solana." developers.metaplex.com (June 2024)
  https://developers.metaplex.com/guides/general/how-to-diagnose-solana-transaction-errors

- QuickNode. "Common Solana RPC Errors & Fixes Using QuickNode Logs." blog.quicknode.com (June 2025)
  https://blog.quicknode.com/solana-rpc-errors-quicknode-logs/

- FailSafe. "Solana Smart Contract Audit in 2025." getfailsafe.com (2025)
  https://getfailsafe.com/solana-smart-contract-audit-in-2025

- Anchor Framework. "Local Development — Quickstart." anchor-lang.com/docs (2025)
  https://www.anchor-lang.com/docs/quickstart/local

- Anchor Framework. "Sealevel Attacks Reference." anchor-lang.com/docs (2025)
  https://www.anchor-lang.com/docs/references/sealevel-attacks

- Skywork. "Unlocking On-Chain AI: The Ultimate Guide to Solana Agent MCP Server by SendAI." skywork.ai (October 2025)
  https://skywork.ai/skypage/en/unlocking-on-chain-ai-solana-agent-mcp-server/1981556108773355520

- Sakamoto, A. "How to Use Solana Agent MCP Server: A Comprehensive Guide." Medium/Towards AGI (April 2025)
  https://medium.com/towards-agi/how-to-use-solana-agent-mcp-server-a-comprehensive-guide-83fd3263571c

## Gaps & Caveats

1. **Rapidly evolving landscape.** The Solana MCP ecosystem is less than a year old
   (the Foundation's MCP server launched March 2025). Tools, capabilities, and best
   practices are changing monthly. Verify current setup instructions against the
   official sources above.

2. **No benchmarks for AI accuracy on Solana code.** While the arXiv papers study
   LLM vulnerability detection accuracy, there are no published benchmarks comparing
   LLM accuracy for Solana program generation across models (Claude vs GPT-4 vs Gemini).
   The "confidence: 8/10" rating reflects strong directional guidance but acknowledges
   this gap.

3. **Security review is not audit.** AI-assisted security review is a useful triage
   tool but must not be confused with a professional audit. No LLM has been validated
   as a replacement for human auditors on Solana programs. Use AI review as a supplement,
   not a substitute.

4. **Private key exposure risk.** The SendAI Agent Kit MCP server requires a private key
   in its configuration. This is inherently risky. Never use mainnet keys, and consider
   the implications for your threat model even on devnet.

5. **Training data lag.** LLM training data typically lags 3-12 months behind the
   current state of the Solana ecosystem. The MCP server mitigates this for documentation
   lookups, but cannot fix the model's underlying knowledge gaps for code generation.
   Always cross-check generated code against current documentation.

6. **Bankrun deprecation awareness.** As of March 2025, Bankrun is deprecated. Many
   AI models and online tutorials still reference it. Always specify LiteSVM (Rust)
   or anchor-litesvm in your prompts. If AI generates Bankrun code, reject it and
   re-prompt.

7. **No coverage of AI agent development.** This document intentionally excludes the
   topic of building autonomous AI agents that transact on Solana (Eliza framework,
   GOAT toolkit, etc.). That topic is covered in `ai-agents-solana.md`.

