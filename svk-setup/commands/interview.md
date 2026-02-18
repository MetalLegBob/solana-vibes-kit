---
name: SVK-setup:interview
description: "Phase 1: Short conversational interview to build a user profile that drives all subsequent recommendations"
allowed-tools:
  - Read
  - Write
  - Edit
  - Glob
  - AskUserQuestion
---

# SVK Setup — Phase 1: Interview

You are conducting a short, friendly interview (5-7 questions, one at a time) to understand the user's experience level and project scope. The answers produce a profile that drives all tool recommendations.

## What This Phase Does

1. Ask 5-7 questions conversationally (one at a time, using AskUserQuestion)
2. Build a user profile: experience level + project scope
3. Classify the user as Beginner / Intermediate / Advanced
4. Save the profile to `.svk/SETUP_PROFILE.json`

---

## Step 1: Check State

Check if `.svk/SETUP_PROFILE.json` already exists.

**If it exists:** Ask the user:
"I found an existing setup profile. Want to start fresh with a new interview, or keep the existing profile and skip to recommendations?"

**If it doesn't exist:** Create the `.svk/` directory and proceed.

```bash
mkdir -p .svk
```

---

## Step 2: Experience Gauging (3 questions)

Ask these one at a time using AskUserQuestion. Be conversational — react to answers.

### Question 1: Git Experience

```
question: "How comfortable are you with git?"
options:
  - label: "New to git"
    description: "Haven't used it much or at all"
  - label: "Basic"
    description: "Can commit, push, pull — the basics"
  - label: "Comfortable"
    description: "Branching, rebasing, resolving conflicts — no problem"
```

### Question 2: Solana Experience

```
question: "Have you built on Solana before?"
options:
  - label: "No"
    description: "This is my first Solana project"
  - label: "Learning"
    description: "Done tutorials, maybe a small project"
  - label: "Shipped projects"
    description: "Deployed programs to mainnet"
```

### Question 3: Claude Code Experience

```
question: "How much Claude Code experience do you have?"
options:
  - label: "New to it"
    description: "Just installed it or haven't used it yet"
  - label: "Some experience"
    description: "Used it for a few projects"
  - label: "Power user"
    description: "Daily driver, know the ins and outs"
```

---

## Step 3: Project Scoping (4 questions)

### Question 4: New or Existing

```
question: "Starting fresh or adding SVK to an existing project?"
options:
  - label: "New project"
    description: "Starting from scratch"
  - label: "Existing project"
    description: "Adding SVK to a project I'm already working on"
```

### Question 5: Project Type

```
question: "What are you building?"
options:
  - label: "DeFi"
    description: "AMMs, lending, staking, yield, token launches"
  - label: "NFTs"
    description: "Collections, marketplaces, dynamic NFTs, gaming assets"
  - label: "DAO / Governance"
    description: "Voting, proposals, treasury management"
  - label: "Tool / Infrastructure"
    description: "Developer tools, SDKs, CLIs, APIs, indexers"
```

If the user selects "Other", ask them to describe their project briefly and map it to the closest category for recommendation purposes.

### Question 6: Stack Scope

```
question: "Frontend, backend, or both?"
options:
  - label: "Full stack"
    description: "Frontend + Solana programs"
  - label: "Backend only"
    description: "Solana programs, APIs, infrastructure"
  - label: "Frontend only"
    description: "Frontend consuming existing programs"
```

### Question 7: Team Size

```
question: "Solo or team?"
options:
  - label: "Solo"
    description: "Just me"
  - label: "Team"
    description: "Working with others"
```

---

## Step 4: Compute Profile

Based on the answers, compute the profile level:

### Scoring

| Answer | Points |
|--------|--------|
| Git: New | 0 |
| Git: Basic | 1 |
| Git: Comfortable | 2 |
| Solana: No | 0 |
| Solana: Learning | 1 |
| Solana: Shipped | 2 |
| Claude Code: New | 0 |
| Claude Code: Some | 1 |
| Claude Code: Power user | 2 |

### Profile Classification

| Total Score | Profile |
|-------------|---------|
| 0-2 | **Beginner** — Extra explanations, guardrails emphasized, learning resources |
| 3-4 | **Intermediate** — Standard explanations, full recommended tier |
| 5-6 | **Advanced** — Minimal hand-holding, full catalog, cherry-pick mode |

---

## Step 5: Save Profile

Write `.svk/SETUP_PROFILE.json`:

```json
{
  "version": "1.0.0",
  "created": "{ISO timestamp}",
  "experience": {
    "git": "none | basic | comfortable",
    "solana": "none | learning | shipped",
    "claude_code": "new | some | power_user"
  },
  "project": {
    "type": "new | existing",
    "category": "defi | nfts | dao | game | tool | other",
    "category_description": "{only if other — user's description}",
    "stack": "fullstack | backend | frontend",
    "team": "solo | team"
  },
  "profile": {
    "level": "beginner | intermediate | advanced",
    "score": 0-6,
    "explanation_depth": "detailed | standard | minimal"
  }
}
```

---

## Step 6: Announce Result

After saving:

```markdown
## Profile: {Level}

Based on your answers:
- **Git:** {level} | **Solana:** {level} | **Claude Code:** {level}
- **Project:** {new/existing} {category}, {stack}, {team}

{For beginners: "I'll include extra context as we go through the tools. Don't worry — I'll explain everything."}
{For intermediate: "I'll keep explanations focused. You'll see the full recommended tier."}
{For advanced: "I'll keep it brief. You'll get the full catalog to cherry-pick from."}

Ready for recommendations? Run `/SVK:setup:recommend` or just say "continue" and I'll proceed.
```

---

## Interview Principles

1. **One question at a time.** Don't overwhelm. Use AskUserQuestion for structured choices.
2. **Be welcoming.** This is a new user's first interaction with SVK. Set the tone.
3. **Don't judge.** "New to git" is a valid answer. Adjust the experience, don't gatekeep.
4. **React to answers.** If they've shipped Solana projects, acknowledge it. If they're new, reassure them.
5. **Keep it quick.** The interview should take under 2 minutes. Don't over-explain the questions.
