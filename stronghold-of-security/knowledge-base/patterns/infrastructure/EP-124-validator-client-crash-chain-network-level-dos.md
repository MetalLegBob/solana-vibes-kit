# EP-124: Validator Client Crash Chain (Network-Level DoS)
**Category:** Resource / DoS  **Severity:** CRITICAL  **Solana-Specific:** Yes
**Historical Exploits:** Agave rBPF vulnerability (Aug 2024 — crafted input could crash validator leaders sequentially, halting the entire network. Patched by Anza, 67%+ network upgraded in 3 days), Agave v3.0.14 (Jan 2026 — two critical bugs patched, detailed by Anza post-mortem Jan 16 2026: (1) **Gossip defrag buffer cleanup** — bounds check error in defragmentation buffer cleanup logic caused validator panic/crash under specific conditions; (2) **Vote censoring attack** — `VoteStorage` did not verify the correct vote authority signature, allowing attacker to submit malicious incorrectly-signed vote transactions targeting future slots, blocking genuine valid votes for affected validators and potentially stalling consensus at scale. Only 18% upgraded promptly, Solana Foundation linked stake delegation to compliance.)

**Description:** Vulnerabilities in the validator client software (Agave, Firedancer, Jito) can be exploited to crash leader nodes or disrupt consensus. Because Solana rotates leaders on a schedule, crashing leaders sequentially can halt block production across the entire network. These bugs typically reside in program loading (rBPF/SBF), transaction processing, or consensus voting logic — not in user-deployed smart contracts.

**Why It Matters for Auditors:**
1. **Protocol dependency risk:** dApps relying on Solana's liveness (oracle freshness, time-sensitive liquidations) must account for potential network halts
2. **Validator software updates** may change program behavior — CPI depth limits, compute limits, account handling
3. **Agave 3.0 changes** directly affect smart contract security surface: CPI nesting depth increased from 4→8, single-account compute limit raised to 40% of block CUs
4. **Multi-client world:** Agave and Firedancer may handle edge cases differently (see EP-125)

**Audit Considerations:**
```
// Check protocol assumptions about network liveness:
// - Does the protocol have time-dependent logic that breaks during halts?
// - Are there liquidation windows that assume continuous block production?
// - Do oracles have staleness checks that account for network downtime?
// - Does the protocol handle slot gaps gracefully?

// Check for CPI depth assumptions:
// Agave 3.0 raised CPI nesting from 4 to 8
// Programs assuming max depth of 4 may have new attack surface
require!(cpi_depth <= MAX_EXPECTED_DEPTH); // May need updating
```
**Detection:** Review protocol's dependency on network liveness. Check for hardcoded slot/time assumptions. Verify oracle staleness bounds are sufficient for potential multi-hour halts. For CPI-heavy programs, reassess depth assumptions after Agave 3.0 upgrade.
