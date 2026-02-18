# OC-265: Keeper Operating on Stale State

**Category:** Automation & Bots
**Severity:** HIGH
**Auditors:** BOT-01, CHAIN-04
**CWE:** CWE-613 — Insufficient Session Expiration (adapted: Insufficient Data Freshness)
**OWASP:** N/A — Domain-specific

## Description

Keeper bots that read on-chain state and act on it without ensuring the state is current may execute operations against outdated data. This "stale state" problem is distinct from oracle staleness (OC-254) in that it concerns the bot's view of account data, slot progression, and transaction confirmations rather than price feed age.

On Solana, there are three commitment levels: "processed" (optimistic, may be rolled back), "confirmed" (voted on by supermajority), and "finalized" (irreversible). A keeper that reads account state at "processed" commitment may see data that is subsequently rolled back, causing it to act on state that never actually existed. Conversely, a keeper that only reads at "finalized" commitment sees state that is 32+ slots behind the current tip, potentially missing time-sensitive opportunities or acting on already-changed conditions.

The most common manifestation is a keeper that caches account state for performance and acts on the cached version. If the cache TTL is too long, the keeper may attempt to liquidate a position that was already repaid, crank an order that was already filled, or process a state transition that was already completed by another keeper. The Drift Protocol keeper documentation specifically warns about this and recommends re-reading account state immediately before submitting transactions.

## Detection

```
# Cached state used in decisions
grep -rn "cache\|Cache\|cached\|stateCache\|accountCache" --include="*.ts" --include="*.js"
grep -rn "getAccountInfo\|getMultipleAccountsInfo" --include="*.ts" | grep -v "commitment"

# Commitment level usage
grep -rn "commitment.*processed\|commitment.*confirmed\|commitment.*finalized" --include="*.ts" --include="*.js"

# State reads far from action (gap between read and write)
grep -rn "getAccountInfo" --include="*.ts" --include="*.js"

# Missing slot/blockhash freshness checks
grep -rn "recentBlockhash\|lastValidBlockHeight" --include="*.ts" --include="*.js"
```

## Vulnerable Code

```typescript
import { Connection } from '@solana/web3.js';

const accountCache = new Map<string, { data: Buffer; fetchedAt: number }>();
const CACHE_TTL_MS = 60_000; // 1 minute cache

async function getAccountState(connection: Connection, pubkey: PublicKey) {
  const cached = accountCache.get(pubkey.toBase58());
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return parseAccountData(cached.data); // VULNERABLE: 60-second stale data
  }

  // VULNERABLE: No commitment level specified (defaults to "finalized" in some versions)
  const info = await connection.getAccountInfo(pubkey);
  accountCache.set(pubkey.toBase58(), { data: info!.data, fetchedAt: Date.now() });
  return parseAccountData(info!.data);
}

async function runCrank(connection: Connection) {
  const accounts = await getEligibleAccounts(connection);

  // VULNERABLE: accounts were fetched seconds ago, may be stale by execution time
  for (const account of accounts) {
    const state = await getAccountState(connection, account);
    if (state.needsCranking) {
      await executeCrank(connection, account); // May fail or be redundant
    }
  }
}
```

## Secure Code

```typescript
import { Connection, Commitment } from '@solana/web3.js';

const COMMITMENT: Commitment = 'confirmed'; // Balance between freshness and reliability

async function getAccountState(connection: Connection, pubkey: PublicKey) {
  // Always fetch fresh state with explicit commitment
  const info = await connection.getAccountInfo(pubkey, { commitment: COMMITMENT });
  if (!info) {
    throw new Error(`Account ${pubkey.toBase58()} not found`);
  }
  return parseAccountData(info.data);
}

async function runCrank(connection: Connection) {
  const accounts = await getEligibleAccounts(connection);

  for (const account of accounts) {
    // Re-read state immediately before acting (minimize stale window)
    const freshState = await getAccountState(connection, account);
    if (!freshState.needsCranking) {
      logger.debug({ account: account.toBase58() }, 'Account no longer needs cranking');
      continue;
    }

    // Build transaction with recent blockhash
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash(COMMITMENT);
    const tx = buildCrankTransaction(account, freshState);
    tx.recentBlockhash = blockhash;

    // Simulate before submitting
    const simulation = await connection.simulateTransaction(tx, { commitment: COMMITMENT });
    if (simulation.value.err) {
      logger.warn({
        account: account.toBase58(),
        err: simulation.value.err,
      }, 'Simulation failed -- state may have changed');
      continue;
    }

    try {
      const sig = await sendAndConfirmTransaction(connection, tx, [botKeypair], {
        commitment: COMMITMENT,
      });
      logger.info({ sig, account: account.toBase58() }, 'Crank executed');
    } catch (err) {
      if (isAlreadyProcessedError(err as Error)) {
        logger.info({ account: account.toBase58() }, 'Already cranked by another keeper');
      } else {
        throw err;
      }
    }
  }
}

function isAlreadyProcessedError(err: Error): boolean {
  return err.message.includes('already been processed') ||
         err.message.includes('AlreadyProcessed') ||
         err.message.includes('custom program error: 0x0');
}
```

## Impact

- Wasted SOL on transactions that fail because state has already changed
- Attempting to liquidate already-healthy positions (false liquidation)
- Missing genuinely eligible accounts because cache shows old healthy state
- Race condition with other keepers when both act on same stale state
- Potential loss if acting on "processed" commitment state that gets rolled back

## References

- Solana documentation: Transaction confirmation and commitment levels
- Drift Protocol keeper-bots-v2: state freshness recommendations for keeper implementations
- Helium TukTuk: crank turner design for permissionless state cranking on Solana
- Kora documentation: signer configuration and transaction fee payer management
