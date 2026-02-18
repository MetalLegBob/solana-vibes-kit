# OC-113: RPC Endpoint Spoofing

**Category:** Blockchain Interaction
**Severity:** HIGH
**Auditors:** CHAIN-02
**CWE:** CWE-295 (Improper Certificate Validation), CWE-346 (Origin Validation Error)
**OWASP:** N/A — Blockchain-specific

## Description

Solana applications communicate with the blockchain through JSON-RPC endpoints. If the RPC endpoint URL is user-configurable, sourced from an untrusted environment variable, or served over an insecure connection, an attacker can redirect the application to a malicious RPC node. A spoofed RPC can return fabricated account balances, fake transaction confirmations, or manipulated program data.

Frontend dApps are especially vulnerable because the RPC URL is often embedded in client-side code or environment variables that can be intercepted. If a user's browser traffic is intercepted (e.g., via a malicious proxy or DNS spoofing), the dApp could communicate with a fake RPC that returns false data. Helius, QuickNode, and other Solana RPC providers recommend authenticating requests via API keys in headers, but many implementations embed the API key directly in the URL, making it visible in logs and browser network tabs.

In 2022, GenesysGo introduced spoof-proofing measures for their RPC infrastructure after observing spoofing attacks against Solana validators. The Solana public RPC endpoints (api.mainnet-beta.solana.com) are rate-limited and have no authentication, making them unsuitable for production applications and easy targets for redirection.

## Detection

```
grep -rn "new Connection(" --include="*.ts" --include="*.js"
grep -rn "clusterApiUrl" --include="*.ts" --include="*.js"
grep -rn "mainnet-beta\.solana\.com" --include="*.ts" --include="*.js"
grep -rn "RPC_URL\|SOLANA_RPC\|rpcUrl" --include="*.ts" --include="*.js" --include="*.env*"
```

Look for: hardcoded public RPC URLs, API keys embedded in RPC URLs, RPC URLs from user-configurable sources without validation, HTTP (non-HTTPS) RPC endpoints.

## Vulnerable Code

```typescript
import { Connection } from "@solana/web3.js";

// VULNERABLE: Public RPC with no auth, URL from query parameter
function getConnection(req: Request): Connection {
  // Attacker can set ?rpc=https://evil-rpc.com
  const rpcUrl = new URL(req.url).searchParams.get("rpc")
    || "https://api.mainnet-beta.solana.com";
  return new Connection(rpcUrl);
}
```

## Secure Code

```typescript
import { Connection } from "@solana/web3.js";

// SECURE: Allowlisted RPC endpoints with authenticated access
const ALLOWED_RPCS: Record<string, string> = {
  mainnet: process.env.HELIUS_RPC_URL!,   // Authenticated, private
  devnet: process.env.DEVNET_RPC_URL!,
};

function getConnection(network: string = "mainnet"): Connection {
  const rpcUrl = ALLOWED_RPCS[network];
  if (!rpcUrl) {
    throw new Error(`Unknown network: ${network}`);
  }
  if (!rpcUrl.startsWith("https://")) {
    throw new Error("RPC URL must use HTTPS");
  }
  return new Connection(rpcUrl, {
    commitment: "confirmed",
    confirmTransactionInitialTimeout: 60_000,
  });
}
```

## Impact

A spoofed RPC can return false account balances (causing an application to release goods or services for unpaid transactions), fake transaction confirmations (enabling double-spend attacks), or manipulated program data (causing incorrect business logic execution). In financial applications, RPC spoofing can directly enable fund theft.

## References

- GenesysGo: RPC spoof-proofing measures for Solana (April 2022)
- Helius docs: Protect Your API Keys — security best practices
- QuickNode docs: Solana Endpoint Security — authentication methods
- Solana docs: Clusters and Public RPC Endpoints — rate limit warnings
