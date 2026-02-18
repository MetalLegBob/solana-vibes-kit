# OC-257: Exchange API Key with Withdrawal Permission

**Category:** Automation & Bots
**Severity:** CRITICAL
**Auditors:** BOT-02
**CWE:** CWE-269 — Improper Privilege Management
**OWASP:** API1:2023 — Broken Object Level Authorization

## Description

Exchange API keys used by trading bots should be scoped to the minimum necessary permissions. When a bot's API key includes withdrawal permission, a compromise of the bot's server, configuration, or codebase grants the attacker the ability to withdraw all funds from the exchange account to an external wallet -- a far more severe outcome than unauthorized trading, which is limited to the exchange's ecosystem.

Centralized exchanges like Binance, Coinbase, and Kraken allow API keys to be created with granular permissions: read-only, trading, and withdrawal. A trading bot only needs read and trade permissions. Withdrawal permission is almost never needed by automated systems and dramatically increases the blast radius of any compromise.

The February 2025 GHSL-2025-023 vulnerability in the open-source binance-trading-bot demonstrated this risk. The bot had an authenticated RCE vulnerability via the `/restore` endpoint. If the bot's exchange API key had withdrawal permission, an attacker exploiting this RCE could immediately drain the exchange account. The Polymarket copy-trading bot malware discovered in December 2025 similarly targeted bots with overpermissioned API keys.

## Detection

```
# Check for API key permission configuration
grep -rn "apiKey\|API_KEY\|apiSecret\|API_SECRET" --include="*.ts" --include="*.js" --include="*.env"
grep -rn "withdraw\|WITHDRAW\|enableWithdraw\|withdrawal" --include="*.ts" --include="*.js" --include="*.json"

# Exchange client configuration without permission restrictions
grep -rn "new Binance\|new ccxt\|createExchange\|exchange.*config" --include="*.ts" --include="*.js"

# Check for IP whitelisting configuration
grep -rn "ipWhitelist\|IP_WHITELIST\|restrictedIp\|allowedIps" --include="*.ts" --include="*.js"
```

## Vulnerable Code

```typescript
import Binance from 'binance-api-node';

// VULNERABLE: API key has withdrawal permission, stored in plain env var
const client = Binance({
  apiKey: process.env.BINANCE_API_KEY!,    // Key has trade + withdraw
  apiSecret: process.env.BINANCE_SECRET!,
});

async function runBot() {
  const prices = await client.prices();
  // ... trading logic ...

  // An attacker who gains access to this process can do:
  // await client.withdraw({ asset: 'BTC', address: 'attacker-address', amount: '10' });
}
```

## Secure Code

```typescript
import Binance from 'binance-api-node';
import { SecretsManager } from '@aws-sdk/client-secrets-manager';

const secretsManager = new SecretsManager({ region: 'us-east-1' });

async function createExchangeClient() {
  // Retrieve API keys from a secrets manager, not env vars
  const secret = await secretsManager.getSecretValue({ SecretId: 'trading-bot/binance' });
  const { apiKey, apiSecret } = JSON.parse(secret.SecretString!);

  const client = Binance({
    apiKey,     // Key created with ONLY: read + spot trading
    apiSecret,  // NO withdrawal permission
  });

  return client;
}

// API Key Setup Checklist (documented, not in code):
// 1. Create API key with ONLY "Enable Reading" and "Enable Spot Trading"
// 2. DO NOT enable "Enable Withdrawals"
// 3. Enable IP whitelist restriction to bot server IPs only
// 4. Set trading pair restrictions if exchange supports it
// 5. Enable API key expiration/rotation schedule

async function validateApiKeyPermissions(client: ReturnType<typeof Binance>) {
  const account = await client.accountInfo();
  logger.info({
    canTrade: account.canTrade,
    canWithdraw: account.canWithdraw,
    canDeposit: account.canDeposit,
  }, 'API key permissions');

  if (account.canWithdraw) {
    logger.error('CRITICAL: API key has withdrawal permission! Rotate immediately.');
    process.exit(1); // Refuse to run with overpermissioned key
  }
}
```

## Impact

- Complete fund drainage from exchange account upon any bot compromise
- Attacker can withdraw to external wallets, making recovery impossible
- Supply chain attacks (malicious npm packages) can exfiltrate keys and withdraw
- Single vulnerability in bot code escalates from "trading risk" to "total loss"

## References

- GHSL-2025-023: Authenticated RCE in binance-trading-bot via command injection in /restore endpoint (February 2025, CVE assigned)
- Polymarket copy-trading bot: malicious code by "Trust412" targeting API keys (December 2025, SlowMist)
- SentinelOne: Ethereum drainers posed as trading bots to steal $900K+ (August 2025)
- API Stronghold: "Securing Crypto AI Agents: How to Protect Exchange API Keys" (February 2026)
