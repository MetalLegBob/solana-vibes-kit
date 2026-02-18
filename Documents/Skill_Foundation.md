# SVK Skill Foundations — Meta Document

**Purpose:** Reference document for planning and building new Solana Vibes Kit skills. Contains extracted patterns from the 5 most effective meta-skills in the Claude Code ecosystem, adapted for Solana/blockchain development workflows.

**How to use:** Read this document BEFORE designing any new SVK skill. Use the patterns as building blocks — most skills will combine 2-3 patterns. The Decision Matrix at the end maps common skill types to which patterns they should use.

---

## The 5 Foundation Patterns

| # | Pattern | Source | Core Idea |
|---|---------|--------|-----------|
| 1 | Thin Orchestrator | GSD (get-shit-done) | Never do heavy work in the main context. Spawn subagents, wait, integrate. |
| 2 | Signal-Based Indexing | Supermemory / claude-mem | Don't load everything. Index first, identify relevance, fetch only what matters. |
| 3 | Adversarial Multi-Perspective | Trail of Bits / AgentShield | Multiple agents examine the same thing from different angles, then synthesise. |
| 4 | Progressive Disclosure | Anthropic / Manus | 3-level loading: metadata → instructions → resources. Only pay for what you use. |
| 5 | Structured Handoff Notes | GSD / Manus | Agents communicate via structured files with frontmatter, not raw conversation. |

---

## Pattern 1: Thin Orchestrator

**Source:** GSD (get-shit-done) by glittercowboy — 699 stars, used by engineers at Amazon, Google, Shopify

### The Problem It Solves

Claude Code context windows are 200k tokens. Quality degrades predictably:
- 0-30% context: Peak quality — thorough, comprehensive
- 30-50% context: Good quality — confident, solid
- 50-70% context: Degrading — corner-cutting, rushing
- 70%+: Poor — minimal, unreliable

Any skill that does significant work (security audit, codebase analysis, test generation) will blow past 50% in a single session if you don't manage this.

### The Pattern

```
ORCHESTRATOR (stays at 15-30% context)
│
├── Reads task definitions (frontmatter only, ~25 lines each)
├── Computes dependency graph / wave assignments
├── Spawns subagents for actual work
├── Collects structured results (SUMMARY files)
├── Integrates and produces final output
│
├── SUBAGENT 1 (fresh 200k context)
│   ├── Receives: task definition + relevant prior summaries
│   ├── Does: actual heavy work
│   ├── Produces: structured SUMMARY with frontmatter
│   └── Exits (context freed)
│
├── SUBAGENT 2 (fresh 200k context, parallel if no dependency)
│   └── Same pattern
│
└── SUBAGENT N...
```

### Key Implementation Rules

**Rule 1 — Aggressive Atomicity:** Each subagent gets 2-3 tasks maximum. Target 50% context usage per subagent. Better to spawn 10 small agents than 2 bloated ones.

**Rule 2 — Wave-Based Parallelization:** Before spawning, analyse dependencies. Group independent tasks into waves. All tasks in Wave 1 run concurrently. Wave 2 waits for Wave 1, then runs concurrently. This is pre-computed during planning, NOT decided at runtime.

```
Wave assignment fields in task frontmatter:
---
wave: 1
depends_on: []
files_modified: [programs/amm/src/lib.rs]
provides: [amm-architecture-map]
requires: []
---
```

**Rule 3 — Orchestrator Never Does Heavy Lifting:** The orchestrator reads frontmatter, spawns agents, collects results. It never reads full files, never analyses code, never writes output directly. If you catch the orchestrator doing real work, your design is wrong.

**Rule 4 — Fresh Context Per Execution:** Each subagent starts with zero conversation history. It loads only: (a) the task definition, (b) essential project context, (c) 2-4 relevant prior summaries identified by frontmatter scanning. This prevents context rot across the full pipeline.

### SVK Application

This pattern is the backbone of any multi-phase SVK skill. Examples:
- **SOS (security audit):** Orchestrator spawns 10+ focus area agents in parallel, collects findings, spawns investigation agents, synthesises report
- **CPI Mapper:** Orchestrator identifies all programs, spawns per-program analysis agents, collects results, spawns cross-program dependency mapper
- **Token Launchpad:** Orchestrator sequences: mint creation → metadata → pool setup → hook configuration → verification

### Template: Orchestrator Agent Prompt

```markdown
You are a THIN ORCHESTRATOR. Your only job is coordination.

RULES:
1. NEVER read full source files. Only read frontmatter/headers.
2. NEVER write code or analysis directly.
3. ALWAYS delegate work to subagents via Task().
4. TRACK progress in STATE.md (update after each subagent completes).
5. TARGET: Stay below 30% context usage at all times.

WORKFLOW:
1. Read task definitions from .planning/ directory (frontmatter only)
2. Compute wave assignments based on depends_on and files_modified
3. For each wave:
   a. Spawn all independent tasks as parallel subagents
   b. Wait for all to complete
   c. Collect SUMMARY files
   d. Update STATE.md
4. After all waves: synthesise final output from summaries
```

### Template: Subagent Prompt

```markdown
You are a FOCUSED EXECUTION AGENT. You have one job.

CONTEXT PROVIDED:
- Task definition: [TASK.md]
- Project context: [PROJECT.md] (skim only, ~200 lines)
- Prior relevant work: [SUMMARY files listed below]

YOUR TASK:
[Specific task description from frontmatter]

OUTPUT REQUIREMENTS:
Write a SUMMARY.md file with this frontmatter:
---
task_id: [from task definition]
status: completed | failed | partial
subsystem: [which part of the codebase]
key_findings: [bullet list, max 5]
files_analysed: [list]
files_modified: [list]
provides: [what downstream tasks can use]
confidence: [1-10]
---

[Detailed findings below frontmatter]

RULES:
- Do NOT deviate from the task definition
- Do NOT attempt work outside your scope
- If you encounter something outside scope, note it in findings and move on
- Commit after each completed task with descriptive message
```

---

## Pattern 2: Signal-Based Indexing

**Source:** Supermemory (SaaS) + claude-mem (local) + obra/episodic-memory. Core technique extracted without SaaS dependency.

### The Problem It Solves

Solana programs are big. A 5-program protocol like Fraudsworth is ~27,000 lines across ~95 files. You can't load all of it into context. But agents need to find relevant code quickly. Naive grep is too noisy. Manual file selection doesn't scale.

### The Pattern

Three-layer token-efficient search:

```
Layer 1: INDEX (tiny, always loaded)
├── File manifest with metadata per file (~2 lines each)
├── Total cost: ~500-1000 tokens for full project
│
Layer 2: RELEVANCE SCAN (medium, loaded on demand)  
├── Expanded metadata for files matching query
├── Function signatures, struct definitions, key constants
├── Total cost: ~200-500 tokens per relevant file
│
Layer 3: FULL CONTENT (expensive, loaded only when needed)
├── Actual source code for specific functions/sections
├── Total cost: varies, but targeted to exact lines needed
```

### Key Implementation Rules

**Rule 1 — Build the Index First:** Before any analysis skill starts work, it should generate an index. This is a one-time cost that pays for itself many times over. The index lives as a file artifact and persists across subagents.

```markdown
INDEX.md format:
---
generated: 2026-02-13
project: dr-fraudsworth
total_files: 95
total_loc: 27000
---

## programs/amm/src/instructions/swap.rs
- LOC: 450
- Key structs: SwapAccounts, SwapParams
- Key functions: process_swap, calculate_output
- External calls: token_program::transfer, system_program::transfer
- Risk markers: unchecked arithmetic (0), raw AccountInfo (2), CPI calls (3)

## programs/tax-program/src/instructions/swap_sol_buy.rs
- LOC: 420
- Key structs: SwapSolBuyAccounts
- Key functions: swap_sol_buy, distribute_tax
- External calls: amm_program::swap, staking_program::deposit_rewards
- Risk markers: unchecked arithmetic (0), raw AccountInfo (5), CPI calls (4)
```

**Rule 2 — Signal Keywords:** Not everything is worth indexing deeply. Define signal keywords that trigger deeper capture. For Solana security: `AccountInfo`, `invoke_signed`, `invoke`, `unchecked`, `unsafe`, `system_instruction::transfer`, `seeds`, `bump`, `authority`, `signer`. For economics: `fee`, `tax`, `reward`, `stake`, `burn`, `mint`, `pool`, `reserve`.

**Rule 3 — Three-Layer Search Protocol:**
1. Agent receives a question/task
2. Agent reads INDEX.md (always available, cheap)
3. Agent identifies 3-8 relevant files from index metadata
4. Agent reads expanded summaries for those files (Layer 2)
5. Agent loads full source ONLY for specific functions it needs (Layer 3)
6. Agent never loads files it didn't identify as relevant in steps 3-4

**Rule 4 — Compact Stale Results (from Manus):** As a long-running skill progresses, replace full tool outputs with file path references. Keep recent results in full (for the current decision), but older results become pointers. This is how you prevent context from growing monotonically.

```
Before compaction:
  Turn 5 result: [450 lines of swap.rs analysis]
  Turn 12 result: [300 lines of staking.rs analysis]
  Turn 15 result: [200 lines of epoch.rs analysis]  ← current

After compaction:
  Turn 5 result: "See .analysis/swap_analysis.md for full results. Key: 2 raw AccountInfo gaps found."
  Turn 12 result: "See .analysis/staking_analysis.md. Key: phantom reward vector confirmed."
  Turn 15 result: [200 lines of epoch.rs analysis]  ← current, kept in full
```

### SVK Application

Every SVK skill that reads code should use this pattern:
- **SOS:** Index → identify hot files by risk markers → deep-dive only on high-risk functions
- **CPI Mapper:** Index → identify all CPI call sites → trace only relevant cross-program flows
- **Account Debugger:** Index → match account type → load only the struct definition and validation logic
- **Economics Simulator:** Index → identify all fee/tax/reward constants → load only parameter definitions

### Template: Index Generator Prompt

```markdown
You are an INDEX BUILDER. Scan the project and produce a structured index.

For each source file in programs/**/src/**/*.rs:
1. Count lines of code
2. Extract: struct names, function names, constant names
3. Identify external calls (CPI invocations, system program calls)
4. Count risk markers:
   - raw AccountInfo<'info> without constraints
   - invoke / invoke_signed calls
   - system_instruction::transfer calls  
   - unchecked arithmetic (no checked_* or saturating_*)
   - seeds/bump derivations
5. Tag with subsystem: [amm | tax | epoch | staking | transfer-hook]

Output: INDEX.md with the standard format.
Do NOT read file contents beyond what's needed to extract the above.
Do NOT analyse or make judgments — just index.
```

---

## Pattern 3: Adversarial Multi-Perspective Analysis

**Source:** Trail of Bits skills (15+ security skills, CC-BY-SA-4.0) + AgentShield (red-team/blue-team/auditor pipeline)

### The Problem It Solves

A single agent examining code from one perspective misses things. This is the fundamental lesson from software security: the developer who wrote the code is the worst person to find bugs in it, because they share the same mental model. AI agents have the same problem — a single prompt biases the agent toward certain finding types.

### The Pattern

Multiple agents examine the same codebase through different lenses, then a synthesis agent resolves conflicts and identifies emergent threats:

```
PERSPECTIVE AGENTS (parallel, independent, no cross-talk)
│
├── Access Control Agent
│   └── "Who can call what? What permissions are checked? What's missing?"
│
├── Arithmetic Safety Agent  
│   └── "Where can numbers overflow? What rounding exists? What precision is lost?"
│
├── CPI & External Calls Agent
│   └── "What crosses program boundaries? What privileges propagate? What's validated?"
│
├── State Machine Agent
│   └── "What are the valid states? Can invalid transitions occur? What's the lifecycle?"
│
├── Economic Model Agent
│   └── "Where does value flow? What incentives exist? What can be gamed?"
│
├── Oracle & External Data Agent
│   └── "What external data is trusted? How is it validated? Can it be spoofed?"
│
├── ... (as many perspectives as the domain requires)
│
SYNTHESIS AGENT (runs after all perspective agents complete)
├── Reads all perspective findings
├── Identifies contradictions (Agent A says safe, Agent B says vulnerable)
├── Identifies COMBINATION attacks (findings from different agents that interact)
├── Produces N×N interaction matrix
├── Re-calibrates severity based on combinations
└── Produces final unified report
```

### Key Implementation Rules

**Rule 1 — Independence Is Critical:** Perspective agents must NOT see each other's findings during analysis. If Agent A knows Agent B found a vulnerability, it biases Agent A toward confirming rather than independently discovering. Run all perspective agents from the same starting point with no shared state.

**Rule 2 — Structured Finding Format:** Every perspective agent outputs findings in the same schema. This is what makes synthesis possible. Without a consistent format, the synthesis agent spends all its context parsing instead of analysing.

```yaml
Finding format:
---
finding_id: [perspective]-[number]
perspective: access-control
title: "Unvalidated treasury account in swap instruction"
severity: CRITICAL | HIGH | MEDIUM | LOW | INFO
confidence: 1-10
affected_files:
  - file: programs/tax-program/src/instructions/swap_sol_buy.rs
    lines: [387, 400]
root_cause: "AccountInfo<'info> with only #[account(mut)], no PDA/address constraint"
exploit_path: "Transaction builder substitutes attacker wallet for treasury"
impact: "1% of all tax revenue redirectable per swap"
blocking_factors: []  # What prevents exploitation
enabling_factors: ["permissionless instruction", "no off-chain validation"]
fix_recommendation: "Add address constraint: #[account(mut, address = expected_treasury())]"
fix_effort: "1-2 hours"
related_to: []  # IDs of findings this interacts with (filled by synthesis)
---
```

**Rule 3 — Synthesis Is Where the Magic Happens:** The synthesis agent's job is NOT to summarise. It's to find EMERGENT THREATS — combinations of findings from different perspectives that create attack paths neither perspective would find alone. The N×N interaction matrix is the key output.

**Rule 4 — Variant Analysis (from Trail of Bits):** When one vulnerability is found, immediately search for the same pattern elsewhere. If `treasury` is an unvalidated AccountInfo in `swap_sol_buy.rs`, check EVERY other instruction that takes a treasury/escrow/vault account. This is what Trail of Bits calls "variant analysis" and it's how they found that the same pattern repeated in 7 instruction files in Fraudsworth.

### SVK Application

This pattern is the core of SOS but can be adapted for:
- **Economics Auditor:** Multiple agents model tokenomics from different actor perspectives (whale, retail, arb bot, staker, attacker)
- **Upgrade Safety Check:** One agent analyses state changes, another analyses account layout changes, another analyses CPI interface changes, synthesis identifies breaking combinations
- **Game Theory Analyzer:** Agents model different strategies, synthesis identifies Nash equilibria and dominant strategies

### Template: Perspective Agent Prompt

```markdown
You are a [PERSPECTIVE NAME] specialist. You examine Solana/Anchor code
EXCLUSIVELY through the lens of [perspective description].

You are ONE of multiple independent agents examining this codebase.
Do NOT attempt to analyse areas outside your specialty.
Do NOT make assumptions about what other agents will find.

YOUR LENS: [Detailed description of what this perspective looks for]

For every finding, output in the standard finding format (see schema).
Rate confidence honestly — 10 means "I have code evidence proving this."
5 means "This looks suspicious but I can't fully confirm."

When in doubt, report the finding with lower confidence rather than
omitting it. The synthesis agent will resolve false positives.

CRITICAL: If you find a vulnerability, IMMEDIATELY search for the same 
pattern in every other file in the codebase (variant analysis). Report 
all instances as separate findings linked by root_cause.
```

### Template: Synthesis Agent Prompt

```markdown
You are a SYNTHESIS AGENT. You receive findings from N independent 
perspective agents. Your job is to find what NONE of them could find alone.

INPUT: All finding files from all perspective agents.

WORKFLOW:
1. Deduplicate: Group findings with the same root cause
2. Validate: Cross-check findings between perspectives
   - If Access Control says "no check" and State Machine says "check exists" → investigate
3. Combination Analysis: For each pair of findings from DIFFERENT perspectives:
   - Can they be exploited together?
   - Does combining them amplify impact?
   - Does one enable the other?
4. Build N×N interaction matrix:
   - A = Amplified (emergent damage exceeds sum)
   - + = Additive (combined impact = sum)
   - - = No interaction
5. Identify attack chains: sequences of findings that create full exploit paths
6. Re-calibrate severity: a MEDIUM finding that enables a CRITICAL chain becomes CRITICAL
7. Identify Critical Fix Nodes: minimum set of fixes that break maximum attack paths

OUTPUT: Final report with:
- Deduplicated findings with assigned primary/duplicate status
- Combination attack analysis with chains
- N×N interaction matrix
- Critical fix nodes with attack paths broken per fix
- Severity re-calibration table
```

---

## Pattern 4: Progressive Disclosure

**Source:** Anthropic's official skill architecture + Manus context engineering

### The Problem It Solves

If you have 10 SVK skills installed and each is 5,000 tokens of instructions, that's 50,000 tokens loaded before the user even asks a question. That's 25% of context wasted on instructions for skills that might not be relevant.

### The Pattern

Three levels of loading, each triggered only when needed:

```
Level 0: FRONTMATTER (~100 tokens per skill)
├── Always loaded when Claude starts
├── Just name + description
├── Claude uses this to decide IF a skill is relevant
│
Level 1: SKILL.md BODY (~2,000-5,000 tokens per skill)  
├── Loaded when Claude determines the skill applies
├── Contains: workflow steps, rules, output formats
├── Enough to execute the skill for simple tasks
│
Level 2: BUNDLED RESOURCES (variable, on-demand)
├── Loaded only when explicitly needed during execution
├── Examples: exploit pattern databases, Solana-specific checklists,
│   reference implementations, template files
├── Agent reads specific files as needed, never loads all at once
```

### Key Implementation Rules

**Rule 1 — Frontmatter Is Your Elevator Pitch:** Claude decides whether to load your skill based on ~100 tokens. Make them count. Be specific about WHEN this skill should activate.

```yaml
# GOOD frontmatter — short name, specific triggers
---
name: SOS
description: >
  Stronghold of Security: Adversarial security audit for Solana/Anchor smart contracts.
  Use when: security audit requested, vulnerability scan needed,
  pre-deployment review, code safety check.
  Covers: account validation, CPI safety, arithmetic, state machines,
  oracle trust, economic model attacks.
  Run /SOS for a getting-started guide, or /SOS:scan to begin.
---

# BAD frontmatter — long name forces verbose commands, vague description
---
name: stronghold-of-security
description: Checks code for security issues
---
```

**Rule 2 — SKILL.md Is Self-Contained for Simple Cases:** A user should be able to get value from the skill without Level 2 resources loading. SKILL.md contains the complete workflow logic. Resources enhance it, they don't replace it.

**Rule 3 — Resources Are Indexed, Not Bulk-Loaded:** If your skill has a 128-pattern exploit database, don't load all 128 patterns. Create an index file that lists pattern names and categories (~500 tokens). The agent loads specific patterns as needed during execution.

```
resources/
├── PATTERNS_INDEX.md          ← Agent reads this first (500 tokens)
├── patterns/
│   ├── account-validation/
│   │   ├── missing-owner-check.md
│   │   ├── missing-signer-check.md
│   │   └── pda-seed-collision.md
│   ├── cpi-safety/
│   │   ├── privilege-escalation.md
│   │   ├── program-substitution.md
│   │   └── return-value-unchecked.md
│   └── ...
```

**Rule 4 — Skill Composition:** Multiple skills can activate simultaneously. Design skills to be composable — they should not conflict with each other. Use clear namespace prefixes for any files your skill creates.

### SVK Application

Every SVK skill MUST use this pattern. It's not optional — it's how you make a kit of 10+ skills viable without drowning in context.

### Template: Skill Directory Structure

```
my-skill/
├── SKILL.md                    # Level 0 (frontmatter) + Level 1 (body)
├── resources/
│   ├── INDEX.md                # Level 2 entry point — always read first
│   ├── checklists/             # Loaded per-category as needed
│   ├── patterns/               # Loaded per-pattern as needed
│   └── templates/              # Loaded when generating output
├── scripts/                    # Executable helpers (if needed)
│   └── index_builder.py
└── agents/                     # Subagent definitions (if multi-agent)
    ├── orchestrator.md
    ├── perspective-access-control.md
    ├── perspective-arithmetic.md
    └── synthesis.md
```

---

## Pattern 5: Structured Handoff Notes

**Source:** GSD's SUMMARY.md system + Manus compact-stale-results

### The Problem It Solves

When subagent A finishes and subagent B starts, B needs to know what A found — but B can't read A's entire conversation history (it was in a separate context window). You need a structured way to pass knowledge between agents that is both compact and complete.

### The Pattern

Every agent produces a structured output file with machine-readable frontmatter and human-readable body:

```
AGENT A completes → writes SUMMARY-A.md
                            │
ORCHESTRATOR reads frontmatter of SUMMARY-A.md (25 lines)
                            │
ORCHESTRATOR decides SUMMARY-A is relevant to Agent C's task
                            │
AGENT C starts → receives SUMMARY-A.md as input context
```

### Key Implementation Rules

**Rule 1 — Frontmatter Is the API, Body Is the Documentation:** The orchestrator reads ONLY frontmatter to decide routing. The receiving agent reads the full body for details. This means frontmatter must contain everything needed for routing decisions.

**Rule 2 — Standard Fields Across All SVK Skills:**

```yaml
---
# IDENTITY
skill: stronghold-of-security    # Which SVK skill produced this
task_id: sos-phase2-cpi-analysis # Unique task identifier
agent_type: perspective           # orchestrator | perspective | synthesis | execution

# CONTENT
subsystem: tax-program            # Which part of the codebase
scope: [swap_sol_buy.rs, swap_sol_sell.rs, swap_exempt.rs]
finding_count: 7
severity_breakdown: {critical: 2, high: 3, medium: 1, low: 1}

# DEPENDENCIES  
provides: [cpi-target-validation-findings, privilege-escalation-map]
requires: []
depends_on: []

# KEY OUTPUTS (most important items, max 5)
key_findings:
  - "amm_program AccountInfo unvalidated in 5 instruction files"
  - "CPI privilege propagation enables carnage fund drain"
key_files: [programs/tax-program/src/instructions/swap_sol_buy.rs]

# METADATA
confidence: 9
execution_time: "4 minutes"
context_usage: "38%"
status: completed
---
```

**Rule 3 — Immutability:** Once written, summary files are NEVER modified. If new information emerges, write a NEW summary that references the old one. This prevents state corruption and makes the full audit trail recoverable.

**Rule 4 — Relevance Matching:** The orchestrator matches `provides` fields against `requires` fields to determine which summaries to pass to which agents. Agent C with `requires: [cpi-target-validation-findings]` gets SUMMARY-A if SUMMARY-A has `provides: [cpi-target-validation-findings]`. This is automatic, not manual.

### SVK Application

This pattern is the communication protocol between all agents in any multi-phase SVK skill. It's also how skills communicate with EACH OTHER — if the CPI Mapper runs before SOS, SOS can read the CPI Mapper's summaries.

---

## Decision Matrix: Which Patterns for Which Skill?

| SVK Skill | Thin Orchestrator | Signal Indexing | Adversarial Multi-Perspective | Progressive Disclosure | Structured Handoff |
|-----------|:-:|:-:|:-:|:-:|:-:|
| **SOS (security audit)** | ✅ Core | ✅ Core | ✅ Core | ✅ Required | ✅ Core |
| **CPI Mapper** | ✅ Core | ✅ Core | ○ Optional | ✅ Required | ✅ Core |
| **Token Launchpad** | ✅ Core | ○ Optional | ○ Not needed | ✅ Required | ✅ Core |
| **Economics Simulator** | ○ Optional | ○ Optional | ✅ Core | ✅ Required | ○ Optional |
| **Account Debugger** | ○ Not needed | ✅ Core | ○ Not needed | ✅ Required | ○ Not needed |
| **Test Generator** | ✅ Core | ✅ Core | ○ Optional | ✅ Required | ✅ Core |
| **Devnet Deploy** | ✅ Core | ○ Not needed | ○ Not needed | ✅ Required | ✅ Core |
| **Migration Planner** | ✅ Core | ✅ Core | ✅ Core | ✅ Required | ✅ Core |

**Legend:** ✅ Core = essential, design around this pattern. ○ Optional = use if complexity warrants it. ○ Not needed = skip for this skill type.

---

## Anti-Patterns: What NOT To Do

### Anti-Pattern 1: The God Agent
**Symptom:** Single agent prompt that says "analyse the entire codebase for security issues, generate tests, create documentation, and deploy."
**Why it fails:** Context fills to 90% before meaningful analysis begins. Quality degrades. Findings get shallow and generic.
**Fix:** Use Pattern 1 (Thin Orchestrator). Break into phases. Each subagent does ONE thing well.

### Anti-Pattern 2: Load Everything
**Symptom:** Skill starts by reading every source file into context "for completeness."
**Why it fails:** 27,000 lines of code = ~80,000 tokens. That's 40% of context before any analysis. Agent has no room to think.
**Fix:** Use Pattern 2 (Signal Indexing). Build index first. Load files on demand. Never load what you don't need.

### Anti-Pattern 3: Serial Everything
**Symptom:** Agent analyses file 1, then file 2, then file 3... in sequence. Each analysis is in the same context window.
**Why it fails:** By file 15, the agent has forgotten what it found in file 1. Context rot accumulates. Findings become inconsistent.
**Fix:** Use Pattern 1 (Thin Orchestrator) with wave parallelization. Independent analyses run in parallel with fresh contexts.

### Anti-Pattern 4: Unstructured Output
**Symptom:** Agents produce free-form text findings. Synthesis agent has to parse natural language to find structure.
**Why it fails:** Synthesis agent wastes 50%+ of its context parsing instead of analysing. Deduplication becomes guesswork.
**Fix:** Use Pattern 5 (Structured Handoff). Enforce schemas. Frontmatter is the API. Body is the documentation.

### Anti-Pattern 5: Monolithic Skill
**Symptom:** Single SKILL.md file that's 8,000 tokens long with every possible instruction.
**Why it fails:** Loads fully every time the skill activates, even for simple queries. Competes with other skills for context space.
**Fix:** Use Pattern 4 (Progressive Disclosure). Keep SKILL.md to ~2,000-3,000 tokens. Move detailed checklists, pattern databases, and reference material into indexed resources.

---

## Combining Patterns: SOS as Reference Implementation

SOS (Stronghold of Security) uses ALL 5 patterns. Here's how they layer:

```
1. PROGRESSIVE DISCLOSURE (Pattern 4)
   └── User asks for security audit
   └── Claude reads SOS frontmatter (~100 tokens) → decides to activate
   └── Claude loads SKILL.md body (~3,000 tokens) → gets workflow

2. SIGNAL-BASED INDEXING (Pattern 2)
   └── Phase 0: Build INDEX.md of the codebase
   └── Identify hot files by risk markers
   └── Resources: Load exploit pattern INDEX, not all 128 patterns

3. THIN ORCHESTRATOR (Pattern 1)
   └── Phase 1: Orchestrator spawns 10 perspective agents (Wave 1, parallel)
   └── Each perspective agent gets: INDEX.md + its assigned files (Layer 3)
   └── Orchestrator stays at ~20% context

4. ADVERSARIAL MULTI-PERSPECTIVE (Pattern 3)
   └── Phase 1 agents: Access Control, Arithmetic, CPI, State Machine, etc.
   └── Each analyses independently, produces structured findings
   └── Phase 2: Synthesis agent reads all findings, builds combination matrix

5. STRUCTURED HANDOFF (Pattern 5)
   └── Every agent outputs SUMMARY.md with standard frontmatter
   └── Orchestrator routes by provides/requires matching
   └── Phase 2 investigation agents receive relevant Phase 1 summaries
   └── Final report synthesis receives all investigation summaries
```

This is why SOS can audit 27,000 lines across 5 programs in ~8 hours of automated work without quality degradation. The patterns compound.

---

## Quick-Start Checklist for New SVK Skills

When building a new skill, answer these in order:

- [ ] **Scope:** What exactly does this skill do? (One sentence.)
- [ ] **Trigger:** When should Claude activate this skill? (Be specific.)
- [ ] **Complexity:** Is this a single-agent or multi-agent workflow?
  - Single agent: Skip Pattern 1, use Patterns 2+4+5
  - Multi-agent: Use all 5 patterns
- [ ] **Input:** What does the skill need? (Codebase? Specific files? User parameters?)
- [ ] **Indexing:** Does the skill need to search a codebase? If yes, define signal keywords.
- [ ] **Perspectives:** Does the skill benefit from multiple analysis angles? If yes, define perspectives.
- [ ] **Output:** What does the skill produce? (Report? Files? Deployed code? Test suite?)
- [ ] **Handoff:** Will this skill's output be consumed by other skills? If yes, define the provides schema.
- [ ] **Directory structure:** Follow the template from Pattern 4.
- [ ] **Frontmatter:** Write the ~100-token elevator pitch FIRST.

---

## SVK Command Structure

Every SVK skill follows a two-tier command convention:

- `/skill-name` — Runs the full workflow (thin orchestrator sequences all phases)
- `/skill-name:phase` — Runs a specific phase independently

This is progressive disclosure applied to the UX. Users don't need to understand the full pipeline to get value from a single phase. The top-level command is just the orchestrator that sequences the sub-commands.

### Examples

```
/sos                      → full security audit
/sos:index                → build codebase index only
/sos:scan                 → static pre-scan (semgrep/grep)
/sos:analyse              → spawn perspective agents
/sos:investigate          → spawn investigation agents for confirmed findings
/sos:synthesise           → combination analysis + final report

/grand-exchange           → full token launch workflow
/grand-exchange:mint      → create Token-2022 mint
/grand-exchange:meta      → attach metadata
/grand-exchange:hooks     → configure transfer hooks
/grand-exchange:pool      → seed liquidity pools
/grand-exchange:verify    → verify on-chain state matches spec

/fairy-ring               → full CPI map
/fairy-ring:index         → build program index
/fairy-ring:trace         → trace cross-program calls
/fairy-ring:graph         → generate dependency visualisation

/barrows                  → full test generation
/barrows:scaffold         → generate Bankrun test structure
/barrows:edge-cases       → identify and generate edge case tests
/barrows:run              → execute and report
```

### Design Rules

1. **Every sub-command is independently useful.** A user running `/SOS:index` gets a complete codebase index they can use for other purposes, not a half-finished artifact that only makes sense inside the full pipeline.

2. **The full command is just orchestration.** `/SOS` internally calls `/SOS:index` → `/SOS:scan` → `/SOS:analyse` → `/SOS:investigate` → `/SOS:synthesise` in sequence, passing structured handoff notes between phases. No magic — just sequencing.

3. **Sub-commands respect the handoff protocol.** Each phase reads prior phase summaries via frontmatter matching (Pattern 5) and writes its own summary. This means phases can be re-run independently if a prior phase's output already exists.

4. **Naming convention:** Skill names are RuneScape-themed. Sub-commands are descriptive English. The theming makes skills memorable; the plain sub-commands make them usable.

5. **CRITICAL — The `name` field in SKILL.md IS the command prefix.** Claude Code routes slash commands as `/<skill-name>:<command-filename>`. The `name` field in SKILL.md determines the prefix users actually type. If your skill is called `stronghold-of-security`, users must type `/stronghold-of-security:scan` — not the `/SOS:scan` you documented. **Always use the short abbreviation as the `name` field** (e.g., `SOS`, `GL`, `SVK-setup`), and keep the full thematic name in the `description` field instead.

---

## References

| Source | URL | What to Extract |
|--------|-----|-----------------|
| GSD | github.com/glittercowboy/get-shit-done | Orchestration, wave parallelization, context zones |
| GSD DeepWiki | deepwiki.com/glittercowboy/get-shit-done | Architecture deep-dive, file formats |
| Supermemory | github.com/supermemoryai/claude-supermemory | Signal extraction, hybrid memory, 3-layer search |
| Trail of Bits | github.com/trailofbits/skills | Variant analysis, fix verification, audit-context-building |
| Manus Context Engineering | rlancemartin.github.io/2025/10/15/manus/ | Compact stale results, sub-agent context sharing |
| Context Engineering Skills | github.com/muratcankoylan/Agent-Skills-for-Context-Engineering | Progressive disclosure formalization, context budgeting |
| obra/superpowers | github.com/obra/superpowers | Episodic memory, brainstorm/plan/execute pipeline |
| everything-claude-code | github.com/affaan-m/everything-claude-code | Strategic compact, token optimization, cost management |
| Anthropic Skills Docs | claude.com/blog/skills-explained | Official progressive disclosure architecture |

---

*This document is v1.0. Update as new patterns emerge or SVK skills reveal improvements to the foundations.*