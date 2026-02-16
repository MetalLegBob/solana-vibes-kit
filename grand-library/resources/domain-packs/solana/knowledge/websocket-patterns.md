---
pack: solana
topic: "WebSocket Patterns"
decision: "How do I build real-time data feeds from Solana?"
confidence: 8/10
sources_checked: 25
last_updated: "2026-02-16"
---

# WebSocket Patterns: Real-Time Solana Data Feeds

## Decision Context

You need real-time blockchain data. RPC polling is too slow (200ms-5s latency), but you're not sure whether to use WebSockets, gRPC streaming, or something else. Your app needs to track account changes, transaction confirmations, or program events as they happen—without the lag that kills trading bots or frustrates users.

**The core trade-off:** WebSockets are simple and universally supported, but fragile under load. Yellowstone gRPC offers 2-10x lower latency with better reliability, but requires more infrastructure. QuickNode Streams handles complexity for you but adds managed-service costs.

## The Real Answer

Start with WebSockets if you're building a dApp UI or proof-of-concept. Move to gRPC when latency matters (HFT, MEV, sniping). Use managed streams when you need guaranteed delivery to databases or warehouses.

**But here's what the docs won't tell you:** All three approaches share the same fundamental challenges—reconnection logic, subscription limits, missed updates, and stale data. Solving these patterns matters more than the transport protocol.

## WebSocket Subscription Types

Solana's JSON-RPC WebSocket API exposes six core subscription methods:

### 1. accountSubscribe
Monitor specific account changes (balance, data, owner).

```javascript
const subscriptionId = await connection.onAccountChange(
  publicKey,
  (accountInfo, context) => {
    console.log('Slot:', context.slot);
    console.log('Lamports:', accountInfo.lamports);
    console.log('Data:', accountInfo.data);
  },
  { commitment: 'confirmed', encoding: 'jsonParsed' }
);
```

**Use for:** Wallet balance tracking, token account monitoring, NFT ownership changes.

**Pitfall:** High-frequency accounts (DEX pools, hot wallets) can flood your client. Each update costs credits—Helius charges 50 credits per response, QuickNode charges 500 credits per response.

### 2. programSubscribe
Subscribe to all accounts owned by a program.

```javascript
const subscriptionId = await connection.onProgramAccountChange(
  programId,
  (accountInfo, context) => {
    // Fires for EVERY account owned by this program that changes
  },
  { commitment: 'confirmed', filters: [{ dataSize: 165 }] }
);
```

**Use for:** Monitoring Raydium pools, tracking all SPL token mints, indexing program state.

**Pitfall:** Popular programs (Token Program, Raydium) generate thousands of updates per second. Without filters, you'll hit rate limits instantly. Use `dataSize` or `memcmp` filters to narrow scope.

**Production pattern:**
```javascript
// Filter for specific account structure
const filters = [
  { dataSize: 165 },  // SPL token account size
  { memcmp: { offset: 32, bytes: mintAddress } }  // Filter by mint
];
```

### 3. logsSubscribe
Stream transaction logs mentioning specific addresses.

```javascript
const subscriptionId = await connection.onLogs(
  { mentions: [programId] },
  (logs, context) => {
    console.log('Signature:', logs.signature);
    console.log('Logs:', logs.logs);
    console.log('Error:', logs.err);
  },
  { commitment: 'confirmed' }
);
```

**Use for:** Monitoring transactions to/from a wallet, tracking program instruction calls, event extraction.

**Pitfall:** `mentions` only supports ONE pubkey per call despite array syntax. To monitor multiple addresses, open multiple subscriptions (each costs connection quota).

**When to use vs accountSubscribe:** Use `logsSubscribe` for transaction-level events (swaps, transfers). Use `accountSubscribe` for state changes (balance updates).

### 4. signatureSubscribe
Monitor specific transaction confirmation status.

```javascript
const subscriptionId = await connection.onSignature(
  signature,
  (result, context) => {
    if (result.err) {
      console.error('Transaction failed:', result.err);
    } else {
      console.log('Transaction confirmed at slot:', context.slot);
    }
  },
  { commitment: 'confirmed' }
);
```

**Use for:** Polling submitted transactions, displaying "pending" state in UIs.

**Production pattern:** Always set a timeout. Dropped transactions never resolve.

```javascript
const timeout = setTimeout(() => {
  connection.removeSignatureListener(subscriptionId);
  handleTimeout(signature);
}, 60000);  // 60s max wait

const subscriptionId = await connection.onSignature(signature, () => {
  clearTimeout(timeout);
  // Handle confirmation
});
```

### 5. slotSubscribe
Receive notifications when slots change.

```javascript
const subscriptionId = await connection.onSlotChange((slotInfo) => {
  console.log('Current slot:', slotInfo.slot);
  console.log('Parent:', slotInfo.parent);
  console.log('Root:', slotInfo.root);
});
```

**Use for:** Network timing, slot-based actions, measuring validator performance.

**Latency:** ~10ms p90 for slot updates with Enhanced WebSockets (Helius), ~5ms with Yellowstone gRPC.

### 6. rootSubscribe
Track root slot changes (finalized blocks).

```javascript
const subscriptionId = await connection.onRootChange((root) => {
  console.log('New finalized root:', root);
});
```

**Use for:** Financial settlement, irreversible state tracking.

## Connection Management

WebSocket connections are fragile. Network interruptions, server restarts, load balancer timeouts, and mobile network switches all terminate connections without warning.

### Reconnection Strategy: Exponential Backoff

Never reconnect immediately. You'll DDoS your own servers when they're down.

```javascript
class ExponentialBackoff {
  constructor({
    initial = 1000,      // 1s
    max = 30000,         // 30s cap
    multiplier = 2,
    jitter = 0.1
  } = {}) {
    this.initial = initial;
    this.max = max;
    this.multiplier = multiplier;
    this.jitter = jitter;
    this.attempt = 0;
  }

  nextDelay() {
    const base = Math.min(this.initial * Math.pow(this.multiplier, this.attempt), this.max);
    const jitterAmount = base * this.jitter * (Math.random() * 2 - 1);
    this.attempt++;
    return Math.floor(base + jitterAmount);
  }

  reset() {
    this.attempt = 0;
  }
}
```

**Why jitter matters:** If 1000 clients disconnect simultaneously, they shouldn't all reconnect at exactly 1s, 2s, 4s. Random jitter spreads the load.

### Connection State Machine

Track state explicitly to avoid race conditions.

```javascript
const ConnectionState = {
  DISCONNECTED: 'disconnected',
  CONNECTING: 'connecting',
  CONNECTED: 'connected',
  RECONNECTING: 'reconnecting',
  FAILED: 'failed'
};

class ReconnectingWebSocket {
  constructor(url, options = {}) {
    this.url = url;
    this.state = ConnectionState.DISCONNECTED;
    this.backoff = new ExponentialBackoff(options.backoff);
    this.maxReconnectAttempts = options.maxReconnectAttempts || Infinity;
    this.reconnectAttempt = 0;
    this.intentionalClose = false;
    this.messageQueue = [];
  }

  connect() {
    if (this.state === ConnectionState.CONNECTED ||
        this.state === ConnectionState.CONNECTING) {
      return;
    }

    this.state = ConnectionState.CONNECTING;
    this.ws = new WebSocket(this.url);

    this.ws.onopen = () => {
      this.state = ConnectionState.CONNECTED;
      this.backoff.reset();
      this.reconnectAttempt = 0;
      this.flushMessageQueue();
      this.startHeartbeat();
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    this.ws.onclose = () => {
      this.stopHeartbeat();

      if (this.intentionalClose) {
        this.state = ConnectionState.DISCONNECTED;
        return;
      }

      // Attempt reconnection
      if (this.reconnectAttempt < this.maxReconnectAttempts) {
        this.state = ConnectionState.RECONNECTING;
        const delay = this.backoff.nextDelay();
        setTimeout(() => this.connect(), delay);
        this.reconnectAttempt++;
      } else {
        this.state = ConnectionState.FAILED;
      }
    };
  }

  close() {
    this.intentionalClose = true;
    this.ws?.close();
  }
}
```

### Heartbeat / Keepalive

Load balancers and firewalls close idle connections. Prevent this with regular pings.

```javascript
startHeartbeat() {
  this.heartbeatInterval = setInterval(() => {
    if (this.ws?.readyState === WebSocket.OPEN) {
      // Most Solana RPC providers don't respond to ping frames,
      // so send a lightweight RPC call instead
      this.send(JSON.stringify({
        jsonrpc: '2.0',
        id: 'heartbeat',
        method: 'getHealth',
        params: []
      }));
    }
  }, 30000);  // 30s, well under typical 60s timeout
}

stopHeartbeat() {
  clearInterval(this.heartbeatInterval);
}
```

**Provider-specific timeouts:**
- Helius Enhanced WebSockets: 10-minute inactivity timer
- Syndica: 60-second idle timeout
- QuickNode: Varies by plan
- Self-hosted validators: 60s default (configurable)

**Best practice:** Send pings every 20-30 seconds to stay well under timeout thresholds.

### Message Queueing During Reconnection

When the connection drops mid-send, queue messages instead of losing them.

```javascript
send(message) {
  if (this.state === ConnectionState.CONNECTED) {
    this.ws.send(message);
  } else {
    // Queue for delivery after reconnection
    this.messageQueue.push(message);
  }
}

flushMessageQueue() {
  while (this.messageQueue.length > 0) {
    const message = this.messageQueue.shift();
    this.ws.send(message);
  }
}
```

**Pitfall:** Unbounded queues consume memory. Set a max queue size and either drop old messages or reject new ones.

```javascript
send(message) {
  if (this.state === ConnectionState.CONNECTED) {
    this.ws.send(message);
  } else {
    if (this.messageQueue.length >= 100) {
      this.messageQueue.shift();  // Drop oldest
    }
    this.messageQueue.push(message);
  }
}
```

## Subscription Limits

Every provider enforces connection and subscription limits. Exceeding them causes silent disconnects or rejected subscriptions.

### Connection Limits by Provider

| Provider | Plan | Max Connections | Max Subscriptions | Per-Method Limits |
|----------|------|----------------|-------------------|-------------------|
| **Helius** | Free | 5 | N/A | N/A |
| | Developer | 150 | N/A | N/A |
| **Syndica** | Standard | 100 | 100 total | Varies by method |
| | Scale | 300 | 600 total | Varies by method |
| **QuickNode** | Free | 5 | N/A | N/A |
| | Build | 50 | N/A | N/A |
| **Self-hosted** | N/A | OS limits | Validator config | Validator config |

### Best Practices for Limit Management

1. **Reuse connections:** Create multiple subscriptions on a single WebSocket.

```javascript
const ws = new WebSocket(endpoint);

// Multiple subscriptions on one connection
const subId1 = await connection.onAccountChange(account1, handler1);
const subId2 = await connection.onAccountChange(account2, handler2);
const subId3 = await connection.onLogs({ mentions: [program1] }, handler3);
```

2. **Track subscription IDs:** Always store the ID returned from subscribe calls. You need it to unsubscribe.

```javascript
const activeSubscriptions = new Map();

async function subscribe(type, params, handler) {
  const id = await connection[type](params, handler);
  activeSubscriptions.set(id, { type, params });
  return id;
}

async function unsubscribe(id) {
  const sub = activeSubscriptions.get(id);
  if (sub) {
    await connection[`${sub.type}Unsubscribe`](id);
    activeSubscriptions.delete(id);
  }
}
```

3. **Clean up stale subscriptions:** Remove listeners when components unmount or data is no longer needed.

```javascript
// React example
useEffect(() => {
  const subscriptionId = connection.onAccountChange(account, handler);

  return () => {
    connection.removeAccountChangeListener(subscriptionId);
  };
}, [account]);
```

4. **Monitor active count:** Log subscription count in production to detect leaks.

```javascript
setInterval(() => {
  console.log('Active subscriptions:', activeSubscriptions.size);
  if (activeSubscriptions.size > 50) {
    console.warn('High subscription count - possible leak');
  }
}, 60000);
```

## Common Pitfalls

### 1. Missed Updates

**Problem:** WebSocket subscriptions can drop events under high load or network issues.

**Why it happens:**
- Network congestion causes packet loss
- Client processing too slow → TCP backpressure → dropped messages
- RPC node skips updates when overwhelmed
- Connection drops briefly, misses updates during reconnection

**Solution:** Never rely solely on WebSockets for guaranteed event capture.

```javascript
// BAD: Only using WebSocket
connection.onAccountChange(account, (info) => {
  processUpdate(info);
});

// GOOD: WebSocket + polling backup
let lastSeenSlot = 0;

connection.onAccountChange(account, (info, context) => {
  lastSeenSlot = context.slot;
  processUpdate(info);
});

// Polling backup every 30s to catch missed updates
setInterval(async () => {
  const currentInfo = await connection.getAccountInfo(account);
  const currentSlot = await connection.getSlot();

  if (currentSlot > lastSeenSlot + 10) {  // More than 10 slots behind
    console.warn('WebSocket lag detected, using polled data');
    processUpdate(currentInfo);
    lastSeenSlot = currentSlot;
  }
}, 30000);
```

**Alternative:** Use `getSignaturesForAddress` polling for transaction monitoring instead of relying on `logsSubscribe`.

```javascript
let lastSignature = null;

async function pollSignatures() {
  const signatures = await connection.getSignaturesForAddress(
    address,
    { until: lastSignature, limit: 10 }
  );

  if (signatures.length > 0) {
    lastSignature = signatures[0].signature;

    for (const sig of signatures.reverse()) {
      await processTransaction(sig);
    }
  }
}

setInterval(pollSignatures, 5000);  // Poll every 5s for guaranteed capture
```

### 2. Stale Data on Reconnection

**Problem:** After reconnecting, your subscription resumes but you've missed updates during downtime.

**Solution:** Re-fetch current state after reconnection, then resume streaming.

```javascript
class StateSync {
  constructor(connection, publicKey) {
    this.connection = connection;
    this.publicKey = publicKey;
    this.currentState = null;
    this.subscriptionId = null;
  }

  async start() {
    // Step 1: Fetch current state
    this.currentState = await this.connection.getAccountInfo(this.publicKey);

    // Step 2: Subscribe to future updates
    this.subscriptionId = await this.connection.onAccountChange(
      this.publicKey,
      (info, context) => {
        this.currentState = info;
        this.onUpdate(info, context);
      }
    );
  }

  async reconnect() {
    // Fetch latest state to catch missed updates
    const latestState = await this.connection.getAccountInfo(this.publicKey);

    if (latestState && this.hasChanged(latestState, this.currentState)) {
      this.currentState = latestState;
      this.onUpdate(latestState, { slot: await this.connection.getSlot() });
    }

    // Resume subscription
    await this.start();
  }

  hasChanged(newState, oldState) {
    if (!oldState) return true;
    return newState.lamports !== oldState.lamports ||
           !newState.data.equals(oldState.data);
  }

  onUpdate(info, context) {
    // Override this method
  }
}
```

### 3. Out-of-Order Updates

**Problem:** WebSocket notifications can arrive out of order, especially when using multiple RPC providers.

**Solution:** Use slot numbers to sequence updates.

```javascript
class OrderedUpdateHandler {
  constructor() {
    this.lastProcessedSlot = 0;
    this.pendingUpdates = new Map();  // slot -> update
  }

  handleUpdate(update, context) {
    const slot = context.slot;

    if (slot <= this.lastProcessedSlot) {
      // Old update, ignore
      return;
    }

    if (slot === this.lastProcessedSlot + 1) {
      // Next expected slot, process immediately
      this.processUpdate(update);
      this.lastProcessedSlot = slot;

      // Check for queued future updates
      this.processPendingUpdates();
    } else {
      // Future update, queue it
      this.pendingUpdates.set(slot, update);
    }
  }

  processPendingUpdates() {
    let nextSlot = this.lastProcessedSlot + 1;

    while (this.pendingUpdates.has(nextSlot)) {
      const update = this.pendingUpdates.get(nextSlot);
      this.processUpdate(update);
      this.pendingUpdates.delete(nextSlot);
      this.lastProcessedSlot = nextSlot;
      nextSlot++;
    }
  }

  processUpdate(update) {
    // Your update logic here
    console.log('Processing update at slot:', this.lastProcessedSlot);
  }
}
```

### 4. Commitment Confusion

**Problem:** Different commitment levels show different data states, causing apparent "rollbacks."

**Reality:** Solana's block finalization is progressive:
- `processed`: Validator received it (~400ms) - NOT guaranteed, can be skipped
- `confirmed`: Supermajority vote (~1-2s) - Safe for UI updates
- `finalized`: 100% irreversible (~13s) - Required for financial settlement

**Pitfall:** Using `processed` for transaction confirmation.

```javascript
// BAD: processed can roll back
connection.onAccountChange(account, handler, { commitment: 'processed' });

// GOOD: confirmed is safe for most UIs
connection.onAccountChange(account, handler, { commitment: 'confirmed' });

// BEST: finalized for financial operations
connection.onAccountChange(account, handler, { commitment: 'finalized' });
```

**When commitment matters most:**
- Trading bots: Use `confirmed` (speed) with fallback to `finalized` (certainty)
- Payment UIs: Use `confirmed` for "pending," wait for `finalized` to mark complete
- DEX interfaces: Use `confirmed` for swap feedback

### 5. Memory Leaks from Subscription Handlers

**Problem:** Event handlers hold references to objects, preventing garbage collection.

```javascript
// BAD: Closure captures large objects
class Dashboard {
  constructor(connection) {
    this.largeDataCache = new Array(10000).fill({});  // Large object

    connection.onAccountChange(account, (info) => {
      // This closure captures 'this', keeping largeDataCache in memory
      this.updateUI(info);
    });
  }
}
```

**Solution:** Use weak references or explicit cleanup.

```javascript
// GOOD: Store subscription ID for cleanup
class Dashboard {
  constructor(connection) {
    this.connection = connection;
    this.subscriptionId = null;
  }

  async start() {
    this.subscriptionId = await this.connection.onAccountChange(
      account,
      this.handleUpdate.bind(this)
    );
  }

  handleUpdate(info) {
    // Method doesn't capture unnecessary scope
  }

  cleanup() {
    if (this.subscriptionId) {
      this.connection.removeAccountChangeListener(this.subscriptionId);
      this.subscriptionId = null;
    }
  }
}
```

## WebSocket vs gRPC Comparison

| Factor | WebSocket | Yellowstone gRPC |
|--------|-----------|------------------|
| **Latency** | ~10ms p90 (slots), ~374ms p90 (accounts) | ~5ms p90 (slots), ~215ms p90 (accounts) |
| **Transport** | JSON over TCP/TLS | Protobuf over HTTP/2 |
| **Payload size** | High (JSON + base64) | Low (binary) |
| **Browser support** | Native | Requires gRPC-web (no bidirectional streaming) |
| **Setup complexity** | Easy (web3.js built-in) | Moderate (requires gRPC client) |
| **Reliability** | Low-Medium (fragile under load) | High (built-in retry, backpressure) |
| **Filtering** | Basic (commitment, encoding) | Advanced (account owners, data size, memcmp) |
| **Best for** | dApp UIs, proof-of-concepts | HFT, MEV, high-throughput indexing |
| **Cost** | Free to moderate | $499/mo+ (dedicated infrastructure) |

**When to upgrade from WebSocket to gRPC:**
1. Latency requirements < 50ms
2. Handling > 100 updates/second
3. Need server-side filtering (reduce bandwidth)
4. Building MEV/arbitrage bots where milliseconds = profit

**When to stick with WebSocket:**
1. Building web dApps (browser compatibility)
2. Monitoring < 10 accounts
3. Latency requirements > 100ms acceptable
4. Development/testing environments

## Production Patterns

### Pattern 1: Multi-Provider Failover

Don't rely on a single RPC provider. Even paid providers have downtime.

```javascript
class MultiProviderWebSocket {
  constructor(endpoints) {
    this.endpoints = endpoints;  // Array of WSS URLs
    this.currentIndex = 0;
    this.connections = [];
    this.activeConnection = null;
  }

  async connect() {
    for (let i = 0; i < this.endpoints.length; i++) {
      try {
        const ws = new ReconnectingWebSocket(this.endpoints[i]);
        await ws.connect();
        this.activeConnection = ws;
        return;
      } catch (error) {
        console.error(`Failed to connect to ${this.endpoints[i]}:`, error);
        // Try next provider
      }
    }
    throw new Error('All providers failed');
  }

  async subscribe(method, params) {
    if (!this.activeConnection) {
      await this.connect();
    }

    return this.activeConnection.subscribe(method, params);
  }
}
```

### Pattern 2: Deduplication Across Providers

When using multiple providers simultaneously, deduplicate events by transaction signature or slot.

```javascript
class DeduplicatingSubscriber {
  constructor(connections) {
    this.connections = connections;
    this.seenSignatures = new Set();
    this.signatureTTL = 60000;  // 60s cache
  }

  subscribeToLogs(filter, handler) {
    this.connections.forEach(conn => {
      conn.onLogs(filter, (logs, context) => {
        const signature = logs.signature;

        if (this.seenSignatures.has(signature)) {
          return;  // Already processed from another provider
        }

        this.seenSignatures.add(signature);

        // Expire after TTL
        setTimeout(() => {
          this.seenSignatures.delete(signature);
        }, this.signatureTTL);

        handler(logs, context);
      });
    });
  }
}
```

### Pattern 3: Rate Limit Aware Subscription Manager

Respect provider limits to avoid disconnections.

```javascript
class SubscriptionManager {
  constructor(connection, limits = { maxSubscriptions: 100 }) {
    this.connection = connection;
    this.limits = limits;
    this.subscriptions = new Map();
  }

  async subscribe(type, params, handler) {
    if (this.subscriptions.size >= this.limits.maxSubscriptions) {
      throw new Error(`Subscription limit reached: ${this.limits.maxSubscriptions}`);
    }

    const id = await this.connection[type](params, handler);
    this.subscriptions.set(id, { type, params, handler });
    return id;
  }

  async unsubscribe(id) {
    const sub = this.subscriptions.get(id);
    if (sub) {
      await this.connection[`${sub.type}Unsubscribe`](id);
      this.subscriptions.delete(id);
    }
  }

  async pruneOldest(count = 1) {
    const toRemove = Array.from(this.subscriptions.keys()).slice(0, count);
    for (const id of toRemove) {
      await this.unsubscribe(id);
    }
  }

  getStats() {
    return {
      active: this.subscriptions.size,
      limit: this.limits.maxSubscriptions,
      available: this.limits.maxSubscriptions - this.subscriptions.size
    };
  }
}
```

### Pattern 4: Circuit Breaker for Unhealthy Connections

Detect degraded connections and force reconnection before failures cascade.

```javascript
class CircuitBreaker {
  constructor(connection, options = {}) {
    this.connection = connection;
    this.failureThreshold = options.failureThreshold || 5;
    this.resetTimeout = options.resetTimeout || 60000;
    this.failures = 0;
    this.state = 'CLOSED';  // CLOSED, OPEN, HALF_OPEN
    this.lastFailureTime = null;
  }

  async execute(operation) {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime > this.resetTimeout) {
        this.state = 'HALF_OPEN';
      } else {
        throw new Error('Circuit breaker is OPEN');
      }
    }

    try {
      const result = await operation();
      if (this.state === 'HALF_OPEN') {
        this.reset();
      }
      return result;
    } catch (error) {
      this.recordFailure();
      throw error;
    }
  }

  recordFailure() {
    this.failures++;
    this.lastFailureTime = Date.now();

    if (this.failures >= this.failureThreshold) {
      this.state = 'OPEN';
      console.error('Circuit breaker opened - forcing reconnection');
      this.connection.reconnect();
    }
  }

  reset() {
    this.failures = 0;
    this.state = 'CLOSED';
  }
}
```

## When NOT to Use WebSockets

### Use Case: Historical Data

WebSockets only provide real-time updates. For historical backfill, use RPC methods or indexers.

```javascript
// Combine historical fetch + real-time subscription
async function syncAccountHistory(connection, account) {
  // 1. Fetch historical signatures
  const signatures = await connection.getSignaturesForAddress(account, { limit: 1000 });

  // 2. Process historical transactions
  for (const sig of signatures.reverse()) {
    const tx = await connection.getTransaction(sig.signature);
    processTransaction(tx);
  }

  // 3. Subscribe to new transactions
  connection.onLogs(
    { mentions: [account] },
    (logs) => processTransaction(logs)
  );
}
```

### Use Case: Data Warehousing

For piping blockchain data to Snowflake, PostgreSQL, or S3, use managed streams (QuickNode Streams) or gRPC with custom ETL.

WebSockets don't provide:
- Delivery guarantees
- Backpressure handling
- Built-in transformation
- Multiple destination routing

### Use Case: High-Frequency Trading

gRPC offers 2-10x lower latency. For competitive trading, WebSockets are too slow.

| Approach | Latency | Use Case |
|----------|---------|----------|
| WebSocket | 10-400ms | dApp UIs |
| gRPC | 5-200ms | General bots |
| Shreds (UDP) | 0.02ms | MEV, arbitrage |

## Monitoring and Debugging

### Health Metrics to Track

```javascript
class WebSocketMonitor {
  constructor(ws) {
    this.ws = ws;
    this.metrics = {
      messagesReceived: 0,
      messagesSent: 0,
      reconnections: 0,
      lastMessageTime: null,
      connectionUptime: 0,
      connectionStartTime: Date.now()
    };

    this.startMonitoring();
  }

  startMonitoring() {
    this.ws.addEventListener('message', () => {
      this.metrics.messagesReceived++;
      this.metrics.lastMessageTime = Date.now();
    });

    // Check for stale connections
    setInterval(() => {
      const timeSinceLastMessage = Date.now() - this.metrics.lastMessageTime;

      if (timeSinceLastMessage > 120000) {  // 2 minutes
        console.warn('No messages received in 2 minutes - connection may be stale');
        this.ws.reconnect();
      }
    }, 60000);

    // Log metrics every minute
    setInterval(() => {
      console.log('WebSocket metrics:', {
        ...this.metrics,
        uptime: Date.now() - this.metrics.connectionStartTime
      });
    }, 60000);
  }
}
```

### Debugging Subscription Issues

```javascript
// Enable verbose logging
const DEBUG = true;

function debugSubscribe(connection, type, params, handler) {
  if (DEBUG) {
    console.log(`[SUBSCRIBE] ${type}`, params);
  }

  const wrappedHandler = (...args) => {
    if (DEBUG) {
      console.log(`[NOTIFICATION] ${type}`, args);
    }
    handler(...args);
  };

  return connection[type](params, wrappedHandler);
}
```

## Summary Decision Matrix

| Your Requirement | Use This |
|------------------|----------|
| dApp UI real-time updates | WebSocket (web3.js) |
| Trading bot (latency sensitive) | Yellowstone gRPC |
| Monitoring 1-10 accounts | WebSocket |
| Monitoring 100+ accounts | gRPC + filtering |
| Data pipeline to warehouse | QuickNode Streams |
| Browser-based application | WebSocket (only option) |
| Guaranteed message delivery | Polling + WebSocket hybrid |
| Historical + real-time sync | RPC fetch + WebSocket |
| High-frequency trading | gRPC or Shreds (UDP) |
| Development/testing | WebSocket (simplest) |

## Key Takeaways

1. **WebSockets are fragile:** Always implement reconnection logic with exponential backoff.
2. **Missed updates happen:** Use polling backup for critical data.
3. **Subscription limits are real:** Track and clean up subscriptions proactively.
4. **Commitment levels matter:** Use `confirmed` for UIs, `finalized` for settlement.
5. **Multiple providers improve reliability:** Implement failover to avoid single points of failure.
6. **gRPC is faster but harder:** Only upgrade when latency requirements demand it.
7. **Heartbeats prevent timeouts:** Send pings every 20-30s to keep connections alive.
8. **Out-of-order updates are normal:** Use slot numbers to sequence events.

## Further Reading

- [Solana WebSocket Methods Reference](https://solana.com/docs/rpc/websocket)
- [Yellowstone gRPC Plugin](https://github.com/rpcpool/yellowstone-grpc)
- [Helius Enhanced WebSockets](https://www.helius.dev/docs/enhanced-websockets)
- [QuickNode Subscription Strategies](https://www.quicknode.com/docs/solana/subscriptions)
- [WebSocket Reconnection Patterns](https://oneuptime.com/blog/post/2026-01-27-websocket-reconnection-logic/view)
