# OC-115: No RPC Failover (Single Point of Failure)

**Category:** Blockchain Interaction
**Severity:** MEDIUM
**Auditors:** CHAIN-02
**CWE:** CWE-544 (Missing Standardized Error Handling Mechanism)
**OWASP:** N/A — Blockchain-specific

## Description

Solana applications that rely on a single RPC endpoint have a single point of failure. If that endpoint goes down, becomes rate-limited, or returns errors, the entire application becomes non-functional. This is especially critical for trading bots, automated keepers, and DeFi applications where downtime can result in missed liquidations, stale orders, or financial losses.

Solana RPC providers (Helius, QuickNode, Triton, etc.) have experienced outages. The public Solana RPC endpoints are heavily rate-limited and frequently return 429 (Too Many Requests) errors during periods of high network activity. Applications that do not implement RPC failover or redundancy cannot gracefully handle these situations.

Beyond availability, different RPC providers may have different latencies, data freshness, and feature support. A failover strategy should consider not just uptime but also data consistency across providers to avoid split-brain scenarios where different parts of the application see different blockchain states.

## Detection

```
grep -rn "new Connection(" --include="*.ts" --include="*.js"
grep -rn "createSolanaRpc(" --include="*.ts" --include="*.js"
grep -rn "clusterApiUrl" --include="*.ts" --include="*.js"
```

Look for: single `Connection` instantiation with one URL, no retry logic around RPC calls, no health check on RPC connections, hardcoded single endpoint.

## Vulnerable Code

```typescript
import { Connection } from "@solana/web3.js";

// VULNERABLE: Single RPC endpoint, no failover
const connection = new Connection("https://api.mainnet-beta.solana.com");

async function getBalance(pubkey: PublicKey): Promise<number> {
  // If RPC is down or rate-limited, entire app fails
  return connection.getBalance(pubkey);
}
```

## Secure Code

```typescript
import { Connection } from "@solana/web3.js";

// SECURE: Multiple RPC endpoints with failover and health checks
const RPC_ENDPOINTS = [
  process.env.PRIMARY_RPC_URL!,
  process.env.SECONDARY_RPC_URL!,
  process.env.TERTIARY_RPC_URL!,
];

class RpcManager {
  private connections: Connection[];
  private currentIndex = 0;

  constructor(endpoints: string[]) {
    this.connections = endpoints.map(
      (url) => new Connection(url, { commitment: "confirmed" })
    );
  }

  async execute<T>(fn: (conn: Connection) => Promise<T>): Promise<T> {
    for (let attempt = 0; attempt < this.connections.length; attempt++) {
      try {
        const conn = this.connections[this.currentIndex];
        return await fn(conn);
      } catch (err: any) {
        console.warn(`RPC ${this.currentIndex} failed: ${err.message}`);
        this.currentIndex = (this.currentIndex + 1) % this.connections.length;
      }
    }
    throw new Error("All RPC endpoints failed");
  }
}

const rpc = new RpcManager(RPC_ENDPOINTS);
async function getBalance(pubkey: PublicKey): Promise<number> {
  return rpc.execute((conn) => conn.getBalance(pubkey));
}
```

## Impact

A single RPC failure causes complete application downtime. For automated systems (liquidation bots, market makers, keepers), downtime during critical periods can lead to significant financial losses. For user-facing dApps, it results in a broken user experience and potential loss of trust.

## References

- Solana docs: Clusters and Public RPC Endpoints — rate limit warnings
- Helius, QuickNode, Triton: documented RPC outage incidents
- InstantNodes: Solana RPC Security Best Practices — redundancy recommendations
