---
doc_id: frontend-spec
title: "Frontend Specification"
wave: 2
requires: [architecture]
provides: [frontend-spec]
status: draft
decisions_referenced: []
needs_verification: []
---

# {Project Name} — Frontend Specification

## Overview

**Framework:** {e.g., Next.js, React, Vue, Svelte}
**Rendering:** {SSR | SPA | Static | Hybrid}
**State Management:** {e.g., Zustand, Redux, Context}
**Styling:** {e.g., Tailwind, CSS Modules, styled-components}

## Pages / Routes

| Route | Page | Auth Required | Description |
|-------|------|---------------|-------------|
| | | | |

## Page Specifications

### {Page Name}

**Route:** `{path}`
**Layout:** {which layout template}

**Components:**
- {Component list with hierarchy}

**Data Requirements:**
- {What data this page needs and where it comes from}

**User Actions:**
- {What the user can do on this page}

**States:**
| State | Display | Trigger |
|-------|---------|---------#|
| Loading | | |
| Empty | | |
| Error | | |
| Success | | |

---

## Components

### {Component Name}

**Type:** {page | layout | shared | feature}
**Props:**

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| | | | | |

**Behavior:**
{What this component does, state it manages, events it emits.}

## State Management

### Global State

| Store/Slice | Purpose | Key Fields |
|-------------|---------|------------|
| | | |

### Data Fetching

{How data is fetched — SWR, React Query, server components, etc.}

## User Flows

### {Flow Name}

{Step-by-step user journey with page transitions.}

1. User lands on {page}
2. User {action}
3. System {response}
4. ...

## Design System

{Design tokens, component library, typography, spacing conventions.}

## Responsive Breakpoints

| Breakpoint | Width | Layout Changes |
|------------|-------|---------------|
| | | |

## Accessibility

{WCAG compliance level, keyboard navigation, screen reader support, ARIA patterns.}
