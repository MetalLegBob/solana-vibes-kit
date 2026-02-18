# Off-Chain Attack Strategy Catalog

**Project:** {PROJECT_NAME}
**Generated:** {TIMESTAMP}
**Total Strategies:** {COUNT}

---

## Strategy Generation Sources

This catalog was generated from:
- 8 focus area off-chain context analyses
- Historical off-chain exploit patterns (OC-001 through OC-160)
- AI-generated code pitfall database
- Off-chain-specific attack surface analysis
- Cross-skill context (SOS on-chain findings, GL spec docs)

---

## Strategy Index by Category

### Secrets & Key Management ({N} strategies)
- S001: {Title}
- S002: {Title}
- ...

### Authentication & Session ({N} strategies)
- S010: {Title}
- ...

### Transaction Construction ({N} strategies)
- S020: {Title}
- ...

### RPC & API Security ({N} strategies)
- S030: {Title}
- ...

### Frontend & Client ({N} strategies)
- S040: {Title}
- ...

### Infrastructure & Configuration ({N} strategies)
- S050: {Title}
- ...

### Keeper, Crank & Bot Logic ({N} strategies)
- S060: {Title}
- ...

### Data Integrity & Validation ({N} strategies)
- S070: {Title}
- ...

### Cross-Boundary (On-Chain ↔ Off-Chain) ({N} strategies)
- S080: {Title}
- ...

### Novel / Codebase-Specific ({N} strategies)
- S090: {Title}
- ...

---

## Strategy Definitions

---

## S001: {Strategy Title}

**Category:** Secrets & Key Management
**Estimated Priority:** {Tier 1 (CRITICAL potential) | Tier 2 (HIGH potential) | Tier 3 (MEDIUM-LOW potential)}
**Historical Precedent:** {OC-XXX pattern or "Novel"}

### Hypothesis

{What the attacker is trying to achieve - clear statement}

### Attack Vector

1. Attacker {first action}
2. This causes {effect}
3. Attacker then {next action}
4. Result: {what attacker gains}

### Target Code

| File | Function/Route | Lines | Relevance |
|------|---------------|-------|-----------|
| `{file}` | `{function/route}` | {X-Y} | {Why investigate this} |

### Prerequisites

- {What attacker needs to have}
- {Required state or conditions}
- {Any setup required}

### Potential Impact

**Severity if confirmed:** {CRITICAL | HIGH | MEDIUM | LOW}

**Impact description:**
{What damage would occur - be specific}

- Financial: {$ estimate if possible}
- Data: {PII exposed, keys leaked, etc.}
- Users affected: {scope}
- System state: {compromised/degraded/etc.}

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

```javascript
// Pattern that suggests vulnerability:
{code pattern}
```

### Indicators of Safety

```javascript
// Pattern that suggests protection:
{code pattern}
```

---

## S002: {Strategy Title}

{Same format as above}

---

## Cross-Strategy Analysis

### Potentially Related Strategies

Strategies that might combine or relate:

| Strategy A | Strategy B | Potential Combination |
|------------|------------|----------------------|
| S001 | S045 | If secret leaks, auth bypass becomes trivial |
| S012 | S067 | Both target same API endpoint |

### Off-Chain → On-Chain Chains

{If SOS audit available:}

| Off-Chain Strategy | On-Chain Finding | Combined Attack |
|-------------------|------------------|-----------------|
| S{XX} | H{XX} | {How off-chain weakness enables on-chain exploit} |

### Investigation Priority Order

Based on potential impact and likelihood:

**Tier 1 (Investigate First):**
1. S{XX}: {Why priority}
2. S{XX}: {Why priority}

**Tier 2 (High Priority):**
1. S{XX}
2. S{XX}

**Tier 3 (Standard):**
- Remaining strategies

---

## Statistics

| Category | Count | High Priority | Historical Precedent | Novel |
|----------|-------|---------------|---------------------|-------|
| Secrets & Key Mgmt | {N} | {N} | {N} | {N} |
| Auth & Session | {N} | {N} | {N} | {N} |
| Transaction Construction | {N} | {N} | {N} | {N} |
| RPC & API Security | {N} | {N} | {N} | {N} |
| Frontend & Client | {N} | {N} | {N} | {N} |
| Infrastructure & Config | {N} | {N} | {N} | {N} |
| Keeper/Crank/Bot | {N} | {N} | {N} | {N} |
| Data Integrity | {N} | {N} | {N} | {N} |
| Cross-Boundary | {N} | {N} | {N} | {N} |
| Novel/Specific | {N} | {N} | {N} | {N} |
| **TOTAL** | **{N}** | **{N}** | **{N}** | **{N}** |

**Novel strategy percentage:** {X}% (minimum target: 20%)

---

## Notes for Investigators

### General Guidance

- Each strategy should be investigated independently
- Reference ARCHITECTURE.md for context
- Write findings to `.bulwark/findings/S{XXX}.md`
- Don't skip strategies even if they seem unlikely
- Note any discoveries that suggest NEW strategies
- For cross-boundary strategies, reference `.audit/FINAL_REPORT.md` for on-chain context

### Status Definitions

- **CONFIRMED**: Vulnerability exists and is exploitable
- **POTENTIAL**: Could be vulnerable under specific conditions
- **NOT VULNERABLE**: Protected against this attack
- **NEEDS MANUAL REVIEW**: Couldn't determine, needs expert

### Off-Chain Severity Calibration

When assessing off-chain findings, consider:
- **Fund loss** via key compromise, transaction manipulation, or bot exploitation → CRITICAL
- **Data breach** of PII, keys, or credentials → CRITICAL/HIGH
- **Remote code execution** via injection, deserialization, SSRF → CRITICAL
- **Authentication bypass** gaining unauthorized access → HIGH
- **API abuse** causing financial or operational damage → HIGH/MEDIUM
- **Information disclosure** of internal state or config → MEDIUM
- **Denial of service** to off-chain components → MEDIUM/LOW

---

**This catalog is the input for Phase 4: Parallel Investigation**
