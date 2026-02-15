# Bridge / Cross-Chain Attack Playbook
<!-- Protocol-specific attack vectors for Cross-Chain Bridges -->
<!-- Last updated: 2026-02-06 -->

## How Bridges Work (Mental Model)

Cross-chain bridges enable transfer of assets and messages between different blockchains. On Solana, bridges like Wormhole allow users to move tokens between Solana, Ethereum, and other chains. Bridges are high-value targets — they hold large amounts of locked assets and have complex multi-chain attack surfaces.

**Key components:**
- **Guardians/Validators:** Off-chain nodes that verify cross-chain messages
- **VAA (Verified Action Approval):** Signed message attesting to a cross-chain event
- **Lock-and-mint:** Lock assets on source chain, mint wrapped tokens on destination
- **Burn-and-release:** Burn wrapped tokens, release originals on source chain
- **Relayers:** Forward signed messages between chains
- **Smart contracts:** On each chain, handle locking/minting/burning

---

## Common Architecture Patterns

### Guardian-Based (Wormhole)
- 19 guardian nodes verify messages
- 13/19 (2/3+1) signatures required for VAA
- Wormhole: $40B+ in transferred assets
- Guardians are known, reputable entities

### Optimistic (LayerZero-style)
- Messages assumed valid unless challenged
- Challenge period before finalization
- Lower cost but longer finality

### Native Verification
- Use light clients or ZK proofs
- Most secure but most complex
- Emerging on Solana (e.g., ZK-bridging efforts)

---

## Known Attack Vectors

### 1. Signature/Guardian Verification Bypass
**Severity:** CRITICAL  **EP Reference:** EP-002, EP-092
**Historical:** Wormhole ($326M, Feb 2022)

**Mechanism:** The bridge's signature verification logic has a flaw allowing forged messages. In Wormhole's case, the `verify_signatures` instruction used the deprecated `load_instruction_at` which didn't verify the sysvar account address. Attacker passed a fake sysvar account with fabricated signature data.

**Detection:**
- How are guardian/validator signatures verified?
- Is `load_instruction_at` used? (deprecated, must use `load_instruction_at_checked`)
- Are sysvar accounts validated by address?
- Can signature accounts be substituted with attacker-controlled accounts?

**Code pattern to audit:**
```rust
// DANGEROUS: Deprecated, doesn't check sysvar address
let ix = solana_program::sysvar::instructions::load_instruction_at(
    index, &instruction_sysvar_account
)?;
// SAFE: Checks sysvar address
let ix = solana_program::sysvar::instructions::load_instruction_at_checked(
    index, &instruction_sysvar_account
)?;
```

**Invariant:** `all_sysvar_accounts_validated_by_address`

---

### 1b. Ed25519 Instruction Offset Bypass
**Severity:** CRITICAL  **EP Reference:** EP-123
**Historical:** Relay Protocol ($5B+ volume, Sep 2025 — Asymmetric Research disclosure, patched, no funds lost)

**Mechanism:** Bridge verifies signatures by reading Ed25519 precompile instruction data from the instructions sysvar. Program checks that a valid Ed25519 verification instruction exists in the transaction but does NOT validate the offset fields. Attacker includes a valid Ed25519 signature for a different message and manipulates offsets so the program reads attacker-controlled data.

**Detection:**
- Does the bridge verify Ed25519/secp256k1 signatures via instruction sysvar?
- Are ALL offset fields (`signature_offset`, `public_key_offset`, `message_data_offset`) validated?
- Is the actual message content verified against expected values?
- Is the public key checked against the expected authority?

**Code pattern to audit:**
```rust
// DANGEROUS: Reading Ed25519 data at unvalidated offset
let sig_data = &ed25519_ix.data[attacker_controlled_offset..];

// SAFE: Parse Ed25519SignatureOffsets and validate all fields
let offsets = Ed25519SignatureOffsets::unpack(&ed25519_ix.data[2..])?;
require!(offsets.message_data_offset == EXPECTED_OFFSET);
// Also verify message content and public key match expected values
```

**Invariant:** `ed25519_offset_fields_fully_validated AND message_content_matches_expected`

---

### 2. Fake Deposit Event
**Severity:** CRITICAL  **EP Reference:** EP-002
**Historical:** Qubit ($80M, Jan 2022)

**Mechanism:** Bridge monitors deposit events on the source chain. Attacker creates a deposit event without actually depositing assets (e.g., using a valueless token that the bridge accepts, or exploiting a logic error that credits a deposit of zero).

**Detection:**
- How are deposit events verified?
- Can a deposit of zero or valueless token trigger a mint on the destination?
- Is the deposit token validated against an allowlist?
- Are deposit amounts verified on-chain before minting?

**Invariant:** `mint_only_after_verified_nonzero_deposit`

---

### 3. Guardian/Validator Key Compromise
**Severity:** CRITICAL  **EP Reference:** EP-097
**Historical:** Ronin Bridge ($625M, Mar 2022), Harmony Horizon ($100M)

**Mechanism:** Attacker compromises enough guardian private keys to forge valid signatures. With sufficient keys (threshold), they can approve arbitrary withdrawals. Social engineering, insider threats, or poor key management enable this.

**Detection:**
- How many guardians/validators are there?
- What is the signing threshold? (should be > 2/3)
- How are guardian keys managed? (HSMs? Multi-party?)
- Are guardians geographically and organizationally diverse?
- Is there a key rotation mechanism?

**Invariant:** `guardian_keys_in_HSMs_with_MPC`

---

### 4. Message Replay Attack
**Severity:** HIGH  **EP Reference:** EP-011, EP-049

**Mechanism:** A valid cross-chain message (VAA) is replayed to execute the same action multiple times. If the bridge doesn't properly mark messages as consumed, an attacker can withdraw the same amount repeatedly.

**Detection:**
- Are consumed VAAs/messages tracked and marked?
- Is there a nonce or sequence number preventing replay?
- Can the same message be processed on multiple destination chains?

**Code pattern to audit:**
```rust
// DANGEROUS: No replay protection
fn process_vaa(vaa: &VAA) -> Result<()> {
    verify_signatures(vaa)?;
    mint_tokens(vaa.amount)?;
    Ok(())
}
// SAFE: Track consumed VAAs
fn process_vaa(vaa: &VAA) -> Result<()> {
    verify_signatures(vaa)?;
    require!(!is_consumed(&vaa.hash), ErrorCode::AlreadyConsumed);
    mark_consumed(&vaa.hash)?;
    mint_tokens(vaa.amount)?;
    Ok(())
}
```

**Invariant:** `every_vaa_processed_exactly_once`

---

### 5. Wrapped Token Backing Insolvency
**Severity:** CRITICAL  **EP Reference:** EP-058

**Mechanism:** If locked assets on the source chain are stolen (via any exploit), wrapped tokens on the destination chain become unbacked and worthless. Users holding wrapped tokens have no recourse.

**Detection:**
- Is there a mechanism to verify backing in real-time?
- Can the bridge pause minting if backing is compromised?
- Is there an insurance or bailout mechanism?
- Are reserves auditable on-chain?

**Invariant:** `wrapped_token_supply <= locked_assets_on_source_chain`

---

### 6. Relayer Manipulation
**Severity:** MEDIUM  **EP Reference:** EP-093

**Mechanism:** Relayers forward messages between chains. A malicious relayer can delay, reorder, or censor messages. If the protocol assumes timely delivery, delayed messages can be exploited (e.g., executing at stale prices).

**Detection:**
- Is the relayer permissionless? (anyone can relay)
- Can relayer delay or censor messages?
- Is there a timeout mechanism for undelivered messages?
- Can users self-relay as fallback?

**Invariant:** `protocol_functions_correctly_with_relayer_delay`

---

### 7. Bridge Contract Upgrade / Admin Key Attack
**Severity:** CRITICAL  **EP Reference:** EP-008, EP-009

**Mechanism:** Bridge contracts are often upgradeable. If the upgrade authority is a single key (or small multisig), compromising it allows replacing the contract with a malicious version that drains all locked funds.

**Detection:**
- Is the bridge contract upgradeable?
- Who holds the upgrade authority? (multisig? timelock?)
- Is there a timelock on upgrades allowing community review?
- Can the upgrade authority be transferred?

**Invariant:** `upgrade_authority_requires_multisig_plus_timelock`

---

### 8. Cross-Chain Reentrancy / Race Condition
**Severity:** HIGH  **EP Reference:** EP-093

**Mechanism:** Cross-chain operations are inherently asynchronous. An attacker can exploit the time gap between initiating an action on chain A and its completion on chain B. For example, initiating a withdrawal on chain A, then quickly using the still-wrapped tokens on chain B before the withdrawal is reflected.

**Detection:**
- Is there a lock period between initiating and completing cross-chain actions?
- Can wrapped tokens be used while a withdrawal is pending?
- Are cross-chain state updates atomic or eventual?

**Invariant:** `tokens_locked_during_pending_cross_chain_operations`

---

### 9. Failed Message Non-Recoverability (Fund Lock)
**Severity:** HIGH  **EP Reference:** EP-104
**Historical:** Olympus DAO OFT (LayerZero, Mar 2023 — failed messages locked tokens)

**Mechanism:** Bridge burns or locks tokens on the source chain immediately when a cross-chain send is initiated. If the message fails on the destination chain (gas exhaustion, payload error, validator downtime), there is no retry or refund mechanism. Tokens are permanently lost.

**Detection:**
- Does the bridge burn or escrow tokens on send? (escrow is safer)
- Can failed messages be retried?
- Is there a timeout-based refund mechanism?
- Are pending transfers tracked in on-chain state?
- Is there a guardian/relayer override for stuck messages?

**Code pattern to audit:**
```rust
// DANGEROUS: Tokens burned before confirmation
burn_tokens(source, amount)?;
send_message(dst_chain, payload)?;
// If destination fails — tokens are gone forever

// SAFE: Escrow with refund path
escrow_tokens(source, escrow_pda, amount)?;
send_message(dst_chain, payload)?;
// On confirmation: burn escrowed tokens
// On failure/timeout: user calls reclaim()
```

**Invariant:** `burned_or_locked_tokens_always_have_recovery_path`

---

### 10. Upgrade Initialization Gap (Zero-Default Bypass)
**Severity:** CRITICAL  **EP Reference:** EP-117
**Historical:** Ronin Bridge V2 ($12M, Aug 2024), Nomad Bridge ($190M, Aug 2022)

**Mechanism:** During a bridge contract upgrade, new state fields (validator weights, trusted roots, verification parameters) are left uninitialized, defaulting to zero. Security checks that compare against these zero values become no-ops. In Ronin V2, `_totalOperatorWeight` defaulted to 0, disabling `minimumVoteWeight`. In Nomad, `committedRoot` was initialized to `0x00`, matching the default for unproven messages.

**Detection:**
- Has the bridge been recently upgraded?
- Are there new state fields added in the upgrade?
- Is there a migration instruction that sets non-zero defaults?
- Do any `require!(value >= config.threshold)` checks depend on new fields?
- Are zero values valid in the verification logic?

**Key insight:** Zero defaults are the most dangerous initialization value for security parameters — they disable rather than restrict.

**Invariant:** `all_security_thresholds_non_zero_after_upgrade`

---

### 11. Message Verification Zero-Value Bypass
**Severity:** CRITICAL  **EP Reference:** EP-117
**Historical:** Nomad Bridge ($190M — `0x00` root auto-verified 300+ exploiters)

**Mechanism:** Bridge verification logic uses a mapping to check if a message root is valid (`confirmAt[root] > 0`). During initialization, the zero root (`bytes32(0)`) is given a valid timestamp. Since unproven messages default to root `bytes32(0)`, ALL unproven messages pass verification. This is distinct from upgrade gaps (EP-117) — it's a specific pattern where default/zero sentinel values collide with valid verification states.

**Detection:**
- Does the verification use a mapping where the default (zero/null) key has been initialized?
- Can `0x00` or `Pubkey::default()` pass as a valid proof root?
- Are there sentinel values that overlap with uninitialized states?

**On Solana:** Check PDA-based message verification. If a "default" or "initial" message hash has a valid entry in the consumed messages map, all forged messages may pass.

**Invariant:** `zero_or_default_values_must_fail_all_verification_checks`

---

### 12. Insufficient Multisig Threshold
**Severity:** CRITICAL  **EP Reference:** EP-097
**Historical:** Harmony Horizon ($100M — 2-of-5 threshold), community warned months prior

**Mechanism:** Bridge uses a multisig or threshold signature scheme with too few required signers. Compromising only 2 keys (Harmony) or relying on a single custodian (Multichain) gives the attacker full control. The Harmony threshold was 2-of-5 (40%) — far below the 2/3+1 standard. Multichain's CEO was the sole custodian of MPC keys.

**Detection:**
- What is the exact threshold? (must be > 2/3 of total signers)
- Are keys stored in HSMs with proper access controls?
- Can a single individual control enough keys?
- Is there organizational/geographic diversity among signers?
- Were threshold concerns raised and addressed? (Harmony ignored community warnings)

**On Solana:** Wormhole uses 13/19 (68%). Any Solana bridge with threshold below 2/3 is critically vulnerable.

**Invariant:** `signing_threshold >= (2 * total_signers / 3) + 1`

---

### 13. Cross-Chain Function Selector / Program ID Collision
**Severity:** CRITICAL  **EP Reference:** EP-042, EP-044
**Historical:** Poly Network ($611M — brute-forced function selector to call privileged method)

**Mechanism:** Cross-chain message handler dispatches calls based on a method identifier (function selector on EVM, instruction discriminator on Solana). If the dispatcher doesn't restrict which methods can be called, an attacker crafts a message that targets a privileged method (key rotation, guardian replacement). On Poly Network, the attacker brute-forced a method name whose first 4 bytes matched `putCurEpochConPubKeyBytes`, replacing guardian keys with their own.

**Detection:**
- Does the cross-chain handler restrict which instructions/methods can be called?
- Is there an allowlist of valid cross-chain operations?
- Can a cross-chain message invoke admin functions (key rotation, threshold change)?
- Is the instruction discriminator validated against expected values?

**On Solana:** CPI target validation is the analog — ensure cross-chain message processors can only invoke whitelisted programs AND instructions. Never allow arbitrary program invocation based on message content.

**Invariant:** `cross_chain_handler_uses_allowlist_not_denylist`

---

### 14. Single Custodian / Key Person Risk
**Severity:** CRITICAL  **EP Reference:** EP-058
**Historical:** Multichain ($130M — CEO arrested, sole custodian of MPC keys)

**Mechanism:** Bridge operational keys (MPC shares, upgrade authority, emergency pause) are controlled by a single person or a small group without backup. If that person is arrested, dies, loses access, or becomes malicious, the bridge assets are at risk. Multichain's CEO was arrested by Chinese police; his computers and mnemonic phrases were confiscated; $130M was subsequently drained.

**Detection:**
- Who holds the operational keys? Is there a bus factor > 1?
- Are MPC key shares distributed across independent parties?
- Is there a dead-man switch or succession plan?
- Can the bridge operate if any single participant is unavailable?
- Is the upgrade authority a timelocked multisig with distributed keys?

**Invariant:** `no_single_person_can_control_or_disable_bridge`

---

## Cross-Chain Bridge Vulnerability Taxonomy

**From academic research (SoK, 2024):** Analyzed 60 bridges, 34 exploits (2021-2023)

| Category | Total Lost | Examples | Solana Relevance |
|----------|-----------|----------|-----------------|
| Signature verification failures | $1.2B | Ronin, Harmony | Wormhole guardian verification |
| Smart contract vulnerabilities | $847M | Wormhole, Nomad | Bridge program bugs |
| Oracle manipulation | $423M | BNB Bridge | Price feed for wrapped tokens |
| Validator collusion | $298M | Various | Guardian set integrity |
| Private key compromise | Most common | All above | Key management for all bridges |

**Seven fundamental bridge vulnerabilities (Chainlink, 2024):**
1. Unsecure private key management → HSMs, MPC, geographic distribution
2. Unaudited smart contracts → Continuous auditing, formal verification
3. Insufficient validator decentralization → Many independent operators
4. Lack of rate limiting → Daily/hourly withdrawal caps
5. Missing emergency pause → Circuit breakers, guardian pause
6. Inadequate monitoring → Real-time anomaly detection
7. Centralization of operational control → Distributed governance

---

## Key Invariants That Must Hold

1. `wrapped_supply == locked_original` (1:1 backing at all times)
2. `every_message_processed_exactly_once` (no replay, no skip)
3. `signatures_verified_with_current_guardian_set`
4. `guardian_threshold >= 2/3 + 1`
5. `upgrade_authority_is_timelocked_multisig`
6. `sysvar_accounts_validated_by_address` (Solana-specific)
7. `cross_chain_state_eventually_consistent`
8. `burned_or_locked_tokens_always_have_recovery_path`
9. `all_security_thresholds_non_zero_after_upgrade`
10. `zero_or_default_values_fail_all_verification_checks`
11. `no_single_person_can_control_or_disable_bridge`
12. `cross_chain_handler_uses_allowlist_not_denylist`
13. `rate_limits_exist_for_large_withdrawals`

## Red Flags Checklist

- [ ] `load_instruction_at` used instead of `load_instruction_at_checked`
- [ ] Sysvar accounts not validated by address
- [ ] No replay protection on processed messages/VAAs
- [ ] Guardian threshold below 2/3
- [ ] Single upgrade authority key (no multisig, no timelock)
- [ ] No mechanism to pause bridge during exploit
- [ ] Deposit validation allows zero or valueless token deposits
- [ ] Relayer is centralized with no fallback
- [ ] No monitoring for backing insolvency
- [ ] Guardian keys not in HSMs
- [ ] No rate limiting on large withdrawals
- [ ] Tokens burned (not escrowed) on cross-chain send with no retry/refund mechanism
- [ ] No on-chain tracking of pending cross-chain transfers
- [ ] New state fields after upgrade without non-zero initialization
- [ ] Zero/default values accepted as valid in verification logic
- [ ] Multisig threshold below 2/3 of total signers
- [ ] Single person controls MPC keys or operational authority
- [ ] Cross-chain message handler can invoke arbitrary methods/programs
- [ ] No allowlist restricting which operations cross-chain messages can trigger
- [ ] No daily/hourly withdrawal rate limits
- [ ] Bridge survived a previous hack and was re-deployed (verify re-deployment is correct)
- [ ] **Legacy/genesis guardian sets with ExpirationTime=0** (EP-121)
- [ ] **Implementation contract not initialized after upgrade** (Wormhole pattern)
- [ ] **`if expiration > 0` guard on guardian set validation**

---

## Protocol-Specific Intelligence (Wave 8)

### Wormhole
**Architecture:** 19 Guardian nodes, 13-of-19 super majority, signed VAAs
**Audits:** Multiple (public repo at github.com/wormhole-foundation/wormhole-audits), NTT audit competitions
**Bug Bounty:** Immunefi (active)

**Known vulnerabilities (all patched):**
- **Original bridge exploit** ($326M, Feb 2022, EP-001/EP-092): Fake sysvar injection bypassed signature verification
- **"One Key" guardian set bypass** ($50K bounty, Jan 2024, EP-121): Genesis guardian sets (index 0/1) had ExpirationTime=0 → never expired → single genesis key could validate any VAA on Wormchain, bypassing 13/19 quorum. Fixed: only latest set valid when expiration=0
- **Uninitialized implementation** (2022): Implementation contract upgraded but not initialized → $1.8B at risk of ransom
- **Wormchain guardian expiration** ($50K bounty): Cosmos SDK + CosmWasm chain connecting Cosmos ecosystem via Wormhole

**Security architecture strengths:**
- Guardians run full nodes (not light nodes) of every connected blockchain
- If blockchain suffers consensus attack, it disconnects rather than producing invalid VAAs
- NTT (Native Token Transfer) framework for token bridging

**Key audit focus areas for Wormhole integrations:**
- VAA verification: Verify signature threshold and guardian set validation
- Guardian set rotation: Ensure old sets are properly expired
- NTT: Token accounting across chains, message replay protection
- Implementation initialization: Verify all proxy/implementation contracts are properly initialized

### deBridge
**Architecture:** DLN (Decentralized Liquidity Network) for asset transfers
**Audits:** Halborn (Solana contracts, Jan 2024)
**Status:** No public security incidents — clean security record

**Key audit focus areas:**
- Cross-chain message validation
- Liquidity pool accounting
- Fee calculation accuracy

### Allbridge
**Architecture:** Cross-chain bridge supporting EVM and non-EVM (Solana)
**Audits:** Kudelski Security, Quarkslab, Sherlock

**Known incidents:**
- **Flash loan exploit** ($570K, Apr 2023): BNB chain side — price manipulation of USDT/BUSD stablecoin pools via flash loan. Not on Solana, but same codebase may share patterns.

**Key audit focus areas:**
- Stablecoin pool price manipulation resistance
- Flash loan interaction with bridge pools
- Cross-chain message integrity

---
<!-- Sources: Waves 1-2+7+8 research, Wormhole/Ronin/Nomad/Poly Network/Harmony/Multichain exploits, BlockSec analysis, Chainlink bridge security, SoK academic paper (2024), Presto Labs research, Wave 4 audit mining, Marco Hextor Wormhole disclosure, Immunefi wormhole-uninitialized, deBridge/Halborn audit, Allbridge/Neptune Mutual analysis -->
