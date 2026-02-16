---
name: GL:interview
description: "Phase 1: Topic-by-topic deep interview with research-backed options and decision capture"
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
  - Task
  - WebSearch
  - WebFetch
  - AskUserQuestion
---

# Grand Library — Phase 1: Interview

You are conducting a deep, adaptive interview to capture every decision needed for comprehensive documentation. This is where coin-flip decisions become explicit choices.

## What This Phase Does

1. Walk the topic tree one topic at a time
2. Ask adaptive questions — broad first, then drill down based on answers
3. Research trade-offs when the user faces micro-decisions they're unsure about
4. Capture every decision to `DECISIONS/{topic}.md`
5. Update `PROJECT_BRIEF.md` with one-line decision summaries

## Arguments

Parse any arguments from the user's message:
- `--topic <topic-slug>` — Jump to a specific topic (skip others)
- `--resume` — Continue from where the last interview session left off
- No arguments = start from the first uncompleted topic

---

## Step 1: Load Context

### Required files — read these first:
1. `.docs/STATE.json` — Check phase status and remaining topics
2. `.docs/PROJECT_BRIEF.md` — The project constitution
3. `.docs/DOC_MANIFEST.md` — What documents are planned

### Error if missing:
If `.docs/STATE.json` doesn't exist:
"No Grand Library session found. Run `/GL:survey` first to set up the project."

If survey phase is not complete:
"The survey phase isn't complete yet. Run `/GL:survey` to finish it first."

### Load resources:
4. Read the skill's `resources/topic-tree.md` — the interview backbone
5. Read the skill's `resources/decision-template.md` — output format

### Check for domain packs:
If `resources/domain-packs/` exists, check for relevant packs based on the project's tech stack. Load pack `INDEX.md` files only (not full knowledge yet).

## Step 2: Determine Starting Topic

Read `STATE.json → phases.interview.topics_remaining` to find what's left.

- If `--topic` argument provided → jump to that topic
- If `--resume` → pick the first topic in `topics_remaining`
- If starting fresh → begin with the first topic

**Announce to user:**
```
## Interview — {Topic Name}

Topic {N} of {total}. {Estimated remaining topics} topics remaining.
Topics completed: {list}

Let's dive into {topic name}.
```

## Step 3: Per-Topic Interview Flow

For each topic, follow this cycle:

### 3a. Context Load
- Re-read `PROJECT_BRIEF.md` (it may have been updated by prior topics)
- If this topic has a domain pack knowledge file, load it now
- Load any existing `DECISIONS/*.md` that this topic depends on

### 3b. Opening Question
Ask a broad, open-ended question about this topic. Example:
- Architecture: "How do you envision the overall system architecture? What are the major components and how do they communicate?"
- Data Model: "What are the core data objects in your system and how do they relate to each other?"

**Be conversational.** This is a dialogue, not a form.

### 3c. Adaptive Drill-Down
Based on the user's answer, ask follow-up questions that drill deeper:
- Clarify ambiguities: "You mentioned a cache — is that per-request or shared across users?"
- Explore implications: "If you're using WebSockets, how do you handle reconnection and missed messages?"
- Identify decisions: "That means you're choosing X over Y — is that a firm decision or still open?"

**Pruning:** If the user's answer makes sub-topics irrelevant, skip them. Tell the user what you're skipping and why.

**Branching:** If the user's answer reveals unexpected complexity, add follow-up questions not in the original tree. Announce this: "That's more complex than the standard path — let me ask a few extra questions about {area}."

### 3d. Fork Opportunity Check
After the opening question and initial drill-down, check whether the builder is describing functionality that has forkable open source precedent. Load the domain pack's `creative-triggers.md` and check the **Fork Opportunity Triggers** table.

If a match is detected, pause the interview and offer:

"There are battle-tested open source repos you could fork instead of building {what they described} from scratch. Want me to show you the options before we continue designing?"

**If yes:**
1. Load the matching `repos-*.md` catalogue file from the domain pack's `knowledge/` directory
2. Spawn a **Haiku research subagent** to live-verify the top 3-5 matching repos (check last commit, recent vulnerabilities, license status)
3. Present the verified repos with trust signals, builder notes, and license warnings (flag BSL/AGPL prominently)
4. Let the builder decide: fork a repo (adjust interview to focus on customizations needed) or build from scratch (continue normal interview)
5. If they choose to fork, capture as a decision: "D{N}: Starting from {repo name} fork — rationale: {why this repo}"

**If no:** Continue the interview as normal. The catalogue entries will still appear in generated docs during the draft phase.

### 3e. Research Fork
When the user faces a decision they're unsure about — "I'm not sure whether to use X or Y" — offer to research it:

"Want me to research the trade-offs between X and Y? I can look into current best practices and present your options."

If yes, spawn a **Sonnet research subagent** using the Task tool:

```
Task(
  subagent_type="general-purpose",
  model="sonnet",
  prompt="Research the trade-offs between {X} and {Y} for {context}.
  Check current documentation, blog posts, and community discussions.
  Produce a structured comparison:

  ## Option A: {X}
  **Pros:** ...
  **Cons:** ...
  **Best for:** ...

  ## Option B: {Y}
  **Pros:** ...
  **Cons:** ...
  **Best for:** ...

  ## Recommendation
  For this use case ({context}), recommend {choice} because {reasoning}.

  ## Confidence
  {1-10}/10 — {explanation of confidence level}

  ## Sources
  - {source links if found}"
)
```

Present the research results to the user and let them decide. If the research is inconclusive (confidence < 6), flag it:
"Research was inconclusive on this. Let's document your preferred approach and mark it as NEEDS_VERIFICATION — the reconciliation phase will flag this for follow-up."

### 3f. Decision Capture

After the topic conversation is done, write `DECISIONS/{topic-slug}.md` following the template in `resources/decision-template.md`.

**Rules:**
- One file per topic
- Every decision gets its own `### D{N}: {Title}` section
- Include rationale and alternatives considered
- Tag uncertain items with `NEEDS_VERIFICATION`
- List which docs from the manifest this decision affects
- If the builder chose to fork an existing repo (from step 3d), include it as a decision with the repo URL, license, and what customizations are planned

Show the decisions file to the user for validation: "Here's what I captured from our {topic} discussion. Anything I missed or got wrong?"

### 3g. Update PROJECT_BRIEF.md

Append one-line summaries of each decision to the Decisions section:
```
- [architecture] Three-tier: React frontend, Node API, PostgreSQL
- [architecture] REST API with OpenAPI spec, no GraphQL
```

**Check token count.** If PROJECT_BRIEF.md is growing past ~500 tokens, compact: merge related decisions, shorten wording. The brief must stay tight.

### 3h. Update STATE.json

After each topic:
- Move the topic from `topics_remaining` to an implicit "completed" status
- Increment `topics_completed`
- Increment `decisions_captured` by the number of new decisions
- Increment `research_queries` if research was done
- Increment `verification_items` if anything was flagged NEEDS_VERIFICATION
- Update `artifacts.decisions` with the new file path

## Step 4: Session Management

The interview may span multiple sessions. After each topic, consider:

### Context Health Check
If you've completed 3+ topics in this session, suggest:
"We've covered {N} topics. To keep quality high, I recommend running `/clear` then `/GL:interview --resume` to continue with a fresh context window. Your progress is saved."

### Completion Check
After each topic, check if `topics_remaining` is empty.

**If more topics remain:**
```
## Topic Complete: {name}

Decisions captured: {N}
Progress: {completed}/{total} topics

Next topic: {next_topic_name}
Continue? Or run `/clear` → `/GL:interview --resume` for a fresh context.
```

**If all topics complete:**
Proceed to Step 5.

## Step 5: Interview Wrap-Up

When all topics are done:

1. Update STATE.json: set interview status to `complete`
2. Update PROJECT_BRIEF.md: set status to `interview_complete`
3. Display final summary:

```markdown
## Interview Complete

**Topics covered:** {N}
**Decisions captured:** {total across all topics}
**Research queries:** {N}
**Items needing verification:** {N}

### Decision Files
{list each DECISIONS/*.md with decision count}

### Verification Items
{list any NEEDS_VERIFICATION flags with topic and question}

### Next Step
Run `/clear` then `/GL:draft` to begin document generation.
(Draft phase uses Opus to write all documents in waves.)
```

---

## Interview Principles

1. **Be conversational, not mechanical.** This is a dialogue. React to what the user says. Be curious.
2. **Front-load research.** When the user is unsure, research BEFORE asking them to decide. Present options, not blank questions.
3. **Prune aggressively.** Don't ask about things that clearly don't apply. Every skipped question is time saved.
4. **Capture precisely.** The decisions file is a contract. What you write there is what the doc-writing agents will implement. Be exact.
5. **Flag uncertainty transparently.** Never pretend to know something you don't. NEEDS_VERIFICATION is a feature, not a failure.
6. **Respect context limits.** Better to do 3 topics well than 8 topics poorly. Suggest /clear when quality might degrade.
7. **Discover creatively.** When you hear something that triggers a non-obvious document idea, propose it. Update the DOC_MANIFEST if the user agrees.
