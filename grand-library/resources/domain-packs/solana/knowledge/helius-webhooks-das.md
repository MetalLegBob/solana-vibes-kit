---
pack: solana
confidence: 8/10
sources_checked: 16
last_updated: "2026-02-16"
---

# How do I use Helius DAS API and webhooks?

Helius provides two essential APIs for Solana development: the Digital Asset Standard (DAS) API for querying NFTs and tokens, and Webhooks for real-time event notifications. This guide covers practical integration patterns beyond basic API reference.

## Digital Asset Standard (DAS) API

The DAS API is an open-source specification that provides a unified interface for all types of digital assets on Solana. It's the most comprehensive and performant API for tokens, NFTs, compressed NFTs (cNFTs), and programmable NFTs (pNFTs).

### Why DAS API Matters

**Before DAS**: You needed different APIs for regular NFTs (Metaplex), compressed NFTs (Merkle tree RPCs), and tokens (SPL Token RPCs). Fetching a wallet's holdings required multiple queries and manual metadata parsing.

**With DAS**: One unified API handles all asset types with complete on-chain and off-chain metadata in a single call.

### Core Methods

#### `getAsset` — Get Complete Asset Details

Returns comprehensive data for any Solana digital asset by its mint address.

```typescript
import { Helius } from "helius-sdk";

const helius = new Helius("YOUR_API_KEY");

const asset = await helius.rpc.getAsset({
  id: "AssetMintAddress..."
});

console.log(asset.content.metadata.name);
console.log(asset.ownership.owner);
console.log(asset.compression.compressed); // true for cNFTs
```

**Response includes**:
- **Ownership**: Current owner, delegate, frozen status
- **Content**: Name, symbol, description, image, attributes
- **Metadata**: JSON URI, creators, royalties
- **Compression**: Whether it's a cNFT, tree address, proof paths
- **Grouping**: Collection membership
- **Token Info**: Supply, decimals (for fungible tokens)

**Use Cases**:
- NFT detail pages (fetch all metadata in one call)
- Verifying asset ownership for token-gating
- Checking if an NFT is compressed (cNFT vs. regular)

#### `getAssetsByOwner` — Get Wallet Holdings

Returns all assets owned by a wallet address, with powerful filtering options.

```typescript
const assets = await helius.rpc.getAssetsByOwner({
  ownerAddress: "WalletAddress...",
  page: 1,
  limit: 100,
  displayOptions: {
    showCollectionMetadata: true,
    showUnverifiedCollections: false
  }
});

console.log(`Found ${assets.total} assets`);
console.log(assets.items[0].content.metadata.name);
```

**Filtering Options**:
- `sortBy`: Sort by created, updated, or recent activity
- `showNativeBalance`: Include SOL balance
- `showZeroBalance`: Show/hide empty token accounts
- `showCollectionMetadata`: Include collection-level metadata
- `showUnverifiedCollections`: Filter out unverified collections (spam protection)

**Use Cases**:
- Wallet portfolio displays
- NFT gallery views
- Token balance checks
- Spam filtering (use `showUnverifiedCollections: false`)

**Pagination**: DAS API uses cursor-based pagination. Save `page` and increment for next batch.

```typescript
let page = 1;
let allAssets = [];

while (true) {
  const response = await helius.rpc.getAssetsByOwner({
    ownerAddress: wallet,
    page,
    limit: 1000 // max per page
  });

  allAssets.push(...response.items);

  if (response.items.length < 1000) break; // no more pages
  page++;
}
```

#### `searchAssets` — Advanced Filtering

Search assets with complex filters (by collection, creator, attributes, etc.).

```typescript
const assets = await helius.rpc.searchAssets({
  grouping: ["collection", "CollectionMintAddress"],
  creatorAddress: "CreatorAddress...",
  creatorVerified: true,
  compressed: true, // only cNFTs
  page: 1,
  limit: 100
});
```

**Filter Options**:
- `grouping`: Filter by collection membership
- `creatorAddress` + `creatorVerified`: Filter by creator
- `ownerAddress`: Filter by owner (combine with other filters)
- `compressed`: Filter by compression status
- `burnt`: Include/exclude burned assets
- `jsonUri`: Filter by metadata URI

**Use Cases**:
- Collection floors and listings (search by collection)
- Creator dashboards (all assets by a creator)
- Marketplace indexing (compressed NFTs only)

#### `getAssetProof` — Compressed NFT Proofs

For compressed NFTs (cNFTs), you need Merkle proofs to transfer or burn them.

```typescript
const proof = await helius.rpc.getAssetProof({
  id: "cNftMintAddress..."
});

// Use proof in transfer instruction
const transferIx = createTransferInstruction({
  merkleTree: proof.tree_id,
  root: proof.root,
  dataHash: proof.data_hash,
  creatorHash: proof.creator_hash,
  proof: proof.proof,
  // ... other params
});
```

**When You Need This**: Any time you're transferring, burning, or verifying ownership of a compressed NFT.

### Enhanced Transactions API

The Enhanced Transactions API complements DAS by decoding raw transactions into human-readable formats.

```typescript
// Get enhanced transaction by signature
const enhancedTx = await helius.rpc.getTransaction({
  signature: "txSignature...",
  commitment: "confirmed"
});

console.log(enhancedTx.type); // "NFT_SALE", "SWAP", "TRANSFER"
console.log(enhancedTx.description); // Human-readable summary
console.log(enhancedTx.events); // Parsed events (transfers, swaps, mints)
```

**Parsers**: Helius has 100+ built-in parsers for popular programs (Jupiter, Metaplex, Magic Eden, etc.).

**Use Cases**:
- Transaction history feeds
- Activity notifications
- Portfolio trackers

### DAS API Best Practices

1. **Cache Aggressively**: Asset metadata rarely changes. Cache responses for hours/days.
2. **Filter Spam**: Always use `showUnverifiedCollections: false` for user-facing apps.
3. **Batch Requests**: If you need multiple assets, use `searchAssets` with filters instead of many `getAsset` calls.
4. **Handle Pagination**: DAS limits responses to 1000 items/page. Always paginate for large collections.
5. **Check Compression**: Use `asset.compression.compressed` to determine if special handling (Merkle proofs) is needed.

## Helius Webhooks

Webhooks enable real-time notifications when on-chain events occur. Instead of polling RPCs, Helius pushes events to your server.

### Webhook Types

#### 1. Enhanced Webhooks (Recommended)

Sends parsed, human-readable transaction data (same format as Enhanced Transactions API).

```json
{
  "type": "NFT_SALE",
  "description": "SoLaNa sold for 10 SOL on Magic Eden",
  "signature": "...",
  "timestamp": 1234567890,
  "nativeTransfers": [...],
  "tokenTransfers": [...],
  "accountData": [...]
}
```

**Use Cases**:
- NFT sale notifications
- Token transfer alerts
- Swap activity tracking

**Advantages**: No manual parsing needed. Helius handles instruction decoding.

#### 2. Raw Webhooks

Sends raw Solana transaction objects (same as `getTransaction` RPC response).

**Use Cases**:
- Custom parsing logic
- Events Helius doesn't parse
- Full transaction inspection

**Trade-off**: You must decode instructions yourself.

#### 3. Discord Webhooks

Sends formatted messages directly to Discord channels.

**Use Cases**:
- Community notifications (sales, mints, listings)
- Team alerting
- Bot integration

### Creating Webhooks

#### Via Dashboard (Easiest)

1. Go to https://helius.dev → Webhooks
2. Click "Create Webhook"
3. Configure:
   - **Webhook Type**: Enhanced, Raw, or Discord
   - **Webhook URL**: Your HTTPS endpoint
   - **Addresses**: Up to 100,000 addresses to monitor
   - **Transaction Types**: Filter by type (NFT_SALE, SWAP, TRANSFER, etc.)
   - **Account Includes**: Filter by program IDs

4. Save and deploy

#### Via SDK (Programmatic)

```typescript
import { Helius } from "helius-sdk";

const helius = new Helius("YOUR_API_KEY");

const webhook = await helius.createWebhook({
  webhookURL: "https://your-server.com/webhook",
  transactionTypes: ["NFT_SALE", "NFT_LISTING"],
  accountAddresses: [
    "WalletOrProgramAddress1...",
    "WalletOrProgramAddress2..."
  ],
  webhookType: "enhanced"
});

console.log(`Webhook created: ${webhook.webhookID}`);
```

#### Via API (HTTP)

```bash
curl -X POST "https://api.helius.xyz/v0/webhooks?api-key=YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "webhookURL": "https://your-server.com/webhook",
    "transactionTypes": ["TRANSFER"],
    "accountAddresses": ["YourAddress..."],
    "webhookType": "enhanced"
  }'
```

### Webhook Filters and Configuration

#### Transaction Type Filters

Filter by parsed transaction types (Enhanced webhooks only):

- `NFT_SALE`, `NFT_LISTING`, `NFT_CANCEL_LISTING`
- `NFT_MINT`, `NFT_BURN`
- `TRANSFER` (SOL or SPL tokens)
- `SWAP`
- `COMPRESSED_NFT_MINT`, `COMPRESSED_NFT_TRANSFER`
- `UNKNOWN` (catch-all for unparsed transactions)

#### Account Address Filters

Monitor up to 100,000 addresses per webhook:

```typescript
{
  accountAddresses: [
    "YourWalletAddress...",      // User wallets
    "YourProgramId...",           // Program interactions
    "CollectionMintAddress..."    // Collection-wide events
  ]
}
```

**Pattern**: Monitor collection mint addresses to track all sales/transfers within a collection.

#### Program ID Filters

Filter transactions that interact with specific programs:

```typescript
{
  accountAddresses: ["YourWalletAddress..."],
  accountIncludes: ["JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4"] // Jupiter
}
```

This captures only transactions where your wallet interacts with Jupiter.

### Webhook Endpoint Implementation

Your webhook endpoint must:
1. Accept POST requests
2. Respond with HTTP 200 within 15 seconds
3. Handle retries and deduplication

#### Example Webhook Server (Express)

```typescript
import express from "express";
import crypto from "crypto";

const app = express();
app.use(express.json());

const processedSignatures = new Set(); // Simple deduplication

app.post("/webhook", async (req, res) => {
  const event = req.body;

  // 1. Verify signature (optional but recommended)
  const signature = req.headers["helius-signature"];
  const expectedSignature = crypto
    .createHmac("sha256", process.env.WEBHOOK_SECRET)
    .update(JSON.stringify(event))
    .digest("hex");

  if (signature !== expectedSignature) {
    return res.status(401).send("Invalid signature");
  }

  // 2. Deduplicate (Helius may retry)
  if (processedSignatures.has(event.signature)) {
    return res.status(200).send("Already processed");
  }

  // 3. Process event (non-blocking if possible)
  processEvent(event).catch(console.error);

  // 4. Respond immediately
  processedSignatures.add(event.signature);
  res.status(200).send("OK");
});

async function processEvent(event) {
  console.log(`[${event.type}] ${event.description}`);

  if (event.type === "NFT_SALE") {
    // Send notification, update database, etc.
    await sendDiscordNotification(event);
  }
}

app.listen(3000);
```

### Webhook Reliability and Best Practices

#### Deduplication

Helius may send duplicate events due to retries. Always check `signature` to deduplicate.

```typescript
// Redis-based deduplication (production-ready)
const alreadyProcessed = await redis.get(`tx:${event.signature}`);
if (alreadyProcessed) {
  return res.status(200).send("Already processed");
}

await redis.setex(`tx:${event.signature}`, 3600, "1"); // 1 hour TTL
```

#### Retry Handling

Helius retries failed webhooks with exponential backoff. If your server is down:
- Helius will retry for up to 24 hours
- After 24 hours, events are dropped

**Solution**: Use a queue (SQS, RabbitMQ) to buffer events:

```typescript
app.post("/webhook", async (req, res) => {
  // Immediately queue the event
  await sqs.sendMessage({
    QueueUrl: process.env.QUEUE_URL,
    MessageBody: JSON.stringify(req.body)
  });

  res.status(200).send("OK"); // Respond fast
});

// Separate worker processes events from queue
async function worker() {
  while (true) {
    const messages = await sqs.receiveMessage({ ... });
    for (const msg of messages) {
      await processEvent(JSON.parse(msg.Body));
      await sqs.deleteMessage({ ... }); // Ack after processing
    }
  }
}
```

#### Rate Limits and Throttling

Helius does NOT throttle webhook deliveries, but your server might get overwhelmed during high activity (mints, airdrops).

**Solutions**:
1. **Horizontal Scaling**: Deploy multiple webhook endpoints behind a load balancer
2. **Backpressure Handling**: Use a queue to buffer events
3. **Async Processing**: Respond 200 immediately, process in background

#### Monitoring

Track these metrics:
- **Delivery Success Rate**: % of webhooks that return 200
- **Processing Time**: How long your endpoint takes to respond
- **Event Lag**: Timestamp difference between event occurrence and processing

```typescript
app.post("/webhook", async (req, res) => {
  const start = Date.now();
  const event = req.body;

  try {
    await processEvent(event);

    // Log success
    const lag = start - event.timestamp * 1000;
    console.log(`Processed ${event.signature} in ${Date.now() - start}ms (lag: ${lag}ms)`);

    res.status(200).send("OK");
  } catch (error) {
    console.error(`Failed to process ${event.signature}:`, error);
    res.status(500).send("Error"); // Helius will retry
  }
});
```

### Managing Webhooks

#### List Webhooks

```typescript
const webhooks = await helius.getAllWebhooks();
console.log(webhooks);
```

#### Edit Webhook

```typescript
await helius.editWebhook(webhookID, {
  accountAddresses: [...newAddresses],
  transactionTypes: ["SWAP"]
});
```

#### Delete Webhook

```typescript
await helius.deleteWebhook(webhookID);
```

## Real-World Integration Patterns

### Pattern 1: NFT Activity Bot (Discord)

**Use Case**: Notify Discord channel when NFTs in a collection are sold.

```typescript
// 1. Create Discord webhook in Helius dashboard
// Webhook Type: Discord
// Transaction Types: NFT_SALE
// Account Addresses: [CollectionMintAddress]

// 2. Helius automatically posts to Discord (no server needed!)
```

### Pattern 2: Wallet Tracker

**Use Case**: Track all activity for a wallet (transfers, swaps, NFT sales).

```typescript
// 1. Create Enhanced webhook
const webhook = await helius.createWebhook({
  webhookURL: "https://your-server.com/wallet-events",
  transactionTypes: ["TRANSFER", "SWAP", "NFT_SALE"],
  accountAddresses: ["WalletToTrack..."],
  webhookType: "enhanced"
});

// 2. Process events
app.post("/wallet-events", async (req, res) => {
  const event = req.body;

  // Store in database
  await db.transactions.create({
    signature: event.signature,
    type: event.type,
    description: event.description,
    timestamp: event.timestamp,
    data: event
  });

  // Send push notification to user
  await sendPushNotification({
    title: event.type,
    body: event.description
  });

  res.status(200).send("OK");
});
```

### Pattern 3: DEX Trading Bot

**Use Case**: Execute trades when specific swap events occur.

```typescript
// Monitor Jupiter swaps involving a specific token
const webhook = await helius.createWebhook({
  webhookURL: "https://bot-server.com/swaps",
  transactionTypes: ["SWAP"],
  accountIncludes: ["JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4"],
  webhookType: "enhanced"
});

app.post("/swaps", async (req, res) => {
  const event = req.body;

  // Filter for target token
  const targetToken = "TokenMintAddress...";
  const hasTarget = event.tokenTransfers.some(
    t => t.mint === targetToken
  );

  if (hasTarget) {
    // Analyze swap and potentially execute counter-trade
    await analyzeAndTrade(event);
  }

  res.status(200).send("OK");
});
```

### Pattern 4: Token-Gating Verification

**Use Case**: Verify a user owns an NFT from a specific collection.

```typescript
// Frontend: User connects wallet
const walletAddress = await wallet.publicKey.toBase58();

// Backend: Check holdings
const assets = await helius.rpc.getAssetsByOwner({
  ownerAddress: walletAddress,
  displayOptions: {
    showUnverifiedCollections: false
  }
});

const hasRequiredNFT = assets.items.some(
  asset => asset.grouping.some(
    g => g.group_key === "collection" &&
         g.group_value === "RequiredCollectionMint..."
  )
);

if (hasRequiredNFT) {
  // Grant access
}
```

## Cost and Rate Limits

### DAS API Limits

- **Free Tier**: 100 requests/second
- **Paid Tiers**: Up to 1000+ requests/second
- **No per-request cost**: Flat monthly fee based on RPS tier

### Webhook Limits

- **Addresses per Webhook**: Up to 100,000
- **Total Webhooks**: Unlimited (paid tiers)
- **Delivery Retries**: Up to 24 hours
- **Concurrent Deliveries**: No limit

### Optimization Tips

1. **Batch DAS Queries**: Use `searchAssets` or `getAssetsByOwner` instead of many `getAsset` calls
2. **Cache Metadata**: Cache DAS responses for static data (metadata rarely changes)
3. **Webhook Filtering**: Use transaction type filters to reduce unnecessary events
4. **Deduplication**: Always deduplicate webhook events (Helius may retry)

## Troubleshooting

### Webhook Not Firing

1. Check webhook is active: `helius.getAllWebhooks()`
2. Verify addresses are correct (case-sensitive)
3. Test with `testWebhook()` in SDK
4. Check your server is returning HTTP 200

### Missing Transaction Types

If Enhanced webhooks don't catch a transaction:
- Use Raw webhooks (catches everything)
- Check if transaction is parsed (may show as `UNKNOWN` type)

### High Latency

If webhook events are delayed:
- Check your server response time (must be < 15s)
- Use async processing (respond 200 immediately)
- Monitor Helius status page for incidents

## Further Reading

- DAS API Docs: https://www.helius.dev/docs/das-api
- Webhook Docs: https://www.helius.dev/docs/webhooks
- Enhanced Transactions: https://www.helius.dev/docs/enhanced-transactions
- Helius SDK: https://github.com/helius-labs/helius-sdk

## Sources

- [Solana DAS API: Unified NFT and Token Data Access - Helius Docs](https://www.helius.dev/docs/das-api)
- [Digital Asset Standard (DAS) API - Helius Docs](https://helius.mintlify.app/das-api)
- [All You Need to Know About Solana's New DAS API](https://www.helius.dev/blog/all-you-need-to-know-about-solanas-new-das-api)
- [getAsset - Helius Docs](https://helius.mintlify.app/api-reference/das/getasset)
- [Using DAS API For Fetching all NFTs in a Collection](https://www.helius.dev/blog/solana-dev-101-using-das-to-return-all-collection-assets)
- [Solana Webhooks: Real-Time Blockchain Event Notifications - Helius Docs](https://www.helius.dev/docs/webhooks)
- [Solana Webhooks and WebSockets - Real-time Event Streaming](https://www.helius.dev/solana-webhooks-websockets)
- [Solana Event Listening Quickstart - Helius Docs](https://helius.mintlify.app/event-listening/quickstart)
- [GitHub - wkennedy/helius-webhooks-tutorial](https://github.com/wkennedy/helius-webhooks-tutorial)
- [GitHub - helius-labs/helius-sdk](https://github.com/helius-labs/helius-sdk)
- [Solana On-Chain Event Monitoring Guide | Panda Academy](https://pandaacademy.medium.com/solana-on-chain-event-monitoring-guide-from-theory-to-practice-6750ee9a3933)
- [Building on Solana: Helius RPCs + Tutorial | Solana Dev Tips](https://medium.com/solana-dev-tips/building-on-solana-helius-rpcs-tutorial-solana-development-platform-part-1-b53a1fc66d4c)
- [Solana Dev 101 - Email Notifications for dApps](https://www.helius.dev/blog/webhook-to-email)
- [Listening to Onchain Events on Solana](https://www.helius.dev/blog/solana-data-streaming)
- [Solana Enhanced Transactions API - Helius Docs](https://www.helius.dev/docs/enhanced-transactions)
- [Helius - Solana's Leading RPC and API Platform](https://www.helius.dev)
