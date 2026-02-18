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
2. Walk through each tool category in order
3. For each tool: explain → ask install/skip → install → verify
4. Track results in `.svk/SETUP_INSTALLED.json`

---

## Step 1: Load Context

### Required files — read these first:
1. `.svk/SETUP_RECOMMENDATIONS.json` — What to install
2. `.svk/SETUP_PROFILE.json` — User profile (for explanation depth)
3. Read the skill's `resources/tool-catalog.md` — Installation details

### Error if missing:
If `.svk/SETUP_RECOMMENDATIONS.json` doesn't exist:
"No recommendations found. Run `/SVK:setup:recommend` first."

---

## Step 2: Initialize Tracking

Create or update `.svk/SETUP_INSTALLED.json`:

```json
{
  "version": "1.0.0",
  "started": "{ISO timestamp}",
  "completed": null,
  "tools": {}
}
```

---

## Step 3: Category-by-Category Walkthrough

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

#### 3a. Explain

Adapt explanation depth to profile:

| Profile | Depth |
|---------|-------|
| Beginner | Full explanation + beginner_note + why it matters |
| Intermediate | 1-2 sentence description |
| Advanced | Name + one-liner only |

#### 3b. Ask Install or Skip

Use AskUserQuestion:

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

#### 3c. Install

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

#### 3d. API Key Handling

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

#### 3e. Verify

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

#### 3f. Track Result

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

## Step 4: Installation Summary

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

## Step 5: Transition

```markdown
Ready to generate your personalized reference document?
Run `/SVK:setup:reference` or say "continue".
```

---

## Installation Principles

1. **One at a time.** Don't batch installs. Let the user see each one.
2. **Verify every install.** Don't assume success. Check.
3. **Never store API keys in plain text files committed to git.** Use MCP config or environment variables.
4. **Handle failures gracefully.** If one tool fails, continue with the next. Don't abort the whole walkthrough.
5. **Skip without guilt.** If the user skips a tool, acknowledge and move on. No "are you sure?"
6. **Track everything.** The installed.json file is the source of truth for Phase 4.
