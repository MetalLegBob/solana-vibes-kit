---
doc_id: data-model
title: "Data Model"
wave: 1
requires: []
provides: [data-model]
status: draft
decisions_referenced: []
needs_verification: []
---

# {Project Name} — Data Model

## Overview

{Brief description of the data model approach. What storage technologies are used and why.}

## Entity Relationship Diagram

```
{ASCII diagram showing entities and their relationships.
Use [Entity] for entities, lines with cardinality for relationships.}
```

## Entities

### {Entity Name}

**Storage:** {Database table, on-chain account, document collection, etc.}
**Lifecycle:** {How is it created, updated, and deleted?}

| Field | Type | Required | Description | Constraints |
|-------|------|----------|-------------|-------------|
| | | | | |

**Relationships:**
- {relationship description with cardinality}

**Indexes:**
- {index fields and purpose}

{Repeat for each entity.}

## Storage Architecture

### Primary Storage

{Database technology, why it was chosen, connection details.}

### Caching

{Caching strategy — what's cached, TTL, invalidation approach.}

### File / Blob Storage

{If applicable — what files are stored, where, access patterns.}

## Data Flow

### Ingestion

{How does data enter the system?}

### Transformation

{How is data processed or transformed?}

### Egress

{How does data leave the system? APIs, exports, events?}

## Data Integrity

{Validation rules, consistency guarantees, backup strategy.}

## Migration Strategy

{How will the data model evolve? Schema migration approach.}
