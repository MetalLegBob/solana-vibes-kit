# EP-125: Multi-Client Consensus Divergence
**Category:** Logic / State Machine  **Severity:** CRITICAL  **Solana-Specific:** Yes
**Historical Exploits:** No public exploit yet, but Asymmetric Research has documented finding consensus-level bugs via differential fuzzing between Agave and Firedancer validator clients (May 2025). Minor behavioral differences between implementations can lead to network forks. The Agave v3.0.14 vote censoring bug (Jan 2026) demonstrated how implementation-level issues can cascade into consensus-level impact — `VoteStorage` accepted votes without verifying the vote authority signature, meaning a single implementation flaw could stall the entire network.

**Description:** With multiple validator client implementations (Agave by Anza, Firedancer by Jump Crypto), behavioral differences in edge-case handling can cause consensus divergence. If validators running different clients produce different results for the same transaction, the network risks splitting. These differences are particularly dangerous in: integer arithmetic edge cases, account state handling, BPF/SBF instruction execution, and transaction scheduling.

**Why It Matters for Auditors:**
1. **Smart contracts may behave differently** on Agave vs Firedancer for edge cases
2. **A vulnerability in one client but not the other** creates asymmetric attack vectors
3. **Differential fuzzing** (comparing Agave vs Firedancer behavior) is the key detection technique
4. **Programs that rely on precise runtime behavior** (exact compute units consumed, specific error codes, account data layout edge cases) are most at risk

**Detection Approach:**
```
// Patterns most likely to trigger divergence:
// 1. Integer arithmetic near boundaries (u64::MAX, u128 overflow)
// 2. Floating-point operations (if any)
// 3. Account realloc edge cases
// 4. CPI call depth boundaries (especially with 4→8 change)
// 5. Compute budget edge cases (exactly at limit)
// 6. Transaction size limits
// 7. Instruction data parsing (malformed inputs)

// Audit question: Does this program rely on behavior that
// might differ between validator implementations?
// Key areas: error handling, compute metering, account locking
```
**Detection:** Flag programs that depend on precise runtime behavior or error codes. Check for operations near arithmetic boundaries. Note programs using newer features (increased CPI depth, larger compute budgets) where implementation differences are more likely. The Asymmetric Research differential fuzzing methodology (LibAFL-based, comparing Agave vs Firedancer) is the gold standard for finding these issues.
