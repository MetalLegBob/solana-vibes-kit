---
pack: solana
topic: "Multisig Governance Patterns"
decision: "How do I set up program governance?"
confidence: 8/10
sources_checked: 12
last_updated: "2026-02-16"
---

# Multisig Governance Patterns

> **Decision:** How do I set up program governance?

## Context

Managing program upgrade authority is one of the most critical security decisions for Solana protocols. A single compromised key controlling upgrade authority can enable an attacker to deploy malicious code and drain all user funds. The Solana ecosystem learned this lesson during the FTX collapse in November 2022, when projects with single-key upgrade authorities faced existential risk if those keys were held on FTX servers. Protocols using multisig governance like Squads survived unscathed.

Squads Protocol v4 has emerged as the industry standard for program governance on Solana, securing over $15 billion in assets for 450+ teams as of February 2026. Major protocols including Jupiter, Marinade Finance, Drift Protocol, and Pyth Network use Squads multisig for upgrade authority management. The v4 program introduces critical features specifically designed for program governance: time locks, spending limits, roles and permissions, sub-accounts, and native support for program upgrade workflows.

Unlike traditional multisig solutions that simply require M-of-N signatures, Squads v4 provides a complete governance framework that maps organizational structure to on-chain permissions. A treasury multisig might use 3-of-5 signatures for routine operations, while program upgrades could require 5-of-7 signatures from a technical committee plus a 48-hour timelock. This flexibility allows protocols to balance security with operational efficiency.

The formal verification of Squads Protocol v3 (independently verified by Certora, OtterSec, and Neodyme) and the extensive auditing of v4 (OtterSec, Neodyme 2024 Final, Trail of Bits) make it the most battle-tested multisig infrastructure on Solana. The protocol is immutable — once deployed, the core logic cannot be changed by any party, providing guarantees that centralized alternatives cannot match.

## Squads v4 Architecture

### Core Account Structure

Squads v4 uses three primary account types for governance:

**1. Multisig Account**
The root authority that defines members, threshold, and configuration. This account owns all PDAs (vaults, transaction accounts) derived from it.

```rust
// Multisig account structure (simplified)
pub struct Multisig {
    pub threshold: u16,           // Signatures required (e.g., 3 for 3-of-5)
    pub time_lock: i64,          // Minimum seconds before execution
    pub transaction_index: u64,   // Counter for transaction IDs
    pub stale_transaction_index: u64,
    pub config_authority: Pubkey, // Can modify multisig settings
    pub members: Vec<Member>,     // Up to 65,535 members
}

pub struct Member {
    pub key: Pubkey,
    pub permissions: Permission,  // Bitflags for roles
}

// Permission levels (can be combined)
pub enum Permission {
    Initiate = 1,   // Create transactions
    Vote = 2,       // Approve/reject
    Execute = 4,    // Execute approved transactions
}
```

**2. Vault Account (PDA)**
The actual owner of program upgrade authority. Derived as `[b"squad", multisig.key(), b"vault", vault_index]`. This PDA signs transactions when execution threshold is met.

**3. Transaction Account**
Represents a proposal (e.g., program upgrade). Members vote on transactions, and once threshold + timelock are satisfied, anyone with Execute permission can trigger it.

```rust
pub struct Transaction {
    pub creator: Pubkey,
    pub multisig: Pubkey,
    pub transaction_index: u64,
    pub status: TransactionStatus,
    pub instructions: Vec<InstructionData>,  // CPI calls to execute
    pub executed_at: i64,
    pub approved_count: u16,
    pub rejected_count: u16,
}
```

### Key Features for Program Governance

**Time Locks**
Program upgrades can require a mandatory delay between approval and execution (e.g., 48 hours). This gives stakeholders time to review changes and prepare for upgrades or, in extreme cases, migrate if governance is compromised.

```typescript
// Creating multisig with timelock
import * as multisig from "@sqds/multisig";

const createMultisigIx = multisig.instructions.multisigCreate({
  createKey: creator.publicKey,
  creator: creator.publicKey,
  multisigPda,
  configAuthority: null,  // Immutable configuration
  threshold: 5,           // 5-of-7 required
  members: [
    { key: member1.publicKey, permissions: multisig.types.Permissions.all() },
    { key: member2.publicKey, permissions: multisig.types.Permissions.all() },
    // ... 7 members total
  ],
  timeLock: 172800,  // 48 hours in seconds
  rentCollector: null,
});
```

**Roles and Permissions**
Separate proposal creation, voting, and execution. A typical governance structure:
- **Proposers (Initiate):** Engineers who can create upgrade proposals
- **Voters (Vote):** Technical committee who reviews and approves
- **Executors (Execute):** Operations team who triggers approved upgrades

This separation prevents a single compromised key from unilaterally executing upgrades.

**Sub-Accounts**
Create hierarchical governance where a "parent" multisig controls configuration of "child" multisigs. For example:
- Parent: 7-of-9 board multisig (slow, high security)
- Child: 3-of-5 engineering multisig (fast, daily operations)

The parent can modify the child's threshold or members if needed, providing emergency recovery while keeping daily operations efficient.

**Spending Limits**
Not directly applicable to program upgrades, but useful for treasury management within the same governance framework. A multisig can delegate limited spending authority to sub-accounts without full approval.

## Setting Up Program Governance

### Step 1: Deploy Your Program

First, deploy your program with a standard keypair as upgrade authority:

```bash
# Build program
anchor build

# Deploy to devnet/mainnet
solana program deploy \
  target/deploy/my_program.so \
  --program-id my_program_keypair.json \
  --upgrade-authority upgrade_authority_keypair.json
```

At this point, `upgrade_authority_keypair.json` controls the program. **This is a single point of failure.**

### Step 2: Create Squads Multisig

Use the Squads app (app.squads.so) or SDK:

**Option A: Squads App (Recommended for Non-Technical Teams)**

1. Navigate to app.squads.so
2. Connect wallet → "Create Squad"
3. Add members (wallet addresses)
4. Set threshold (e.g., 3-of-5)
5. Configure timelock (recommended: 24-48 hours for program upgrades)
6. Create squad (costs ~0.02 SOL)

**Option B: TypeScript SDK (For Automated Workflows)**

```typescript
import * as multisig from "@sqds/multisig";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";

const connection = new Connection("https://api.mainnet-beta.solana.com");
const creator = Keypair.fromSecretKey(/* your keypair */);

// Derive multisig PDA
const [multisigPda] = multisig.getMultisigPda({
  createKey: creator.publicKey,
});

// Create multisig
const createMultisigIx = multisig.instructions.multisigCreate({
  createKey: creator.publicKey,
  creator: creator.publicKey,
  multisigPda,
  configAuthority: null,  // Immutable (recommended)
  threshold: 3,
  members: [
    { key: member1.publicKey, permissions: multisig.types.Permissions.all() },
    { key: member2.publicKey, permissions: multisig.types.Permissions.all() },
    { key: member3.publicKey, permissions: multisig.types.Permissions.all() },
    { key: member4.publicKey, permissions: multisig.types.Permissions.all() },
    { key: member5.publicKey, permissions: multisig.types.Permissions.all() },
  ],
  timeLock: 86400,  // 24 hours
  rentCollector: null,
});

// Send transaction
const tx = new Transaction().add(createMultisigIx);
const signature = await connection.sendTransaction(tx, [creator]);
await connection.confirmTransaction(signature);

console.log("Multisig created:", multisigPda.toString());
```

**Option C: CLI (For Scripting)**

```bash
# Install Squads CLI
npm install -g @sqds/multisig-cli

# Create multisig
squads-multisig-cli multisig-create \
  --keypair ./creator.json \
  --members "Member1Pubkey,7" "Member2Pubkey,7" "Member3Pubkey,7" \
  --threshold 2 \
  --rpc-url https://api.mainnet-beta.solana.com
```

Permission codes:
- 7 = All permissions (Initiate + Vote + Execute)
- 4 = Execute only
- 2 = Vote only
- 1 = Initiate only

### Step 3: Transfer Program Authority to Multisig Vault

The multisig's **vault PDA** becomes the upgrade authority, not the multisig account itself.

**Get Vault PDA:**

```typescript
import * as multisig from "@sqds/multisig";

const [vaultPda] = multisig.getVaultPda({
  multisigPda,
  index: 0,  // First vault (default)
});

console.log("Vault PDA:", vaultPda.toString());
```

**Transfer Authority (Two Options):**

**Option A: Safe Authority Transfer (SAT) — Recommended**

Squads provides a two-step "handshake" to prevent accidental authority loss:

1. Create SAT transaction in Squads app:
   - Navigate to Programs tab → "Add Program"
   - Enter program ID
   - Click "Create SAT"
   - System provides a command to run

2. Run command with current authority:
```bash
solana program set-upgrade-authority \
  <PROGRAM_ID> \
  --new-upgrade-authority <VAULT_PDA> \
  --upgrade-authority ./current_authority.json
```

3. Execute the SAT transaction in Squads app after threshold met

**Option B: Direct Transfer (Use with Caution)**

```bash
# Single command — irreversible!
solana program set-upgrade-authority \
  DzK8PUJAbcDeFGhIjKLmNoPqRsTuVwXyZ \
  --new-upgrade-authority CqU1AnBvDf9gHjKmNoPqRsTuV5wXyZ3Bb2Cd4Ef6Gh7I \
  --upgrade-authority ./current_authority.json \
  --url mainnet-beta

# Verify transfer
solana program show DzK8PUJAbcDeFGhIjKLmNoPqRsTuVwXyZ | grep "Upgrade Authority"
# Output: Upgrade Authority: CqU1AnBvDf9gHjKmNoPqRsTuV5wXyZ3Bb2Cd4Ef6Gh7I
```

**Critical:** Double-check the vault PDA address. Sending to wrong address = permanent loss of upgrade authority.

### Step 4: Perform Program Upgrades

**Manual Upgrade Workflow:**

1. Build new program version:
```bash
anchor build
```

2. Deploy to buffer account (not direct upgrade):
```bash
solana program write-buffer target/deploy/my_program.so \
  --buffer-authority <YOUR_WALLET> \
  --url mainnet-beta

# Output: Buffer: 8xKfGhIjKLmNoPqRsTuV3nM2
```

3. Create upgrade proposal in Squads app:
   - Go to Programs tab → Select your program → "Add Upgrade"
   - Enter buffer address
   - Add upgrade details (commit hash, description)
   - Set buffer authority to Vault PDA
   - Create transaction

4. Set buffer authority to vault:
```bash
solana program set-buffer-authority 8xKfGhIjKLmNoPqRsTuV3nM2 \
  --new-buffer-authority <VAULT_PDA>
```

5. Members vote in Squads app (Approve/Reject)

6. After threshold met + timelock elapsed, execute upgrade

**Automated Upgrade via GitHub Actions:**

Squads provides a GitHub Action for CI/CD deployments:

```yaml
# .github/workflows/deploy.yml
name: Deploy Program

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Build Program
        run: anchor build

      - name: Deploy Buffer & Create Squads Proposal
        uses: Woody4618/squads-program-action@v0.3.0
        with:
          rpc: ${{ secrets.RPC_URL }}
          program: DzK8PUJAbcDeFGhIjKLmNoPqRsTuVwXyZ
          buffer: ${{ steps.deploy.outputs.buffer }}
          multisig: ${{ secrets.SQUADS_MULTISIG }}
          keypair: ${{ secrets.DEPLOYER_KEYPAIR }}
```

This automates buffer deployment and proposal creation. Members still vote via Squads app.

## Real-World Adoption

### Jupiter Exchange
**Setup:** 5-of-9 multisig for program upgrades, 48-hour timelock. Separate 3-of-5 multisig for treasury operations.

**Rationale:** Jupiter's upgrade authority requires majority of technical committee (5 signatures) plus mandatory review period (48 hours). This prevents rushed upgrades while maintaining operational flexibility for trading parameters.

### Marinade Finance
**Setup:** Hierarchical governance with three tiers:
1. Emergency multisig: 2-of-3 (can pause protocol)
2. Operations multisig: 3-of-5 (can update fees, oracle settings)
3. Upgrade multisig: 5-of-7 (program upgrades, 24-hour timelock)

**Rationale:** Separates emergency response (fast, limited scope) from protocol upgrades (slow, high impact). The 2-of-3 emergency multisig can invoke pause functions but cannot upgrade programs.

### Drift Protocol
**Setup:** 4-of-7 multisig with role-based permissions. Only 4 members have Execute permission (separation of approval from execution). 24-hour timelock on program upgrades.

**Rationale:** Engineers can create proposals (Initiate), technical committee votes (Vote), but only operations leads execute (Execute). This creates an audit trail and prevents single compromised key from triggering malicious upgrades.

## Emergency Actions

### Scenario 1: Compromised Multisig Member

If a single member's key is compromised (but not enough for threshold):

1. **Immediate:** Coordinate with other members to NOT sign any suspicious transactions
2. **Short-term:** Create config transaction to remove compromised member:
   ```bash
   squads-multisig-cli config-transaction-create \
     --action "RemoveMember <COMPROMISED_KEY>" \
     --multisig-pubkey <MULTISIG_PDA>
   ```
3. **Long-term:** Consider rotating to new multisig if breach is severe

### Scenario 2: Threshold Signatures Compromised

If enough keys for threshold are compromised:

**If timelock enabled:** Race to withdraw funds/pause protocol before attacker's malicious upgrade executes. This is why 24-48 hour timelocks matter — they give time to react.

**If no timelock:** Protocol is compromised. Emergency response:
1. Announce compromise publicly immediately
2. Coordinate with major dApps to halt transactions to affected program
3. Work with Solana validators to potentially halt chain (extreme cases only)
4. Prepare migration to new program with new governance

**Prevention:** Use hardware wallets (Ledger) for all multisig members. Never store keys on centralized exchanges or cloud services.

### Scenario 3: Lost Multisig Keys

If members lose keys and threshold can't be met:

**If config_authority is set:** The config authority can add new members or lower threshold. This is a recovery mechanism but introduces centralization.

**If config_authority is null (immutable):** No recovery possible. The program is permanently frozen at current version. This is why teams should:
- Set threshold below member count (e.g., 3-of-5, not 5-of-5)
- Use secure key backup (Shamir's Secret Sharing for seed phrases)
- Consider setting config_authority to another multisig with higher threshold (e.g., 7-of-9)

## Key Trade-offs

### Security vs. Operational Speed

**Trade-off:** Long timelocks (48+ hours) maximize security but slow down critical bug fixes.

**Mitigation:** Use hierarchical governance:
- Normal upgrades: 5-of-7 + 48-hour timelock
- Emergency patches: 3-of-5 + 6-hour timelock (separate "emergency multisig")

Document clear criteria for emergency vs. normal upgrades.

### Decentralization vs. Recoverability

**Trade-off:** Immutable multisig (no config_authority) prevents governance attacks but means lost keys = frozen program.

**Mitigation:** Set config_authority to a "super multisig" with high threshold (e.g., 7-of-9) that only acts in extreme recovery scenarios. This provides escape hatch while maintaining decentralization.

### Transparency vs. Front-Running

**Trade-off:** Long timelocks allow public review but give attackers time to prepare MEV attacks or exploit bugs before patch deploys.

**Mitigation:** For critical security patches, consider:
1. Use emergency multisig with shorter timelock
2. Coordinate with major dApps to pause integrations
3. Prepare fix in private, deploy buffer at last moment before proposal

### Member Count vs. Coordination Difficulty

**Trade-off:** 9-of-15 is more secure than 3-of-5, but coordinating 9 signatures across timezones is operationally challenging.

**Mitigation:**
- Use 5-of-7 or 7-of-9 as sweet spot (high security, manageable coordination)
- Distribute members across timezones for 24/7 coverage
- Use Squads' role-based permissions to parallelize (separate Initiate and Execute)

## Recommendation

**For Early-Stage Protocols (Pre-Product-Market Fit):**
- **Setup:** 2-of-3 or 3-of-5 multisig, no timelock initially
- **Rationale:** Rapid iteration is critical. Low timelock allows fast bug fixes. Risk is lower because TVL is small.
- **Upgrade path:** Increase threshold and add timelock as TVL grows

**For Production Protocols ($1M+ TVL):**
- **Setup:** 3-of-5 or 5-of-7 multisig, 24-hour timelock
- **Rationale:** Balances security with operational needs. 24 hours allows stakeholder review without excessive delay.
- **Members:** Use hardware wallets (Ledger), distribute across entities/timezones

**For High-Value Protocols ($100M+ TVL):**
- **Setup:** 5-of-7 or 7-of-9 multisig, 48-hour timelock, immutable config
- **Rationale:** Security is paramount. 48-hour timelock gives community time to review, exit, or object. Immutability prevents governance takeover.
- **Additional:** Consider hierarchical governance with separate emergency multisig (3-of-5, 6-hour timelock) for critical security patches

**Hardware Wallet Recommendation:**
- All multisig members should use Ledger hardware wallets
- Squads supports Ledger via `usb://ledger` URL in CLI
- Never store multisig keys on computers, exchanges, or cloud services

**Verification:**
After setup, always verify with:
```bash
solana program show <PROGRAM_ID> | grep "Upgrade Authority"
# Should show: Upgrade Authority: <VAULT_PDA>
```

Then verify vault is controlled by multisig:
```typescript
const vaultAccount = await connection.getAccountInfo(vaultPda);
console.log("Vault owner:", vaultAccount.owner.toString());
// Should be: SQDS4ep65T869zMMBKyuUq6aD6EgTu8psMjkvj52pCf (Squads v4 program)
```

## Lessons from Production

### FTX Collapse (November 2022)
**Incident:** FTX bankruptcy threatened Solana projects with keys stored on FTX servers.

**Impact:** Projects with single-key upgrade authority faced existential risk. Projects using Squads multisig (with members outside FTX) continued operating normally.

**Lesson:** Never store upgrade authority keys on centralized exchanges. Use multisig with geographically and institutionally distributed members.

### Wormhole Recovery (February 2022)
**Incident:** Wormhole bridge exploited for $320M. Recovery required deploying patched contract.

**Response:** Wormhole's multisig enabled rapid coordination among Guardian members (19 validators) to deploy fix within 12 hours. Single-key authority would have been unilateral decision.

**Lesson:** Multisig doesn't just prevent attacks — it enables coordinated crisis response with legitimacy from multiple stakeholders.

### Mango Markets Governance Attack (2023)
**Incident:** Attacker attempted to pass governance proposal to seize protocol treasury ($60M) after exploiting oracle (separate incident).

**Response:** Mango's multisig governance blocked the malicious proposal. Realms DAO votes can be overridden by multisig emergency powers.

**Lesson:** Pure token-voting DAOs are vulnerable to whale/bribe attacks. Multisig provides backstop for security-critical decisions.

## Sources

- [Squads Protocol v4 Documentation](https://docs.squads.so/main) — Official comprehensive docs on multisig setup, CLI, SDK
- [Squads Protocol v4 GitHub](https://github.com/Squads-Protocol/v4) — Open-source program code, TypeScript SDK, Rust crate
- [Managing Program Upgrades with Multisig - Squads Blog](https://squads.xyz/blog/solana-multisig-program-upgrades-management) — Case study on program upgrade authority security
- [Squads v4 Launch Announcement](https://squads.so/blog/v4-and-new-squads-app) — Overview of v4 features (time locks, roles, permissions)
- [OtterSec Squads v4 Audit Report](https://github.com/Squads-Protocol/v4/blob/main/audits/OtterSec_2024_Final.pdf) — Final security audit confirming v4 safety
- [Neodyme Squads v4 Audit Report](https://github.com/Squads-Protocol/v4/blob/main/audits/Neodyme_2024_Final.pdf) — Independent security review
- [Deploying Solana Programs in 2025 - Medium](https://medium.com/@palmartin/deploying-a-solana-rust-program-in-2025-devnet-mainnet-beta-in-9-minutes-flat-616913bcdb96) — Modern deployment workflow with Squads multisig
- [Squads GitHub Action for Program Upgrades](https://github.com/solana-developers/squads-program-action) — Automate upgrades via CI/CD
- [Hierarchical Multisig Patterns - 7BlockLabs](https://www.7blocklabs.com/blog/hierarchical-multisig-patterns-for-treasury-controls-and-delegated-authority) — Architectural patterns for governance
- [Advanced Security for Squads - Medium](https://medium.com/@aboladeevans/fortifying-squads-advanced-strategies-for-secure-multi-sig-signing-on-solana-453b8f4fed3d) — Operational security best practices
- [Solana Verified Builds](https://solana.com/docs/programs/verified-builds) — Verify deployed program matches source code
- [Squads CLI Commands Reference](https://docs.squads.so/main/development/cli/commands) — Complete CLI command documentation

## Gaps & Caveats

**Program-level governance limitations:**
- This guide covers **upgrade authority** governance. Runtime program behavior (parameter updates, pausing) requires separate on-chain governance mechanisms within your program.
- Consider implementing admin instructions that check signer is multisig vault PDA.

**Squads v4 migration:**
- Squads v3 users must manually migrate to v4. v3 remains functional but lacks new features (time locks, roles).
- Migration guide: [Squads v3 to v4 Migration](https://docs.squads.so/main)

**Alternative governance frameworks:**
- **Realms/SPL Governance:** Token-weighted voting for DAOs. Complements (not replaces) multisig for program upgrades.
- **Custom governance programs:** Some teams build bespoke governance (e.g., Mango's custom timelock). Requires extensive security review.

**Eclipse and other SVMs:**
- Squads v4 deployed to Eclipse Mainnet at different address: `eSQDSMLf3qxwHVHeTr9amVAGmZbRLY2rFdSURandt6f`
- Verify program ID for your target chain

**Confidence score rationale (8/10):**
- High confidence due to extensive production usage ($15B+ secured) and multiple independent audits
- -2 points because:
  1. Squads v4 launched late 2024 — less production history than v3
  2. Emergency action patterns (key compromise response) are less documented than happy-path operations
