---
pack: solana
topic: "Monitoring & Alerting"
decision: "How do I monitor my Solana program in production?"
confidence: 8/10
sources_checked: 35
last_updated: "2026-02-16"
---

# How Do I Monitor My Solana Program in Production?

## Executive Summary

Monitoring a Solana program in production requires a different approach than traditional web services. You need to track on-chain metrics (program invocations, account state changes, compute unit usage, error rates) and off-chain health indicators (transaction landing rates, account balances, TVL). This guide covers production-grade monitoring patterns specific to Solana's high-throughput, slot-based architecture.

**Quick recommendations:**
- **Real-time event monitoring**: Helius Webhooks or Yellowstone gRPC (account updates, transactions)
- **Error tracking**: Custom log parsing + transaction simulation for debugging
- **Account balance alerts**: Wallet monitoring tools (balance thresholds for operational accounts)
- **Performance metrics**: Compute unit tracking, transaction success rate, slot drift
- **Dashboards**: Grafana + custom Prometheus exporters or Dune Analytics for protocol-level metrics
- **Incident detection**: Combine webhooks + alerting (PagerDuty, Discord, Telegram)

## What Should You Monitor?

### 1. Program Invocations & Transaction Success Rate

**What to track:**
- Total invocations per hour/day
- Success vs. failure rate
- Error code distribution (Anchor custom errors, Solana program errors)
- Transaction simulation failures before submission

**Why it matters:**
- Sudden drop in invocations = frontend issues, wallet integration problems, or network congestion
- Rising error rates = program bugs, account state issues, or insufficient compute budget
- Success rate <95% in production = critical investigation required

**How to monitor:**
- **Helius Enhanced Transactions API**: Filter by program ID, get human-readable transaction types
- **Yellowstone gRPC**: Subscribe to transactions involving your program address
- **RPC polling** (fallback): Query `getSignaturesForAddress` on program ID periodically

**Example: Helius Webhook for Program Invocations**
```typescript
// Create webhook via Helius API
const webhook = await helius.createWebhook({
  webhookURL: "https://your-server.com/webhook",
  transactionTypes: ["ANY"], // Or specific types like SWAP, TRANSFER
  accountAddresses: ["YourProgramID111111111111111111111111111"],
  webhookType: "enhanced",
});

// Handler
app.post("/webhook", (req, res) => {
  const events = req.body;
  events.forEach(event => {
    const success = !event.err;
    const errorMsg = event.err ? JSON.stringify(event.err) : null;

    // Log to metrics
    prometheusClient.increment("program_invocations_total", {
      success: success.toString(),
      instruction: event.instructions[0]?.name || "unknown"
    });

    if (!success) {
      console.error(`Transaction failed: ${event.signature}`, errorMsg);
      // Alert on high error rate
    }
  });
  res.sendStatus(200);
});
```

### 2. Account Balance Monitoring (Operational Accounts)

**Critical accounts to monitor:**
- **Program upgrade authority**: Must have SOL for upgrade transactions
- **Fee payer accounts**: Used by bots, indexers, or backend services
- **Treasury/vault accounts**: Track SOL or token balances for protocol operations
- **PDA rent accounts**: Ensure program-derived accounts maintain rent exemption

**Why it matters:**
- Depleted fee payer = your backend stops working
- Low treasury balance = inability to process withdrawals or rewards
- Lost rent exemption = account gets deleted by Solana runtime

**Monitoring approaches:**

**A) Simple: RPC Polling**
```typescript
import { Connection, PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";

const connection = new Connection("https://api.mainnet-beta.solana.com");
const ALERT_THRESHOLD = 0.5 * LAMPORTS_PER_SOL; // Alert below 0.5 SOL

async function checkBalances() {
  const accounts = [
    { name: "Fee Payer", address: new PublicKey("...") },
    { name: "Treasury", address: new PublicKey("...") },
  ];

  for (const account of accounts) {
    const balance = await connection.getBalance(account.address);

    if (balance < ALERT_THRESHOLD) {
      sendAlert({
        severity: "high",
        message: `${account.name} balance low: ${balance / LAMPORTS_PER_SOL} SOL`,
      });
    }
  }
}

// Run every 5 minutes
setInterval(checkBalances, 5 * 60 * 1000);
```

**B) Advanced: Helius Account Webhooks**
```typescript
// Get notified on every balance change
const webhook = await helius.createWebhook({
  webhookURL: "https://your-server.com/balance-alert",
  accountAddresses: ["FeePayerAddress", "TreasuryAddress"],
  webhookType: "enhanced",
});

// Handler checks balance immediately
app.post("/balance-alert", async (req, res) => {
  const events = req.body;
  for (const event of events) {
    const account = event.accountData.find(a =>
      a.account === "FeePayerAddress"
    );

    if (account && account.nativeBalanceChange < 0) {
      const newBalance = account.balance; // in lamports
      if (newBalance < ALERT_THRESHOLD) {
        sendAlert({
          severity: "critical",
          message: `Fee payer balance: ${newBalance / LAMPORTS_PER_SOL} SOL`,
        });
      }
    }
  }
  res.sendStatus(200);
});
```

**C) Wallet Monitoring Tools (No-Code)**
- **Solana Insider Monitor**: Open-source tool for tracking wallet balance changes
- **Step Finance**: Dashboard with portfolio tracking and alert features
- **Ledger wallet alerts**: Built-in notification system for balance changes

### 3. Total Value Locked (TVL) & Economic Metrics

**What to track:**
- Total SOL or token deposits in your program
- TVL changes over time (deposits vs. withdrawals)
- Number of active users (unique depositors)
- Average transaction size

**Why it matters:**
- Sudden TVL drop = potential exploit, mass withdrawal, or loss of confidence
- Growing TVL with flat user count = whale concentration risk
- TVL plateauing = product-market fit issues or competitive pressure

**Monitoring approaches:**

**A) Real-Time: Geyser Plugin Account Subscriptions**
```typescript
// Using Yellowstone gRPC to monitor vault accounts
import Client from "@triton-one/yellowstone-grpc";

const client = new Client("https://grpc.triton.one", "your-token");

// Subscribe to all vault PDAs
await client.subscribe({
  accounts: {
    vault_monitor: {
      owner: ["YourProgramID"], // All accounts owned by your program
      filters: [
        { memcmp: { offset: 0, bytes: "VaultAccount" } } // Discriminator
      ]
    }
  }
});

client.on("account", (account) => {
  // Deserialize vault account
  const vault = deserializeVault(account.data);

  // Update TVL metric
  prometheusClient.set("protocol_tvl_lamports", vault.totalDeposits);
  prometheusClient.set("protocol_depositors_total", vault.depositorCount);
});
```

**B) Periodic: Dune Analytics Dashboard**
```sql
-- Example Dune query for TVL tracking
SELECT
  block_time,
  SUM(CASE
    WHEN instruction = 'deposit' THEN amount
    WHEN instruction = 'withdraw' THEN -amount
    ELSE 0
  END) OVER (ORDER BY block_time) as cumulative_tvl
FROM solana.instructions
WHERE program_id = 'YourProgramID'
  AND (instruction = 'deposit' OR instruction = 'withdraw')
ORDER BY block_time DESC;
```

**C) On-Demand: RPC `getProgramAccounts` Snapshot**
```typescript
// Expensive call - use sparingly (hourly/daily)
const vaults = await connection.getProgramAccounts(programId, {
  filters: [
    { dataSize: 128 }, // Vault account size
    { memcmp: { offset: 0, bytes: "VaultDiscriminator" } }
  ]
});

let totalTVL = 0;
vaults.forEach(({ account }) => {
  const vault = deserializeVault(account.data);
  totalTVL += vault.balance;
});

prometheusClient.set("protocol_tvl_snapshot", totalTVL);
```

### 4. Compute Unit (CU) Usage & Optimization

**What to track:**
- Actual CU consumed per instruction
- CU limit set vs. actual usage (over-provisioning)
- CU spikes indicating inefficient code paths
- Priority fees paid vs. transaction success rate

**Why it matters:**
- Over-provisioned CU = wasted priority fees (users pay more than necessary)
- Under-provisioned CU = transaction failures
- Sudden CU spike = bug introduced (e.g., infinite loop, inefficient data loading)
- High CU + low success rate = transactions losing fee market competition

**Monitoring approaches:**

**A) Transaction Simulation (Pre-Flight)**
```typescript
import { Transaction, Connection } from "@solana/web3.js";

const connection = new Connection("https://api.mainnet-beta.solana.com");

async function estimateComputeUnits(transaction: Transaction) {
  const simulation = await connection.simulateTransaction(transaction, {
    commitment: "confirmed",
  });

  if (simulation.value.err) {
    console.error("Simulation failed:", simulation.value.logs);
    return null;
  }

  const cuConsumed = simulation.value.unitsConsumed || 0;
  console.log(`Estimated CU: ${cuConsumed}`);

  // Alert if CU spikes above normal
  if (cuConsumed > EXPECTED_CU_THRESHOLD) {
    sendAlert({
      severity: "medium",
      message: `High CU usage: ${cuConsumed} (expected <${EXPECTED_CU_THRESHOLD})`,
    });
  }

  return cuConsumed;
}
```

**B) Post-Transaction Analysis**
```typescript
// After transaction confirms, check actual CU usage
const tx = await connection.getTransaction(signature, {
  commitment: "confirmed",
  maxSupportedTransactionVersion: 0,
});

const cuUsed = tx?.meta?.computeUnitsConsumed || 0;
const cuLimit = findComputeBudgetInstruction(tx)?.units || 200_000;

console.log(`CU Usage: ${cuUsed}/${cuLimit} (${(cuUsed/cuLimit*100).toFixed(1)}%)`);

// Track metrics
prometheusClient.histogram("program_compute_units", cuUsed, {
  instruction: "deposit", // Tag by instruction type
});

prometheusClient.set("compute_efficiency", cuUsed / cuLimit);
```

**C) Continuous Monitoring: Log Parsing**
- Parse Solana validator logs (if running own node)
- Extract `Program log: Consumed X compute units` messages
- Aggregate by program and instruction type

### 5. Error Tracking & Debugging

**Common error categories:**
- **Anchor custom errors**: Your program's business logic errors (e.g., `InsufficientFunds`)
- **Solana program errors**: Runtime errors (e.g., `AccountNotRentExempt`, `InvalidAccountData`)
- **Transaction errors**: Pre-flight failures (e.g., `BlockhashExpired`, `InsufficientFundsForRent`)
- **Network errors**: RPC timeouts, rate limits, slot drift

**Monitoring strategy:**

**A) Webhook Error Parsing**
```typescript
app.post("/webhook", (req, res) => {
  const events = req.body;

  events.forEach(event => {
    if (event.err) {
      const error = parseError(event.err);

      // Log error with context
      logger.error({
        signature: event.signature,
        errorCode: error.code,
        errorMessage: error.message,
        instruction: event.instructions[0]?.name,
        accounts: event.accountData.map(a => a.account),
      });

      // Increment error counter
      prometheusClient.increment("program_errors_total", {
        error_type: error.type, // "anchor" | "solana" | "network"
        error_code: error.code,
      });

      // Alert on new error types
      if (isNewErrorType(error.code)) {
        sendAlert({
          severity: "high",
          message: `New error type detected: ${error.code} - ${error.message}`,
          signature: event.signature,
        });
      }
    }
  });

  res.sendStatus(200);
});

function parseError(err: any) {
  // Anchor custom error (e.g., 0x1770)
  if (err.InstructionError && err.InstructionError[1]?.Custom) {
    const code = err.InstructionError[1].Custom;
    return {
      type: "anchor",
      code: `0x${code.toString(16)}`,
      message: lookupAnchorError(code), // Use your program's IDL
    };
  }

  // Solana program error
  if (err.InstructionError) {
    return {
      type: "solana",
      code: Object.keys(err.InstructionError[1])[0],
      message: JSON.stringify(err.InstructionError[1]),
    };
  }

  // Transaction-level error
  return {
    type: "transaction",
    code: Object.keys(err)[0],
    message: JSON.stringify(err),
  };
}
```

**B) Transaction Simulation for Debugging**
```typescript
// When a production transaction fails, simulate it to get logs
async function debugFailedTransaction(signature: string) {
  const tx = await connection.getTransaction(signature, {
    commitment: "confirmed",
    maxSupportedTransactionVersion: 0,
  });

  if (!tx) {
    console.error("Transaction not found");
    return;
  }

  // Reconstruct transaction for simulation
  const message = tx.transaction.message;
  const simulation = await connection.simulateTransaction(tx.transaction, {
    commitment: "confirmed",
  });

  console.log("Simulation logs:");
  simulation.value.logs?.forEach(log => console.log(log));

  // Parse logs for error context
  const errorLog = simulation.value.logs?.find(log =>
    log.includes("Error:") || log.includes("Panic:")
  );

  if (errorLog) {
    sendAlert({
      severity: "high",
      message: `Transaction ${signature} failed with: ${errorLog}`,
      logs: simulation.value.logs?.join("\n"),
    });
  }
}
```

**C) Anchor Error Mapping**
```typescript
// Auto-generate from your program's IDL
import { Program } from "@coral-xyz/anchor";
import { YourProgram } from "./idl/your_program";

function lookupAnchorError(code: number): string {
  const program = new Program(yourProgramIdl);
  const error = program.idl.errors?.find(e => e.code === code);
  return error ? `${error.name}: ${error.msg}` : `Unknown error code: ${code}`;
}

// Example: Monitoring Anchor errors
// Error code 0x1770 (6000) = "Insufficient funds for withdrawal"
// Error code 0x1771 (6001) = "Invalid deposit amount"
```

### 6. Transaction Landing & Confirmation Times

**What to track:**
- Time from submission to confirmation (p50, p95, p99 latencies)
- Transaction drop rate (submitted but never confirmed)
- Slot drift between submission and landing
- Priority fee effectiveness (correlation with confirmation time)

**Why it matters:**
- High drop rate = RPC issues, insufficient priority fees, or blockhash expiry
- Slow confirmation = poor user experience, especially for time-sensitive operations
- Priority fee optimization = cost savings without sacrificing speed

**Monitoring approaches:**

**A) Client-Side Timing**
```typescript
async function sendAndMonitorTransaction(transaction: Transaction) {
  const startTime = Date.now();
  const signature = await connection.sendRawTransaction(
    transaction.serialize(),
    { skipPreflight: false }
  );

  console.log(`Transaction sent: ${signature}`);

  // Wait for confirmation with timeout
  const timeout = 30_000; // 30 seconds
  try {
    const confirmation = await connection.confirmTransaction(
      signature,
      "confirmed",
      timeout
    );

    const confirmTime = Date.now() - startTime;
    console.log(`Confirmed in ${confirmTime}ms`);

    // Track metrics
    prometheusClient.histogram("transaction_confirmation_time_ms", confirmTime, {
      success: "true",
    });

    return { signature, confirmed: true, time: confirmTime };
  } catch (err) {
    const dropTime = Date.now() - startTime;
    console.error(`Transaction dropped after ${dropTime}ms`);

    prometheusClient.histogram("transaction_confirmation_time_ms", dropTime, {
      success: "false",
    });
    prometheusClient.increment("transaction_drops_total");

    return { signature, confirmed: false, time: dropTime };
  }
}
```

**B) Webhook-Based Landing Detection**
```typescript
// Track submission time, get confirmation via webhook
const pendingTxs = new Map(); // signature -> { startTime, instruction }

async function submitTransaction(tx: Transaction) {
  const signature = await connection.sendRawTransaction(tx.serialize());
  pendingTxs.set(signature, {
    startTime: Date.now(),
    instruction: tx.instructions[0].data.toString(),
  });

  // Cleanup old entries after 60s
  setTimeout(() => {
    if (pendingTxs.has(signature)) {
      console.warn(`Transaction ${signature} never confirmed`);
      prometheusClient.increment("transaction_drops_total");
      pendingTxs.delete(signature);
    }
  }, 60_000);
}

app.post("/webhook", (req, res) => {
  const events = req.body;
  events.forEach(event => {
    const pending = pendingTxs.get(event.signature);
    if (pending) {
      const confirmTime = Date.now() - pending.startTime;
      console.log(`Transaction confirmed in ${confirmTime}ms`);

      prometheusClient.histogram("transaction_confirmation_time_ms", confirmTime);
      pendingTxs.delete(event.signature);
    }
  });
  res.sendStatus(200);
});
```

---

## Monitoring Approaches: On-Chain vs. Off-Chain

### On-Chain Monitoring (Direct Blockchain Data)

**Helius Webhooks**
- **Best for**: Real-time notifications on account changes, transactions, NFT events
- **Pricing**: 1 credit per event delivered (starts at 1M credits free/month)
- **Latency**: ~50-200ms after transaction confirmation
- **Use cases**: Transaction monitoring, balance alerts, event-driven automation

**Pros:**
- No polling overhead (push-based)
- Human-readable transaction parsing (Enhanced Transactions API)
- Webhook retries and delivery guarantees
- Supports filtering by program, accounts, transaction types

**Cons:**
- Requires publicly accessible endpoint (use ngrok for local dev)
- Must handle duplicate events (webhook retries)
- Credit-based pricing can get expensive at scale
- Limited to confirmed commitment level (no pre-confirmation data)

**Example setup:**
```bash
curl -X POST 'https://api.helius.xyz/v0/webhooks?api-key=YOUR_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "webhookURL": "https://your-server.com/webhook",
    "transactionTypes": ["SWAP", "TRANSFER"],
    "accountAddresses": ["YourProgramID"],
    "webhookType": "enhanced"
  }'
```

---

**Yellowstone gRPC (Geyser Plugin)**
- **Best for**: High-frequency trading, real-time indexers, low-latency monitoring
- **Pricing**: Varies by provider (Chainstack: $49-$500/month, Helius LaserStream: $999+/month)
- **Latency**: <50ms (sub-slot updates, multiple events per 400ms slot)
- **Use cases**: HFT bots, DEX monitoring, real-time analytics

**Pros:**
- Fastest possible data delivery (pre-finalization via ShredStream)
- Strongly-typed Protobuf payloads (efficient binary format)
- Subscribe to specific accounts, programs, or transactions (filtered streaming)
- Open-source protocol (portable across providers)

**Cons:**
- Backend-only (gRPC not browser-compatible; need middleware)
- More complex setup vs. webhooks (Protobuf compilation, streaming client)
- Higher cost for premium providers
- Must handle reconnections and stream backpressure

**Example subscription:**
```typescript
import Client from "@triton-one/yellowstone-grpc";

const client = new Client("grpc.endpoint.com:443", "token");

await client.subscribe({
  accounts: {
    monitor: {
      account: ["VaultAccount1", "VaultAccount2"],
      owner: [], // Or filter by owner (your program ID)
    }
  },
  transactions: {
    txs: {
      accountInclude: ["YourProgramID"],
      accountRequired: [],
    }
  },
  commitment: 0, // 0=Processed, 1=Confirmed, 2=Finalized
});

client.on("account", (account) => {
  console.log("Account updated:", account.account.pubkey.toString("base64"));
  // Update metrics
});

client.on("transaction", (tx) => {
  console.log("Transaction:", tx.signature.toString("base64"));
  // Track success/failure
});
```

---

**RPC Polling (Standard JSON-RPC)**
- **Best for**: Low-frequency monitoring, simple setups, free-tier friendly
- **Pricing**: Varies by provider (some free, some credit-based)
- **Latency**: 5-60 seconds depending on poll interval
- **Use cases**: Account balance checks, periodic health checks, dashboard updates

**Pros:**
- Simple to implement (no webhooks or gRPC setup)
- Works with any RPC provider (no specialized APIs)
- Easy to test locally
- No inbound traffic required (firewall-friendly)

**Cons:**
- High latency (limited by poll frequency)
- Inefficient (wasted calls when no state changes)
- Rate limit concerns (expensive methods like `getProgramAccounts`)
- No real-time alerting

**Example: Poll for balance changes**
```typescript
let lastBalance = 0;

setInterval(async () => {
  const balance = await connection.getBalance(monitoredAccount);

  if (balance !== lastBalance) {
    console.log(`Balance changed: ${lastBalance} -> ${balance}`);
    prometheusClient.set("account_balance_lamports", balance);

    if (balance < ALERT_THRESHOLD) {
      sendAlert({ message: "Balance low", balance });
    }

    lastBalance = balance;
  }
}, 10_000); // Poll every 10 seconds
```

---

**Log Streaming (Solana WebSockets)**
- **Best for**: Transaction log monitoring, smart contract event parsing
- **Pricing**: Included with RPC (subject to rate limits)
- **Latency**: ~400-800ms (slot confirmation + network)
- **Use cases**: Event-driven UIs, transaction log parsing, error detection

**Pros:**
- Native to Solana RPC (no third-party dependency)
- Real-time (within slot confirmation limits)
- Can filter by program address or log mentions
- Useful for debugging (full log output)

**Cons:**
- Only emits at slot confirmation (not pre-confirmation)
- WebSocket management (reconnections, backpressure)
- Log parsing required (no structured data like Helius Enhanced Transactions)
- Browser-friendly but less efficient than gRPC

**Example: Subscribe to program logs**
```typescript
const subscriptionId = connection.onLogs(
  programId,
  (logs) => {
    console.log("Program logs:", logs.logs);

    // Parse for errors
    const hasError = logs.logs.some(log =>
      log.includes("Error:") || log.includes("Panic:")
    );

    if (hasError) {
      prometheusClient.increment("program_errors_total");
      sendAlert({
        severity: "high",
        message: "Program error detected",
        signature: logs.signature,
        logs: logs.logs.join("\n"),
      });
    }
  },
  "confirmed"
);

// Cleanup on exit
process.on("SIGINT", () => {
  connection.removeOnLogsListener(subscriptionId);
});
```

---

### Off-Chain Monitoring (Infrastructure & Metrics)

**Prometheus + Grafana (Custom Metrics)**
- **Best for**: Aggregating custom metrics, historical analysis, dashboards
- **Setup complexity**: Medium (requires Prometheus exporter, Grafana instance)
- **Cost**: Free (self-hosted) or cloud (Grafana Cloud: $8-50/month)

**What to monitor:**
- Program invocation counts (by instruction type)
- Error rates (by error code)
- Compute unit usage (histogram)
- Transaction confirmation times (p50, p95, p99)
- Account balances (operational accounts)
- TVL snapshots (periodic)

**Example Prometheus metrics:**
```typescript
import { Registry, Counter, Histogram, Gauge } from "prom-client";

const register = new Registry();

// Counters
const invocations = new Counter({
  name: "program_invocations_total",
  help: "Total program invocations",
  labelNames: ["instruction", "success"],
  registers: [register],
});

const errors = new Counter({
  name: "program_errors_total",
  help: "Total errors by type",
  labelNames: ["error_type", "error_code"],
  registers: [register],
});

// Histograms
const confirmTime = new Histogram({
  name: "transaction_confirmation_time_ms",
  help: "Transaction confirmation time in milliseconds",
  labelNames: ["instruction"],
  buckets: [100, 200, 500, 1000, 2000, 5000, 10000],
  registers: [register],
});

const computeUnits = new Histogram({
  name: "program_compute_units",
  help: "Compute units consumed per instruction",
  labelNames: ["instruction"],
  buckets: [1000, 5000, 10000, 25000, 50000, 100000, 200000],
  registers: [register],
});

// Gauges
const balance = new Gauge({
  name: "account_balance_lamports",
  help: "Account balance in lamports",
  labelNames: ["account_name"],
  registers: [register],
});

const tvl = new Gauge({
  name: "protocol_tvl_lamports",
  help: "Total value locked in protocol",
  registers: [register],
});

// Expose metrics endpoint
app.get("/metrics", async (req, res) => {
  res.set("Content-Type", register.contentType);
  res.end(await register.metrics());
});
```

**Grafana dashboard example:**
- Panel 1: Transaction success rate (last 1h, 24h)
- Panel 2: Error distribution (pie chart by error code)
- Panel 3: Confirmation time percentiles (line graph: p50, p95, p99)
- Panel 4: Compute unit usage (histogram)
- Panel 5: Account balances (multi-line graph)
- Panel 6: TVL over time (area chart)

---

**Dune Analytics (Protocol-Level Metrics)**
- **Best for**: Public dashboards, community transparency, historical analysis
- **Setup complexity**: Low (SQL queries, no infrastructure)
- **Cost**: Free for public dashboards, $99-399/month for private

**What to monitor:**
- Daily active users (unique signers)
- Transaction volume over time
- TVL trends (aggregated across all program accounts)
- Revenue metrics (fees collected)
- Top users by volume

**Example query: Daily Active Users**
```sql
SELECT
  DATE_TRUNC('day', block_time) as date,
  COUNT(DISTINCT signer) as daily_active_users,
  COUNT(*) as transaction_count
FROM solana.transactions
WHERE array_contains(account_keys, 'YourProgramID')
  AND succeeded = true
  AND block_time > NOW() - INTERVAL '30' DAY
GROUP BY 1
ORDER BY 1 DESC;
```

**Example query: TVL Over Time**
```sql
WITH deposits AS (
  SELECT
    block_time,
    SUM(amount) OVER (ORDER BY block_time) as cumulative_tvl
  FROM (
    SELECT
      block_time,
      CASE
        WHEN instruction_name = 'deposit' THEN amount
        WHEN instruction_name = 'withdraw' THEN -amount
        ELSE 0
      END as amount
    FROM solana.instructions
    WHERE program_id = 'YourProgramID'
  )
)
SELECT
  DATE_TRUNC('hour', block_time) as hour,
  MAX(cumulative_tvl) as tvl
FROM deposits
GROUP BY 1
ORDER BY 1 DESC;
```

---

**Solana Watchtower (Validator Monitoring)**
- **Best for**: Validator operators, not directly for program monitoring
- **Note**: Built for validator health (delinquency alerts), less relevant for dApp developers

**Adaptation for programs:**
- Monitor "program authority" account balance (similar to validator voting account)
- Alert on abnormal transaction patterns (sudden surge or drop)
- Track slot lag of RPC providers (indirect indicator of data freshness)

---

**Community Tools & No-Code Options**

**Solana Watchtower (Program Fork)**
- **GitHub**: hasip-timurtas/solana-watchtower
- **Features**: Watch/analyze Solana programs in real-time, alerts, metrics, logs, rules, dashboards
- **Setup**: Docker-based, configurable via YAML

**Dialect Monitoring Service**
- **GitHub**: dialectlabs/solana-monitoring-service
- **Features**: Messaging protocol for on-chain notifications
- **Use case**: User-facing alerts (e.g., "Your vault is at risk of liquidation")

**Simple Program Monitoring Scripts**
- **GitHub**: accretion-xyz/simple-program-monitoring
- **Features**: Lightweight scripts for monitoring program invocations
- **Setup**: Node.js scripts with RPC polling

---

## Alerting Strategies

### Alert Channels

**1. PagerDuty / Opsgenie (Production)**
- Use for critical alerts (program errors, balance depletion, TVL drops)
- Escalation policies (notify on-call engineer if no response)
- Incident tracking and post-mortems

**2. Discord / Telegram (Team)**
- Real-time alerts for medium-severity issues
- Separate channels: #alerts-critical, #alerts-info
- Bot integration for rich messages (embed transaction links)

**3. Slack (Internal)**
- Workflow automation (alert -> create Jira ticket)
- Thread discussions for incident resolution
- Status dashboard pins

**4. Email (Low-Priority)**
- Daily/weekly summary reports
- Non-urgent anomalies (unusual traffic patterns)
- Compliance notifications

### Alert Severity Levels

**CRITICAL** (Wake up on-call engineer)
- Program upgrade authority balance <0.1 SOL
- Error rate >10% in last 5 minutes
- TVL drop >20% in last hour
- All transactions failing for 10+ minutes

**HIGH** (Investigate within 15 minutes)
- Fee payer balance <1 SOL
- New error type detected
- Transaction confirmation time p95 >10 seconds
- Compute unit usage spike >50% above baseline

**MEDIUM** (Investigate within 1 hour)
- Unusual traffic patterns (10x surge or 50% drop)
- RPC rate limits hit
- Single instruction type failure rate >5%

**LOW** (Review daily)
- Suboptimal compute budget (over-provisioned >20%)
- Slow RPC response times (p95 >2 seconds)
- Minor account balance dips (still above critical threshold)

**INFO** (Monitoring only, no alerts)
- Successful transaction volume changes
- New users detected
- TVL growth

### Alert Throttling & Deduplication

**Problem**: Alert storms during incidents (hundreds of duplicate alerts)

**Solution**:
```typescript
const alertCache = new Map(); // alertKey -> lastSentTime

function sendAlert(alert: Alert) {
  const key = `${alert.severity}_${alert.type}_${alert.message}`;
  const lastSent = alertCache.get(key) || 0;
  const now = Date.now();

  // Throttle: Only send same alert once per 5 minutes
  if (now - lastSent < 5 * 60 * 1000) {
    console.log(`Alert throttled: ${key}`);
    return;
  }

  // Send to PagerDuty, Discord, etc.
  pagerduty.trigger({
    severity: alert.severity,
    summary: alert.message,
    details: alert,
  });

  alertCache.set(key, now);
}
```

---

## Incident Detection Patterns

### Pattern 1: Transaction Success Rate Drop

**Trigger**: Success rate drops below 95% for 5+ minutes

**Possible causes:**
- Program bug introduced in recent update
- Insufficient compute budget (network CU prices increased)
- Account state corruption (PDA data invalid)
- RPC provider issues (slot drift, stale data)

**Debugging steps:**
1. Check recent program upgrades (revert if necessary)
2. Simulate failing transactions to get logs
3. Review error distribution (new error codes?)
4. Compare RPC providers (slot drift check)

---

### Pattern 2: Balance Depletion Alert

**Trigger**: Fee payer or treasury balance below critical threshold

**Possible causes:**
- Normal operation (forgot to top up)
- Unexpected cost spike (priority fees increased)
- Exploit or unauthorized access (stolen keys)

**Debugging steps:**
1. Check recent transactions from account (via Solscan)
2. Review transaction signatures for unusual patterns
3. Verify fee payer key security (rotate if compromised)
4. Top up balance immediately (automation: auto-refill via script)

---

### Pattern 3: TVL Sudden Drop

**Trigger**: TVL decreases >10% in 1 hour

**Possible causes:**
- Whale withdrawal (normal)
- Exploit or vulnerability (urgent)
- UI bug (users withdrawing due to fear)
- Market-wide event (contagion from other protocol)

**Debugging steps:**
1. Review large withdrawals (transaction signatures)
2. Check for unusual transaction patterns (exploit detection)
3. Verify program logic (audit recent changes)
4. Communicate with community (transparency if exploit confirmed)

---

### Pattern 4: Compute Unit Spike

**Trigger**: CU usage increases >50% above baseline

**Possible causes:**
- Code change introduced inefficiency (loop, large data load)
- User behavior change (complex multi-leg transactions)
- Bug: Infinite loop or excessive logging

**Debugging steps:**
1. Compare CU usage before/after recent deployment
2. Simulate transactions to profile instruction steps
3. Review program logs for excessive iterations
4. Optimize hot paths (reduce account loads, simplify logic)

---

### Pattern 5: New Error Code Detected

**Trigger**: Error code never seen before (or rare) appears

**Possible causes:**
- Edge case triggered (user behavior not anticipated)
- Program bug (logic error in new code path)
- Account state issue (corrupted PDA data)

**Debugging steps:**
1. Look up error code in Anchor IDL (decode message)
2. Simulate transaction to reproduce error
3. Review program logs for context
4. Check account data for anomalies

---

## Dashboards: What to Visualize

### Real-Time Dashboard (Grafana)

**Panel 1: Transaction Success Rate**
- Metric: `program_invocations_total{success="true"} / program_invocations_total`
- Time range: Last 1h, 6h, 24h
- Alert threshold: <95% for 5 minutes

**Panel 2: Error Distribution**
- Metric: `program_errors_total` grouped by `error_code`
- Visualization: Pie chart or bar chart
- Top 5 errors by count

**Panel 3: Confirmation Time Percentiles**
- Metric: `transaction_confirmation_time_ms` (p50, p95, p99)
- Visualization: Multi-line time series
- Alert threshold: p95 >10 seconds

**Panel 4: Compute Unit Usage**
- Metric: `program_compute_units` histogram
- Visualization: Heatmap over time
- Track average and p95

**Panel 5: Account Balances**
- Metric: `account_balance_lamports` by account name
- Visualization: Multi-line time series (SOL units)
- Alert lines: Critical and warning thresholds

**Panel 6: TVL Over Time**
- Metric: `protocol_tvl_lamports`
- Visualization: Area chart
- Include 7-day and 30-day change annotations

**Panel 7: Active Users (24h rolling)**
- Metric: Count of unique signers (derived from transaction logs)
- Visualization: Single stat with sparkline

**Panel 8: RPC Latency (if monitoring multiple providers)**
- Metric: `rpc_request_duration_ms` by provider
- Visualization: Comparison bar chart
- Detect slot drift or provider issues

---

### Public Dashboard (Dune Analytics)

**Panel 1: Daily Active Users**
- Query: Unique signers per day (last 30 days)

**Panel 2: Transaction Volume**
- Query: Total transactions per day (success vs. failure)

**Panel 3: TVL Chart**
- Query: Cumulative deposits minus withdrawals over time

**Panel 4: Revenue (Fees Collected)**
- Query: Sum of fees paid to your protocol (if applicable)

**Panel 5: Top Users by Volume**
- Query: Leaderboard of largest depositors or traders

**Panel 6: Geographic Distribution (if tracking wallet metadata)**
- Query: Map of users by region (requires off-chain data enrichment)

---

## Production Checklist

### Pre-Launch
- [ ] Set up monitoring for all critical accounts (upgrade authority, fee payers, treasuries)
- [ ] Configure webhooks or gRPC streaming for program invocations
- [ ] Define error thresholds and alert rules
- [ ] Create Grafana dashboards (or equivalent)
- [ ] Test alerting (send test alerts to PagerDuty, Discord, etc.)
- [ ] Document runbooks for common incidents
- [ ] Set up automated balance top-ups (fee payer accounts)

### Post-Launch (First Week)
- [ ] Monitor error rates closely (watch for new error types)
- [ ] Track transaction confirmation times (optimize priority fees if needed)
- [ ] Review compute unit usage (optimize if over-provisioned)
- [ ] Validate TVL tracking (compare on-chain vs. dashboard)
- [ ] Test incident response (simulate balance depletion alert)

### Ongoing (Weekly/Monthly)
- [ ] Review alert thresholds (adjust based on normal patterns)
- [ ] Audit error logs (identify recurring issues)
- [ ] Optimize compute budgets (reduce costs)
- [ ] Check RPC provider performance (consider switching if degraded)
- [ ] Update dashboards (add new metrics as needed)
- [ ] Review post-mortems for past incidents (improve runbooks)

---

## Common Pitfalls

### 1. "We'll add monitoring later"
**Reality**: Critical bugs are often discovered via user reports, not internal monitoring. By the time you notice, reputation damage is done.

**Solution**: Set up basic monitoring (balance alerts, error tracking) BEFORE mainnet launch.

---

### 2. "RPC polling is good enough"
**Reality**: Polling introduces 5-60 second delays, misses rapid state changes, and wastes RPC credits.

**Solution**: Use webhooks (Helius) or gRPC (Yellowstone) for real-time monitoring. Reserve polling for low-priority checks.

---

### 3. "One alert channel is fine"
**Reality**: Discord alerts get lost in conversation. Email alerts go unread during off-hours.

**Solution**: Multi-tier alerting: PagerDuty for critical, Discord for high, email for low.

---

### 4. "We'll decode errors manually when needed"
**Reality**: During incidents, manually looking up error codes wastes precious time.

**Solution**: Automate error decoding (use Anchor IDL to map error codes to human-readable messages).

---

### 5. "Monitoring is expensive"
**Reality**: Basic monitoring (webhooks + Prometheus + Grafana) costs <$100/month. Missing a critical bug costs 1000x more.

**Solution**: Start with free tiers (Helius 1M credits, Grafana self-hosted) and upgrade as you scale.

---

## Cost Breakdown

### Minimal Setup (Free Tier)
- **RPC**: Alchemy Free (30M calls/month) — $0
- **Monitoring**: Helius Free (1M webhook credits) — $0
- **Metrics**: Self-hosted Prometheus + Grafana — $0 (if you have server)
- **Alerting**: Discord webhooks — $0
- **Total**: $0/month (suitable for testnet/early mainnet)

### Production Setup (Small Scale)
- **RPC**: Helius Developer ($49) + Alchemy Free (failover) — $49
- **Monitoring**: Helius webhooks (10M credits, ~$49 covered in RPC tier) — $0 extra
- **Metrics**: Grafana Cloud Essentials ($8) — $8
- **Alerting**: PagerDuty Free (5 users) + Discord — $0
- **Total**: ~$57/month

### Production Setup (Medium Scale)
- **RPC**: Helius Business ($499) + QuickNode backup ($299) — $798
- **Monitoring**: Helius webhooks (100M credits included) — $0 extra
- **Metrics**: Grafana Cloud Pro ($50) — $50
- **Alerting**: PagerDuty Starter ($21/user, 3 users) + Discord — $63
- **Total**: ~$911/month

### High-Scale / Trading
- **RPC**: Dedicated nodes (Helius Enterprise $5K+) — $5,000+
- **Streaming**: Yellowstone gRPC (Chainstack $500 or Helius LaserStream $999+) — $999
- **Metrics**: Grafana Cloud Advanced ($200+) — $200
- **Alerting**: PagerDuty Business ($41/user, 5 users) + Opsgenie — $205
- **Total**: ~$6,404+/month

**ROI Calculation**: Detecting a critical bug 1 hour earlier can save $10K-$100K in exploited TVL. Monitoring pays for itself after preventing a single incident.

---

## Tools & Resources

### Monitoring Services
- **Helius**: https://www.helius.dev/docs/webhooks
- **Yellowstone gRPC**: https://docs.triton.one (Triton One)
- **Chainstack Geyser**: https://chainstack.com/yellowstone-grpc/
- **QuickNode**: https://www.quicknode.com/docs/solana (add-ons marketplace)

### Open-Source Tools
- **Solana Watchtower (Program Fork)**: https://github.com/hasip-timurtas/solana-watchtower
- **Dialect Monitoring**: https://github.com/dialectlabs/solana-monitoring-service
- **Solana Insider Monitor**: https://github.com/AccursedGalaxy/Insider-Monitor
- **Simple Program Monitoring**: https://github.com/accretion-xyz/simple-program-monitoring

### Dashboards & Analytics
- **Grafana**: https://grafana.com (self-hosted or cloud)
- **Prometheus**: https://prometheus.io (metrics collection)
- **Dune Analytics**: https://dune.com (public dashboards)
- **Solscan Analytics**: https://solscan.io/analytics
- **Step Finance**: https://app.step.finance (portfolio tracking)

### Alerting Platforms
- **PagerDuty**: https://www.pagerduty.com
- **Opsgenie**: https://www.atlassian.com/software/opsgenie
- **Discord Webhooks**: https://discord.com/developers/docs/resources/webhook
- **Telegram Bots**: https://core.telegram.org/bots/api

### Debugging Tools
- **Solana Explorer**: https://explorer.solana.com
- **Solscan**: https://solscan.io (better UX for transaction inspection)
- **Helius Enhanced Transactions**: https://www.helius.dev/docs/enhanced-transactions-api
- **Anchor IDL Decoder**: Use `@coral-xyz/anchor` SDK for error decoding

### Wallet Monitoring
- **Bitquery Solana API**: https://docs.bitquery.io/docs/blockchain/Solana/
- **Ledger Wallet Alerts**: https://www.ledger.com/academy/solana-wallet-alerts

---

## Conclusion

Monitoring a Solana program in production requires a multi-layered approach:
1. **Real-time event streaming** (webhooks or gRPC) for transaction monitoring
2. **Balance alerts** (critical accounts must never run dry)
3. **Error tracking** (automated decoding and alerting)
4. **Performance metrics** (compute units, confirmation times)
5. **Dashboards** (Grafana for ops, Dune for community)
6. **Incident response** (multi-tier alerting, runbooks)

**The minimum viable monitoring setup** (first week of production):
- Helius webhooks for program invocations (detect errors)
- RPC polling for fee payer balance (avoid depletion)
- Discord alerts for critical issues
- Manual transaction inspection for debugging

**The production-grade setup** (scaling beyond MVP):
- Helius Enhanced Transactions + Yellowstone gRPC (real-time data)
- Prometheus + Grafana (custom metrics and dashboards)
- PagerDuty (critical alerting with escalation)
- Dune Analytics (public transparency dashboard)
- Automated runbooks (incident response automation)

Start simple, measure what matters (error rate, balance, confirmation time), and iterate based on real production incidents.

---

## Sources & Further Reading

**Official Documentation:**
- Solana Monitoring Best Practices: https://docs.solanalabs.com/operations/best-practices/monitoring
- Helius Webhooks Guide: https://www.helius.dev/docs/webhooks
- Yellowstone gRPC Guide: https://www.quicknode.com/guides/solana-development/tooling/geyser/yellowstone

**Technical Guides:**
- Build a Wallet Tracker on Solana: https://helius.dev/blog/build-a-wallet-tracker-on-solana
- Solana Geyser Plugins: https://medium.com/@extremelysunnyyk/solana-geyser-plugins-powering-high-speed-data-streaming-guide
- Using Transaction Simulations to Debug: https://medium.com/@connect.hashblock/using-solana-logs-and-transaction-simulations-to-debug-production-failures

**Tools & Comparisons:**
- Top Solana Block Explorers: https://www.helius.dev/blog/top-solana-block-explorers
- Best Tools for On-Chain Analytics: https://www.nansen.ai/post/best-tools-for-solana-onchain-activity-analysis-2025-guide
- Solana Watchtower README: https://github.com/solana-labs/solana/blob/master/watchtower/README.md

**Community Discussions:**
- Monitoring Anchor Program Failures: https://solana.stackexchange.com/questions/24079/what-tools-or-approaches-do-teams-use-to-monitor-anchor-program-failures-in-prod
- Post-Deployment Tooling: https://forum.solana.com/t/post-deployment-monitoring-tooling/1031
- Debugging Failed Transactions: https://www.uniblock.dev/blog/how-to-debug-failed-transactions-on-solana

**Video Resources:**
- Solana Validator Monitoring (YouTube): https://www.youtube.com/watch?v=lLxC0BXC08k
- Real-Time Streams with Yellowstone gRPC: https://www.youtube.com/watch?v=ICBF1wdD-sM
