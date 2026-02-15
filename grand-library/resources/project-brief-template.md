---
skill: grand-library
type: template
for: PROJECT_BRIEF.md
max_tokens: 500
description: >
  Template for the project brief — the "constitution" that every agent loads.
  MUST stay under 500 tokens. One-line summaries only.
---

# PROJECT_BRIEF.md Template

```markdown
---
project: "{project_name}"
status: survey_complete | interview_in_progress | interview_complete
mode: greenfield | existing
created: {date}
updated: {date}
topics_completed: []
topics_remaining: []
---

# {Project Name} — Project Brief

## Vision
{One sentence: what is this and why does it exist?}

## Scope
- **In scope (v1):** {bullet list}
- **Out of scope:** {bullet list}

## Architecture
- **Stack:** {e.g., "Next.js frontend, Rust/Anchor on-chain programs, PostgreSQL backend"}
- **Components:** {e.g., "3 on-chain programs, 1 indexer, 1 web app"}
- **Key pattern:** {e.g., "Event-driven with webhook notifications"}

## Decisions
{One line per decision made during interview. Added incrementally.}
- [{topic}] {decision summary}
- [{topic}] {decision summary}

## Open Questions
{Anything flagged NEEDS_VERIFICATION during interview.}
- {question} (flagged in: {topic})
```

### Rules
1. This file must NEVER exceed 500 tokens (~375 words)
2. Every agent in every phase loads this file — it's the constant context
3. New decisions are appended as one-liners during the interview
4. If it bloats past 500 tokens, compact: merge related decisions, shorten wording
