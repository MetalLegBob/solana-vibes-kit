# SVK:setup — Design Document

**Date:** 2026-02-16
**Status:** Draft
**Skill:** `/SVK:setup`

## Overview

`/SVK:setup` is a guided onboarding skill that interviews the user, recommends tools based on their experience level and project scope, walks them through installation, and generates a personalized reference document.

It is the first thing a new SVK user runs. It sets up not just SVK, but the entire ecosystem of plugins, MCPs, and skills needed for a productive Solana development environment.

---

## Phase 1: Interview

A short conversational interview (5-7 questions, one at a time) builds a user profile that drives all subsequent recommendations. Follows the same interview pattern established by `/GL:interview`.

### Experience Gauging

| Question | Options | Purpose |
|----------|---------|---------|
| How comfortable are you with git? | None / Basic / Comfortable | Determines guardrail level |
| Have you built on Solana before? | No / Learning / Shipped projects | Tunes Solana tool depth |
| How much Claude Code experience do you have? | New / Some / Power user | Adjusts explanation verbosity |

### Project Scoping

| Question | Options | Purpose |
|----------|---------|---------|
| Starting fresh or adding SVK to an existing project? | New / Existing | Determines setup flow |
| What are you building? | DeFi / NFTs / DAO / Game / Tool / Other | Tunes domain-specific recommendations |
| Frontend + backend, or just one? | Both / Backend only / Frontend only | Filters frontend/backend tools |
| Solo or team? | Solo / Team | Affects git workflow recommendations |

### Profile Output

The answers produce one of three profiles:

- **Beginner** — Extra explanations during walkthrough, guardrails (Safety Net) emphasized, "Getting Started" section in reference doc, learning resources linked
- **Intermediate** — Standard explanations, full recommended tier shown, streamlined walkthrough
- **Advanced** — Minimal hand-holding, full catalog available, cherry-pick what they want

---

## Phase 2: Tiered Recommendations

After the interview, SETUP presents a summary of what it recommends, organized into three tiers. The tiers shift based on the user's profile.

### Essential (always recommended)

| Tool | What it does | Cost | Install method |
|------|-------------|------|----------------|
| **GSD** ([get-shit-done](https://github.com/gsd-build/get-shit-done)) | Spec-driven development — project planning, phase execution, atomic commits, multi-agent orchestration | Free | `npx get-shit-done-cc@latest` |
| **Superpowers** | Development practices — brainstorming, TDD, debugging, code review, git worktrees, skill writing | Free | Plugin install |
| **Safety Net** ([claude-code-safety-net](https://github.com/kenryu42/claude-code-safety-net)) | Catches destructive git/filesystem commands before they execute | Free | Plugin install |
| **Solana Dev MCP** ([mcp.solana.com](https://mcp.solana.com/)) | Real-time Solana docs, account queries, transaction analysis, Anchor framework expert | Free | `claude mcp add --transport http solana-mcp https://mcp.solana.com/mcp` |
| **Search MCP** (choice) | Web search for docs, solutions, current information | See alternatives | MCP config |
| **Memory MCP** (choice) | Persistent memory across sessions | See alternatives | MCP config |

#### Search MCP Alternatives

| Option | Cost | Queries/month | Best for |
|--------|------|---------------|----------|
| **Brave Search** ([brave-search-mcp-server](https://github.com/brave/brave-search-mcp-server)) | FREE | 2,000 | Default recommendation — solid general search |
| **Exa** ([exa-mcp-server](https://github.com/exa-labs/exa-mcp-server)) | $10 free credits, then ~$1/1K | 1,000 free | Premium upgrade — semantic search, code context, company research |
| **Stack free tiers** (Brave + Exa + Tavily) | FREE | ~4,000 combined | Budget-conscious power users |

Brave is recommended as the default. Exa is presented as an upgrade for research-heavy workflows. Stacking free tiers is offered as a third option.

The **Fetch MCP** ([modelcontextprotocol/servers](https://github.com/modelcontextprotocol/servers)) is automatically installed alongside Brave, since Brave returns snippets and Fetch reads full page content. Free, no API key needed.

#### Memory MCP Alternatives

| Option | Cost | Storage | Best for |
|--------|------|---------|----------|
| **CMEM** ([@colbymchenry/cmem](https://www.npmjs.com/package/@colbymchenry/cmem)) | FREE | Local (SQLite) | Default — free, private, no subscription |
| **Supermemory** ([supermemory.ai](https://supermemory.ai/)) | Free tier + paid | Cloud | Upgrade — universal memory across all AI tools, web UI |

CMEM is recommended as the default (free, local, no subscription required). Supermemory is presented as the upgrade for users who work across multiple AI tools and want cloud sync.

#### GSD + Superpowers Distinction

Both are recommended. During the walkthrough, the distinction is explained as:

> "GSD runs your project — it handles planning, execution, and milestones. Superpowers improves how you code — brainstorming, debugging, testing, code review. They complement each other."

### Recommended (profile-dependent)

| Tool | When recommended | Cost |
|------|-----------------|------|
| **Trail of Bits** (security skills) | Always; *emphasized* for DeFi/token projects | Free |
| **Context7** ([upstash/context7](https://github.com/upstash/context7)) | If building frontend (React, Next.js, Tailwind docs) | Free |
| **Supabase MCP** | If they need off-chain data storage | Free (Supabase free tier) |
| **Neon MCP** ([neondatabase/mcp-server-neon](https://github.com/neondatabase/mcp-server-neon)) | Alternative to Supabase for serverless PostgreSQL | Free tier |
| **Helius MCP** ([helius.dev](https://helius.dev)) | NFT projects or heavy on-chain reads (DAS API) | Free tier (1M credits) |
| **Playwright MCP** | If building frontend (E2E testing) | Free |

### Optional (shown but not pushed)

| Tool | Use case | Cost |
|------|----------|------|
| **Figma MCP** | Design-to-code workflow | Free (needs Figma account) |
| **Magic MCP** ([21st-dev/magic-mcp](https://github.com/21st-dev/magic-mcp)) | AI-generated React/Tailwind components | Free tier |
| **Vercel MCP** | Frontend deployment management | Free (Vercel hobby tier) |
| **Cloudflare MCP** ([cloudflare/mcp-server-cloudflare](https://github.com/cloudflare/mcp-server-cloudflare)) | Edge deployment (Workers, Pages, KV, R2) | Free tier |
| **Docker MCP** | Container management | Free |
| **Redis/Upstash MCP** | Caching, rate limiting, message queues | Free tier |
| **Sequential Thinking MCP** | Structured problem-solving for complex architecture | Free |
| **Browser Tools MCP** | Console logs, network requests, screenshots | Free |
| **Puppeteer MCP** | Browser automation, visual regression testing | Free |

### Presentation

After building the recommendation list, SETUP presents a summary:

> *"Based on your profile, I'd recommend **6 essential** and **4 recommended** tools. There are also 9 optional ones you can add later. Want to walk through them now?"*

---

## Phase 3: Installation Walkthrough

Walks through each tool **one category at a time**. For each tool:

1. **Explain** what it does in 1-2 sentences
2. **Show the choice** if alternatives exist (with trade-offs: free vs paid, local vs cloud)
3. **Ask** install or skip
4. **Install** (write MCP config, run `npx`, clone repos, configure API keys)
5. **Verify** with a quick health check

### Category Order

1. Dev Workflow (GSD + Superpowers)
2. Safety (Safety Net)
3. Solana (Solana Dev MCP, Helius)
4. Search (Brave / Exa / stacked)
5. Memory (CMEM / Supermemory)
6. Security (Trail of Bits)
7. Frontend (Context7, Figma, Magic, Playwright)
8. Backend/Database (Supabase, Neon, Redis)
9. DevOps (Vercel, Cloudflare, Docker)
10. Utility (Sequential Thinking, Browser Tools, Puppeteer)

### Adaptive Explanation Depth

For **beginners**, each category gets extra context explaining why it matters:

> *"Search tools are important because Claude can't access the internet by default. Without one, it can only use what it already knows — which may be outdated."*

For **intermediate/advanced** users, explanations are kept to 1-2 sentences.

### API Key Handling

When a tool requires an API key, SETUP:

1. Explains where to get it (with a link)
2. Asks the user to paste it
3. Writes it to the appropriate config location
4. Tests it with a quick verification call

> *"I'll need a Brave API key. You can get one free at brave.com/search/api/ — paste it here when ready."*

### Installation Methods

| Method | Used for |
|--------|----------|
| MCP config (`.mcp.json` or `settings.json`) | MCP servers (Solana, Brave, Exa, CMEM, etc.) |
| `npx` install | GSD, standalone tools |
| Plugin marketplace | Safety Net, Superpowers |
| Skill file installation | Trail of Bits, SVK skills |

---

## Phase 4: Reference Document

After all installations complete, SETUP generates a personalized reference document saved to `docs/svk-setup-reference.md`.

### Contents

1. **Getting Started** (top of doc)
   - What to do next: run `/GL:interview` first, then `/gsd:new-project`
   - For beginners: *"Grand Library teaches Claude everything about WHAT you're building. GSD teaches it HOW to build it."*

2. **Installed Tools** (grouped by category)
   - For each tool:
     - Status: Installed
     - Category
     - What it does (1-2 sentences)
     - 5-10 practical use cases tailored to their project type
     - Quick-start commands / how to invoke
     - Links to docs and repos

3. **Skipped Tools**
   - What was skipped and why
   - How to install later if they change their mind

4. **Quick Reference**
   - One-line summary of every installed tool for fast scanning

### Example Entry

```markdown
### Brave Search MCP
**Status:** Installed
**Category:** Search & Research

**What it does:** Lets Claude search the web for current information, docs, and solutions.

**Use it for:**
1. Finding Solana documentation and code examples
2. Researching error messages and stack traces
3. Looking up npm package comparisons
4. Checking current program addresses or API endpoints
5. Finding community solutions to common issues

**Invoke:** Claude uses it automatically when it needs web info, or ask "search for..."

**Docs:** https://github.com/brave/brave-search-mcp-server
```

### What To Do Next Section

```markdown
## What To Do Next

1. **Run `/GL:interview`** — Grand Library will interview you about your project
   domain and generate a comprehensive knowledge suite (topic trees, technical
   docs, implementation guides). This gives Claude deep understanding of WHAT
   you're building.

2. **Run `/gsd:new-project`** — GSD will use that knowledge context to plan and
   build your project properly. This gives Claude a structured plan for HOW to
   build it.

GL gives Claude the knowledge. GSD gives Claude the plan.
Together they make sure Claude actually builds what you need.
```

---

## Tool Catalog (complete)

This section serves as the master registry that SETUP reads from. When new tools are discovered or new SVK skills are added, this catalog is updated.

### Solana-Specific MCPs

| Name | Description | GitHub/URL | Cost | Config |
|------|-------------|-----------|------|--------|
| Solana Dev MCP | Real-time docs, account queries, tx analysis, Anchor expert | https://mcp.solana.com/ | Free | `claude mcp add --transport http solana-mcp https://mcp.solana.com/mcp` |
| Solana Agent Kit MCP | Token ops, DeFi, NFT minting, wallet management | https://github.com/sendaifun/solana-mcp | Free | MCP config with RPC URL |
| Helius MCP | Enhanced RPC, DAS API for NFTs, tx parsing | https://helius.dev | Free tier (1M credits) | MCP config with API key |
| solana-mcp-server (openSVM) | Raw Solana RPC methods | https://github.com/openSVM/solana-mcp-server | Free | MCP config |

### Search & Research MCPs

| Name | Description | GitHub/URL | Cost | Free tier |
|------|-------------|-----------|------|-----------|
| Brave Search | Web, local, image, video, news search | https://github.com/brave/brave-search-mcp-server | Free | 2,000/month |
| Exa | Semantic search, code context, company research | https://github.com/exa-labs/exa-mcp-server | Paid | $10 credits / 1,000 searches with free API key |
| Tavily | AI-optimized search with clean results | https://tavily.com | Paid | 1,000/month |
| Fetch MCP | Read full page content from URLs | https://github.com/modelcontextprotocol/servers | Free | Unlimited |

### Memory MCPs

| Name | Description | GitHub/URL | Cost | Storage |
|------|-------------|-----------|------|---------|
| CMEM | Self-learning memory, auto-extracts lessons, web GUI | https://www.npmjs.com/package/@colbymchenry/cmem | Free | Local (SQLite) |
| Supermemory | Universal memory across all AI tools, semantic search | https://supermemory.ai/ | Free tier + paid | Cloud |
| CCMem | Persistent project memory for Claude Code | https://github.com/adestefa/ccmem | Free | Local |
| MCP Knowledge Graph | Local knowledge graph, entity/relation memory | https://github.com/shaneholloman/mcp-knowledge-graph | Free | Local (JSON) |

### Plugins & Skills

| Name | Description | GitHub/URL | Cost | Install |
|------|-------------|-----------|------|---------|
| GSD | Spec-driven dev: planning, execution, atomic commits | https://github.com/gsd-build/get-shit-done | Free | `npx get-shit-done-cc@latest` |
| Superpowers | Brainstorming, TDD, debugging, code review, worktrees | Plugin marketplace | Free | Plugin install |
| Safety Net | Catches destructive git/filesystem commands | https://github.com/kenryu42/claude-code-safety-net | Free | Plugin install |
| Trail of Bits | 30+ security audit skills (vuln scanners, static analysis) | Plugin marketplace | Free | Plugin install |

### Frontend & UI MCPs

| Name | Description | GitHub/URL | Cost |
|------|-------------|-----------|------|
| Context7 | Live docs for React, Next.js, Tailwind, Anchor | https://github.com/upstash/context7 | Free |
| Figma MCP | Design-to-code from Figma files | Figma developer platform | Free (needs account) |
| Magic MCP | AI-generated React/Tailwind components | https://github.com/21st-dev/magic-mcp | Free tier |
| Browser Tools MCP | Console logs, network requests, screenshots | Community | Free |
| Puppeteer MCP | Browser automation, screenshots, page interaction | Official MCP repo | Free |
| Playwright MCP | E2E testing, browser automation | Official | Free |

### Backend & Database MCPs

| Name | Description | GitHub/URL | Cost |
|------|-------------|-----------|------|
| Supabase MCP | Database, auth, storage, edge functions | https://supabase.com | Free tier |
| PostgreSQL MCP | Read-only database queries, schema inspection | Official MCP repo | Free |
| Neon MCP | Serverless PostgreSQL with branching | https://github.com/neondatabase/mcp-server-neon | Free tier |
| Redis/Upstash MCP | Caching, rate limiting, message queues | https://github.com/upstash/mcp-server-upstash | Free tier |

### DevOps MCPs

| Name | Description | GitHub/URL | Cost |
|------|-------------|-----------|------|
| Vercel MCP | Deployment, env vars, domains, preview envs | Community | Free (hobby tier) |
| Cloudflare MCP | Workers, Pages, KV, R2, D1 | https://github.com/cloudflare/mcp-server-cloudflare | Free tier |
| Docker MCP | Container and compose management | Community | Free |
| GitHub MCP | Repos, issues, PRs, actions | Official MCP repo | Free |

### Utility MCPs

| Name | Description | GitHub/URL | Cost |
|------|-------------|-----------|------|
| Sequential Thinking | Structured problem-solving for complex decisions | Official MCP repo | Free |

---

## Maintenance

When new SVK skills are introduced (e.g., `/SVK:help`, `/SVK:check`), update:

1. The tool catalog in this design doc
2. The skill's internal recommendation engine
3. The reference document template

The skill should be designed so that adding a new tool means adding a single entry to the catalog — the interview logic, tiering, and walkthrough adapt automatically.

---

## Next Steps

1. **Design `/SVK:help`** — Skill discovery and guidance for all SVK capabilities
2. **Design `/SVK:check`** — Project health assessment and next-step suggestions
3. **Implement `/SVK:setup`** — Build the skill following SVK Skill Foundation patterns
