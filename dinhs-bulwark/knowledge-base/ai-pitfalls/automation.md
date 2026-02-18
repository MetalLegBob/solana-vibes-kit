# AI-Generated Code Pitfalls: Automation & Bots
<!-- Domain: automation -->
<!-- Relevant auditors: BOT-01, BOT-02, BOT-03 -->

AI code generators (ChatGPT, Claude, Copilot, etc.) produce particularly dangerous patterns when generating automated trading bots, keeper systems, and crank turners. The generated code often "works" in isolation but lacks the safety mechanisms required for systems that sign transactions and move funds autonomously. These pitfalls are critical because automation code runs unattended, magnifying the impact of every deficiency.

---

## AIP-129: Trading Bot Without Fund Limits or Kill Switch

**Auditors:** BOT-01
**Related patterns:** OC-247, OC-248, OC-256

AI generators produce trading bot loops that execute strategies indefinitely without any maximum loss threshold, daily spending cap, or emergency shutdown mechanism. The generated code focuses on the strategy logic (buy/sell signals) and treats risk management as a separate concern that is never implemented. The bot will trade until its wallet is completely empty during an adverse scenario.

```typescript
// AI-GENERATED (DANGEROUS):
while (true) {
  const signal = await strategy.evaluate();
  if (signal.action === 'buy') {
    await jupiter.swap({ inputMint: SOL, outputMint: signal.token, amount: signal.amount });
  }
  await sleep(5000);
}

// CORRECT: Wrap in circuit breaker with loss limits
const bot = new TradingBot({
  maxDailyLossLamports: 1_000_000_000,  // 1 SOL max daily loss
  maxDrawdownPercent: 0.15,              // 15% drawdown triggers shutdown
  maxPerTradeLamports: 100_000_000,      // 0.1 SOL max per trade
});
bot.onKillSwitch((reason) => { alertOperator(reason); process.exit(0); });
await bot.run(strategy);
```

---

## AIP-130: Infinite Retry Loop Without Backoff or Maximum Attempts

**Auditors:** BOT-01
**Related patterns:** OC-249, OC-250

AI models generate retry logic using `while (true)` with a fixed short delay and no maximum attempt count. The generated code catches all errors uniformly and retries, even for permanent failures like closed accounts or invalid program IDs. Combined with fee escalation, this pattern can drain a wallet through transaction fees alone.

```typescript
// AI-GENERATED (DANGEROUS):
while (true) {
  try {
    await sendAndConfirmTransaction(connection, tx, [signer]);
    break;
  } catch (err) {
    console.log('Retrying...');
    await sleep(500);
  }
}

// CORRECT: Bounded retries with exponential backoff and permanent error detection
for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
  try {
    await sendAndConfirmTransaction(connection, tx, [signer]);
    return;
  } catch (err) {
    if (isPermanentError(err)) throw err;
    await sleep(Math.min(1000 * Math.pow(2, attempt), 30000));
  }
}
throw new Error('Max retries exceeded');
```

---

## AIP-131: Hardcoded Slippage Tolerance in All Swap Operations

**Auditors:** BOT-02
**Related patterns:** OC-253, OC-258

When generating DEX swap code for bots, AI models hardcode a single slippage value (typically 5% or 500 basis points) that is used for all token pairs and market conditions. The generated code does not differentiate between stablecoin pairs, major tokens, and volatile memecoins. A 5% slippage on a stablecoin swap is a direct gift to MEV sandwich attackers, while 5% on a low-liquidity memecoin may still be insufficient.

```typescript
// AI-GENERATED (DANGEROUS):
const SLIPPAGE_BPS = 500; // 5% everywhere -- sandwich attack magnet
await jupiter.computeRoutes({ inputMint, outputMint, amount, slippageBps: SLIPPAGE_BPS });

// CORRECT: Dynamic slippage based on pair type, liquidity, and volatility
const slippageBps = await calculateDynamicSlippage(inputMint, outputMint, amount);
// stablecoin pairs: 5-20 bps, major tokens: 50-100 bps, volatile: 100-300 bps
```

---

## AIP-132: No Oracle Staleness Check on Price Feed Reads

**Auditors:** BOT-02
**Related patterns:** OC-254

AI generators produce code that reads oracle price data (Pyth, Switchboard) by directly parsing account data without checking the price update timestamp. The generated code trusts whatever price is in the account, even if the oracle has not updated in hours due to network congestion or an outage. Pyth's SDK provides `getPriceNoOlderThan()` specifically for this purpose, but AI models use the lower-level `get_price()` instead.

```typescript
// AI-GENERATED (DANGEROUS):
const priceData = parsePythPriceData(accountInfo.data);
const price = priceData.price; // Could be hours old

// CORRECT: Enforce staleness threshold
const price = priceFeed.getPriceNoOlderThan(currentTimestamp, 30); // Max 30 seconds old
if (!price) throw new Error('Price feed stale, refusing to act');
// Also check confidence interval: reject if band is too wide
if (price.conf / Math.abs(price.price) > 0.05) throw new Error('Price confidence too wide');
```

---

## AIP-133: Bot Signs All Transactions Without Program Allowlist

**Auditors:** BOT-01
**Related patterns:** OC-246

AI-generated keeper and crank bot code signs every transaction instruction it constructs without validating that the target program is in an approved allowlist. The generated code trusts its own instruction-building logic completely. If the instruction builder is fed malicious data (via a compromised config, a poisoned queue message, or a supply chain attack like CVE-2024-54134), the bot signs transactions interacting with arbitrary programs, including attacker-deployed drainers.

```typescript
// AI-GENERATED (DANGEROUS):
const ix = buildInstruction(eventData); // eventData could target any program
const tx = new Transaction().add(ix);
await sendAndConfirmTransaction(connection, tx, [botKeypair]);

// CORRECT: Validate program ID before signing
const ALLOWED_PROGRAMS = new Set(['DRiFt...', 'JUP6...', '11111...']);
if (!ALLOWED_PROGRAMS.has(ix.programId.toBase58())) {
  throw new Error(`Blocked: unauthorized program ${ix.programId}`);
}
const tx = new Transaction().add(ix);
await sendAndConfirmTransaction(connection, tx, [botKeypair]);
```

---

## AIP-134: Exchange API Key Created With Full Permissions

**Auditors:** BOT-02
**Related patterns:** OC-257

AI-generated exchange bot examples instruct users to create API keys and paste them into `.env` files without specifying which permissions to enable. The tutorials generated by AI models typically say "create an API key on Binance" without mentioning that withdrawal permission should be disabled, IP whitelisting should be enabled, or trading pair restrictions should be configured. Users follow these instructions and create keys with all permissions enabled.

```typescript
// AI-GENERATED (DANGEROUS):
// .env file:
// BINANCE_API_KEY=your_key_here  <-- No guidance on permissions
// BINANCE_SECRET=your_secret_here

const client = Binance({ apiKey: process.env.BINANCE_API_KEY, apiSecret: process.env.BINANCE_SECRET });

// CORRECT: Validate key permissions at startup and refuse to run with withdrawal access
const account = await client.accountInfo();
if (account.canWithdraw) {
  console.error('FATAL: API key has withdrawal permission. Create a new key with only trading access.');
  process.exit(1);
}
```

---

## AIP-135: No Idempotency in Event Processing or Crank Operations

**Auditors:** BOT-01, BOT-03
**Related patterns:** OC-252, OC-260

AI generators produce event processing and crank bot code that processes each incoming event or queue message without checking whether it has already been handled. The generated code assumes exactly-once delivery, which no message queue or WebSocket connection provides. On bot restart, crash recovery, or network reconnection, events are reprocessed, causing duplicate transactions.

```typescript
// AI-GENERATED (DANGEROUS):
websocket.on('message', async (data) => {
  const event = JSON.parse(data);
  await executeLiquidation(event.account, event.amount); // No dedup check
});

// CORRECT: Track processed events and check before acting
const processedEvents = new Set<string>(); // Or Redis/DB for persistence
websocket.on('message', async (data) => {
  const event = JSON.parse(data);
  const eventKey = `${event.account}:${event.slot}`;
  if (processedEvents.has(eventKey)) return;
  await executeLiquidation(event.account, event.amount);
  processedEvents.add(eventKey);
  await redis.setex(`processed:${eventKey}`, 86400, '1'); // Persist for crash recovery
});
```

---

## AIP-136: Cron Jobs Without Overlap Protection

**Auditors:** BOT-01
**Related patterns:** OC-264

AI models generate scheduled tasks using `setInterval` or `node-cron` without any guard against overlapping executions. If the task takes longer than the interval, concurrent instances run simultaneously, causing duplicate operations, race conditions on shared state, and wasted resources. This is especially common in keeper bot code where the scan interval is shorter than the potential scan duration.

```typescript
// AI-GENERATED (DANGEROUS):
setInterval(async () => {
  const positions = await scanPositions(); // Could take 60s
  for (const pos of positions) await processPosition(pos);
}, 30_000); // Fires every 30s -- overlap guaranteed

// CORRECT: Guard against overlap
let isProcessing = false;
setInterval(async () => {
  if (isProcessing) return;
  isProcessing = true;
  try {
    const positions = await scanPositions();
    for (const pos of positions) await processPosition(pos);
  } finally {
    isProcessing = false;
  }
}, 30_000);
// For distributed systems: use Redis Redlock instead of a boolean flag
```

---

## AIP-137: Submitting Swaps Through Public RPC Without MEV Protection

**Auditors:** BOT-02
**Related patterns:** OC-258

AI-generated Solana swap code submits transactions through the standard public RPC endpoint (`sendAndConfirmTransaction` via `api.mainnet-beta.solana.com`), making them visible to MEV searchers who can sandwich them. AI models are not aware of Jito bundles, Nozomi protection, or private transaction submission -- they generate the simplest possible send pattern. Every swap submitted through public RPC on mainnet is a potential sandwich target.

```typescript
// AI-GENERATED (DANGEROUS):
const connection = new Connection('https://api.mainnet-beta.solana.com');
const sig = await sendAndConfirmTransaction(connection, swapTx, [wallet]);

// CORRECT: Submit via Jito bundle for MEV protection
const jitoClient = SearcherClient.connect('mainnet.block-engine.jito.wtf');
swapTx.add(createJitoTipInstruction(wallet.publicKey, 10_000));
await jitoClient.sendBundle([swapTx]);
// Or use a MEV-protected RPC endpoint (Nozomi, etc.)
```

---

## AIP-138: Private Key Stored in Plain Environment Variable

**Auditors:** BOT-01
**Related patterns:** OC-246, OC-002

AI generators universally produce bot code that loads the signing keypair from a plaintext environment variable (`process.env.PRIVATE_KEY` or `process.env.BOT_PRIVATE_KEY`). This is the most common pattern in every AI-generated Solana bot tutorial. The private key sits unencrypted in `.env` files, is visible in process listings, and can be captured by any process on the same machine. The December 2024 `@solana/web3.js` supply chain attack (CVE-2024-54134) specifically targeted bots that loaded keys from environment variables.

```typescript
// AI-GENERATED (DANGEROUS):
const keypair = Keypair.fromSecretKey(Buffer.from(process.env.PRIVATE_KEY!, 'hex'));

// CORRECT: Load from encrypted keyfile or secrets manager with access audit trail
import { SecretsManager } from '@aws-sdk/client-secrets-manager';
const sm = new SecretsManager({ region: 'us-east-1' });
const secret = await sm.getSecretValue({ SecretId: 'bot/signing-key' });
const keypair = Keypair.fromSecretKey(Buffer.from(JSON.parse(secret.SecretString!).key, 'hex'));
// Or use filesystem keypair with restrictive permissions: chmod 600 keypair.json
```
