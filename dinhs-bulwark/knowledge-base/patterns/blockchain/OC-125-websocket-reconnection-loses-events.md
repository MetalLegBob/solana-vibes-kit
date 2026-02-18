# OC-125: WebSocket Reconnection Loses Events

**Category:** Blockchain Interaction
**Severity:** MEDIUM
**Auditors:** CHAIN-04
**CWE:** CWE-393 (Return of Wrong Status Code)
**OWASP:** N/A — Blockchain-specific

## Description

Solana dApps and backend services use WebSocket subscriptions (`accountSubscribe`, `logsSubscribe`, `signatureSubscribe`) for real-time event monitoring. When the WebSocket connection drops and reconnects, events that occurred during the disconnection window are lost unless the application implements gap-filling logic.

WebSocket connections to Solana RPC nodes can drop due to network instability, RPC node restarts, rate limiting, or idle connection timeouts. The standard `Connection` class in @solana/web3.js does not automatically reconnect WebSocket subscriptions or fill gaps from the disconnection period. When the connection is re-established, new subscriptions start from the current state — any events between the drop and reconnect are silently lost.

For applications that process financial events (deposits, withdrawals, trades), missed events mean lost transactions that are never credited or processed. For monitoring systems, gaps in event coverage create blind spots where malicious activity could go undetected.

## Detection

```
grep -rn "onAccountChange\|onLogs\|onSignature\|onSlotChange" --include="*.ts" --include="*.js"
grep -rn "accountSubscribe\|logsSubscribe" --include="*.ts" --include="*.js"
grep -rn "WebSocket\|websocket\|ws://" --include="*.ts" --include="*.js"
```

Look for: WebSocket subscriptions without reconnection handling, missing gap-fill logic after reconnection, no heartbeat/keepalive on WebSocket connections, event processing that relies solely on WebSocket without polling fallback.

## Vulnerable Code

```typescript
import { Connection, PublicKey } from "@solana/web3.js";

// VULNERABLE: WebSocket subscription with no reconnection or gap-fill
const connection = new Connection("https://api.mainnet-beta.solana.com", {
  wsEndpoint: "wss://api.mainnet-beta.solana.com",
});

function watchAccount(pubkey: PublicKey) {
  // If WebSocket drops, events during downtime are lost
  connection.onAccountChange(pubkey, (accountInfo, context) => {
    processAccountUpdate(accountInfo, context.slot);
  });
  // No reconnection logic, no gap detection
}
```

## Secure Code

```typescript
import { Connection, PublicKey } from "@solana/web3.js";

// SECURE: WebSocket with reconnection and polling gap-fill
class ReliableSubscription {
  private subId: number | null = null;
  private lastProcessedSlot = 0;
  private connection: Connection;

  constructor(private endpoint: string, private wsEndpoint: string) {
    this.connection = new Connection(endpoint, { wsEndpoint });
  }

  async watch(pubkey: PublicKey) {
    this.subscribe(pubkey);
    // Polling fallback: periodically check for missed events
    setInterval(() => this.fillGaps(pubkey), 10_000);
  }

  private subscribe(pubkey: PublicKey) {
    this.subId = this.connection.onAccountChange(
      pubkey,
      (accountInfo, context) => {
        this.lastProcessedSlot = context.slot;
        processAccountUpdate(accountInfo, context.slot);
      },
      { commitment: "confirmed" }
    );
    // Monitor connection health
    this.connection.onSlotChange((slotInfo) => {
      // If we haven't seen an update in 30 seconds, reconnect
    });
  }

  private async fillGaps(pubkey: PublicKey) {
    // Poll for current state to catch any missed WebSocket events
    const currentSlot = await this.connection.getSlot("confirmed");
    if (currentSlot - this.lastProcessedSlot > 100) {
      console.warn(`Gap detected: ${currentSlot - this.lastProcessedSlot} slots`);
      const accountInfo = await this.connection.getAccountInfo(pubkey, "confirmed");
      if (accountInfo) {
        processAccountUpdate(accountInfo, currentSlot);
        this.lastProcessedSlot = currentSlot;
      }
    }
  }
}
```

## Impact

Lost events during WebSocket disconnections can result in unprocessed deposits, missed liquidation triggers, stale portfolio displays, or incomplete audit trails. For automated systems, a few seconds of missed events during high-activity periods can translate to significant financial impact.

## References

- Solana docs: WebSocket subscriptions — connection behavior
- @solana/web3.js: Connection class WebSocket management
- Helius: Enhanced WebSockets — reliability improvements
- QuickNode: Streams — guaranteed event delivery alternative to WebSockets
