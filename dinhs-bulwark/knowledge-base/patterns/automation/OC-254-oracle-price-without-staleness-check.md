# OC-254: Oracle Price Without Staleness Check

**Category:** Automation & Bots
**Severity:** HIGH
**Auditors:** BOT-02
**CWE:** CWE-754 — Improper Check for Unusual or Exceptional Conditions
**OWASP:** N/A — Domain-specific

## Description

Keeper bots and trading systems that consume oracle price data (from Pyth, Switchboard, Chainlink, or custom feeds) without checking for staleness may operate on outdated prices. A stale price occurs when the oracle has not updated within an expected time window due to network congestion, oracle downtime, or deliberate manipulation.

On Solana, Pyth Network provides price feeds with a confidence interval and timestamp. The Pyth SDK includes `getPriceNoOlderThan()` specifically to guard against stale data, but many bot implementations skip this check and read the price directly from the account. OWASP's SC03:2026 (Price Oracle Manipulation) lists staleness as a primary attack vector for DeFi exploits.

The consequences are severe. A liquidation bot operating on stale prices may liquidate positions that are actually healthy (if the price has recovered since the stale reading) or fail to liquidate positions that are underwater (if the price has dropped further). A trading bot using stale oracle data may execute swaps at prices that diverge significantly from the current market, resulting in guaranteed losses.

## Detection

```
# Pyth price feed reads without staleness check
grep -rn "load_price_feed_from_account_info\|PriceUpdateV2\|PullFeedAccountData" --include="*.rs" --include="*.ts"
grep -rn "get_price\b" --include="*.rs" --include="*.ts" | grep -v "get_price_no_older_than\|NoOlderThan\|staleness"

# Missing staleness threshold constants
grep -rn "STALENESS_THRESHOLD\|stalenessThreshold\|maxAge\|maxStaleness" --include="*.ts" --include="*.rs"

# Switchboard feed reads without staleness
grep -rn "get_value\|fetchUpdateIx" --include="*.ts" | grep -v "staleness\|slot.*current"

# Direct account data reads (skipping SDK checks)
grep -rn "accountInfo\.data\|parseAccountData" --include="*.ts" | grep -i "price\|oracle\|feed"
```

## Vulnerable Code

```typescript
import { PythSolanaReceiver } from '@pythnetwork/pyth-solana-receiver';

async function getBtcPrice(connection: Connection, priceFeedAccount: PublicKey): Promise<number> {
  // VULNERABLE: No staleness check -- price could be hours old
  const accountInfo = await connection.getAccountInfo(priceFeedAccount);
  const priceData = parsePythPriceData(accountInfo!.data);
  return priceData.price; // Could be from hours ago during an outage
}

async function shouldLiquidate(position: Position): Promise<boolean> {
  const price = await getBtcPrice(connection, BTC_PRICE_FEED);
  // Operating on potentially stale price
  return position.collateralValue(price) < position.debtValue * 1.1;
}
```

## Secure Code

```typescript
import { PriceServiceConnection } from '@pythnetwork/hermes-client';
import { PythSolanaReceiver } from '@pythnetwork/pyth-solana-receiver';

const STALENESS_THRESHOLD_SECONDS = 30; // Maximum acceptable age

async function getBtcPrice(
  connection: Connection,
  priceFeedAccount: PublicKey
): Promise<{ price: number; confidence: number; timestamp: number }> {
  const accountInfo = await connection.getAccountInfo(priceFeedAccount);
  const priceData = parsePythPriceData(accountInfo!.data);

  // Staleness check: reject prices older than threshold
  const currentTime = Math.floor(Date.now() / 1000);
  const priceAge = currentTime - priceData.publishTime;

  if (priceAge > STALENESS_THRESHOLD_SECONDS) {
    throw new Error(
      `Price feed stale: ${priceAge}s old (max: ${STALENESS_THRESHOLD_SECONDS}s)`
    );
  }

  // Confidence interval check: reject uncertain prices
  const confidenceRatio = priceData.confidence / Math.abs(priceData.price);
  if (confidenceRatio > 0.05) { // 5% confidence band is too wide
    throw new Error(
      `Price confidence too wide: ${(confidenceRatio * 100).toFixed(1)}%`
    );
  }

  return {
    price: priceData.price,
    confidence: priceData.confidence,
    timestamp: priceData.publishTime,
  };
}

async function shouldLiquidate(position: Position): Promise<boolean> {
  try {
    const { price, confidence } = await getBtcPrice(connection, BTC_PRICE_FEED);
    // Use conservative price (worst-case for liquidator)
    const conservativePrice = price - confidence;
    return position.collateralValue(conservativePrice) < position.debtValue * 1.1;
  } catch (err) {
    logger.warn({ err }, 'Cannot get fresh price, skipping liquidation check');
    return false; // Fail-safe: don't liquidate on stale data
  }
}
```

## Impact

- Liquidation of healthy positions based on outdated prices (user harm)
- Failure to liquidate underwater positions, exposing protocol to bad debt
- Trading at stale prices guarantees loss versus current market
- Adversarial oracle selection: attacker can choose favorable historical prices

## References

- OWASP SC03:2026: Price Oracle Manipulation -- staleness as primary attack vector
- Pyth Network Best Practices: `getPriceNoOlderThan()` and adversarial selection mitigation
- Switchboard documentation: MaxStaleness parameter in aggregator configuration
- ChainScore Labs: "Why Oracle Data Freshness is a Critical, Overlooked Metric" (2025)
- Sigma Prime: "Common Vulnerabilities: Oracles and Pricing" (2025)
