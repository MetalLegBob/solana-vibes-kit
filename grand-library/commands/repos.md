---
name: GL:repos
description: "Browse the curated catalogue of forkable open source repos"
allowed-tools:
  - Read
  - Glob
  - Grep
  - Task
  - WebSearch
  - WebFetch
  - AskUserQuestion
---

# Grand Library — Repo Catalogue Browser

Browse the curated catalogue of verified open source repos for Solana development. Find fork candidates, reference implementations, and reusable components.

## Arguments

Parse any arguments from the user's message:
- No arguments = show all categories with entry counts
- `<search term>` = search across all catalogue files for matching repos (e.g., `amm`, `vesting`, `multisig`)
- `--fork-ready` = filter to repos tagged as "Fork candidate"
- `--license permissive` = filter to Apache 2.0 and MIT repos only
- `--category <name>` = show a specific category (e.g., `defi`, `tokens`, `governance`, `nft`, `frontend`, `tooling`, `infra`)

---

## Step 1: Load Catalogue Files

Read all `repos-*.md` files from the domain pack knowledge directory:
```
resources/domain-packs/solana/knowledge/repos-*.md
```

If no catalogue files exist:
"No repo catalogue found. The Solana domain pack may not include catalogue files yet."

## Step 2: Route by Arguments

### No arguments — Category Overview

Display a summary table:

```markdown
## Repo Catalogue

| Category | Repos | Top Fork Candidates |
|----------|-------|-------------------|
| DeFi Primitives | {N} | Orca Whirlpools, Raydium CP-Swap, Solend |
| Token Infrastructure | {N} | Jito Distributor, Bonfida Vesting |
| Governance | {N} | SPL Governance, Squads MPL |
| NFT & Gaming | {N} | Candy Machine, Bubblegum, Bolt |
| Client & Frontend | {N} | create-solana-dapp, Wallet Adapter |
| Developer Tooling | {N} | Anchor, Bankrun, LiteSVM, Codama |
| Infrastructure | {N} | Yellowstone gRPC, Geyser Postgres |

Browse a category: `/GL:repos defi`
Search for a topic: `/GL:repos amm`
Filter by license: `/GL:repos --license permissive`
```

### Search term — Find Matching Repos

Search all catalogue files for the term (case-insensitive) in repo names, category tags, and builder notes. Display matching entries with their full details.

### --fork-ready — Fork Candidates Only

Filter to entries where use cases include "Fork candidate". Display as a concise table:

```markdown
| Repo | Category | License | Complexity | Builder Notes (summary) |
|------|----------|---------|------------|------------------------|
```

### --license permissive — Permissive License Only

Filter to entries where license is Apache 2.0 or MIT. Exclude GPL, AGPL, BSL, and unverified licenses.

### --category — Single Category

Display all entries from the matching catalogue file with full details (trust signals, builder notes, complexity).

## Step 3: Live Verification (Optional)

After displaying results, offer:

"Want me to live-verify these repos? I'll check last commit dates, current license files, and any recent security incidents."

If yes, spawn a **Haiku subagent** for each repo to verify:

```
Task(
  subagent_type="general-purpose",
  model="haiku",
  prompt="Verify the current status of {repo_url}:
  1. Last meaningful commit date (via web search for '{org}/{repo} github')
  2. Current license (check if it has changed)
  3. Any recent security incidents or vulnerabilities
  4. Whether the repo is archived or actively maintained
  5. Current star/fork count if findable

  Return a brief status line:
  {repo_name}: {status} | Last commit: {date} | License: {license} | Stars: {N} | {any warnings}"
)
```

Present results as a verification table:

```markdown
## Live Verification (as of {date})

| Repo | Status | Last Commit | License | Stars | Warnings |
|------|--------|-------------|---------|-------|----------|
```

Update confidence scores based on findings. Flag any repos where:
- Last commit > 6 months ago (stale warning)
- License has changed (license warning)
- Repo is archived (archived warning)
- Security incidents found (security warning)

## Step 4: Recommendation

If the user searched for a specific use case (e.g., "amm", "vesting"), end with an opinionated recommendation:

"**For your use case, I'd recommend starting with {repo}** — {one-sentence why}. {License note if relevant}."

---

## Model Allocation

| Task | Model |
|------|-------|
| Catalogue browsing / filtering | User's context (no subagent needed) |
| Live verification checks | Haiku (per repo) |
| Search across catalogue files | User's context |
