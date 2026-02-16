---
skill: grand-library
type: template
for: DECISIONS/*.md
description: >
  Template for per-topic decision files produced during the interview.
  Each topic gets one file. These are the detailed records that doc-writing
  agents consume during Phase 2.
---

# DECISIONS/{topic-slug}.md Template

```markdown
---
topic: "{Topic Name}"
topic_slug: "{topic-slug}"
status: complete | partial | needs_verification
interview_date: {date}
decisions_count: {N}
provides: ["{topic-slug}-decisions"]
requires: []
verification_items: []
---

# {Topic Name} — Decisions

## Summary
{2-3 sentence overview of what was decided in this topic.}

## Decisions

### D1: {Decision Title}
**Choice:** {What was decided}
**Rationale:** {Why — user's reasoning or research-backed recommendation}
**Alternatives considered:** {What else was on the table}
**Affects docs:** [{doc-ids from manifest that need this decision}]

### D2: {Decision Title}
...

## Open Questions
{Anything the user wasn't sure about. Tagged NEEDS_VERIFICATION.}
- [ ] {Question} — confidence: {low|medium}, source: {interview|research}

## Raw Notes
{Any additional context the user provided that doesn't fit neatly into decisions.
Useful for doc-writing agents that need tone/intent context.}
```
