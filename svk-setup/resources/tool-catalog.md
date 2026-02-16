---
skill: svk-setup
type: tool-catalog
version: "1.0.0"
total_tools: 28
---

# SVK Tool Catalog

Master registry for all tools recommended by SVK Setup. Each entry contains everything needed for the recommendation engine and installation walkthrough.

**Adding a new tool:** Add a single entry below. The interview logic, tiering, and walkthrough adapt automatically from the fields.

---

## Schema

Each tool entry uses these fields:

| Field | Description |
|-------|-------------|
| `id` | Unique identifier (kebab-case) |
| `name` | Display name |
| `category` | Category for walkthrough grouping |
| `tier` | `essential` / `recommended` / `optional` |
| `description` | 1-2 sentence explanation |
| `cost` | Free / Free tier / Paid |
| `free_tier` | Details of free tier if applicable |
| `install_method` | `mcp-config` / `npx` / `plugin` / `skill` / `cli` |
| `install_command` | Exact command or config to run |
| `requires_api_key` | true/false |
| `api_key_url` | Where to get the API key |
| `verify_command` | Quick health check after install |
| `when_recommended` | Conditions for recommending (profile-dependent tools) |
| `alternatives` | Other tools in the same choice group |
| `docs_url` | Link to documentation |
| `repo_url` | Link to source repository |

---

## Category 1: Dev Workflow

### GSD (get-shit-done)
- **id:** gsd
- **tier:** essential
- **description:** Spec-driven development — project planning, phase execution, atomic commits, multi-agent orchestration.
- **cost:** Free
- **install_method:** npx
- **install_command:** `npx get-shit-done-cc@latest`
- **requires_api_key:** false
- **verify_command:** Check that `.claude/commands/gsd/` exists after install
- **docs_url:** https://github.com/gsd-build/get-shit-done
- **repo_url:** https://github.com/gsd-build/get-shit-done

### Superpowers
- **id:** superpowers
- **tier:** essential
- **description:** Development practices — brainstorming, TDD, debugging, code review, git worktrees, skill writing.
- **cost:** Free
- **install_method:** plugin
- **install_command:** Install from Claude Code plugin marketplace
- **requires_api_key:** false
- **verify_command:** Check that superpowers skills appear in `/help`
- **docs_url:** https://github.com/obra/superpowers
- **repo_url:** https://github.com/obra/superpowers

### GSD + Superpowers Distinction
> "GSD runs your project — it handles planning, execution, and milestones. Superpowers improves how you code — brainstorming, debugging, testing, code review. They complement each other."

---

## Category 2: Safety

### Safety Net (claude-code-safety-net)
- **id:** safety-net
- **tier:** essential
- **description:** Catches destructive git/filesystem commands before they execute. Essential guardrail.
- **cost:** Free
- **install_method:** plugin
- **install_command:** Install from Claude Code plugin marketplace
- **requires_api_key:** false
- **verify_command:** Check that safety-net hooks are active
- **docs_url:** https://github.com/kenryu42/claude-code-safety-net
- **repo_url:** https://github.com/kenryu42/claude-code-safety-net
- **beginner_note:** "This is your safety net. It prevents Claude from accidentally deleting files or force-pushing code. Highly recommended for everyone, essential for beginners."

---

## Category 3: Solana

### Solana Dev MCP
- **id:** solana-dev-mcp
- **tier:** essential
- **description:** Real-time Solana docs, account queries, transaction analysis, Anchor framework expert.
- **cost:** Free
- **install_method:** cli
- **install_command:** `claude mcp add --transport http solana-mcp https://mcp.solana.com/mcp`
- **requires_api_key:** false
- **verify_command:** Confirm MCP appears in active MCPs list
- **docs_url:** https://mcp.solana.com/
- **repo_url:** https://mcp.solana.com/

### Helius MCP
- **id:** helius-mcp
- **tier:** recommended
- **description:** Enhanced RPC, DAS API for NFTs, transaction parsing, compressed NFTs.
- **cost:** Free tier (1M credits)
- **install_method:** mcp-config
- **requires_api_key:** true
- **api_key_url:** https://dev.helius.xyz/
- **when_recommended:** NFT projects or heavy on-chain reads (DAS API)
- **docs_url:** https://docs.helius.dev/
- **repo_url:** https://helius.dev

---

## Category 4: Search & Research

### Brave Search MCP (default recommendation)
- **id:** brave-search
- **tier:** essential
- **description:** Web, local, image, video, and news search. Solid general-purpose search.
- **cost:** Free
- **free_tier:** 2,000 queries/month
- **install_method:** mcp-config
- **requires_api_key:** true
- **api_key_url:** https://brave.com/search/api/
- **alternatives:** [exa, search-stack]
- **docs_url:** https://github.com/brave/brave-search-mcp-server
- **repo_url:** https://github.com/brave/brave-search-mcp-server
- **beginner_note:** "Search tools are important because Claude can't access the internet by default. Without one, it can only use what it already knows — which may be outdated."

### Exa MCP (premium alternative)
- **id:** exa
- **tier:** essential
- **description:** Semantic search, code context lookup, company research. Premium upgrade for research-heavy workflows.
- **cost:** $10 free credits on signup, then ~$1/1K queries
- **free_tier:** ~1,000 searches with free API key
- **install_method:** mcp-config
- **requires_api_key:** true
- **api_key_url:** https://dashboard.exa.ai/
- **alternatives:** [brave-search, search-stack]
- **docs_url:** https://github.com/exa-labs/exa-mcp-server
- **repo_url:** https://github.com/exa-labs/exa-mcp-server

### Search Stack (budget option)
- **id:** search-stack
- **tier:** essential
- **description:** Stack Brave + Exa + Tavily free tiers for ~4,000 combined queries/month at zero cost.
- **cost:** Free (combined free tiers)
- **free_tier:** ~4,000 queries/month combined
- **install_method:** mcp-config
- **alternatives:** [brave-search, exa]

### Fetch MCP
- **id:** fetch-mcp
- **tier:** essential
- **description:** Read full page content from URLs. Automatically installed alongside search MCPs since search returns snippets and Fetch reads full content.
- **cost:** Free
- **install_method:** mcp-config
- **requires_api_key:** false
- **docs_url:** https://github.com/modelcontextprotocol/servers
- **repo_url:** https://github.com/modelcontextprotocol/servers
- **bundled_with:** [brave-search, exa, search-stack]

### Tavily MCP
- **id:** tavily
- **tier:** optional
- **description:** AI-optimized search with clean, structured results.
- **cost:** Free tier
- **free_tier:** 1,000 queries/month
- **install_method:** mcp-config
- **requires_api_key:** true
- **api_key_url:** https://tavily.com/
- **docs_url:** https://tavily.com/

---

## Category 5: Memory

### CMEM (default recommendation)
- **id:** cmem
- **tier:** essential
- **description:** Self-learning memory that auto-extracts lessons from conversations. Local SQLite storage, web GUI, no subscription.
- **cost:** Free
- **install_method:** mcp-config
- **install_command:** Configure via MCP settings with `npx @colbymchenry/cmem`
- **requires_api_key:** false
- **alternatives:** [supermemory]
- **docs_url:** https://www.npmjs.com/package/@colbymchenry/cmem
- **repo_url:** https://www.npmjs.com/package/@colbymchenry/cmem

### Supermemory (premium alternative)
- **id:** supermemory
- **tier:** essential
- **description:** Universal memory across all AI tools with semantic search, cloud sync, and web UI.
- **cost:** Free tier + paid plans
- **install_method:** mcp-config
- **requires_api_key:** true
- **api_key_url:** https://supermemory.ai/
- **alternatives:** [cmem]
- **docs_url:** https://supermemory.ai/
- **repo_url:** https://supermemory.ai/

---

## Category 6: Security

### Trail of Bits Skills
- **id:** trail-of-bits
- **tier:** recommended
- **description:** 30+ security audit skills — vulnerability scanners for Solana/Anchor, static analysis (Semgrep, CodeQL), fuzzing, constant-time analysis.
- **cost:** Free
- **install_method:** plugin
- **install_command:** Install from Claude Code plugin marketplace
- **requires_api_key:** false
- **when_recommended:** Always recommended; *emphasized* for DeFi/token projects
- **docs_url:** https://github.com/trailofbits/skills

---

## Category 7: Frontend & UI

### Context7
- **id:** context7
- **tier:** recommended
- **description:** Live docs for React, Next.js, Tailwind, Anchor, and more. Keeps Claude's knowledge up-to-date.
- **cost:** Free
- **install_method:** mcp-config
- **requires_api_key:** false
- **when_recommended:** Building frontend (React, Next.js, Tailwind)
- **docs_url:** https://github.com/upstash/context7
- **repo_url:** https://github.com/upstash/context7

### Figma MCP
- **id:** figma-mcp
- **tier:** optional
- **description:** Design-to-code workflow from Figma files.
- **cost:** Free (needs Figma account)
- **install_method:** mcp-config
- **requires_api_key:** true
- **api_key_url:** https://www.figma.com/developers
- **when_recommended:** Design-to-code workflow
- **docs_url:** https://www.figma.com/developers

### Magic MCP
- **id:** magic-mcp
- **tier:** optional
- **description:** AI-generated React/Tailwind components from natural language descriptions.
- **cost:** Free tier
- **install_method:** mcp-config
- **requires_api_key:** true
- **api_key_url:** https://github.com/21st-dev/magic-mcp
- **docs_url:** https://github.com/21st-dev/magic-mcp
- **repo_url:** https://github.com/21st-dev/magic-mcp

### Playwright MCP
- **id:** playwright-mcp
- **tier:** recommended
- **description:** E2E testing and browser automation for frontend applications.
- **cost:** Free
- **install_method:** mcp-config
- **requires_api_key:** false
- **when_recommended:** Building frontend (E2E testing)
- **docs_url:** https://playwright.dev/

### Browser Tools MCP
- **id:** browser-tools-mcp
- **tier:** optional
- **description:** Console logs, network requests, screenshots from browser.
- **cost:** Free
- **install_method:** mcp-config
- **requires_api_key:** false
- **docs_url:** https://github.com/nicholasoxford/browser-tools-mcp

### Puppeteer MCP
- **id:** puppeteer-mcp
- **tier:** optional
- **description:** Browser automation, screenshots, page interaction for testing.
- **cost:** Free
- **install_method:** mcp-config
- **requires_api_key:** false
- **docs_url:** https://github.com/pptr/pptr

---

## Category 8: Backend & Database

### Supabase MCP
- **id:** supabase-mcp
- **tier:** recommended
- **description:** Database, auth, storage, edge functions — full backend-as-a-service.
- **cost:** Free tier
- **install_method:** mcp-config
- **requires_api_key:** true
- **api_key_url:** https://supabase.com/
- **when_recommended:** Needs off-chain data storage
- **alternatives:** [neon-mcp]
- **docs_url:** https://supabase.com/

### Neon MCP
- **id:** neon-mcp
- **tier:** recommended
- **description:** Serverless PostgreSQL with database branching. Great for preview environments.
- **cost:** Free tier
- **install_method:** mcp-config
- **requires_api_key:** true
- **api_key_url:** https://neon.tech/
- **when_recommended:** Serverless PostgreSQL alternative to Supabase
- **alternatives:** [supabase-mcp]
- **docs_url:** https://github.com/neondatabase/mcp-server-neon
- **repo_url:** https://github.com/neondatabase/mcp-server-neon

### Redis/Upstash MCP
- **id:** upstash-mcp
- **tier:** optional
- **description:** Caching, rate limiting, message queues via serverless Redis.
- **cost:** Free tier
- **install_method:** mcp-config
- **requires_api_key:** true
- **api_key_url:** https://upstash.com/
- **docs_url:** https://github.com/upstash/mcp-server-upstash
- **repo_url:** https://github.com/upstash/mcp-server-upstash

---

## Category 9: DevOps

### Vercel MCP
- **id:** vercel-mcp
- **tier:** optional
- **description:** Frontend deployment management — env vars, domains, preview environments.
- **cost:** Free (hobby tier)
- **install_method:** mcp-config
- **requires_api_key:** true
- **docs_url:** https://vercel.com/

### Cloudflare MCP
- **id:** cloudflare-mcp
- **tier:** optional
- **description:** Edge deployment — Workers, Pages, KV, R2, D1.
- **cost:** Free tier
- **install_method:** mcp-config
- **requires_api_key:** true
- **api_key_url:** https://dash.cloudflare.com/
- **docs_url:** https://github.com/cloudflare/mcp-server-cloudflare
- **repo_url:** https://github.com/cloudflare/mcp-server-cloudflare

### Docker MCP
- **id:** docker-mcp
- **tier:** optional
- **description:** Container and Docker Compose management.
- **cost:** Free
- **install_method:** mcp-config
- **requires_api_key:** false
- **docs_url:** https://www.docker.com/

---

## Category 10: Utility

### Sequential Thinking MCP
- **id:** sequential-thinking
- **tier:** optional
- **description:** Structured problem-solving for complex architectural decisions.
- **cost:** Free
- **install_method:** mcp-config
- **requires_api_key:** false
- **docs_url:** https://github.com/modelcontextprotocol/servers

---

## Category Order (for walkthrough)

1. Dev Workflow (GSD + Superpowers)
2. Safety (Safety Net)
3. Solana (Solana Dev MCP, Helius)
4. Search (Brave / Exa / stacked + Fetch)
5. Memory (CMEM / Supermemory)
6. Security (Trail of Bits)
7. Frontend (Context7, Figma, Magic, Playwright)
8. Backend/Database (Supabase, Neon, Redis)
9. DevOps (Vercel, Cloudflare, Docker)
10. Utility (Sequential Thinking, Browser Tools, Puppeteer)

---

## Choice Groups

Some tools are alternatives — the user picks one (or stacks free tiers):

| Group | Options | Default |
|-------|---------|---------|
| Search | Brave, Exa, Search Stack | Brave |
| Memory | CMEM, Supermemory | CMEM |
| Database | Supabase, Neon | Supabase |
