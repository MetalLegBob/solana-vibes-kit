# Phase 0.5: Static Pattern Catalog

Grep/ripgrep patterns for building a hot-spots map before Phase 1 agents start analysis.
Each pattern is organized by risk category with: regex, risk level, and relevant focus area(s).

The orchestrator runs these patterns against all `.rs` source files in the program directory.

---

## Pattern Categories

### 1. Unchecked Arithmetic (HIGH)

**What it catches:** Arithmetic operations that could overflow/underflow in release builds (Rust wraps silently in release mode).

| Pattern ID | Grep Command | What It Finds |
|------------|-------------|---------------|
| PA-001 | `grep -rn ' as u64' --include='*.rs'` | Potentially truncating casts to u64 |
| PA-002 | `grep -rn ' as u128' --include='*.rs'` | Widening casts (may indicate large arithmetic) |
| PA-003 | `grep -rn ' as i64' --include='*.rs'` | Signed casts (sign confusion risk) |
| PA-004 | `grep -rn ' as u32' --include='*.rs'` | Truncating casts to u32 |
| PA-005 | `grep -rn ' as u16\| as u8' --include='*.rs'` | Narrow casts (high truncation risk) |
| PA-006 | `grep -rn 'try_into().unwrap()' --include='*.rs'` | Unchecked type conversion |

**Focus Areas:** Arithmetic Safety, Rust Footguns

**What to look for in results:** Files with high cast density suggest complex arithmetic that needs checked_* operations or explicit bounds verification.

---

### 2. Unwrap/Expect Usage (MEDIUM)

**What it catches:** Panic-triggering operations in instruction handlers that could cause DoS.

| Pattern ID | Grep Command | What It Finds |
|------------|-------------|---------------|
| PB-001 | `grep -rn '\.unwrap()' --include='*.rs'` | Panic on None/Err |
| PB-002 | `grep -rn '\.expect(' --include='*.rs'` | Panic with message |
| PB-003 | `grep -rn '\[.*\]' --include='*.rs' \| grep -v '//' \| grep -v 'test'` | Array indexing (panic on out-of-bounds) |

**Focus Areas:** Error Handling, Rust Footguns, Compute & Resource

**Note:** Filter results to focus on instruction handler code (`pub fn` within `impl` blocks), not test code or initialization.

---

### 3. UncheckedAccount / Raw AccountInfo (HIGH)

**What it catches:** Accounts that bypass Anchor's automatic validation — require manual ownership, signer, and type checks.

| Pattern ID | Grep Command | What It Finds |
|------------|-------------|---------------|
| PC-001 | `grep -rn 'UncheckedAccount' --include='*.rs'` | Explicitly unchecked accounts |
| PC-002 | `grep -rn "AccountInfo<'info>" --include='*.rs'` | Raw account info (no Anchor validation) |
| PC-003 | `grep -rn '/// CHECK:' --include='*.rs'` | Anchor safety comment (review justification) |

**Focus Areas:** Account Validation, Access Control

**What to look for:** Every `UncheckedAccount` and `AccountInfo` must have a `/// CHECK:` comment explaining why it's safe. Missing comments = immediate red flag.

---

### 4. Access Control Patterns (HIGH)

**What it catches:** Authority, signer, and admin patterns that may have gaps.

| Pattern ID | Grep Command | What It Finds |
|------------|-------------|---------------|
| PD-001 | `grep -rn 'Signer<' --include='*.rs'` | Signer declarations (map all signers) |
| PD-002 | `grep -rn 'has_one' --include='*.rs'` | Anchor authority constraints |
| PD-003 | `grep -rn 'constraint\s*=' --include='*.rs'` | Custom Anchor constraints |
| PD-004 | `grep -rn 'pub authority\|pub admin\|pub owner' --include='*.rs'` | Authority field declarations |
| PD-005 | `grep -rn '#\[access_control' --include='*.rs'` | Access control decorators |
| PD-006 | `grep -rn 'require_keys_eq!' --include='*.rs'` | Explicit key equality checks |

**Focus Areas:** Access Control, Account Validation

**What to look for:** Instructions WITHOUT any signer check (compare instruction list against PD-001 results). Admin fields without `has_one` constraints.

---

### 5. init_if_needed and Reinitialization (MEDIUM)

**What it catches:** Account initialization patterns that may allow reinitialization attacks.

| Pattern ID | Grep Command | What It Finds |
|------------|-------------|---------------|
| PE-001 | `grep -rn 'init_if_needed' --include='*.rs'` | Conditional init (reinitialization risk) |
| PE-002 | `grep -rn 'init,' --include='*.rs'` | Standard init (check for missing guards) |
| PE-003 | `grep -rn 'is_initialized\|initialized' --include='*.rs'` | Manual init tracking fields |

**Focus Areas:** Account Validation, State Machine

---

### 6. CPI and External Calls (HIGH)

**What it catches:** Cross-program invocations that may pass excessive privileges or call unvalidated programs.

| Pattern ID | Grep Command | What It Finds |
|------------|-------------|---------------|
| PF-001 | `grep -rn 'invoke(' --include='*.rs'` | Raw CPI calls |
| PF-002 | `grep -rn 'invoke_signed(' --include='*.rs'` | PDA-signed CPI calls |
| PF-003 | `grep -rn 'Program<' --include='*.rs'` | Anchor program type validation |
| PF-004 | `grep -rn 'CpiContext' --include='*.rs'` | Anchor CPI pattern |
| PF-005 | `grep -rn 'remaining_accounts' --include='*.rs'` | Dynamic account passing (extra scrutiny) |

**Focus Areas:** CPI & External Calls, Access Control

**What to look for:** `invoke(` or `invoke_signed(` WITHOUT corresponding `Program<'info, T>` type check = potential arbitrary CPI.

---

### 7. Hardcoded Values (MEDIUM)

**What it catches:** Hardcoded public keys, magic numbers, and constants that may be incorrect or environment-specific.

| Pattern ID | Grep Command | What It Finds |
|------------|-------------|---------------|
| PG-001 | `grep -rn 'Pubkey::new_from_array' --include='*.rs'` | Hardcoded pubkeys (inline) |
| PG-002 | `grep -rn 'declare_id!' --include='*.rs'` | Program ID declarations |
| PG-003 | `grep -rn 'pubkey!' --include='*.rs'` | Macro-generated pubkeys |
| PG-004 | `grep -rn 'const.*: u64 =' --include='*.rs'` | Numeric constants (check correctness) |

**Focus Areas:** Access Control, Upgrade & Admin

---

### 8. Unsafe Rust (HIGH)

**What it catches:** Unsafe blocks that bypass Rust's memory safety guarantees.

| Pattern ID | Grep Command | What It Finds |
|------------|-------------|---------------|
| PH-001 | `grep -rn 'unsafe {' --include='*.rs'` | Unsafe blocks |
| PH-002 | `grep -rn 'unsafe fn' --include='*.rs'` | Unsafe functions |
| PH-003 | `grep -rn 'unsafe impl' --include='*.rs'` | Unsafe trait impls |
| PH-004 | `grep -rn 'std::mem::transmute' --include='*.rs'` | Type transmutation |
| PH-005 | `grep -rn 'from_raw_parts\|slice::from_raw' --include='*.rs'` | Raw pointer operations |

**Focus Areas:** Rust Footguns, Error Handling

---

### 9. Token-2022 / Extensions (MEDIUM — conditional)

**What it catches:** Token Extensions usage that introduces additional attack surface.

| Pattern ID | Grep Command | What It Finds |
|------------|-------------|---------------|
| PI-001 | `grep -rn 'spl_token_2022' --include='*.rs'` | Token-2022 program usage |
| PI-002 | `grep -rn 'token_2022' --include='*.rs'` | Token-2022 references |
| PI-003 | `grep -rn 'TransferHook\|transfer_hook' --include='*.rs'` | Transfer hook extension |
| PI-004 | `grep -rn 'TransferFee\|transfer_fee' --include='*.rs'` | Transfer fee extension |
| PI-005 | `grep -rn 'ConfidentialTransfer' --include='*.rs'` | Confidential transfers |
| PI-006 | `grep -rn 'PermanentDelegate\|permanent_delegate' --include='*.rs'` | Permanent delegate (high risk) |

**Focus Areas:** Token & Economic, Account Validation

**What to look for:** Any Token-2022 usage means transfer hooks could execute arbitrary code during transfers. Transfer fees affect amount calculations.

---

### 10. Oracle and External Data (MEDIUM)

**What it catches:** External data dependencies and price feed integrations.

| Pattern ID | Grep Command | What It Finds |
|------------|-------------|---------------|
| PJ-001 | `grep -rn 'pyth\|Pyth\|PriceAccount\|PriceFeed' --include='*.rs'` | Pyth oracle usage |
| PJ-002 | `grep -rn 'switchboard\|Switchboard\|AggregatorAccountData' --include='*.rs'` | Switchboard oracle |
| PJ-003 | `grep -rn 'price\|oracle' --include='*.rs'` | General price/oracle references |
| PJ-004 | `grep -rn 'staleness\|stale\|max_age\|confidence' --include='*.rs'` | Freshness/confidence checks |

**Focus Areas:** Oracle & External Data, Token & Economic

**What to look for:** Oracle usage (PJ-001/002/003) WITHOUT freshness checks (PJ-004) = stale price vulnerability.

---

### 11. State Machine / Lifecycle (MEDIUM)

**What it catches:** State tracking and lifecycle management patterns.

| Pattern ID | Grep Command | What It Finds |
|------------|-------------|---------------|
| PK-001 | `grep -rn 'close\s*=' --include='*.rs'` | Anchor close constraint |
| PK-002 | `grep -rn 'enum.*State\|Status\|Phase' --include='*.rs'` | State enums |
| PK-003 | `grep -rn 'is_paused\|paused\|frozen\|emergency' --include='*.rs'` | Pause/emergency mechanisms |
| PK-004 | `grep -rn 'realloc' --include='*.rs'` | Account reallocation |

**Focus Areas:** State Machine, Upgrade & Admin

---

### 12. Timing and MEV (MEDIUM)

**What it catches:** Time-dependent operations and MEV-sensitive code.

| Pattern ID | Grep Command | What It Finds |
|------------|-------------|---------------|
| PL-001 | `grep -rn 'Clock::get\|clock.unix_timestamp\|clock.slot\|clock.epoch' --include='*.rs'` | Clock/time usage |
| PL-002 | `grep -rn 'deadline\|expir\|timeout' --include='*.rs'` | Time-bound operations |
| PL-003 | `grep -rn 'slippage\|min_amount\|max_amount\|min_out' --include='*.rs'` | Slippage protection |

**Focus Areas:** Timing & Ordering, Token & Economic

---

## HOT_SPOTS.md Output Template

The orchestrator generates `.audit/HOT_SPOTS.md` with this structure:

```markdown
# Hot-Spots Map (Pre-Phase 1 Static Scan)

## Summary
- Total patterns found: {N}
- HIGH risk locations: {N}
- MEDIUM risk locations: {N}
- Semgrep used: {Yes/No}

## Hot-Spots by File (sorted by risk density)

### {file.rs} — Risk Score: {HIGH/MEDIUM/LOW} ({N} patterns)
| Line | Pattern ID | Pattern | Risk | Focus Area |
|------|-----------|---------|------|------------|
| 45   | PB-001    | .unwrap() | MEDIUM | Error Handling |
| 89   | PA-001    | as u64 | HIGH | Arithmetic |

### {file2.rs} — Risk Score: {HIGH/MEDIUM/LOW} ({N} patterns)
...

## Hot-Spots by Focus Area

### Access Control
- {file}:{line} — {pattern} — {risk}

### Arithmetic Safety
- {file}:{line} — {pattern} — {risk}

### State Machine
...

### CPI & External Calls
...

### Token & Economic
...

### Account Validation
...

### Oracle & External Data
...

### Upgrade & Admin
...

### Error Handling
...

### Timing & Ordering
...
```
