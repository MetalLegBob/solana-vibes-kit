---
pack: solana
topic: "Program Upgrade Strategies"
decision: "How should I handle program upgradeability?"
confidence: 8/10
sources_checked: 50
last_updated: "2026-02-15"
---

# Program Upgrade Strategies

> **Decision:** How should I handle program upgradeability?

## Context

Unlike Ethereum's immutable-by-default smart contracts, Solana programs are **upgradeable by default**. When you deploy a program using the BPF Upgradeable Loader, it creates two accounts: the program account (executable) and the program data account (containing the bytecode). The deployment process assigns an **upgrade authority** — a single keypair that can replace the program's bytecode at any time.

This design choice favors developer velocity and iterative improvement, but creates a critical security tradeoff: the upgrade authority becomes a single point of failure. A compromised authority can drain user funds, alter protocol logic, or rug pull liquidity. The FTX collapse in November 2022 nearly caused catastrophic damage to Solana DeFi when concerns arose about upgrade authorities controlled by FTX-affiliated entities — Serum's upgrade authority had to be frozen immediately, and protocols like Solend faced existential risk managing whale positions during market chaos.

For users evaluating a protocol, upgrade authority management is **more important than a code audit**. An audited program with a single-key upgrade authority can be changed to unaudited malicious code in seconds. The upgrade authority model determines whether a protocol is trustless (immutable), trust-minimized (multisig/governance), or trust-dependent (single admin key). Most production Solana protocols use Squads Protocol multisig as their upgrade authority, with 10+ signatures required for major DeFi protocols like Jupiter, Marinade, and Kamino.

## Options

### Option A: Upgradeable with Single-key Authority

**What:** Default Solana deployment — one keypair (typically the deployer's wallet) can upgrade the program using `solana program deploy <program.so>`.

**Pros:**
- Maximum development velocity during active iteration
- No coordination overhead for emergency patches
- Simple operational model for early-stage projects
- Can deploy fixes immediately when bugs are discovered

**Cons:**
- **Critical security risk** — single compromised key = total protocol compromise
- Users must trust the team completely (no code is "final")
- No transparency or notice before upgrades ship
- Key management burden (hardware wallet required for production)
- Difficult to upgrade programs from hardware wallets (requires signing hundreds of buffer write transactions)

**Best for:**
- Development and testnet environments
- Pre-launch products with no user funds at risk
- Temporary state during initial mainnet deployment (should transition quickly)
- Internal tools where trust is acceptable

**Warning:** Never use this for production protocols holding user funds. Even well-intentioned teams face operational risk (phishing attacks on deployer keys, insider threats, legal seizure of keys).

---

### Option B: Upgradeable with Multisig Authority (Squads)

**What:** Transfer program upgrade authority to a Squads Protocol multisig requiring M-of-N signatures. Upgrades require multiple team members (or DAO + core team) to approve transactions jointly.

**Pros:**
- **Industry standard for production protocols** — eliminates single point of failure
- Transparent upgrade process (proposals visible on-chain before execution)
- Defense against compromised individual keys or insider threats
- Can implement timelocks via governance integrations
- Supports complex approval policies (e.g., 3-of-5 for minor updates, 7-of-10 for critical changes)
- Squads provides dedicated UI for program upgrade management
- Compatible with verifiable builds workflow

**Cons:**
- Coordination overhead for emergency patches (need M signers online)
- Requires operational discipline (key holder availability, secure communication)
- Slightly higher complexity than single key
- Signer set management is critical (lost keys, member turnover)
- Still requires trusting the signer set (not trustless, but trust-minimized)

**Best for:**
- **All production protocols with user funds** (this is the baseline)
- DeFi protocols, NFT marketplaces, infrastructure programs
- Projects that have raised funding or have public users
- Teams serious about security posture and user trust

**Real-world examples:**
- **Jupiter**: Largest DEX aggregator on Solana — uses Squads multisig
- **Marinade Finance**: Liquid staking protocol securing $1B+ TVL — uses Squads
- **Kamino Finance**: Lending protocol — uses Squads with governance integration
- **Drift Protocol**: Perpetuals DEX — uses Squads multisig
- **Phoenix Protocol**: Order book DEX — uses Squads
- Most protocols securing $10B+ combined through Squads infrastructure

**Implementation:**
1. Deploy program with your keypair as initial authority
2. Create a Squads multisig with appropriate M-of-N threshold
3. Transfer upgrade authority: `solana program set-upgrade-authority <program-id> --new-upgrade-authority <squads-vault-address>`
4. Test upgrade workflow on devnet before mainnet
5. Document process for emergency upgrades (who are signers, how to reach them)

---

### Option C: Immutable (Authority Revoked)

**What:** Permanently remove the upgrade authority using `solana program set-upgrade-authority <program-id> --final`. This makes the program **immutable forever** — no one can upgrade it, even if a critical bug is discovered.

**Pros:**
- **Maximum trust guarantees** for users — code is final and verifiable
- Eliminates all upgrade-related attack vectors
- Appropriate for "set it and forget it" protocols (e.g., simple token programs)
- Strongest signal of long-term commitment and no rug risk
- Simplifies security model (one-time audit is sufficient if comprehensive)

**Cons:**
- **Cannot fix bugs** — even critical vulnerabilities are permanent
- Requires flawless initial code (comprehensive audits, extensive testing)
- Cannot adapt to ecosystem changes (new Solana features, evolving standards)
- Users may lose funds to undiscovered bugs with no recourse
- Operational inflexibility (cannot add features users request)
- Discourages innovation and experimentation

**Best for:**
- Battle-tested programs after extensive production use (e.g., SPL Token standard programs)
- Simple, well-understood logic that rarely needs updates (basic vaults, simple escrows)
- Protocols prioritizing trustlessness over adaptability
- Final stage after years of upgradeable operation proving stability

**Real-world examples:**
- **SPL Token Program** (TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA): Immutable after years of production use
- **Metaplex Token Metadata** (later versions): Some versions made immutable post-standardization
- **Serum DEX** (after FTX collapse): Upgrade authority frozen to prevent FTX-related compromise

**Decision framework:**
- Has the program been in production for 2+ years with no issues?
- Is the logic simple and unlikely to need feature updates?
- Are there alternative migration paths if bugs are found (deploy new program, migrate users)?
- Have you completed 3+ independent security audits with zero high/critical findings?

If not all "yes," don't revoke upgrade authority yet.

---

### Option D: Timelocked Upgrades (Governance-gated)

**What:** Combine multisig authority with on-chain governance + time delays. Upgrades must pass a governance vote and wait a mandatory delay (e.g., 3-7 days) before execution, giving users notice to exit if they disagree.

**Pros:**
- Users can monitor pending upgrades and react (exit protocol if upgrade is malicious)
- Democratic decision-making for protocol changes
- Transparent upgrade process with community oversight
- Reduces risk of rapid malicious upgrades (attacker can't rug instantly)
- Aligns with DeFi ethos of decentralized control

**Cons:**
- **Slow emergency response** — time delays prevent rapid bug fixes
- Governance overhead (proposal creation, voting periods, execution)
- Requires mature governance infrastructure (token distribution, voter participation)
- Attack surface includes governance contracts (bribe attacks, vote buying)
- Complex operational model (may discourage iteration)

**Best for:**
- Mature DeFi protocols with established governance tokens
- DAOs managing treasury programs or infrastructure
- Protocols where user exit rights are critical (lending, staking)
- High-value programs where transparency justifies slower upgrades

**Implementation patterns:**
- Use Realms (Solana's on-chain governance) or similar frameworks
- Configure upgrade authority as a governance PDA
- Set time delays appropriate to risk profile (3 days for minor, 7 days for critical changes)
- Maintain an emergency multisig for critical security patches (bypasses delay)

**Real-world considerations:**
- Most protocols find timelocked governance too slow for competitive DeFi environment
- Hybrid approach common: multisig for upgrades, governance for parameter changes
- Ensure governance cannot be easily captured (Sybil resistance, quorum requirements)

---

### Option E: Program Versioning (Deploy New, Deprecate Old)

**What:** Instead of upgrading programs in-place, deploy new program versions as separate addresses (e.g., `myprotocol-v1`, `myprotocol-v2`) and migrate users/liquidity over time. Old program can be deprecated or made immutable.

**Pros:**
- Users can audit new version before migrating (voluntary opt-in)
- Old version remains available (no forced migration)
- Clear versioning and historical record on-chain
- Reduces risk of breaking changes affecting existing users
- Can run multiple versions simultaneously (A/B testing, gradual rollout)

**Cons:**
- **Liquidity fragmentation** — splits users across versions
- Requires user action (friction, low migration rate for inactive users)
- Operational overhead (maintain multiple codebases, support old versions)
- Complex for protocols relying on network effects (liquidity depth, composability)
- Account migration complexity (users must move funds manually or via migration scripts)

**Best for:**
- Major protocol overhauls with significant architectural changes
- NFT standards evolution (Metaplex v1 → v2 → v3)
- Programs where backward compatibility is impossible
- Protocols where user control outweighs network effects
- Experimental features that may not be adopted widely

**Real-world examples:**
- **Metaplex Token Metadata**: v1 → v2 → v3 deployed as separate programs
- **Serum → Phoenix/OpenBook**: Community forked Serum after FTX collapse
- **Raydium v1 → v2**: New AMM design deployed separately

**Migration strategies:**
- Provide migration UI in frontend (one-click move from v1 to v2)
- Offer incentives for early migration (bonus rewards, reduced fees)
- Set deprecation timeline for old version (e.g., 6 months notice)
- Communicate clearly about end-of-life for old contracts

---

## Account Migration Strategies

**Critical insight:** Upgrading program code is straightforward (just deploy new bytecode), but upgrading **account data structures** is the hard part. If your program stores user state in accounts (balances, positions, metadata), and you change the account schema, you must migrate existing accounts.

### Account Versioning with Discriminators

**Pattern:** Include a version field in every account struct. On every instruction, check version and branch logic accordingly.

```rust
#[account]
pub struct UserAccount {
    pub version: u8,  // Version discriminator
    pub owner: Pubkey,
    pub balance: u64,
    // v2 fields (optional for v1 accounts):
    pub rewards: Option<u64>,
    pub last_claim: Option<i64>,
}

pub fn process_instruction(accounts: &[AccountInfo], data: &[u8]) -> ProgramResult {
    let user_account = UserAccount::try_from_slice(data)?;

    match user_account.version {
        1 => process_v1_logic(accounts, user_account),
        2 => process_v2_logic(accounts, user_account),
        _ => Err(ProgramError::InvalidAccountData),
    }
}
```

**Pros:**
- Backward compatibility (old accounts still work)
- Gradual migration (users upgrade on next interaction)
- No forced mass migration

**Cons:**
- Code complexity (maintain multiple versions in same codebase)
- Technical debt accumulates if many versions coexist
- Must test all version paths

---

### Lazy Migration on Access

**Pattern:** When a user interacts with the program, automatically migrate their account to latest version during the transaction.

```rust
pub fn migrate_account_if_needed(account: &mut UserAccount) -> Result<()> {
    if account.version < CURRENT_VERSION {
        // Migrate fields
        if account.version == 1 {
            account.rewards = Some(0);
            account.last_claim = Some(Clock::get()?.unix_timestamp);
        }
        account.version = CURRENT_VERSION;
    }
    Ok(())
}
```

**Pros:**
- Zero user friction (happens automatically)
- No separate migration transactions needed
- Gradual migration as users interact

**Cons:**
- Inactive users never migrate (stale accounts persist)
- Increased compute cost for first post-upgrade transaction
- Must handle migration failures gracefully

---

### Batch Migration Scripts

**Pattern:** After deploying new version, run off-chain scripts to migrate all accounts in batches.

```typescript
// Migration script (run by protocol team)
const accountsToMigrate = await program.account.userAccount.all();
for (const account of accountsToMigrate) {
  if (account.version < 2) {
    await program.methods
      .migrateAccount()
      .accounts({ userAccount: account.publicKey })
      .rpc();
  }
}
```

**Pros:**
- Proactive (don't wait for users to trigger migration)
- Clean state (all accounts at same version)
- Can set deadline for old version support

**Cons:**
- **Centralized** (team controls migration, not users)
- Transaction fees (who pays? Team or users?)
- Failure handling (network congestion, partial migrations)
- Requires authority over accounts or special migration instruction

---

### Best Practices for Account Migrations

1. **Always version accounts from day 1** — add version field even if you think you won't need it
2. **Use reserved bytes** for future fields: `pub reserved: [u8; 64]` gives you space for expansion
3. **Test migrations on devnet** with realistic data volumes
4. **Document migration path** in code comments and user-facing docs
5. **Minimize breaking changes** — prefer additive changes (new fields) over structural rewrites
6. **Consider account reallocations** — if new version needs more space, use `realloc` instruction carefully
7. **Graceful degradation** — if migration fails, don't brick user accounts

---

## Verifiable Builds

**Problem:** Users must trust that the on-chain bytecode matches the GitHub source code. A team could deploy audited code, then silently upgrade to malicious code. Verifiable builds solve this.

### What Are Verifiable Builds?

A verifiable build is a **deterministic compilation** of Solana programs that produces identical bytecode regardless of who builds it or where. This allows anyone to:
1. Check out source code from GitHub at a specific commit
2. Build the program locally using `anchor build --verifiable` (or `solana-verify`)
3. Compare the hash of their build to the on-chain program hash
4. Verify they match — proving the on-chain code matches the public source

### Why Verifiable Builds Matter for Trust

- **Transparency:** Users can audit the exact code running on-chain
- **Audit validity:** Security audits are meaningless if you can't verify audited code == deployed code
- **Upgrade accountability:** When a program is upgraded, users can diff the source changes
- **Decentralization:** No need to trust the team's claim about what code is deployed

### Current Tooling State

**Anchor (v0.27+):**
```bash
# Build verifiable program
anchor build --verifiable

# Verify deployed program matches GitHub source
anchor verify <program-id> --provider.cluster mainnet
```

**OtterSec Solana Verifiable Build:**
```bash
# Build using Docker for determinism
solana-verify build

# Verify against on-chain program
solana-verify verify-from-repo <program-id> \
  --repo https://github.com/yourorg/yourprogram \
  --commit-hash abc123
```

**Ellipsis Labs solana-verifiable-build:**
```bash
# Alternative tool with GitHub Actions support
solana-verifiable-build verify-from-repo -p <program-id> \
  --repository https://github.com/yourorg/yourprogram
```

### Integration with Multisig Upgrades

Best practice workflow:
1. Develop new version in feature branch
2. Build verifiable artifact: `anchor build --verifiable`
3. Create Squads proposal to upgrade program (include GitHub commit hash in proposal description)
4. Multisig signers verify build before signing: `anchor verify <program-id>`
5. After M-of-N approval, upgrade executes
6. Community can independently verify the upgrade matched the proposal

### Limitations and Gaps

- **Not all programs support verifiable builds** — requires Anchor framework or custom Docker setup
- **Rust toolchain changes** can break determinism (pin Rust version in CI)
- **Dependency variability** — crates.io dependencies may change; use `Cargo.lock` and vendor dependencies
- **Verification UIs lacking** — most users don't run verification commands (need better frontends)
- **No enforcement** — on-chain program doesn't require verification (purely social/transparency mechanism)

**Recommendation:** Always deploy with verifiable builds enabled for production programs. Include verification instructions in your README and announce commit hashes when upgrading.

---

## Key Trade-offs

| Dimension | Single Key | Multisig (Squads) | Immutable | Timelocked Governance | Program Versioning |
|-----------|------------|-------------------|-----------|----------------------|-------------------|
| **Trust Model** | Trust team completely | Trust M-of-N signers | Trustless (code is final) | Trust voters + time delay | Trust new version before migrating |
| **Flexibility** | Maximum (instant upgrades) | High (coordinated upgrades) | Zero (no changes ever) | Moderate (slow but possible) | High (deploy new versions) |
| **User Risk** | Highest (single point of failure) | Moderate (distributed risk) | Bug risk only (no upgrade risk) | Low (exit window during delay) | Voluntary (users choose when to migrate) |
| **Operational Overhead** | Minimal | Moderate (coordinate signers) | Zero (no upgrades) | High (governance process) | High (maintain multiple versions) |
| **Emergency Response** | Instant | Hours (gather signatures) | Impossible | Days (timelock delay) | Fast (deploy new version) |
| **Appropriate for DeFi** | ❌ Never | ✅ Standard | ⚠️ Only if battle-tested | ✅ For mature protocols | ⚠️ Fragments liquidity |
| **Development Velocity** | Fastest | Fast | N/A (one-time deploy) | Slow | Fast (parallel versions) |

---

## Recommendation

**For most production Solana programs, use Option B (Squads multisig) immediately after launch:**

### Development Phase (Pre-launch)
- Use single-key authority for rapid iteration on devnet/testnet
- Perform 2+ security audits before mainnet deployment
- Build verifiable builds pipeline in CI/CD

### Launch Phase (Initial mainnet)
- Deploy with single-key authority for first 1-2 weeks
- Monitor closely for critical bugs
- Be transparent that authority will transition to multisig

### Production Phase (Post-launch)
- **Within 2 weeks of mainnet:** Transfer upgrade authority to Squads multisig
  - Recommended thresholds:
    - Small teams (3-5 members): 2-of-3 or 3-of-5
    - Medium teams (6-10 members): 3-of-5 or 4-of-7
    - Large protocols: 5-of-9 or 7-of-10 with geographic distribution
- Document multisig members publicly (build trust)
- Test upgrade workflow on devnet before first mainnet upgrade
- Implement verifiable build process for all upgrades
- Announce upgrades 24-48 hours in advance (unless emergency security patch)

### Maturity Phase (1-2 years in production)
- **For DeFi protocols:** Consider timelocked governance integration (Realms)
- **For infrastructure/standard programs:** Consider making immutable after extensive battle-testing
- **For NFT/gaming programs:** May keep multisig indefinitely for feature evolution

### Special Cases

**High-value DeFi (>$100M TVL):**
- Use 7-of-10+ multisig with reputable ecosystem participants
- Integrate governance for major upgrades
- Require 3+ independent audits before any upgrade
- Use timelocks for non-emergency upgrades (48-72 hour delay)

**Experimental/early-stage products:**
- Multisig of core team is sufficient initially
- Focus on verifiable builds over governance complexity
- Plan transition to broader signer set as protocol matures

**Infrastructure/standards (Token programs, Oracles):**
- Aim for immutability as end state
- Multisig for initial years until proven stable
- Final audit before revoking authority permanently

---

## Lessons from Production

### Upgrade Authority Compromises

**Serum DEX (November 2022):**
- **Incident:** FTX collapse raised concerns that Sam Bankman-Fried controlled Serum's upgrade authority
- **Impact:** Community immediately froze upgrade authority to prevent potential rug pull
- **Outcome:** Protocol forked to OpenBook and Phoenix with community-controlled multisigs
- **Lesson:** Single-entity control of upgrade authority is existential risk, even for major protocols

**Solend Governance Crisis (June 2022):**
- **Incident:** Solend DAO passed vote to take over whale wallet during liquidation crisis (not upgrade authority compromise, but governance risk)
- **Impact:** Community outrage over centralized intervention despite DAO vote
- **Outcome:** Vote reversed, highlighted tension between DeFi values and operational necessity
- **Lesson:** Even decentralized governance can be controversial; transparency and time delays matter

**Step Finance Treasury Compromise (January 2026):**
- **Incident:** Hackers compromised executive team devices, stole $40M from treasury wallets
- **Impact:** While not program upgrade authority, shows risk of key management
- **Outcome:** Partial recovery through security response, but major user losses
- **Lesson:** Multisig alone isn't enough; operational security (device security, phishing resistance) is critical

### Failed Migrations

**Solend Isolated Pool Exploit (November 2022):**
- **Incident:** Attacker exploited oracle issues during program upgrade, drained $1.26M from isolated pools
- **Impact:** Bad debt left in protocol after upgrade-related bug
- **Lesson:** Test upgrades extensively; oracle integrations are high-risk during migrations

### Successful Multisig Adoption

**Squads Protocol adoption metrics (2023-2025):**
- 450+ teams using Squads for program upgrade authority
- $15B+ in assets secured through Squads multisigs
- $5B+ in stablecoin transfers managed through Squads
- Major protocols (Jupiter, Marinade, Kamino, Drift, Phoenix) all use Squads

**Pattern:** The ecosystem converged on Squads as the standard multisig solution. It's now considered baseline security hygiene for serious protocols.

### Upgrade Authority Hygiene Best Practices from Production

1. **Never use hot wallets** for upgrade authority (even temporarily)
2. **Hardware wallets are insufficient** for single-key authority (use multisig even with hardware wallet signers)
3. **Verify before signing** — signers must independently verify builds before approving upgrades
4. **Document emergency procedures** — how to gather signatures quickly for critical patches
5. **Geographic distribution** of multisig signers reduces single points of failure
6. **Public accountability** — announce signer identities (builds trust, but also social pressure for good behavior)
7. **Regular key rotation** — if signer leaves team, update multisig membership promptly

---

## Sources

- [Squads Protocol - Managing Program Upgrades with Multisig](https://squads.xyz/blog/solana-multisig-program-upgrades-management) — Industry best practices for multisig upgrade authority, FTX collapse case study
- [Solana Docs - Deploying Programs](https://solana.com/docs/programs/deploying) — Official CLI reference for program deployment and upgrade authority management
- [Neodyme - Why Auditing the Code is Not Enough](https://neodyme.io/en/blog/solana_upgrade_authority) — Security analysis of upgrade authority risks, Solend case study
- [Sec3 - How Is a Solana Program Deployed and Upgraded](https://www.sec3.dev/blog/solana-internals-part-2-how-is-a-solana-program-deployed-and-upgraded) — Technical deep dive on BPF Upgradeable Loader internals
- [Solana Cookbook - Migrating Program Data Accounts](https://solanacookbook.com/guides/data-migration.html) — Account versioning and migration patterns
- [Medium - 10 Solana Upgrade Playbooks With Zero Shock](https://medium.com/@sparknp1/10-solana-upgrade-playbooks-with-zero-shock-c911803a9a8c) — Operational best practices for safe upgrades
- [Solana Docs - Verifying Programs](https://solana.com/docs/programs/verified-builds) — Verifiable build implementation guide
- [Ellipsis Labs - solana-verifiable-build](https://github.com/ellipsis-labs/solana-verifiable-build) — Verifiable build tooling
- [Helius - Solana Hacks, Bugs, and Exploits: A Complete History](https://www.helius.dev/blog/solana-hacks) — Comprehensive security incident analysis including upgrade-related exploits
- [CoinsBench - Evolving Without Breaking: Mastering Data Migration on Solana](https://coinsbench.com/evolving-without-breaking-mastering-data-migration-on-solana-a4409df8a339) — Account migration strategies
- [Nadcab - Upgradability of Solana Smart Contracts Complete Guide](https://www.nadcab.com/blog/upgradability-of-solana-smart-contracts) — Overview of upgrade mechanisms
- [BlockSec - Secure the Solana Ecosystem (3) — Program Upgrade](https://blocksec.com/blog/secure-the-solana-ecosystem-3-program-upgrade) — Security considerations for program upgrades
- [QuickNode - How to Make an Immutable Solana Program](https://www.quicknode.com/guides/solana-development/anchor/how-to-make-immutible-solana-programs) — Guide to revoking upgrade authority
- [GitHub Issue - set-upgrade-authority is scary](https://github.com/solana-labs/solana/issues/27932) — Community discussion on upgrade authority UX challenges
- [Solana Stack Exchange - Program Upgrade Best Practices](https://solana.stackexchange.com/questions/9328/solana-program-upgrade-best-practices) — Community knowledge on upgrade patterns

---

## Gaps & Caveats

**Loader v3 / v4 Changes:**
The current BPF Upgradeable Loader may evolve with Solana's roadmap. Future loader versions could introduce:
- Built-in timelocks at the loader level
- On-chain governance hooks for upgrades
- Improved program versioning primitives
- Changes to upgrade authority model

Monitor Solana improvement proposals (SIMDs) for loader updates that could affect upgrade strategies.

**Evolving Governance Tooling:**
On-chain governance on Solana is still maturing:
- Realms (SPL Governance) is widely used but has UX limitations
- Newer frameworks (Tribeca, Goki) experiment with alternative models
- Cross-program governance composability is improving
- Best practices for token-weighted voting, quorum, and delegation are still emerging

**Verifiable Build Limitations:**
- Tooling fragmentation (Anchor vs OtterSec vs Ellipsis approaches)
- Not all dependencies produce deterministic builds
- CI/CD integration requires manual setup
- No standardized UI for end-users to verify programs (most verification is developer-focused)

**Multisig Operational Challenges:**
- Key management for distributed signers (especially for international teams)
- Emergency upgrade coordination across time zones
- Signer availability (vacation, departures, compromise)
- Social engineering risks targeting individual signers
- Legal/regulatory uncertainty around multisig responsibilities

**Account Migration Blind Spots:**
- Large-scale migrations (millions of accounts) can hit RPC/network limits
- Compute budget constraints for complex migrations
- User communication challenges (many users don't monitor social channels)
- Backward compatibility testing is often insufficient
- No standard migration notification mechanism on-chain

**Future Research Needed:**
- Formal verification of upgrade safety (provably safe upgrades)
- Zero-knowledge proofs for upgrade transparency (prove upgrade properties without revealing code)
- Automated compatibility testing for account schema changes
- On-chain upgrade impact disclosure (which accounts/users affected by upgrade)
- Insurance protocols for upgrade-related risks
