# SVK Meta Skills

Three meta skills that make SVK self-aware and user-friendly. These operate at the SVK level (not domain-specific like SOS or GL) and help users get set up, understand what's available, and know what to do next.

---

## /SVK:setup — DESIGNING (see docs/plans/2026-02-16-svk-setup-design.md)

Guided onboarding. Interviews the user, recommends tools based on experience level and project scope, installs everything, generates a reference doc. The front door to SVK.

**Status:** Design complete. Implementation in progress (feature/svk-setup worktree).

---

## /SVK:help — TODO

Skill discovery and guidance. Gives a breakdown of every skill inside SVK and how/when to use them.

### Core idea
- Reads all installed SVK skills dynamically (SOS, GL, setup, and any future skills)
- For each skill: name, purpose, available commands, when to use it
- Adapts output based on context — if you're mid-project it highlights what's relevant NOW
- Could include a "quick reference" mode (one-liner per command) vs "detailed" mode (full explanations with examples)

### Design questions to resolve
- Should it also cover non-SVK tools installed via /SVK:setup (GSD, Superpowers, etc.)?
- Interactive (ask what they want to know about) or dump everything at once?
- Should it detect what skills are actually installed vs what's available but not installed?

### Depends on
- A consistent metadata format across all SVK skills (name, description, commands, when-to-use)
- Finalised /SVK:setup so we know the full tool catalog

---

## /SVK:check — TODO

Project health assessment. Scans the project, figures out where things stand, and suggests what to do next.

### Core idea
- Scans the project for indicators: git history, file structure, test coverage, deployed programs, documentation state
- Determines project stage: not started / early development / building / testing / deployment-ready / deployed
- Checks which SVK skills have been used (GL knowledge suites exist? SOS audits run? GSD milestones completed?)
- Checks tool health: are MCPs configured and working? API keys valid?
- Makes contextual suggestions: "You have no security audit — consider running /SOS:scan" or "Your GL knowledge suite is 3 weeks old — consider /GL:update"

### Design questions to resolve
- How deep should the scan go? Quick overview vs comprehensive analysis?
- Should it produce a score/grade or just a checklist?
- Should it track progress over time (compare to last check)?
- What's the output format — conversational summary, markdown report, or both?

### Depends on
- /SVK:setup (knows what tools are installed)
- /SVK:help (knows what skills are available)
- Mature enough SVK ecosystem to have meaningful things to check

### Suggested implementation order
Build this last — it needs the other two skills to exist first, and benefits from having real projects to test against.
