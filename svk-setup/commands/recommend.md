---
name: SVK-setup:recommend
description: "Phase 2: Build and present tiered tool recommendations based on the user profile"
allowed-tools:
  - Read
  - Write
  - Edit
  - Glob
  - AskUserQuestion
---

# SVK Setup — Phase 2: Tiered Recommendations

You are building a personalized list of tool recommendations based on the user's profile from Phase 1. Present them clearly so the user understands what they're getting and why.

## What This Phase Does

1. Load the user profile from `.svk/SETUP_PROFILE.json`
2. Load the tool catalog from `resources/tool-catalog.md`
3. Apply recommendation rules to build three tiers
4. Present a summary for user approval
5. Save recommendations to `.svk/SETUP_RECOMMENDATIONS.json`

---

## Step 1: Load Context

### Required files — read these first:
1. `.svk/SETUP_PROFILE.json` — User profile from interview
2. Read the skill's `resources/tool-catalog.md` — Master tool registry

### Error if missing:
If `.svk/SETUP_PROFILE.json` doesn't exist:
"No setup profile found. Run `/SVK-setup:interview` first."

---

## Step 2: Build Recommendation List

### Essential Tier (always included)

Every user gets these regardless of profile:

| Tool | Notes |
|------|-------|
| GSD | Always |
| Superpowers | Always |
| Safety Net | Always |
| Solana Dev MCP | Always |
| **Search** (choice) | Present alternatives: Brave (default), Exa (premium), Stack (budget) |
| Fetch MCP | Bundled with search choice |
| **Memory** (choice) | Present alternatives: CMEM (default), Supermemory (premium) |

### Recommended Tier (profile-dependent)

Apply these rules based on the profile:

| Tool | Include When |
|------|-------------|
| Trail of Bits | Always; **emphasize** if `project.category == defi` |
| Context7 | `project.stack == fullstack OR frontend` |
| Playwright MCP | `project.stack == fullstack OR frontend` |
| Supabase MCP | `project.stack == fullstack OR backend` AND needs off-chain storage |
| Neon MCP | Alternative to Supabase — show if Supabase not chosen |
| Helius MCP | `project.category == nfts` OR heavy on-chain reads |

### Optional Tier (shown, not pushed)

Always listed for awareness. Include ALL optional tools from the catalog.

### Profile-Based Adjustments

| Profile | Adjustment |
|---------|-----------|
| **Beginner** | Move Safety Net to top of essential. Add beginner_note for each tool that has one. |
| **Intermediate** | Standard ordering. Show recommended tier in full. |
| **Advanced** | Show all three tiers equally. Don't push — let them cherry-pick. |

---

## Step 3: Present Recommendations

Display the recommendations to the user:

```markdown
## Recommended Setup

Based on your profile ({level}), here's what I'd recommend:

### Essential ({N} tools)
{List each tool with 1-line description}

**Choices needed:**
- **Search:** {default recommendation} — {reason}
  - Alternative: {other option} — {reason}
- **Memory:** {default recommendation} — {reason}
  - Alternative: {other option} — {reason}

### Recommended ({N} tools)
{List each tool with 1-line description and why it's recommended for their profile}

### Optional ({N} tools — install anytime later)
{List each tool with 1-line description}

---

**Total: {N} essential + {N} recommended tools.**
There are also {N} optional ones you can add later.

Want to walk through them now?
```

---

## Step 4: Capture Choices

If the user wants to adjust (add/remove tools from the list), update accordingly.

For **choice groups** (Search, Memory, Database), ask the user to pick:

Use AskUserQuestion for each choice group:

### Search Choice
```
question: "Which search setup do you prefer?"
options:
  - label: "Brave Search (Recommended)"
    description: "Free, 2K queries/month. Solid general-purpose search."
  - label: "Exa"
    description: "$10 free credits. Premium semantic search, code context, company research."
  - label: "Stack free tiers"
    description: "Brave + Exa + Tavily free tiers combined. ~4K queries/month, $0."
```

### Memory Choice
```
question: "Which memory system do you prefer?"
options:
  - label: "CMEM (Recommended)"
    description: "Free, local SQLite. No subscription, no cloud dependency."
  - label: "Supermemory"
    description: "Free tier + paid. Cloud sync, works across all AI tools."
```

---

## Step 5: Save Recommendations

Write `.svk/SETUP_RECOMMENDATIONS.json`:

```json
{
  "version": "1.0.0",
  "created": "{ISO timestamp}",
  "profile_level": "beginner | intermediate | advanced",
  "tiers": {
    "essential": [
      {
        "id": "gsd",
        "name": "GSD",
        "status": "pending",
        "choice_group": null
      },
      {
        "id": "brave-search",
        "name": "Brave Search",
        "status": "pending",
        "choice_group": "search",
        "chosen": true
      }
    ],
    "recommended": [...],
    "optional": [...]
  },
  "choices": {
    "search": "brave-search | exa | search-stack",
    "memory": "cmem | supermemory"
  },
  "total_to_install": "{count of essential + recommended tools}"
}
```

---

## Step 6: Transition

After saving:

```markdown
## Ready to Install

{N} tools queued for installation, organized by category.
Estimated time: {5-15} minutes depending on API key setup.

Ready? Run `/SVK-setup:install` or say "let's go" to proceed.
```

---

## Recommendation Principles

1. **Don't overwhelm.** Present the summary first. Details come during the walkthrough.
2. **Respect the profile.** Beginners get fewer choices with clearer defaults. Advanced users get the full catalog.
3. **Explain choices, don't decide.** For choice groups, present trade-offs and let the user pick.
4. **Free first.** Always lead with the free option. Paid options are upgrades, not defaults.
5. **Be honest about costs.** If a tool has a free tier, say how far the free tier goes.
