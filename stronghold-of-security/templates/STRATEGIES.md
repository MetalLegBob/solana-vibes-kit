# Attack Strategy Catalog

**Project:** {PROJECT_NAME}
**Generated:** {TIMESTAMP}
**Total Strategies:** {COUNT}

---

## Strategy Generation Sources

This catalog was generated from:
- 10 focus area context analyses
- Historical Solana exploit patterns
- DeFi attack pattern database
- Protocol-specific attack surface analysis

---

## Strategy Index by Category

### Access Control ({N} strategies)
- H001: {Title}
- H002: {Title}
- ...

### Arithmetic ({N} strategies)
- H010: {Title}
- ...

### State Machine ({N} strategies)
- H020: {Title}
- ...

### CPI & External ({N} strategies)
- H030: {Title}
- ...

### Token & Economic ({N} strategies)
- H040: {Title}
- ...

### Account Validation ({N} strategies)
- H050: {Title}
- ...

### Oracle & Data ({N} strategies)
- H060: {Title}
- ...

### Upgrade & Admin ({N} strategies)
- H070: {Title}
- ...

### Error Handling ({N} strategies)
- H080: {Title}
- ...

### Timing & Ordering ({N} strategies)
- H090: {Title}
- ...

---

## Strategy Definitions

---

## H001: {Strategy Title}

**Category:** Access Control
**Estimated Priority:** {Tier 1 (CRITICAL potential) | Tier 2 (HIGH potential) | Tier 3 (MEDIUM-LOW potential)}
**Historical Precedent:** {Similar exploit or "Novel"}

### Hypothesis

{What the attacker is trying to achieve - clear statement}

### Attack Vector

1. Attacker {first action}
2. This causes {effect}
3. Attacker then {next action}
4. Result: {what attacker gains}

### Target Code

| File | Function | Lines | Relevance |
|------|----------|-------|-----------|
| `{file}` | `{function}` | {X-Y} | {Why investigate this} |

### Prerequisites

- {What attacker needs to have}
- {Required state or conditions}
- {Any setup required}

### Potential Impact

**Severity if confirmed:** {CRITICAL | HIGH | MEDIUM | LOW}

**Impact description:**
{What damage would occur - be specific}

- Financial: {$ estimate if possible}
- Users affected: {scope}
- Protocol state: {corrupted/degraded/etc.}

### Investigation Approach

1. **Check:** {First thing to verify}
   - Look for: {specific code pattern}
   - In: `{file}`

2. **Check:** {Second thing to verify}
   - Look for: {specific code pattern}
   - In: `{file}`

3. **Determine:** {How to conclude}
   - Vulnerable if: {condition}
   - Safe if: {condition}

### Indicators of Vulnerability

```rust
// Pattern that suggests vulnerability:
{code pattern}
```

### Indicators of Safety

```rust
// Pattern that suggests protection:
{code pattern}
```

---

## H002: {Strategy Title}

{Same format as above}

---

## H003: {Strategy Title}

{Continue for all strategies...}

---

## Cross-Strategy Analysis

### Potentially Related Strategies

Strategies that might combine or relate:

| Strategy A | Strategy B | Potential Combination |
|------------|------------|----------------------|
| H001 | H045 | If A succeeds, B becomes easier |
| H012 | H067 | Both target same code path |

### Investigation Priority Order

Based on potential impact and likelihood:

**Tier 1 (Investigate First):**
1. H{XX}: {Why priority}
2. H{XX}: {Why priority}

**Tier 2 (High Priority):**
1. H{XX}
2. H{XX}

**Tier 3 (Standard):**
- Remaining strategies

---

## Statistics

| Category | Count | High Priority | Historical Precedent |
|----------|-------|---------------|---------------------|
| Access Control | {N} | {N} | {N} |
| Arithmetic | {N} | {N} | {N} |
| State Machine | {N} | {N} | {N} |
| CPI & External | {N} | {N} | {N} |
| Token & Economic | {N} | {N} | {N} |
| Account Validation | {N} | {N} | {N} |
| Oracle & Data | {N} | {N} | {N} |
| Upgrade & Admin | {N} | {N} | {N} |
| Error Handling | {N} | {N} | {N} |
| Timing & Ordering | {N} | {N} | {N} |
| **TOTAL** | **{N}** | **{N}** | **{N}** |

---

## Notes for Investigators

### General Guidance

- Each strategy should be investigated independently
- Reference ARCHITECTURE.md for context
- Write findings to `.audit/findings/H{XXX}.md`
- Don't skip strategies even if they seem unlikely
- Note any discoveries that suggest NEW strategies

### Status Definitions

- **CONFIRMED**: Vulnerability exists and is exploitable
- **POTENTIAL**: Could be vulnerable under specific conditions
- **NOT VULNERABLE**: Protected against this attack
- **NEEDS MANUAL REVIEW**: Couldn't determine, needs expert

---

**This catalog is the input for Phase 4: Parallel Investigation**
