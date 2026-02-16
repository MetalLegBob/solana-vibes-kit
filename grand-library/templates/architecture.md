---
doc_id: architecture
title: "Architecture"
wave: 1
requires: []
provides: [architecture]
status: draft
decisions_referenced: []
needs_verification: []
---

# {Project Name} — Architecture

## System Overview

{High-level description of the system architecture. What are the major components and how do they fit together?}

## Architecture Diagram

```
{ASCII diagram showing major components and their relationships.
Use boxes for components, arrows for data flow, labels for protocols.}
```

## Components

### {Component Name}

**Role:** {What this component does}
**Technology:** {Language, framework, runtime}
**Communicates with:** {Other components + protocol}

{Repeat for each major component.}

## Communication Patterns

| From | To | Protocol | Pattern | Notes |
|------|----|----------|---------|-------|
| | | | | |

## Data Flow

{Describe how data moves through the system from entry to exit. Include the happy path and key alternative paths.}

### {Flow Name}

1. {Step 1}
2. {Step 2}
3. ...

## Infrastructure

### Hosting

{Where each component runs.}

### Environments

| Environment | Purpose | URL/Endpoint |
|-------------|---------|-------------|
| | | |

### CI/CD

{Build and deployment pipeline overview.}

## Key Architectural Decisions

| Decision | Choice | Alternatives Considered | Rationale |
|----------|--------|------------------------|-----------|
| | | | |

## Constraints

{Hard constraints that shaped the architecture — performance requirements, regulatory, budget, team size, etc.}
