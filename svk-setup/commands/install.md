---
name: SVK-setup:install
description: "Phase 3: Walk through installation of recommended tools one category at a time"
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
  - AskUserQuestion
---

# SVK Setup — Phase 3: Installation Walkthrough

You are walking the user through installing each recommended tool, one category at a time. For each tool: explain, ask, install, verify.

## What This Phase Does

1. Load recommendations from `.svk/SETUP_RECOMMENDATIONS.json`
2. Ask the user to choose an install mode (Express or Guided)
3. Walk through each tool category in order
4. For each tool: explain → ask install/skip (guided only) → install → verify
5. Track results in `.svk/SETUP_INSTALLED.json`

---

## Step 1: Load Context

### Required files — read these first:
1. `.svk/SETUP_RECOMMENDATIONS.json` — What to install
2. `.svk/SETUP_PROFILE.json` — User profile (for explanation depth)
3. Read the skill's `resources/tool-catalog.md` — Installation details

### Error if missing:
If `.svk/SETUP_RECOMMENDATIONS.json` doesn't exist:
"No recommendations found. Run `/SVK-setup:recommend` first."

---

## Step 2: Choose Install Mode

Before starting, explain what's about to happen and let the user choose how much hand-holding they want.

**Say this first:**
```markdown
## How do you want to install?

SVK Setup is about to download and install tools from the internet — MCPs, plugins, CLI packages, and skill files. Nothing runs without your knowledge.
```

**Then ask with AskUserQuestion:**
```
question: "How would you like to proceed?"
header: "Install mode"
options:
  - label: "Express (Recommended)"
    description: "Install all recommended tools automatically. I'll only pause for API keys."
  - label: "Guided"
    description: "Ask me about each tool one at a time before installing."
```

**Save the choice** to a variable for use throughout this phase. Record it in the tracking file too.

### Mode behaviors:

| Behavior | Express | Guided |
|----------|---------|--------|
| Per-tool "Install X?" prompt | **Skipped** — auto-install | **Shown** — ask each time |
| API key prompts | **Still shown** — requires user input | **Still shown** |
| Category announcements | **Still shown** — so user can follow along | **Still shown** |
| Tool explanations | **Skipped** — just show name + one-liner | **Full** — depth per profile |
| Verify each install | **Yes** | **Yes** |
| Skip tracking | All marked `installed` unless they fail | Per user choice |

> **Design note:** Express mode does NOT skip API key prompts. Those require user action (pasting a key or choosing to skip). Everything else is automated.

---

## Step 3: Initialize Tracking

Create or update `.svk/SETUP_INSTALLED.json`:

```json
{
  "version": "1.0.0",
  "started": "{ISO timestamp}",
  "install_mode": "express | guided",
  "completed": null,
  "tools": {}
}
```

---

## Step 4: Category-by-Category Walkthrough

Process categories in this order:
1. Dev Workflow (GSD + Superpowers)
2. Safety (Safety Net)
3. Solana (Solana Dev MCP, Helius)
4. Search (user's choice + Fetch)
5. Memory (user's choice)
6. Security (Trail of Bits)
7. Frontend (Context7, Figma, Magic, Playwright)
8. Backend/Database (Supabase, Neon, Redis)
9. DevOps (Vercel, Cloudflare, Docker)
10. Utility (Sequential Thinking, Browser Tools, Puppeteer)

### For each category:

**Announce the category:**
```markdown
## Category {N}/10: {Category Name}

{For beginners: category explanation from beginner_note in catalog}
```

### For each tool in the category:

**Skip** if the tool is not in the user's recommendation list (was deselected or is in a different choice group).

#### 4a. Explain

**Express mode:** Show name + one-liner only, regardless of profile.

**Guided mode:** Adapt explanation depth to profile:

| Profile | Depth |
|---------|-------|
| Beginner | Full explanation + beginner_note + why it matters |
| Intermediate | 1-2 sentence description |
| Advanced | Name + one-liner only |

#### 4b. Ask Install or Skip

**Express mode:** Skip this step entirely. Proceed directly to install.

**Guided mode:** Use AskUserQuestion:

```
question: "Install {tool_name}?"
options:
  - label: "Install"
    description: "{one-line benefit}"
  - label: "Skip"
    description: "Can install later"
```

For essential tools with beginner profiles, phrase as:
```
question: "Install {tool_name}? (Recommended)"
options:
  - label: "Install (Recommended)"
    description: "{benefit}"
  - label: "Skip for now"
    description: "Can install later, but this is strongly recommended"
```

If skipped, record and move on. Don't push.

#### 4c. Install

Execute the installation based on `install_method`:

**MCP Config (`mcp-config`):**
Write the MCP configuration. Check if `.mcp.json` or project-level MCP config exists and add to it.

**CLI command (`cli`):**
```bash
claude mcp add --transport http {name} {url}
```

**npx (`npx`):**
```bash
npx {package}@latest
```

**Plugin (`plugin`):**
Tell the user: "Install {tool_name} from the Claude Code plugin marketplace. You can do this from the Claude Code settings or by searching for it."

**Skill (`skill`):**
Copy skill files to `.claude/skills/` and `.claude/commands/`.

#### 4d. API Key Handling

When a tool requires an API key (`requires_api_key: true`):

1. Explain where to get it:
   "I'll need a {service} API key. You can get one free at {api_key_url}"

2. Ask the user to paste it (use AskUserQuestion with a free-text "Other" option):
   ```
   question: "Paste your {service} API key (or skip to install later):"
   options:
     - label: "Skip for now"
       description: "You can add the API key later in your MCP config"
   ```

3. If provided, write it to the appropriate config location
4. If skipped, mark the tool as `installed_without_key` — it's configured but won't work until the key is added

#### 4e. Verify

After installation, run a quick health check:

- For MCPs: Confirm the entry exists in the MCP config
- For CLI installs: Confirm the command completed successfully
- For plugins: Ask the user to confirm they see it in their plugin list
- For file-based installs: Confirm the files exist

Report result:
```
✓ {tool_name} installed successfully
```
or
```
⚠ {tool_name} installed but needs API key — add it to your MCP config later
```
or
```
✗ {tool_name} installation failed — {error}. You can try again later.
```

#### 4f. Track Result

Update `.svk/SETUP_INSTALLED.json`:

```json
{
  "tools": {
    "gsd": {
      "status": "installed | skipped | failed | installed_without_key",
      "category": "dev-workflow",
      "tier": "essential",
      "installed_at": "{ISO timestamp}",
      "skip_reason": "{if skipped}"
    }
  }
}
```

### Category Complete

After each category:
```markdown
### {Category Name} — Done

{installed_count} installed, {skipped_count} skipped
```

---

## Step 5: Installation Summary

After all categories:

```markdown
## Installation Complete

| Category | Installed | Skipped |
|----------|-----------|---------|
{for each category with tools}
| {category} | {count} | {count} |
{/for}

**Total: {installed} installed, {skipped} skipped**

{If any tools need API keys:}
### Needs API Keys
{list tools that are installed_without_key with links to get keys}

{If any tools failed:}
### Failed — Try Again Later
{list failed tools with error summary}
```

Update `.svk/SETUP_INSTALLED.json` with `completed` timestamp.

---

## Step 6: Transition

```markdown
Ready to generate your personalized reference document?
Run `/SVK-setup:reference` or say "continue".
```

---

## Installation Principles

1. **One at a time.** Don't batch installs. Let the user see each one proceed (even in express mode — show progress, just don't ask).
2. **Verify every install.** Don't assume success. Check.
3. **Never store API keys in plain text files committed to git.** Use MCP config or environment variables.
4. **Handle failures gracefully.** If one tool fails, continue with the next. Don't abort the whole walkthrough.
5. **Skip without guilt.** If the user skips a tool, acknowledge and move on. No "are you sure?"
6. **Track everything.** The installed.json file is the source of truth for Phase 4.
