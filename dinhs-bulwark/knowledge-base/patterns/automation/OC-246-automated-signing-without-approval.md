# OC-246: Automated Signing Without Approval

**Category:** Automation & Bots
**Severity:** HIGH
**Auditors:** BOT-01
**CWE:** CWE-862 — Missing Authorization
**OWASP:** API5:2023 — Broken Function Level Authorization

## Description

Automated signing occurs when a bot or keeper service signs and submits transactions without any human approval gate, spending limit check, or policy engine evaluation. In Solana keeper and crank systems, the bot typically holds a hot wallet keypair and signs every instruction it constructs, trusting its own logic entirely.

This is especially dangerous because a bug in the bot's decision logic, a compromised configuration, or a malicious instruction injected via an untrusted data source can cause the bot to sign transactions that drain its own wallet or interact with attacker-controlled programs. The December 2024 compromise of `@solana/web3.js` (CVE-2024-54134) demonstrated this risk: bots that auto-signed using the compromised library had their private keys exfiltrated and funds drained because there was no approval layer between key material and transaction submission.

In traditional finance, even algorithmic trading systems have pre-trade risk checks. Crypto bots that skip this layer expose the operator to unbounded loss from a single code defect or supply chain compromise.

## Detection

```
# Grep for direct keypair signing without approval gates
grep -rn "\.sign\(\|signTransaction\|signAllTransactions" --include="*.ts" --include="*.js"
grep -rn "Keypair\.fromSecretKey\|Keypair\.fromSeed" --include="*.ts" --include="*.js"
grep -rn "sendAndConfirmTransaction\|sendRawTransaction" --include="*.ts" --include="*.js"

# Look for absence of approval/policy checks near signing
grep -rn "wallet\.signTransaction" --include="*.ts" | grep -v "approve\|policy\|limit\|check"
```

## Vulnerable Code

```typescript
import { Connection, Keypair, Transaction, sendAndConfirmTransaction } from '@solana/web3.js';

const connection = new Connection('https://api.mainnet-beta.solana.com');
const botKeypair = Keypair.fromSecretKey(Buffer.from(process.env.BOT_PRIVATE_KEY!, 'hex'));

async function executeCrankInstruction(instruction: TransactionInstruction) {
  // VULNERABLE: Signs and sends with no approval, no limit check, no policy
  const tx = new Transaction().add(instruction);
  const sig = await sendAndConfirmTransaction(connection, tx, [botKeypair]);
  console.log('Executed:', sig);
}
```

## Secure Code

```typescript
import { Connection, Keypair, Transaction, sendAndConfirmTransaction } from '@solana/web3.js';

interface SigningPolicy {
  maxLamportsPerTx: number;
  allowedPrograms: string[];
  requiresApproval: boolean;
  dailyBudgetLamports: number;
}

const POLICY: SigningPolicy = {
  maxLamportsPerTx: 100_000_000, // 0.1 SOL max per tx
  allowedPrograms: ['DRiFtYourProgramId...'],
  requiresApproval: false, // true for high-value ops
  dailyBudgetLamports: 5_000_000_000, // 5 SOL daily cap
};

let dailySpent = 0;

async function executeCrankInstruction(instruction: TransactionInstruction) {
  // Validate target program is in allowlist
  if (!POLICY.allowedPrograms.includes(instruction.programId.toBase58())) {
    throw new Error(`Blocked: program ${instruction.programId} not in allowlist`);
  }

  // Simulate first to estimate cost
  const tx = new Transaction().add(instruction);
  const simulation = await connection.simulateTransaction(tx);
  if (simulation.value.err) {
    throw new Error(`Simulation failed: ${JSON.stringify(simulation.value.err)}`);
  }

  // Check daily budget
  const estimatedCost = 5000; // base fee estimate in lamports
  if (dailySpent + estimatedCost > POLICY.dailyBudgetLamports) {
    throw new Error('Daily signing budget exhausted');
  }

  const sig = await sendAndConfirmTransaction(connection, tx, [botKeypair]);
  dailySpent += estimatedCost;
  logger.info({ sig, dailySpent }, 'Crank instruction executed');
}
```

## Impact

- Complete wallet drainage if bot logic is compromised or manipulated
- Interaction with malicious programs that steal funds via CPI
- Supply chain attacks (like CVE-2024-54134) exfiltrate keys from auto-signing bots
- No audit trail or spending controls to limit blast radius

## References

- CVE-2024-54134: @solana/web3.js supply chain compromise draining bot wallets ($130K+ loss)
- AIXBT AI crypto bot lost $100K ETH via unauthorized dashboard access (April 2025)
- Turnkey signing automation documentation: policy engine for transaction approval
- GHSL-2025-023: Authenticated RCE in binance-trading-bot via command injection in /restore endpoint
