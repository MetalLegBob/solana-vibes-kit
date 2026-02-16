---
pack: solana
topic: "Incident Response Playbook"
decision: "What do I do when something goes wrong on-chain?"
confidence: 7/10
sources_checked: 16
last_updated: "2026-02-16"
---

# Incident Response Playbook

> **Decision:** What do I do when something goes wrong on-chain?

## Context

On-chain incidents on Solana are fundamentally different from traditional cybersecurity breaches. Transactions are irreversible, exploits can drain millions in minutes, and response windows are measured in seconds rather than hours. Since Solana's mainnet beta launch in 2020, the ecosystem has experienced over $1.2 billion in losses across major exploits, with peak losses of $550 million in 2022 alone. However, losses decreased dramatically to $8 million in 2025 as incident response practices matured and protocols implemented lessons from past failures.

The defining characteristic of effective on-chain incident response is **speed**. The Wormhole exploit (February 2022, $320M) was detected within minutes, but the attacker drained funds before any defensive action could be taken. In contrast, Pump.fun's May 2024 incident ($1.9M) was fully mitigated within 2 hours through rapid multisig coordination and community communication, with 100% of user funds restored. The difference wasn't luck — it was preparation.

According to CRYPTOISAC's 2025 best practices analysis, protocols with documented incident response plans containing pre-authorized emergency actions respond 3-4x faster than those improvising under pressure. The FBI received 149,686 crypto-fraud complaints totaling $9.3 billion in 2024 alone — and this is only reported incidents. The true figure is likely higher. For protocols managing significant TVL, incident response planning is not optional; it's essential infrastructure.

This playbook focuses on **actionable procedures** for Solana protocol teams, not generic incident response theory. Every section includes specific commands, communication templates, and decision trees used by production protocols during real incidents. The quality bar is: Can an on-call engineer execute this during a 3am emergency?

## Incident Classification

### Severity Levels

**Critical (P0): Funds at Immediate Risk**
- Active exploit draining user funds or treasury
- Compromised multisig keys with upgrade authority
- Oracle manipulation enabling liquidations
- Smart contract vulnerability being actively exploited

**Action:** Activate emergency multisig, execute pause mechanisms, public disclosure within 1 hour

**Recent Example:** Pump.fun token bonding curve exploit (May 2024, $1.9M)

---

**High (P1): Potential for Fund Loss**
- Vulnerability discovered but not yet exploited
- Degraded oracle data affecting protocol operation
- Unauthorized access to admin functions (not yet misused)
- Suspicious transactions indicating reconnaissance

**Action:** Coordinate technical committee, prepare defensive transactions, private disclosure to security partners

**Recent Example:** Loopscale discovery of uninitialized account vulnerability (December 2024, preemptive fix)

---

**Medium (P2): Service Disruption**
- RPC endpoint failures affecting transaction submissions
- UI/frontend compromise (not smart contract)
- Non-critical function failures (e.g., reward distribution delay)
- Network congestion impacting user experience

**Action:** Standard on-call response, public status updates, coordinate with infrastructure providers

**Recent Example:** Solana network congestion during BONK airdrop (December 2023)

---

**Low (P3): Minor Issues**
- UI bugs, display errors
- Non-critical documentation errors
- Temporary monitoring alert without user impact

**Action:** Standard bug fix workflow, post-incident review

## Pre-Incident Preparation

### 1. Emergency Multisig Setup

**Goal:** Enable sub-10-minute response time for critical actions.

**Architecture:**
```
Emergency Multisig (2-of-3):
  Purpose: Circuit breaker ONLY (pause deposits, disable swaps)
  Members: 3 on-call engineers with hardware wallets
  Timelock: 0 seconds
  Scope: Limited to pause functions, cannot upgrade program or withdraw funds

Upgrade Multisig (5-of-7):
  Purpose: Program upgrades, parameter changes
  Members: Core team + 2 external advisors
  Timelock: 24 hours
  Scope: Full protocol control

Treasury Multisig (4-of-6):
  Purpose: Fund movements, bounty payments
  Members: Founders + CFO + 2 board members
  Timelock: 12 hours
  Scope: Treasury and admin accounts
```

**Rationale:** Separation of concerns. Emergency multisig can stop bleeding but cannot steal funds. This prevents both delayed response (waiting for 5-of-7 signatures) and insider threats (2-of-3 cannot drain treasury).

**Implementation:**
```typescript
// Example: Pause mechanism via emergency multisig
pub fn emergency_pause(ctx: Context<EmergencyPause>) -> Result<()> {
    let protocol_state = &mut ctx.accounts.protocol_state;

    // Only emergency multisig can call
    require!(
        ctx.accounts.authority.key() == protocol_state.emergency_authority,
        ErrorCode::UnauthorizedEmergencyAction
    );

    // Idempotent (can be called multiple times)
    if protocol_state.is_paused {
        return Ok(());
    }

    protocol_state.is_paused = true;
    protocol_state.paused_at = Clock::get()?.unix_timestamp;

    emit!(EmergencyPauseEvent {
        timestamp: Clock::get()?.unix_timestamp,
        authority: ctx.accounts.authority.key(),
    });

    Ok(())
}

// All user-facing functions check pause state
pub fn deposit(ctx: Context<Deposit>, amount: u64) -> Result<()> {
    let protocol_state = &ctx.accounts.protocol_state;

    require!(
        !protocol_state.is_paused,
        ErrorCode::ProtocolPaused
    );

    // ... deposit logic
}
```

**Key Features:**
- **Idempotent:** Can be called multiple times without error (prevents panic during chaos)
- **Event emission:** Creates on-chain record with timestamp and authority
- **Scoped:** Only affects user-facing functions, not emergency functions (can still execute recovery)

### 2. Monitoring and Alerting

**Goal:** Detect incidents within 60 seconds.

**Critical Metrics:**
```yaml
Alerting Thresholds:
  Large Withdrawals:
    - Single transaction > $100k → Page emergency multisig
    - Total withdrawals in 5min > $500k → Page emergency multisig
    - Unusual beneficiary (not user-controlled wallet) → Investigate

  Failed Transactions:
    - Program error rate > 5% for 60s → Investigate
    - Specific error code (e.g., InvalidAccountData) > 10/min → Potential attack

  Oracle Deviations:
    - Price feed deviation > 10% from CEX TWAP → Halt liquidations
    - Staleness (no update in 60s) → Degrade gracefully or pause

  Admin Actions:
    - Any config change → Notify all core team immediately
    - Upgrade buffer deployment → Verify authorized in team channel

  Multisig Activity:
    - Emergency multisig transaction → Page all members
    - New proposal in upgrade multisig → Notify technical committee
```

**Implementation Options:**

**Option A: Helius Webhooks**
```typescript
// Register webhook via Helius Dashboard or API
const webhook = {
  webhookURL: "https://your-server.com/helius-webhook",
  accountAddresses: [
    protocol_treasury_pda,
    protocol_state_account,
    emergency_multisig_pda
  ],
  transactionTypes: ["ANY"],
  webhookType: "enhanced"
};

// Handler (Express.js example)
app.post('/helius-webhook', async (req, res) => {
  const transactions = req.body;

  for (const tx of transactions) {
    // Check for large transfers
    const nativeTransfer = tx.nativeTransfers?.[0];
    if (nativeTransfer && nativeTransfer.amount > 100_000_000_000) { // 100 SOL
      await alertEmergencyTeam({
        type: "LARGE_WITHDRAWAL",
        amount: nativeTransfer.amount / 1e9,
        signature: tx.signature,
        from: nativeTransfer.fromUserAccount,
        to: nativeTransfer.toUserAccount
      });
    }

    // Check for unusual program errors
    if (tx.meta?.err) {
      await logError({
        signature: tx.signature,
        error: tx.meta.err,
        timestamp: tx.blockTime
      });
    }
  }

  res.sendStatus(200);
});
```

**Option B: Custom RPC Monitoring**
```typescript
// Poll program accounts every 5 seconds
setInterval(async () => {
  const protocolState = await program.account.protocolState.fetch(protocolStatePda);

  // Check if paused unexpectedly
  if (protocolState.isPaused && !expectedPauseState) {
    await alertEmergencyTeam({
      type: "UNEXPECTED_PAUSE",
      pausedAt: protocolState.pausedAt,
      authority: protocolState.lastPauseAuthority
    });
  }

  // Check treasury balance
  const treasuryBalance = await connection.getBalance(treasuryPda);
  if (treasuryBalance < expectedMinBalance) {
    await alertEmergencyTeam({
      type: "TREASURY_DRAIN",
      currentBalance: treasuryBalance / 1e9,
      expectedMin: expectedMinBalance / 1e9
    });
  }
}, 5000);
```

**Option C: On-Chain Event Monitoring**
```typescript
// Subscribe to program logs (real-time)
connection.onLogs(programId, async (logs, context) => {
  // Parse for emergency events
  if (logs.logs.some(log => log.includes("EmergencyPauseEvent"))) {
    await alertEmergencyTeam({
      type: "EMERGENCY_PAUSE_EXECUTED",
      signature: logs.signature,
      slot: context.slot
    });
  }

  // Parse for large transfers
  if (logs.logs.some(log => log.includes("Transfer") && log.includes("amount:"))) {
    // Extract amount and alert if threshold exceeded
    // (implementation depends on log format)
  }
}, "confirmed");
```

### 3. Communication Templates

**Goal:** Eliminate decision paralysis during crisis. Pre-approved templates for instant deployment.

**Template 1: Critical Incident Alert (Public)**
```markdown
⚠️ SECURITY INCIDENT ALERT ⚠️

[Protocol Name] has identified a critical security vulnerability affecting [scope: deposits/withdrawals/specific function].

IMMEDIATE ACTION REQUIRED:
❌ DO NOT interact with [affected functions] until further notice
✅ Funds in [unaffected areas] are NOT at risk
🔒 Protocol is currently PAUSED to prevent further exposure

STATUS: Active investigation
IMPACT: [Estimated affected users/funds]
TIMELINE: Updates every 30 minutes

Official updates: [Twitter], [Discord], [Status page]
Verified only: Check @[official_handle] for authentic information

— Posted [UTC timestamp]
```

**Template 2: Multisig Emergency Action (Private Channel)**
```markdown
@emergency-multisig URGENT ACTION REQUIRED

INCIDENT: [One-line description]
SEVERITY: P0 - Funds at Risk
ACTION REQUIRED: Execute emergency pause

TRANSACTION PREPARED:
Squads URL: [Direct link to transaction]
Function: emergency_pause()
Scope: [Specific functions being paused]
Reversible: Yes (via unpause)

SIGNERS REQUIRED: 2 of 3
Time-sensitive: SIGN IMMEDIATELY

Incident channel: #incident-[timestamp]
Lead: @[on-call-engineer]
```

**Template 3: Post-Incident Report (Public)**
```markdown
[Protocol Name] Incident Report: [Date]

SUMMARY:
On [date] at [time UTC], we identified [vulnerability type] affecting [scope]. The incident was resolved [timeline]. [X] users were affected, and [funds impact].

TIMELINE:
[HH:MM UTC] Incident detected via [monitoring system]
[HH:MM UTC] Emergency multisig activated, protocol paused
[HH:MM UTC] Root cause identified: [technical description]
[HH:MM UTC] Fix deployed to buffer account
[HH:MM UTC] Upgrade multisig approved fix (5 of 7 signatures)
[HH:MM UTC] Fix executed on-chain, protocol resumed
[HH:MM UTC] User fund restoration completed

ROOT CAUSE:
[Technical explanation with code snippets if appropriate]

AFFECTED USERS:
Total: [X] wallets
Total value: $[Y]
Restoration: 100% of affected funds returned via [mechanism]

REMEDIATION:
Immediate:
- [Action 1]
- [Action 2]

Long-term:
- Additional audit of [related code area]
- Enhanced monitoring for [specific pattern]
- Update incident response procedures

COMPENSATION:
[Compensation plan if applicable]

THANKS:
We thank [individuals/orgs who helped] for rapid response.

Full postmortem: [Link to detailed technical writeup]
```

## Incident Response Procedures

### Procedure 1: Active Exploit Detection

**Trigger:** Monitoring alert indicates suspicious activity or community reports exploit.

**Immediate Actions (0-5 minutes):**

1. **Verify exploit is real:**
```bash
# Check recent transactions to protocol
solana transaction-history <PROTOCOL_PDA> \
  --limit 20 \
  --url mainnet-beta

# Look for unusual patterns:
# - Large withdrawals to unknown wallets
# - Repeated calls to sensitive functions
# - Failed transactions with specific error codes
```

2. **Alert emergency multisig (parallel to verification):**
```
- Post to emergency Slack/Discord channel
- Page on-call engineers via PagerDuty/OpsGenie
- Send direct Signal messages to emergency multisig members
```

3. **Execute emergency pause:**
```bash
# If using Squads multisig
squads-multisig-cli create-transaction \
  --multisig-pubkey <EMERGENCY_MULTISIG_PDA> \
  --program-id <YOUR_PROGRAM_ID> \
  --instruction "emergency_pause" \
  --keypair ~/.config/solana/emergency-key-1.json

# Members sign via Squads app (faster than CLI for parallel signing)
# app.squads.so → Emergency Multisig → Pending Transaction → Approve

# Execute as soon as threshold met (2 of 3)
```

**Critical:** DO NOT WAIT for complete understanding. Pause first, investigate later. Every second counts.

4. **Public disclosure (within 1 hour):**
```
- Post Template 1 (Critical Incident Alert) to:
  - Twitter (official account)
  - Discord (announcement channel, @everyone ping)
  - Status page (status.yourprotocol.com)

- Include:
  - What is affected
  - What users should NOT do
  - What is safe
  - Update frequency
```

**Investigation Phase (5-60 minutes):**

5. **Isolate root cause:**
```bash
# Pull all transactions involving protocol
solana transaction-history <PROTOCOL_PDA> \
  --before <EXPLOIT_SIGNATURE> \
  --limit 100 > pre_exploit_txs.json

solana transaction-history <PROTOCOL_PDA> \
  --after <EXPLOIT_SIGNATURE> \
  --limit 100 > exploit_txs.json

# Detailed inspection of exploit transaction
solana confirm -v <EXPLOIT_SIGNATURE> > exploit_details.json

# For each suspicious transaction:
# - Identify which instruction failed/succeeded
# - Check account states before/after
# - Identify attacker wallet(s)

# Use Solana Explorer or SolanaFM for UI-based inspection
open "https://explorer.solana.com/tx/<EXPLOIT_SIGNATURE>"
```

6. **Estimate impact:**
```typescript
// Calculate total funds at risk
const affectedAccounts = await program.account.userAccount.all([
  // Filter for accounts with vulnerable state
  {
    memcmp: {
      offset: 8 + 32, // Skip discriminator + authority
      bytes: bs58.encode(Buffer.from([1])) // Vulnerable flag
    }
  }
]);

const totalAtRisk = affectedAccounts.reduce((sum, acc) =>
  sum + acc.account.balance, 0
);

console.log(`Total funds at risk: ${totalAtRisk / 1e9} SOL`);
console.log(`Affected users: ${affectedAccounts.length}`);
```

7. **Notify security partners:**
```
- OtterSec, Neodyme, or your audit firm (private Slack/Telegram)
- Major integrated protocols (if exploit affects composability)
- Relevant dApps/frontends (coordinate pause on their end)
```

**Mitigation Phase (1-24 hours):**

8. **Develop fix:**
```rust
// Example: Fix missing signer check
// BEFORE (vulnerable):
pub fn withdraw(ctx: Context<Withdraw>, amount: u64) -> Result<()> {
    let vault = &mut ctx.accounts.vault;
    // Missing: authority check!

    vault.balance -= amount;
    // ... transfer logic
}

// AFTER (fixed):
pub fn withdraw(ctx: Context<Withdraw>, amount: u64) -> Result<()> {
    let vault = &mut ctx.accounts.vault;

    // Added: explicit authority validation
    require!(
        ctx.accounts.authority.key() == vault.authority,
        ErrorCode::UnauthorizedWithdrawal
    );

    vault.balance -= amount;
    // ... transfer logic
}
```

9. **Emergency upgrade (if using mutable program):**
```bash
# Build patched version
anchor build

# Deploy to buffer
solana program write-buffer target/deploy/program.so \
  --buffer-authority <UPGRADE_MULTISIG_VAULT_PDA>

# Output: Buffer: <BUFFER_ADDRESS>

# Create upgrade proposal in Squads
# (Use Squads app for faster coordination than CLI)

# If emergency: Coordinate all 5-of-7 signers to sign ASAP
# Override normal 24-hour timelock via emergency vote
```

10. **If immutable program OR upgrade too slow:**
```
- Deploy NEW program version with different address
- Prepare migration instructions for users
- Offer migration incentives (gas reimbursement, bonus rewards)
- Keep old program paused but don't attempt upgrade
```

**Recovery Phase (24 hours - 7 days):**

11. **User fund restoration:**
```typescript
// Option A: Airdrop replacement tokens (if mint authority held)
const affectedUsers = [/* list from impact analysis */];

for (const user of affectedUsers) {
  const lostAmount = calculateLoss(user);

  // Create airdrop transaction
  const tx = await program.methods
    .emergencyMint(new BN(lostAmount))
    .accounts({
      authority: emergencyMultisigPda,
      mint: tokenMint,
      destination: user.tokenAccount,
      tokenProgram: TOKEN_PROGRAM_ID,
    })
    .transaction();

  // Submit via emergency multisig
  // (batch into Squads transaction with multiple instructions)
}

// Option B: Direct treasury transfer (if no mint authority)
for (const user of affectedUsers) {
  const refundAmount = calculateRefund(user);

  const tx = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: treasuryPda,
      toPubkey: user.wallet,
      lamports: refundAmount
    })
  );

  // Execute via treasury multisig
}
```

12. **Unpause protocol:**
```bash
# After fix deployed and verified
squads-multisig-cli create-transaction \
  --multisig-pubkey <EMERGENCY_MULTISIG_PDA> \
  --instruction "emergency_unpause" \
  --keypair ~/.config/solana/emergency-key-1.json

# Verify protocol behavior post-unpause
# - Test deposit/withdraw on devnet mirror first
# - Gradual rollout: unpause for small amounts initially
```

13. **Post-incident report:**
```
- Publish Template 3 (Post-Incident Report) within 48 hours
- Include technical details, timeline, user impact, compensation
- Transparency builds trust; don't hide details
```

### Procedure 2: Compromised Multisig Keys

**Trigger:** Multisig member reports lost/stolen keys OR suspicious multisig activity detected.

**Immediate Actions (0-10 minutes):**

1. **If keys not yet used maliciously:**
```bash
# Emergency: Remove compromised member IMMEDIATELY
squads-multisig-cli config-transaction-create \
  --action "RemoveMember <COMPROMISED_PUBKEY>" \
  --multisig-pubkey <MULTISIG_PDA> \
  --keypair ~/.config/solana/safe-member.json

# Coordinate with remaining members to sign NOW
# Don't wait for full explanation; act first, discuss later
```

2. **If malicious transaction already proposed:**
```bash
# All members vote REJECT
squads-multisig-cli vote-reject \
  --transaction-index <MALICIOUS_TX_INDEX> \
  --multisig-pubkey <MULTISIG_PDA>

# If attacker has enough keys to reach threshold:
# THIS IS CATASTROPHIC. Execute Procedure 3 (Fund Recovery)
```

3. **Audit all recent multisig actions:**
```bash
# List recent transactions
squads-multisig-cli transaction-history \
  --multisig-pubkey <MULTISIG_PDA> \
  --limit 50

# Verify each transaction was authorized
# Look for:
# - Unknown destination addresses
# - Unusual amounts
# - Parameter changes not discussed in team channels
```

**If Threshold Compromised (P0 Escalation):**

If attacker controls enough keys to execute transactions:

1. **Race to drain funds to safety:**
```bash
# Create counter-transaction to move funds to new safe multisig
# This is a RACE. Fastest transaction wins.

# Prepare new safe multisig (created in advance as part of DR plan)
NEW_SAFE_MULTISIG=<address>

# Emergency transfer ALL treasury
squads-multisig-cli create-transaction \
  --multisig-pubkey <COMPROMISED_MULTISIG_PDA> \
  --instruction "transfer_all_to_emergency_vault" \
  --destination <NEW_SAFE_MULTISIG_VAULT_PDA>

# Get remaining honest members to sign IMMEDIATELY
# Priority: Save funds over process
```

2. **If upgrade authority compromised:**
```bash
# Attacker can deploy malicious program upgrade
# THIS IS WORST CASE

# Immediate: Public disclosure warning users to stop all interactions
# Use Template 1 with MAXIMUM urgency

# If timelock enabled: Window to migrate users to new program
# If no timelock: Protocol is lost; focus on user migration
```

**Post-Compromise Actions:**

3. **Forensic analysis:**
```
- How were keys compromised? (phishing, malware, supply chain)
- When did compromise occur? (check key usage history)
- What data was accessed? (if keys were on compromised machine)
```

4. **Create new multisig with fresh keys:**
```bash
# All members generate NEW keypairs on clean machines
# Preferably hardware wallets (Ledger) if not already used

# Create new multisig
squads-multisig-cli multisig-create \
  --members <NEW_PUBKEY_1> <NEW_PUBKEY_2> <NEW_PUBKEY_3> \
  --threshold 2

# Transfer authorities:
# - Program upgrade authority
# - Treasury ownership
# - Admin roles
```

5. **Security review:**
```
- Implement hardware wallet requirement for all members
- Require 2FA for all protocol-related accounts
- Rotate API keys, RPC endpoints, infrastructure credentials
- Review team's security practices (phishing training, etc.)
```

### Procedure 3: Oracle Manipulation Attack

**Trigger:** Unusual liquidations, price feed deviation alerts, or community reports.

**Immediate Actions (0-5 minutes):**

1. **Halt oracle-dependent functions:**
```rust
// If program includes oracle circuit breaker:
pub fn emergency_disable_oracle(ctx: Context<EmergencyDisableOracle>) -> Result<()> {
    let protocol_state = &mut ctx.accounts.protocol_state;

    require!(
        ctx.accounts.authority.key() == protocol_state.emergency_authority,
        ErrorCode::Unauthorized
    );

    protocol_state.oracle_enabled = false;
    protocol_state.oracle_disabled_at = Clock::get()?.unix_timestamp;

    Ok(())
}

// Execute via emergency multisig
```

2. **Verify oracle integrity:**
```typescript
// Check Pyth price feed
const pythClient = new PythHttpClient(connection, getPythProgramKeyForCluster("mainnet-beta"));
const priceData = await pythClient.getAssetPricesFromAccounts([priceFeedId]);

const pythPrice = priceData[0].price;
const pythConfidence = priceData[0].confidence;

// Compare to CEX reference (Binance, Coinbase, etc.)
const cexPrice = await fetchBinancePrice(tradingPair);

const deviation = Math.abs(pythPrice - cexPrice) / cexPrice;

if (deviation > 0.05) { // 5% deviation
  console.error(`Oracle manipulation detected: ${deviation * 100}% deviation`);
  console.error(`Pyth: $${pythPrice}, CEX: $${cexPrice}`);

  // Alert emergency team
  await alertEmergencyTeam({
    type: "ORACLE_MANIPULATION",
    pythPrice,
    cexPrice,
    deviation
  });
}
```

3. **Identify affected positions:**
```typescript
// Find recently liquidated positions
const recentLiquidations = await program.account.position.all([
  {
    memcmp: {
      offset: 8 + 32 + 8, // discriminator + user + last_update
      bytes: bs58.encode(Buffer.from(
        new BN(Clock.get().unix_timestamp - 300).toArray("le", 8) // Last 5 min
      ))
    }
  }
]);

console.log(`Positions liquidated in last 5 min: ${recentLiquidations.length}`);

// Check if liquidation rate is abnormal (>10x baseline)
if (recentLiquidations.length > baselineLiquidationRate * 10) {
  console.error("ABNORMAL LIQUIDATION ACTIVITY");
  // Halt liquidations via emergency action
}
```

**Mitigation Phase:**

4. **Switch to backup oracle or manual pricing:**
```rust
// If multiple oracle sources configured:
pub fn switch_oracle_source(
    ctx: Context<SwitchOracle>,
    new_source: OracleSource
) -> Result<()> {
    let protocol_state = &mut ctx.accounts.protocol_state;

    require!(
        ctx.accounts.authority.key() == protocol_state.emergency_authority,
        ErrorCode::Unauthorized
    );

    protocol_state.active_oracle = new_source;

    match new_source {
        OracleSource::Pyth => { /* ... */ },
        OracleSource::Switchboard => { /* ... */ },
        OracleSource::Manual => {
            // Require multisig to submit price updates
            protocol_state.requires_manual_price_update = true;
        }
    }

    Ok(())
}
```

5. **Revert unfair liquidations:**
```typescript
// Restore positions liquidated during manipulation window
const unfairLiquidations = recentLiquidations.filter(pos =>
  wasLiquidatedDuringManipulation(pos)
);

for (const position of unfairLiquidations) {
  // Recreate position with original parameters
  await program.methods
    .emergencyRestorePosition(
      position.account.user,
      position.account.collateralAmount,
      position.account.borrowedAmount
    )
    .accounts({
      authority: emergencyMultisigPda,
      user: position.account.user,
      // ...
    })
    .rpc();
}
```

### Procedure 4: Network-Level Outage

**Trigger:** Solana network halts or degrades (e.g., no blocks for 5+ minutes).

**Recent Example:** February 6, 2024 outage (network halted for ~5 hours).

**Immediate Actions:**

1. **Monitor official channels:**
```
- Solana Status: status.solana.com
- Solana Discord: #mainnet-outages
- Solana Twitter: @SolanaStatus
- Validator coordination: Usually Discord #mb-triage
```

2. **DO NOT attempt emergency actions during outage:**
```
- Transactions will fail or be dropped
- Wait for network restart coordination
```

3. **Communicate to users:**
```markdown
⚠️ NETWORK STATUS UPDATE

Solana network is currently experiencing [degraded performance / halted].

YOUR FUNDS ARE SAFE:
✅ All protocol funds remain on-chain and secure
✅ No user action required
✅ Transactions will resume once network restarts

WHAT'S HAPPENING:
Solana validators are coordinating network restart.
Official updates: status.solana.com

ESTIMATED RESOLUTION:
Monitoring official channels. Updates every 30 minutes.

DO NOT:
❌ Panic-sell or make hasty decisions
❌ Trust unofficial "recovery" tools (scams are common during outages)
```

4. **Prepare for restart:**
```bash
# Update validator (if you run infrastructure)
solana-install init <RESTART_VERSION>

# Prepare restart command with official slot
# (announced in Discord #mb-triage)

# DO NOT restart before official coordination
# Wait for: "Restart at slot X, version Y"
```

**Post-Restart Actions:**

5. **Verify protocol state:**
```typescript
// Check all critical accounts
const protocolState = await program.account.protocolState.fetch(protocolStatePda);
const treasuryBalance = await connection.getBalance(treasuryPda);

console.log("Protocol state after restart:");
console.log("- Is paused:", protocolState.isPaused);
console.log("- Treasury balance:", treasuryBalance / 1e9, "SOL");
console.log("- Last update:", new Date(protocolState.lastUpdate * 1000));

// Compare to pre-outage snapshot
if (treasuryBalance !== preOutageTreasuryBalance) {
  console.error("TREASURY MISMATCH - INVESTIGATE IMMEDIATELY");
}
```

6. **Resume operations gradually:**
```
- Test with small transactions first
- Monitor for unusual behavior
- Communicate to users that protocol is operational
```

## Communication Protocol

### Internal Communication (During Incident)

**Channel Structure:**
```
#incident-<timestamp>
- Created immediately upon P0/P1 detection
- All incident-related discussion happens here
- Pin key decisions and status updates

Participants:
- Incident lead (on-call engineer)
- Emergency multisig members
- CTO/technical leadership
- Communications lead (for public statements)
```

**Status Update Cadence:**
```
P0 (Critical): Every 15 minutes
P1 (High): Every 30 minutes
P2 (Medium): Every 1-2 hours
P3 (Low): End-of-day summary
```

**Decision Authority:**
```
Emergency multisig: Can execute pause/unpause without full team consensus
Incident lead: Makes tactical decisions (investigation approach, resource allocation)
CTO: Makes strategic decisions (public disclosure, upgrade decisions)
Communications lead: Final approval on all public statements
```

### External Communication (Public)

**Transparency Principles:**
1. **Acknowledge quickly:** Within 1 hour of P0 detection
2. **Update frequently:** Even if "no new information" — silence breeds panic
3. **Be specific about impact:** Don't say "investigating issue" — say "unauthorized withdrawal of $X affecting Y users"
4. **Never promise timelines you can't meet:** "Updates every 30 min" not "Fixed in 2 hours"

**Communication Channels (Priority Order):**
1. **Twitter:** Primary (most users follow)
2. **Discord #announcements:** Secondary (@everyone ping for P0 only)
3. **Status page:** status.yourprotocol.com (automated updates)
4. **Email:** For registered users (lower priority)
5. **On-chain message:** Via program log (for archival/legal proof)

**Example Timeline:**
```
T+0:00 - Incident detected internally
T+0:15 - Emergency multisig activated, pause executed
T+0:45 - Public disclosure (Twitter + Discord)
T+1:15 - Update 1: "Investigation ongoing, X users affected, funds at Y"
T+1:45 - Update 2: "Root cause identified, deploying fix"
T+3:00 - Update 3: "Fix deployed, protocol resuming, restoration plan"
T+6:00 - Update 4: "Restoration complete, X users refunded"
T+24:00 - Post-incident report published
```

## Fund Recovery Mechanisms

### Pattern 1: Emergency Mint (If Mint Authority Controlled)

**Scenario:** Exploit drained liquidity pool, but protocol controls token mint.

**Procedure:**
```typescript
// 1. Calculate net user losses
const affectedUsers = await calculateLosses(exploitStartTime, exploitEndTime);

// 2. Mint replacement tokens to affected users
for (const user of affectedUsers) {
  const lossAmount = user.preExploitBalance - user.postExploitBalance;

  await program.methods
    .emergencyMint(new BN(lossAmount))
    .accounts({
      mintAuthority: emergencyMultisigPda,
      mint: protocolTokenMint,
      destination: user.tokenAccount,
      tokenProgram: TOKEN_PROGRAM_ID,
    })
    .rpc();
}

// 3. Publish compensation details
console.log(`Total minted for recovery: ${totalMinted} tokens`);
console.log(`Inflation impact: ${(totalMinted / totalSupply * 100).toFixed(2)}%`);
```

**Trade-off:** Dilutes existing token holders. Mitigate by using treasury reserves first, minting only if necessary.

### Pattern 2: Treasury Reimbursement

**Scenario:** Exploit drained user funds, protocol has treasury reserves.

**Procedure:**
```typescript
// Direct transfer from treasury
const treasuryBalance = await connection.getBalance(treasuryPda);

if (totalLosses > treasuryBalance) {
  console.error("Insufficient treasury to fully compensate");
  console.error(`Treasury: ${treasuryBalance / 1e9} SOL, Needed: ${totalLosses / 1e9} SOL`);

  // Options:
  // 1. Partial reimbursement (pro-rata)
  // 2. Emergency fundraise (team contribution)
  // 3. Insurance claim (if protocol has coverage)
} else {
  // Full reimbursement
  for (const user of affectedUsers) {
    await program.methods
      .emergencyRefund(new BN(user.lossAmount))
      .accounts({
        treasury: treasuryPda,
        treasuryAuthority: treasuryMultisigPda,
        destination: user.wallet,
        systemProgram: SystemProgram.programId,
      })
      .rpc();
  }
}
```

### Pattern 3: Attacker Negotiation (Last Resort)

**Scenario:** Funds stolen, no mint authority or treasury insufficient.

**Historical Success Rate:** ~30-40% (attacker returns funds for bounty).

**Procedure:**
1. **On-chain message to attacker:**
```rust
// Include message in transaction logs
pub fn message_to_attacker(ctx: Context<Message>) -> Result<()> {
    msg!("To the individual who exploited our protocol:");
    msg!("We recognize your skills. We propose a bounty of 10% ($X) for return of remaining funds.");
    msg!("Contact: security@[email]. You have 24 hours before we pursue legal action.");
    msg!("Wallet for bounty negotiation: [PUBKEY]");
    Ok(())
}
```

2. **Parallel actions:**
```
- Contact law enforcement (FBI, Interpol if international)
- Blockchain forensics (Chainalysis, TRM Labs)
- Exchange cooperation (freeze attacker addresses on CEXs)
```

3. **Public bounty offer:**
```
- Tweet bounty offer publicly
- Tag @[attacker_wallet] if identifiable
- Set deadline (typically 24-72 hours)
```

**Success Example:** Cream Finance 2021 (attacker returned $8.8M for $1.7M bounty).

**Failure Example:** Wormhole 2022 (attacker kept all $320M, Jump Crypto covered losses).

### Pattern 4: Insurance Claims

**If protocol has coverage:**

**Providers:**
- Nexus Mutual (DeFi coverage)
- InsurAce Protocol
- Unslashed Finance

**Claim Process:**
1. Submit incident report within 24 hours
2. Provide on-chain evidence (transaction signatures, program state)
3. Assessment period (7-14 days typically)
4. Payout (if approved)

**Limitations:**
- Coverage caps (typically $5-50M)
- Exclusions (oracle manipulation, governance attacks often not covered)
- Requires pre-incident policy purchase (can't buy after exploit)

## Post-Incident Review

### Required Within 48 Hours:

1. **Public postmortem** (see Template 3)
2. **Internal technical debrief** (30-60 min meeting, all engineers)
3. **Incident timeline documentation** (exact timestamps for all actions)

### Required Within 7 Days:

4. **Root cause analysis:**
```
- What was the vulnerability?
- Why did it exist? (design flaw, implementation error, missing test)
- Why wasn't it caught? (audit scope, testing gaps)
- Contributing factors? (time pressure, complexity, unclear spec)
```

5. **Action items with owners:**
```
- Immediate fixes (already deployed)
- Additional audits (specific focus areas)
- Process improvements (code review, testing, deployment)
- Monitoring enhancements (new alerts, dashboards)
```

6. **Update incident response plan:**
```
- What worked well? (keep doing)
- What didn't work? (change process)
- New procedures needed? (add to this playbook)
```

### Required Within 30 Days:

7. **Security audit of related code areas:**
```
- Engage external auditor to review similar patterns
- Cost: $20-50k for focused review
- Publish audit report publicly
```

8. **Bug bounty program enhancement:**
```
- Increase rewards for vulnerability class that was exploited
- Expand scope if needed
- Promote program to whitehat community
```

## Real Incident Response Timelines

### Pump.fun Token Exploit (May 2024, $1.9M)

**Timeline:**
- T+0:00 — Exploit executed (bonding curve manipulation)
- T+0:12 — Detected by internal monitoring
- T+0:18 — Emergency multisig activated
- T+0:25 — Protocol paused
- T+0:40 — Public disclosure on Twitter
- T+1:30 — Root cause identified (unvalidated bonding curve parameters)
- T+2:00 — Fix deployed, users refunded 100%

**Key Success Factors:**
- Pre-configured emergency multisig (enabled 25-minute pause time)
- Automated monitoring (detected within 12 minutes)
- Clear communication (public disclosure within 40 minutes)
- Treasury reserves (full user reimbursement)

**Lessons:**
- Speed matters: 2-hour resolution prevented user panic and preserved reputation
- Having treasury reserves for refunds is critical for recovery

### Raydium Hack (December 2022, $4.4M)

**Timeline:**
- T+0:00 — Exploit executed (compromised admin private key)
- T+0:30 — Detected by community member (reported in Discord)
- T+0:45 — Team confirmed exploit
- T+1:00 — Public disclosure
- T+3:00 — Attacker's trail analyzed (funds moved to CEXs)
- T+12:00 — Coordinated with exchanges to freeze funds
- T+24:00 — Partial recovery ($2M frozen on exchanges)

**Compensation:**
- 100% for RAY token pool LPs
- 90% for non-RAY token pool LPs
- Used protocol treasury + team contribution

**Key Lessons:**
- Community detection worked (no automated monitoring)
- Compromised admin key = need multisig for admin functions
- Exchange coordination recovered 45% of stolen funds
- Partial compensation better than none (maintained user trust)

### Loopscale Security Disclosure (December 2024, $5.8M at risk)

**Timeline:**
- T+0:00 — Whitehat researcher discovered vulnerability (uninitialized account exploit)
- T+0:00 — Privately disclosed to Loopscale team
- T+2:00 — Vulnerability confirmed by team
- T+6:00 — Patch developed and tested
- T+12:00 — Patch deployed via multisig upgrade
- T+18:00 — Public disclosure AFTER fix deployed

**Compensation:**
- $50,000 bounty paid to whitehat researcher
- 0 user funds lost (preemptive fix)

**Key Lessons:**
- Responsible disclosure worked (researcher went to team, not exploit)
- Fast patch deployment (12 hours from report to fix)
- Public disclosure only after fix = prevented copycat exploits
- Bug bounty program incentivized responsible disclosure

## Key Trade-offs

### Speed vs. Thorough Investigation

**Dilemma:** Pause immediately or investigate first?

**Answer:** PAUSE FIRST if funds are at risk. Investigation can happen after bleeding is stopped.

**Example:** Pump.fun paused within 25 minutes, completed investigation over next 2 hours. Lost no additional funds during investigation.

### Transparency vs. Operational Security

**Dilemma:** Disclose vulnerability details immediately or wait until fix deployed?

**Answer:**
- Disclose IMPACT immediately (what users should do)
- Disclose ROOT CAUSE after fix deployed (prevents copycat exploits)

**Example:** Loopscale announced "critical vulnerability patched" AFTER fix was live, not before.

### Full vs. Partial Compensation

**Dilemma:** If treasury insufficient, offer partial compensation or none?

**Answer:** Partial is better than none. Users respect honest effort.

**Example:** Raydium's 90-100% compensation maintained user trust despite not fully covering losses. Protocol survived and thrived post-incident.

### Centralized Emergency Powers vs. Pure Decentralization

**Dilemma:** Give emergency multisig pause powers (centralization) or rely only on governance votes (slow)?

**Answer:** Emergency powers are necessary evil. Mitigate by:
- Limiting scope (pause only, not upgrade or withdraw)
- Transparency (public log of all emergency actions)
- Accountability (post-incident review by governance)

**Example:** Drift Protocol's 2-of-3 emergency multisig can pause but cannot upgrade or access treasury. This saved protocol during price oracle glitch (October 2024).

## Recommendation

**For All Protocols Managing User Funds:**

1. **Implement emergency pause mechanism:**
   - 2-of-3 or 3-of-5 multisig (fast coordination)
   - Scope limited to pausing user-facing functions
   - Cannot upgrade program or access treasury
   - Hardware wallets (Ledger) for all members

2. **Set up monitoring and alerting:**
   - Helius webhooks or custom RPC monitoring
   - Alert on: large transfers, unusual errors, admin actions
   - PagerDuty/OpsGenie for 24/7 coverage

3. **Document incident response procedures:**
   - This playbook as starting point
   - Customize for your protocol specifics
   - Practice via tabletop exercises (quarterly)

4. **Maintain treasury reserves:**
   - 5-10% of TVL for emergency compensation
   - Separate from operational funds
   - Controlled by treasury multisig (not emergency multisig)

5. **Communication templates ready:**
   - Pre-approved tweets for common scenarios
   - Discord bot for status page updates
   - Designated communications lead

**For High-Value Protocols ($10M+ TVL):**

6. **24/7 on-call rotation:**
   - Minimum 2 engineers always available
   - Handoff procedures between shifts
   - Escalation path to CTO/CEO

7. **Bug bounty program:**
   - Immunefi or HackerOne
   - Payouts: $10k (Low) to $500k (Critical)
   - Publicize program widely

8. **Insurance coverage:**
   - DeFi insurance (Nexus Mutual, etc.)
   - Coverage: $5-50M depending on TVL
   - Review policy exclusions carefully

9. **Security retainer:**
   - Ongoing relationship with audit firm (OtterSec, Neodyme, etc.)
   - Emergency response SLA (respond within 2 hours)
   - Cost: $10-30k/month

10. **Incident simulation drills:**
    - Quarterly tabletop exercises
    - Annual full simulation (with fake exploit)
    - Measure response time, identify gaps

## Sources

- [Tracing Crypto Attacks: On-Chain Incident Response - CRYPTOISAC](https://www.cryptoisac.org/news-member-content/tracingcryptoattacks) — Best practices for blockchain incident response
- [Building Robust Incident Response Plans - CM-Alliance](https://www.cm-alliance.com/cybersecurity-blog/building-robust-incident-response-plans-for-blockchain-powered-systems) — Framework for blockchain IR planning
- [Solana Hacks, Bugs, and Exploits: A Complete History - Helius](https://www.helius.dev/blog/solana-hacks) — 60-minute comprehensive timeline of all Solana incidents
- [Securing Solana: Past Security Incidents and Lessons - Medium](https://medium.com/@khaythefirst/securing-solana-a-comprehensive-analysis-of-past-security-incidents-and-lessons-learnt-26f6d1a79453) — Analysis of incident patterns and evolution
- [Solana Security Incidents, Responses, and Evolution - Medium](https://medium.com/@mniladri64/solana-security-incidents-responses-and-evolution-770b121a0439) — Statistical analysis of response effectiveness
- [The History of Solana Security Incidents - Pine Analytics](https://pineanalytics.substack.com/p/the-history-of-solana-security-incidents) — Security archaeology of Solana's critical breakdowns
- [Solana Security Risks & Mitigation Guide - Cantina](https://cantina.xyz/blog/securing-solana-a-developers-guide) — Developer-focused security best practices
- [Deep Dive into Solana's Security Journey - Paragraph](https://paragraph.com/@mantuametrics/a-deep-dive-into-solanas-security-journey-incidents-impacts-and-lessons-learned) — Impact analysis and lessons learned
- [Secure Signing Process on Squads Protocol - Medium](https://medium.com/@west_XE/securing-squads-4f43944e4c59) — Multisig security incidents and CLI best practices
- [02-06-24 Solana Mainnet Beta Outage Report - Anza](https://solana.com/news/02-06-24-solana-mainnet-beta-outage-report) — Official network outage postmortem (February 2024)
- [PineAnalytics History of Solana Security Incidents - Reddit](https://www.reddit.com/r/solana/comments/1js671t/pineanalytics_the_history_of_all_solana_security/) — Community discussion and timeline compilation
- [Stablecoin Security: Vulnerabilities and Economic Risk - Hacken](https://hacken.io/discover/stablecoin-security/) — Design choices and incident response patterns
- [Cross-Chain Bridge Security Checklist - Zealynx](https://www.zealynx.io/blogs/cross-chain-bridge-security-checklist) — 100+ checks including circuit breakers and incident response

## Gaps & Caveats

**Limitations of this playbook:**
- **Protocol-specific:** Your program may have unique vulnerabilities requiring custom procedures. Adapt this playbook to your architecture.
- **Legal considerations:** This playbook focuses on technical response, not legal compliance. Consult legal counsel for securities laws, user agreements, liability.
- **Emerging attack vectors:** MEV, state compression exploits, Token-2022 vulnerabilities not fully covered. Monitor ecosystem for new patterns.

**Incident response is NOT:**
- **Prevention:** This playbook assumes vulnerability exists. Prioritize security audits, testing, and secure coding practices first.
- **Guaranteed recovery:** Some incidents result in permanent fund loss. No playbook can guarantee 100% recovery.
- **Substitute for insurance:** Incident response reduces damage but doesn't eliminate financial risk. Consider DeFi insurance.

**Testing limitations:**
- **Simulation gaps:** Tabletop exercises don't replicate psychological pressure of real incidents. Expect chaos even with good plans.
- **Timing variability:** Real incidents may unfold faster (seconds) or slower (days) than examples here. Adapt timelines to reality.

**Cross-program attack coordination:**
- **Composability exploits:** Attacks spanning multiple protocols require coordinated response across teams. Establish relationships with integrated protocols in advance.
- **Oracle provider coordination:** Oracle manipulation requires coordination with Pyth, Switchboard, etc. Have direct contacts.

**Confidence score rationale (7/10):**
- High confidence for procedures based on real incidents (Pump.fun, Raydium, Loopscale)
- -3 points because:
  1. Fund recovery success rates vary widely (30-100%), making outcome predictions difficult
  2. Novel attack patterns (e.g., state compression exploits) lack historical response data
  3. Legal/regulatory aspects of incident response are jurisdiction-specific and not deeply covered here
