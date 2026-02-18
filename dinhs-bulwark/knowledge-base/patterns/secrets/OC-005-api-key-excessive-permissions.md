# OC-005: API Key with Excessive Permissions

**Category:** Secrets & Credentials
**Severity:** HIGH
**Auditors:** SEC-02
**CWE:** CWE-250 (Execution with Unnecessary Privileges)
**OWASP:** A01:2021 – Broken Access Control

## Description

API keys are often provisioned with full access permissions when only a subset is needed. This violates the principle of least privilege and means that if a key is compromised, the attacker inherits far more capability than the application requires. Common examples include using an AWS IAM key with `AdministratorAccess` for a service that only needs S3 read access, or an exchange API key with withdrawal permissions for a trading bot that only needs read and trade access.

CVE-2024-36248 documented a case where hardcoded AWS API keys with excessive permissions were discovered in application binaries. The SolarWinds Web Help Desk vulnerability (CVE-2024-28987, CVSS 9.1) demonstrated how a hardcoded credential with excessive backend access allowed unauthenticated users to modify internal data. In the crypto space, exchange API keys with unnecessary withdrawal permissions are a recurring cause of fund theft — the Chainalysis 2025 report noted that compromised private keys remain the leading cause of crypto losses, with individual wallet compromises affecting 80,000 unique victims.

## Detection

```
grep -rn "ADMIN.*KEY\|MASTER.*KEY\|ROOT.*KEY" --include="*.ts" --include="*.js" --include="*.env"
grep -rn "withdraw\|full_access\|admin" --include="*.env" --include="*.json" --include="*.yaml"
grep -rn "AdministratorAccess\|PowerUserAccess\|\*:\*" --include="*.json" --include="*.yaml" --include="*.tf"
```

Review API key configurations for: exchange keys with withdrawal enabled, cloud IAM policies with wildcard actions, RPC endpoint keys with write access when read-only is sufficient, database credentials with DDL permissions.

## Vulnerable Code

```typescript
// VULNERABLE: Exchange API key has withdrawal permissions enabled
// even though the bot only needs to read balances and place orders
import ccxt from "ccxt";

const exchange = new ccxt.binance({
  apiKey: process.env.BINANCE_API_KEY,
  secret: process.env.BINANCE_SECRET,
  // Key was created with: Enable Reading, Enable Spot Trading, Enable Withdrawals
  // Only Reading and Spot Trading are actually needed
});

async function runTradingBot() {
  const balance = await exchange.fetchBalance();
  // ... trading logic ...
  // If this key is compromised, attacker can withdraw all funds
}
```

## Secure Code

```typescript
import ccxt from "ccxt";

// SECURE: API key created with minimum necessary permissions
// Enable Reading: YES, Enable Spot Trading: YES, Enable Withdrawals: NO
// Additionally: IP whitelist configured on the exchange for this key
const exchange = new ccxt.binance({
  apiKey: process.env.BINANCE_API_KEY,
  secret: process.env.BINANCE_SECRET,
  // Key permissions documented and reviewed:
  // - Read-only balance and market data
  // - Spot trading only (no margin, no futures)
  // - Withdrawals DISABLED
  // - IP restricted to production server IPs
});

// Withdrawal operations use a separate, more restricted process
// with multi-signature approval and hardware security module signing
```

## Impact

A compromised API key with excessive permissions allows an attacker to perform operations far beyond the application's intended scope. For exchange keys, this means unauthorized withdrawals. For cloud keys, this means lateral movement across services, data exfiltration, and infrastructure takeover. For RPC keys, this could mean submitting malicious transactions or modifying state.

## References

- CVE-2024-36248: Hardcoded AWS API key with excessive permissions
- CVE-2024-28987: SolarWinds WHD hardcoded credential with full backend access (CVSS 9.1)
- Chainalysis 2025: Compromised keys leading cause of crypto theft ($3.4B stolen in 2025)
- OWASP Principle of Least Privilege
- CWE-250: https://cwe.mitre.org/data/definitions/250.html
