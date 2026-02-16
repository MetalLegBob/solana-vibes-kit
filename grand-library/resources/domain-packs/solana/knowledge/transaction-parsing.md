---
pack: solana
confidence: 8/10
sources_checked: 15
last_updated: "2026-02-16"
---

# How do I parse and decode Solana transactions?

Parsing Solana transactions means converting raw instruction data into meaningful information about what happened on-chain. This guide covers IDL-based decoding, inner instruction handling, Anchor discriminators, and building custom parsers.

## Why Transaction Parsing Matters

Raw Solana transactions are binary data structures that are difficult to interpret:

```json
{
  "signature": "5j7s6...",
  "message": {
    "accountKeys": ["11111...", "TokenkegQ...", "YourProgram..."],
    "instructions": [
      {
        "programIdIndex": 2,
        "accounts": [0, 1, 3, 5],
        "data": "3Bxs4h7G...base58..." // ❌ What does this mean?
      }
    ]
  }
}
```

**Parsed transactions** decode this into human-readable actions:

```json
{
  "type": "SWAP",
  "description": "Swapped 1.5 SOL for 1000 USDC on Jupiter",
  "tokenTransfers": [
    { "fromUserAccount": "wallet1", "toUserAccount": "wallet2", "tokenAmount": 1.5, "mint": "So11111..." },
    { "fromUserAccount": "wallet2", "toUserAccount": "wallet1", "tokenAmount": 1000, "mint": "EPjFWdd5..." }
  ]
}
```

This is essential for:
- Transaction history feeds
- Analytics dashboards
- Event notifications
- Debugging program interactions

## Parsing Approaches

### 1. Use Helius Enhanced Transactions API (Easiest)

Helius provides 100+ built-in parsers for popular programs (Jupiter, Metaplex, Magic Eden, Pump.fun, etc.).

```typescript
import { Helius } from "helius-sdk";

const helius = new Helius("YOUR_API_KEY");

const parsedTx = await helius.rpc.getTransaction({
  signature: "5j7s6...",
  commitment: "confirmed"
});

console.log(parsedTx.type); // "SWAP", "NFT_SALE", "TRANSFER", etc.
console.log(parsedTx.description); // Human-readable summary
console.log(parsedTx.events); // Structured events (swaps, transfers, mints)
```

**Advantages**:
- No parsing code needed
- Supports 100+ programs out of the box
- Includes inner instruction parsing
- Handles edge cases (failed txs, CPI, etc.)

**Limitations**:
- Only works for supported programs
- Requires Helius API key
- Can't customize parsing logic

**When to Use**: You need quick parsing for common programs and don't need custom logic.

### 2. IDL-Based Parsing (Anchor Programs)

If the program uses Anchor framework, you can decode instructions using its IDL (Interface Definition Language).

#### What is an IDL?

An IDL is a JSON file that describes a program's interface:

```json
{
  "version": "0.1.0",
  "name": "my_program",
  "instructions": [
    {
      "name": "swap",
      "accounts": [
        { "name": "user", "isMut": true, "isSigner": true },
        { "name": "poolAccount", "isMut": true, "isSigner": false }
      ],
      "args": [
        { "name": "amountIn", "type": "u64" },
        { "name": "minimumAmountOut", "type": "u64" }
      ]
    }
  ],
  "accounts": [...],
  "types": [...],
  "errors": [...]
}
```

#### Anchor Discriminators

Anchor stores an 8-byte discriminator at the start of each instruction's data:

```
discriminator = first 8 bytes of sha256("global:instruction_name")
```

For example, the "swap" instruction might have discriminator `0xf8c69e91e17587c8`.

**How Parsing Works**:
1. Extract first 8 bytes of instruction data
2. Match discriminator to instruction in IDL
3. Decode remaining bytes using instruction's arg types
4. Map account indices to account names using IDL

#### Example: Decoding with IDL

```typescript
import { BorshInstructionCoder } from "@project-serum/anchor";
import { Program } from "@project-serum/anchor";

// Load IDL (from file or program account)
const idl = await Program.fetchIdl(programId, provider);
const coder = new BorshInstructionCoder(idl);

// Decode instruction data
const instruction = {
  programId: "YourProgramId...",
  data: Buffer.from("f8c69e91e17587c8...", "hex")
};

const decoded = coder.decode(instruction.data);
console.log(decoded.name); // "swap"
console.log(decoded.data); // { amountIn: 1500000, minimumAmountOut: 1000000 }
```

#### Full Transaction Parsing with IDL

```typescript
import { SolanaParser } from "@shyft-to/solana-transaction-parser";
import { Connection } from "@solana/web3.js";

const connection = new Connection("https://api.mainnet-beta.solana.com");
const parser = new SolanaParser([
  { programId: "YourProgramId", idl: yourIdl }
]);

const txSignature = "5j7s6...";
const parsedTx = await parser.parseTransaction(connection, txSignature);

console.log(parsedTx.instructions[0].name); // "swap"
console.log(parsedTx.instructions[0].args); // { amountIn: 1500000, ... }
```

**Libraries**:
- `@shyft-to/solana-transaction-parser` — IDL-based parser with built-in support for popular programs
- `@debridge-finance/solana-transaction-parser` — Alternative with custom parsing schemes
- `@project-serum/anchor` — Low-level IDL decoding (BorshInstructionCoder)

**When to Use**: You're working with Anchor programs and have access to their IDLs.

### 3. Custom Parsers (Non-Anchor Programs)

For programs without IDLs (native programs, older programs), you must manually parse instruction data.

#### Example: Parsing SPL Token Transfer

The SPL Token `transfer` instruction has this layout:

```
[0]: Instruction discriminator (1 byte) = 3
[1-8]: Amount (u64, little-endian)
```

```typescript
import { struct, u8, nu64 } from "@solana/buffer-layout";

function parseTokenTransfer(data: Buffer) {
  const layout = struct([
    u8("instruction"),
    nu64("amount")
  ]);

  const decoded = layout.decode(data);

  if (decoded.instruction !== 3) {
    throw new Error("Not a transfer instruction");
  }

  return {
    type: "TOKEN_TRANSFER",
    amount: decoded.amount.toString()
  };
}

// Usage
const instruction = {
  programId: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
  data: Buffer.from([3, 0, 0, 0, 0, 0, 0, 0, 100]) // Transfer 100 tokens
};

const parsed = parseTokenTransfer(instruction.data);
console.log(parsed); // { type: "TOKEN_TRANSFER", amount: "100" }
```

#### Building a Parser for Custom Instructions

```typescript
import * as BufferLayout from "@solana/buffer-layout";

// Define your instruction layout
const SWAP_LAYOUT = BufferLayout.struct([
  BufferLayout.u8("instruction"), // 0 = swap
  BufferLayout.nu64("amountIn"),
  BufferLayout.nu64("minimumAmountOut"),
  BufferLayout.u8("slippageBps")
]);

function parseSwapInstruction(data: Buffer) {
  const decoded = SWAP_LAYOUT.decode(data);

  return {
    name: "swap",
    args: {
      amountIn: decoded.amountIn.toString(),
      minimumAmountOut: decoded.minimumAmountOut.toString(),
      slippageBps: decoded.slippageBps
    }
  };
}
```

**When to Use**: You're working with native programs (System, Token, Associated Token, etc.) or custom non-Anchor programs.

## Handling Inner Instructions

Solana transactions contain **inner instructions** generated by Cross-Program Invocations (CPIs). These are NOT in the main `instructions` array but in `meta.innerInstructions`.

### Example: Swap Transaction

A Jupiter swap transaction might look like:

```json
{
  "instructions": [
    { "programId": "JUP...", "data": "..." } // Main swap instruction
  ],
  "meta": {
    "innerInstructions": [
      {
        "index": 0, // Index of main instruction that triggered these
        "instructions": [
          { "programId": "TokenkegQ...", "data": "..." }, // Token transfer 1
          { "programId": "TokenkegQ...", "data": "..." }, // Token transfer 2
          { "programId": "11111...", "data": "..." }     // SOL transfer
        ]
      }
    ]
  }
}
```

**Critical**: If you only parse `instructions`, you'll miss the actual token transfers (which happen in `innerInstructions`).

### Parsing Inner Instructions

```typescript
async function parseTransactionWithInnerInstructions(signature: string) {
  const tx = await connection.getTransaction(signature, {
    maxSupportedTransactionVersion: 0
  });

  const allInstructions = [];

  // 1. Parse top-level instructions
  for (const ix of tx.transaction.message.instructions) {
    allInstructions.push(parseInstruction(ix));
  }

  // 2. Parse inner instructions
  if (tx.meta?.innerInstructions) {
    for (const inner of tx.meta.innerInstructions) {
      for (const ix of inner.instructions) {
        allInstructions.push(parseInstruction(ix));
      }
    }
  }

  return allInstructions;
}
```

**Libraries with Inner Instruction Support**:
- `@shyft-to/solana-transaction-parser` — `parseTransactionWithInnerInstructions()`
- `@debridge-finance/solana-transaction-parser` — Automatically unfolds CPIs
- Helius Enhanced Transactions API — Includes all inner instructions in `events`

### Example: Detecting Token Transfers

To find all token transfers in a transaction (including CPIs):

```typescript
function extractTokenTransfers(tx) {
  const transfers = [];

  // Helper to check if instruction is a token transfer
  function isTokenTransfer(ix) {
    return (
      ix.programId === "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA" &&
      ix.data[0] === 3 // Transfer instruction
    );
  }

  // Check main instructions
  for (const ix of tx.transaction.message.instructions) {
    if (isTokenTransfer(ix)) {
      transfers.push(parseTokenTransfer(ix));
    }
  }

  // Check inner instructions
  for (const inner of tx.meta?.innerInstructions || []) {
    for (const ix of inner.instructions) {
      if (isTokenTransfer(ix)) {
        transfers.push(parseTokenTransfer(ix));
      }
    }
  }

  return transfers;
}
```

## Common Parsing Patterns

### Pattern 1: Swap Detection

Detect if a transaction is a swap (typically 2 token transfers in opposite directions):

```typescript
function isSwap(tx) {
  const transfers = extractTokenTransfers(tx);

  if (transfers.length < 2) return false;

  // Check if there are transfers in opposite directions
  const fromUser = transfers.filter(t => t.source === userWallet);
  const toUser = transfers.filter(t => t.destination === userWallet);

  return fromUser.length > 0 && toUser.length > 0 && fromUser[0].mint !== toUser[0].mint;
}
```

### Pattern 2: Transfer Detection

Detect simple token or SOL transfers:

```typescript
function parseTransfer(tx) {
  // SOL transfer (System Program)
  const systemIx = tx.instructions.find(
    ix => ix.programId === "11111111111111111111111111111111"
  );
  if (systemIx && systemIx.data[0] === 2) { // Transfer instruction
    return {
      type: "SOL_TRANSFER",
      amount: parseLamports(systemIx.data.slice(1, 9))
    };
  }

  // Token transfer
  const tokenIx = tx.instructions.find(
    ix => ix.programId === "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA" &&
          ix.data[0] === 3
  );
  if (tokenIx) {
    return {
      type: "TOKEN_TRANSFER",
      amount: parseU64(tokenIx.data.slice(1, 9)),
      mint: tx.accountKeys[tokenIx.accounts[1]] // Mint account
    };
  }

  return { type: "UNKNOWN" };
}
```

### Pattern 3: Event Extraction (Anchor Programs)

Anchor programs emit events that are logged to transaction logs. You can parse these from `meta.logMessages`.

#### Anchor Event Structure

Anchor events are logged as:
```
Program log: <base64-encoded-event-data>
```

The event data starts with an 8-byte discriminator:
```
discriminator = first 8 bytes of sha256("event:event_name")
```

#### Parsing Events

```typescript
function parseAnchorEvents(tx, eventIdl) {
  const events = [];

  for (const log of tx.meta.logMessages || []) {
    if (!log.startsWith("Program log: ")) continue;

    const eventData = log.slice("Program log: ".length);
    const buffer = Buffer.from(eventData, "base64");

    // Extract discriminator (first 8 bytes)
    const discriminator = buffer.slice(0, 8).toString("hex");

    // Find event in IDL by discriminator
    const eventDef = eventIdl.events.find(
      e => getEventDiscriminator(e.name) === discriminator
    );

    if (eventDef) {
      // Decode event data using Borsh
      const eventData = borshDecode(eventDef.fields, buffer.slice(8));
      events.push({
        name: eventDef.name,
        data: eventData
      });
    }
  }

  return events;
}

function getEventDiscriminator(eventName: string) {
  return sha256(`event:${eventName}`).slice(0, 8).toString("hex");
}
```

**Use Case**: Tracking program-specific events (e.g., "SwapExecuted", "OrderPlaced", "LiquidityAdded").

### Pattern 4: Failed Transaction Handling

Failed transactions still consume fees and may have partial state changes. Always check `meta.err`:

```typescript
async function parseTransaction(signature: string) {
  const tx = await connection.getTransaction(signature);

  if (tx.meta.err) {
    return {
      type: "FAILED",
      error: tx.meta.err,
      fee: tx.meta.fee,
      // Parse logs for error details
      errorMessage: extractErrorFromLogs(tx.meta.logMessages)
    };
  }

  // Parse successful transaction
  return parseInstructions(tx);
}

function extractErrorFromLogs(logs: string[]) {
  // Look for "Program failed" or "Error:" in logs
  const errorLog = logs.find(log => log.includes("failed") || log.includes("Error"));
  return errorLog || "Unknown error";
}
```

## Production-Ready Parsing Architecture

For large-scale parsing (indexers, dashboards, bots), use this architecture:

```
Stream (Yellowstone gRPC) → Parser Pool → Structured Storage
                          ↓
                    Enrichment Layer
                    (off-chain metadata, prices)
```

### Parser Pool

Use a worker pool to parse transactions in parallel:

```typescript
import { Worker } from "worker_threads";
import { Queue } from "bullmq";

// Main thread: enqueue transactions
const parserQueue = new Queue("parser");

stream.on("transaction", async (tx) => {
  await parserQueue.add("parse", { signature: tx.signature });
});

// Worker threads: parse transactions
const worker = new Worker("parser-worker.js", {
  concurrency: 10 // 10 parallel parsers
});

worker.on("job", async (job) => {
  const { signature } = job.data;

  // Fetch and parse transaction
  const tx = await connection.getTransaction(signature);
  const parsed = await parseTransactionFull(tx);

  // Store in database
  await db.transactions.insert(parsed);
});
```

### Caching and Deduplication

Cache parsed transactions to avoid re-parsing:

```typescript
import { createHash } from "crypto";

const cache = new Map();

async function parseCached(signature: string) {
  // Check cache
  if (cache.has(signature)) {
    return cache.get(signature);
  }

  // Parse and cache
  const parsed = await parseTransaction(signature);
  cache.set(signature, parsed);

  return parsed;
}
```

For production, use Redis:

```typescript
const cached = await redis.get(`tx:${signature}`);
if (cached) {
  return JSON.parse(cached);
}

const parsed = await parseTransaction(signature);
await redis.setex(`tx:${signature}`, 3600, JSON.stringify(parsed));
```

### Enrichment Layer

Enrich parsed transactions with off-chain data:

```typescript
async function enrichTransaction(parsed) {
  // Add token metadata
  if (parsed.type === "SWAP") {
    parsed.tokenIn.metadata = await fetchTokenMetadata(parsed.tokenIn.mint);
    parsed.tokenOut.metadata = await fetchTokenMetadata(parsed.tokenOut.mint);

    // Add USD values
    parsed.tokenIn.usdValue = await getTokenPrice(parsed.tokenIn.mint) * parsed.tokenIn.amount;
    parsed.tokenOut.usdValue = await getTokenPrice(parsed.tokenOut.mint) * parsed.tokenOut.amount;
  }

  return parsed;
}
```

## Tools and Libraries Summary

| Tool | Use Case | Pros | Cons |
|------|----------|------|------|
| **Helius Enhanced API** | Quick parsing for common programs | 100+ parsers, no setup | Requires API key, limited to supported programs |
| **@shyft-to/solana-transaction-parser** | IDL-based parsing (TypeScript) | Easy to use, supports inner instructions | Requires IDLs |
| **@debridge-finance/solana-transaction-parser** | Custom + IDL parsing (TypeScript) | Flexible, supports custom parsers | More setup required |
| **Anchor BorshCoder** | Low-level IDL decoding | Full control, no dependencies | Requires manual instruction extraction |
| **Custom Parsers** | Non-Anchor programs | Full control, no dependencies | Manual work for each program |

## Best Practices

1. **Always Parse Inner Instructions**: Most important state changes happen in CPIs.
2. **Handle Failed Transactions**: Check `meta.err` before parsing.
3. **Cache Parsed Transactions**: Avoid re-parsing (use Redis or in-memory cache).
4. **Use IDLs When Available**: Faster and more reliable than custom parsers.
5. **Log Unparsed Transactions**: Track `UNKNOWN` types to identify missing parsers.
6. **Enrich with Off-chain Data**: Add token metadata, USD values, labels.
7. **Version Your Parsers**: Programs update their instruction formats. Version parsers accordingly.
8. **Monitor Parse Failures**: Alert on high parse failure rates (indicates missing/broken parsers).

## Debugging Parsing Issues

### Issue: Instruction Not Decoding

**Possible Causes**:
- Wrong IDL version
- Custom instruction layout (not Anchor)
- Compressed instruction data

**Solution**: Inspect raw instruction data and logs:

```typescript
console.log("Instruction data (hex):", ix.data.toString("hex"));
console.log("Logs:", tx.meta.logMessages);
```

### Issue: Missing Token Transfers

**Cause**: Not parsing inner instructions.

**Solution**: Always check `meta.innerInstructions`.

### Issue: Events Not Appearing

**Cause**: Events are in logs, not instructions.

**Solution**: Parse `meta.logMessages` for Anchor events.

## Further Reading

- Open-sourcing the Solana Transaction Parser (deBridge): https://medium.com/debridge/open-sourcing-the-solana-transaction-parser-be168904d3cc
- Decode Solana Transactions on a Budget: https://ryanjc.com/blog/decode-solana-transactions-on-a-budget/
- Solana Transaction Parser (deBridge GitHub): https://github.com/debridge-finance/solana-tx-parser-public
- Helius Enhanced Transactions: https://www.helius.dev/docs/enhanced-transactions
- Anchor IDL Specification: https://www.anchor-lang.com/docs/idl-spec

## Sources

- [Open-sourcing the Solana Transaction Parser | deBridge](https://medium.com/debridge/open-sourcing-the-solana-transaction-parser-be168904d3cc)
- [Decode Solana Transactions on a budget](https://ryanjc.com/blog/decode-solana-transactions-on-a-budget/)
- [GitHub - debridge-finance/solana-tx-parser-public](https://github.com/debridge-finance/solana-tx-parser-public)
- [Solana Meteora DAMM v2 Transaction Parsing | Shyft](https://docs.shyft.to/solana-yellowstone-grpc/examples/meteora-damm-v2/solana-grpc-meteora-damm-transaction-parsing-example)
- [How to parse Raw Transactions on Solana | Shyft.to](https://blogs.shyft.to/how-to-parse-raw-transaction-in-solana-ed392e95e5dd)
- [Decode Solana instructions | Sentio](https://docs.sentio.xyz/docs/decode-solana-instructions)
- [Solana Decoded Tables - Dune Docs](https://docs.dune.com/data-catalog/solana/idl-tables)
- [@debridge-finance/solana-transaction-parser - npm](https://www.npmjs.com/package/@debridge-finance/solana-transaction-parser)
- [@shyft-to/solana-transaction-parser - npm](https://www.npmjs.com/package/@shyft-to/solana-transaction-parser)
- [Solana Enhanced Transactions API - Helius Docs](https://www.helius.dev/docs/enhanced-transactions)
- [GitHub - helius-labs/helius-sdk](https://github.com/helius-labs/helius-sdk)
- [Introducing Orb: Solana's New Block Explorer](https://www.helius.dev/blog/orb-block-explorer)
- [Tracking Smart-Money Wallets on Solana in Rust](https://medium.com/@shailamie/tracking-smart-money-wallets-on-solana-in-rust-07861980d7b1)
- [Decoding and Parsing Transaction Data - Helius Docs](https://helius.mintlify.app/laserstream/guides/decoding-transaction-data)
- [Parsing a Solana Transaction | Soldev](https://soldev.ca/solana/parsing-a-transaction)
