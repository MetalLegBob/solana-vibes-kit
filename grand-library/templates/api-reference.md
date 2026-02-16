---
doc_id: api-reference
title: "API Reference"
wave: 2
requires: [architecture]
provides: [api-reference]
status: draft
decisions_referenced: []
needs_verification: []
---

# {Project Name} — API Reference

## Overview

**Base URL:** `{base_url}`
**Authentication:** {auth mechanism}
**Content Type:** `application/json`
**API Style:** {REST | GraphQL | RPC}

## Authentication

{How to authenticate requests. Include example headers.}

## Common Patterns

### Pagination

{How paginated responses work.}

### Error Responses

All errors follow this format:

```json
{
  "error": {
    "code": "{ERROR_CODE}",
    "message": "{Human-readable message}",
    "details": {}
  }
}
```

### Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| | | |

## Endpoints

### {Resource / Group Name}

#### `{METHOD} {path}`

**Description:** {What this endpoint does}
**Auth Required:** {yes/no + required role}

**Request:**

| Parameter | Location | Type | Required | Description |
|-----------|----------|------|----------|-------------|
| | | | | |

**Request Body:**

```json
{example request body}
```

**Response (`200`):**

```json
{example response body}
```

**Error Responses:**

| Status | Code | When |
|--------|------|------|
| | | |

---

{Repeat for each endpoint.}

## Rate Limits

| Tier | Requests/min | Burst | Notes |
|------|-------------|-------|-------|
| | | | |

## Webhooks (if applicable)

{Webhook events, payloads, retry behavior.}
