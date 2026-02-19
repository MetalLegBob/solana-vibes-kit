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

## Step 5.5: Install SVK Core Skills

SVK includes core skills that provide security auditing, documentation generation, and math verification. These are installed automatically — they're part of SVK itself, not optional third-party tools.

### Skills to install:

| Skill | Abbreviation | Purpose |
|-------|-------------|---------|
| Stronghold of Security | SOS | On-chain security audit |
| Grand Library | GL | Documentation generation |
| Dinh's Bulwark | DB | Off-chain security audit |
| Book of Knowledge | BOK | Math verification & invariant proving |
| SVK Update | SVK | Version management |

> **Note:** svk-setup is already installed (it's what's running). Forge is optional and only for SVK skill developers (it's in the tool catalog if the user wants it).

### Procedure:

1. Read `svk_repo` from `.claude/svk-meta.json`
2. Get the project root directory (the current working directory)
3. Run each skill's installer. For each skill, run via Bash:
   ```bash
   "{svk_repo}/stronghold-of-security/install.sh" "{project_dir}"
   ```
   ```bash
   "{svk_repo}/grand-library/install.sh" "{project_dir}"
   ```
   ```bash
   "{svk_repo}/dinhs-bulwark/install.sh" "{project_dir}"
   ```
   ```bash
   "{svk_repo}/book-of-knowledge/install.sh" "{project_dir}"
   ```
   ```bash
   "{svk_repo}/svk-update/install.sh" "{project_dir}"
   ```

4. **Verify** each one created its commands directory:
   ```bash
   ls .claude/commands/SOS/ .claude/commands/GL/ .claude/commands/DB/ .claude/commands/BOK/ .claude/commands/SVK/
   ```

5. Show progress as each skill installs (even in Express mode):
   ```
   Installing SVK core skills...
     ✓ Stronghold of Security (SOS) — 8 commands
     ✓ Grand Library (GL) — 8 commands
     ✓ Dinh's Bulwark (DB) — 7 commands
     ✓ Book of Knowledge (BOK) — installed
     ✓ SVK Update — installed

   5 SVK skills installed. Commands available: /SOS, /GL, /DB, /BOK, /SVK:update
   ```

6. If any script fails, report the error and continue with the next one. Do not abort.

### Track Results

Update `.svk/SETUP_INSTALLED.json` with entries for each skill:
```json
{
  "svk-sos": {
    "status": "installed",
    "category": "svk-core-skills",
    "installed_at": "{ISO timestamp}"
  },
  "svk-gl": {
    "status": "installed",
    "category": "svk-core-skills",
    "installed_at": "{ISO timestamp}"
  },
  "svk-db": {
    "status": "installed",
    "category": "svk-core-skills",
    "installed_at": "{ISO timestamp}"
  },
  "svk-bok": {
    "status": "installed",
    "category": "svk-core-skills",
    "installed_at": "{ISO timestamp}"
  },
  "svk-update": {
    "status": "installed",
    "category": "svk-core-skills",
    "installed_at": "{ISO timestamp}"
  }
}
```

---

## Step 5.6: SVK Infrastructure — Hook + MCP Server

After all skills are installed, set up the SVK awareness layer. This runs automatically (no user choice needed — it's part of SVK itself).

### 5.6a: Install SessionStart Hook

1. Read the SVK repo path from `.claude/svk-meta.json` (`svk_repo` field) — already available from Step 5.5
2. Copy the hook script:
   ```bash
   mkdir -p .claude/hooks
   cp "{svk_repo}/.claude/hooks/svk-session-start.sh" .claude/hooks/svk-session-start.sh
   chmod +x .claude/hooks/svk-session-start.sh
   ```
3. Check if `.claude/settings.json` exists. If so, read it and merge the hooks config. If not, create it with:
   ```json
   {
     "hooks": {
       "SessionStart": [
         {
           "matcher": "startup",
           "hooks": [
             {
               "type": "command",
               "command": ".claude/hooks/svk-session-start.sh",
               "timeout": 5
             }
           ]
         }
       ]
     }
   }
   ```
   When merging, add the SVK hook entry to the existing `SessionStart` array. Do not overwrite existing hooks.
4. Verify the hook script exists and is executable:
   ```bash
   test -x .claude/hooks/svk-session-start.sh && echo "✓ SVK SessionStart hook installed"
   ```

### 5.6b: Install SVK MCP Server

1. Read the SVK repo path from `.claude/svk-meta.json`
2. Install MCP server dependencies (if not already done):
   ```bash
   cd "{svk_repo}/svk-mcp" && npm install --production && cd -
   ```
3. Add the SVK MCP server to the project's MCP config. Check if `.mcp.json` exists in the project root:
   - If yes, read it and add the `svk` server entry
   - If no, create `.mcp.json` with:
   ```json
   {
     "mcpServers": {
       "svk": {
         "command": "node",
         "args": ["{svk_repo}/svk-mcp/index.js"],
         "env": {
           "SVK_PROJECT_DIR": "."
         }
       }
     }
   }
   ```
4. Report result:
   ```
   ✓ SVK MCP server configured (6 tools: status, docs, decisions, audit, search, suggest)
   ```

### Track Result

Update `.svk/SETUP_INSTALLED.json` with:
```json
{
  "svk-hook": {
    "status": "installed",
    "category": "svk-infrastructure",
    "installed_at": "{ISO timestamp}"
  },
  "svk-mcp": {
    "status": "installed",
    "category": "svk-infrastructure",
    "installed_at": "{ISO timestamp}"
  }
}
```

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
