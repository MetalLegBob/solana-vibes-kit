# OC-017: Hot Wallet with Excessive Balance

**Category:** Secrets & Credentials
**Severity:** HIGH
**Auditors:** SEC-01
**CWE:** CWE-250 (Execution with Unnecessary Privileges)
**OWASP:** A04:2021 – Insecure Design

## Description

A hot wallet is a cryptocurrency wallet whose private key is stored on an internet-connected system for automated operations (trading bots, payment processing, relayers). Keeping more funds in a hot wallet than needed for immediate operations creates unnecessary risk — if the key is compromised, the attacker drains the entire balance.

The Bybit hack (February 2025) resulted in $1.5 billion in losses — the largest crypto theft in history — when attackers compromised the signing infrastructure for a wallet holding excessive funds. Chainalysis reported $3.4 billion in total crypto theft in 2025, with North Korea's Lazarus Group responsible for $2 billion. A South Korean exchange lost $35 million in 15 minutes from a single hot wallet compromise. CoinMarketCap's 2024 analysis confirmed that compromised private keys remain the predominant threat, accounting for the majority of crypto losses.

The principle is simple: hot wallets should hold only the minimum balance needed for operational liquidity. Excess funds should be in cold storage (offline), multi-signature wallets, or time-locked vaults.

## Detection

```
grep -rn "balance\|threshold\|max.*balance\|min.*balance\|sweep\|refill" --include="*.ts" --include="*.js"
grep -rn "getBalance\|requestAirdrop" --include="*.ts" --include="*.js"
grep -rn "WALLET_BALANCE_THRESHOLD\|MAX_HOT_WALLET\|SWEEP_THRESHOLD" --include="*.ts" --include="*.js" --include="*.env"
```

Look for absence of: balance threshold monitoring, automated sweep operations, fund transfer limits, cold-to-hot refill mechanisms. Look for: single wallet handling all funds, no separation between operational and reserve funds.

## Vulnerable Code

```typescript
import { Connection, Keypair, LAMPORTS_PER_SOL } from "@solana/web3.js";

// VULNERABLE: Single hot wallet holds ALL operational funds
// No balance limits, no sweep mechanism, no cold storage
const HOT_WALLET = Keypair.fromSecretKey(/* loaded from env */);

async function processPayment(recipient: string, amount: number) {
  const connection = new Connection(process.env.RPC_URL!);
  // Wallet might hold 10,000 SOL but only needs 100 for daily operations
  const tx = createTransferTransaction(HOT_WALLET.publicKey, recipient, amount);
  tx.sign(HOT_WALLET);
  return connection.sendTransaction(tx, [HOT_WALLET]);
}
```

## Secure Code

```typescript
import { Connection, PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";

const MAX_HOT_WALLET_BALANCE = 50 * LAMPORTS_PER_SOL; // 50 SOL max
const REFILL_THRESHOLD = 10 * LAMPORTS_PER_SOL;       // Refill at 10 SOL
const SWEEP_CHECK_INTERVAL = 60_000;                    // Check every minute

// SECURE: Hot wallet with balance limits and automated sweep
class HotWalletManager {
  private connection: Connection;

  constructor(private hotWalletPubkey: PublicKey) {
    this.connection = new Connection(process.env.RPC_URL!);
  }

  async checkAndSweep(): Promise<void> {
    const balance = await this.connection.getBalance(this.hotWalletPubkey);

    if (balance > MAX_HOT_WALLET_BALANCE) {
      const excess = balance - MAX_HOT_WALLET_BALANCE;
      console.warn(
        `Hot wallet balance ${balance / LAMPORTS_PER_SOL} SOL exceeds limit. ` +
        `Sweeping ${excess / LAMPORTS_PER_SOL} SOL to cold storage.`
      );
      // Sweep excess to cold storage (multi-sig or hardware wallet)
      await this.sweepToColdStorage(excess);
    }

    if (balance < REFILL_THRESHOLD) {
      // Alert ops team to approve cold-to-hot transfer
      await this.alertLowBalance(balance);
    }
  }

  private async sweepToColdStorage(amount: number): Promise<void> {
    // Transfer to multi-sig cold wallet — requires separate approval
    // Implementation depends on custody solution
  }
}
```

## Impact

A compromised hot wallet key results in immediate, irreversible loss of all funds held in that wallet. By limiting the hot wallet balance to operational minimums, the maximum loss from a key compromise is bounded. Without balance limits, a single key compromise can result in total fund loss — as demonstrated by incidents with losses ranging from millions to billions of dollars.

## References

- Bybit hack: $1.5 billion stolen from hot/warm wallet infrastructure (February 2025)
- Chainalysis 2025: $3.4 billion total crypto theft, North Korea responsible for $2B
- South Korean exchange: $35 million drained in 15 minutes from hot wallet (2025)
- CoinMarketCap 2024: Compromised private keys leading cause of crypto losses
- CWE-250: Execution with Unnecessary Privileges — https://cwe.mitre.org/data/definitions/250.html
