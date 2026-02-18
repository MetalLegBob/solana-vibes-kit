---
pack: solana
topic: "x402 Payment Protocol"
decision: "How do I implement x402 payments for AI agent commerce on Solana?"
confidence: 8/10
sources_checked: 34
last_updated: "2026-02-18"
---

# x402 Payment Protocol

> **Decision:** How do I implement x402 payments for AI agent commerce on Solana?

## Context

When Tim Berners-Lee formalized HTTP in the early 1990s, his team reserved status code 402 with the designation "Payment Required." The 1996 HTTP/1.0 specification (RFC 1945) explicitly noted its purpose for "some form of digital cash or micropayment scheme," yet admitted "that has not happened, and this code is not usually used." For three decades, HTTP 402 sat dormant. In May 2025, Coinbase resurrected it with **x402** -- an open protocol that embeds USDC stablecoin payments directly into the HTTP request-response cycle. The protocol is now maintained by the **x402 Foundation**, co-founded by Coinbase and Cloudflare, with an explicit goal of building a free, open internet-native payment standard.

x402 matters because traditional payment rails fundamentally fail at machine-to-machine commerce. Credit cards require human intervention (KYC, account creation, manual approvals), impose minimum transaction sizes that kill micropayments ($0.30 + 2.9% per Stripe transaction), and cannot be programmatically operated by autonomous AI agents. x402 eliminates these barriers: an AI agent can discover an API's price, pay with USDC in a single HTTP header, and receive the response -- all without accounts, API keys, OAuth flows, or human involvement. This is the "payment layer the internet never got."

Solana has emerged as the dominant chain for x402 payments. By December 2025, Solana captured the leading position among x402 payment networks, with over 45 million cumulative x402 transactions and roughly 49% market share (trading position with Base, which holds 70M+ cumulative transactions). The reasons are structural: Solana offers 400ms finality (vs. Base's ~2 seconds), transaction costs of $0.00025 (vs. Base's ~$0.01), and a mature stablecoin ecosystem with $11B+ USDC in circulation supporting 200M+ monthly transactions. For high-frequency micropayments -- the core x402 use case -- Solana's performance characteristics are unmatched.

## Options

### Option A: Coinbase Official SDK (`@x402/express` + `@x402/core`)

**What:** The official x402 v2 TypeScript implementation from Coinbase. Provides Express middleware, fetch/axios wrappers, and EVM + Solana payment scheme support. Uses the Coinbase-hosted facilitator for payment verification and settlement.

**Architecture:**
- **`@x402/core`**: Protocol types, schemas, payment verification logic, facilitator client
- **`@x402/express`**: Express middleware that handles 402 responses, payment validation, and paywall UI
- **`@x402/fetch` / `@x402/axios`**: Client-side wrappers that auto-handle 402 responses and payment signing
- **`@x402/evm`**: EVM-specific payment scheme (EIP-3009 for gasless USDC transfers)
- **`@x402/svm`**: Solana-specific payment scheme (partially-signed transactions)

**Pros:**
- One-line integration for servers (`paymentMiddleware`) and clients (`wrapFetchWithPayment`)
- Hosted facilitator at `facilitator.x402.org` handles verification and settlement for free
- Built-in paywall UI with wallet support (Phantom, Solflare for Solana; MetaMask, Coinbase Wallet for EVM)
- Multi-chain support: a single server can accept payments on both Solana and Base
- Active development with v2 protocol (CAIP-2 network identifiers, `PAYMENT-SIGNATURE` header)
- 5.4K GitHub stars, extensive documentation, and production-grade test suite

**Cons:**
- Solana support is newer than EVM support; some edge cases may be less battle-tested
- Hosted facilitator is a single point of trust (though self-hosting is possible)
- Heavier dependency tree: `@coinbase/cdp-sdk`, `@solana/kit`, `viem`, `zod`
- v1-to-v2 migration required for early adopters (header names, package names changed)

**Best for:**
- Teams wanting the fastest path to production
- Multi-chain APIs that accept payments on both Solana and Base
- Projects comfortable relying on the Coinbase facilitator

**Server Code Example (Express + Solana):**

```typescript
import express from "express";
import { paymentMiddleware, x402ResourceServer } from "@x402/express";
import { ExactSvmScheme } from "@x402/svm/exact/server";
import { HTTPFacilitatorClient } from "@x402/core/server";

const app = express();

// Configure the facilitator (Coinbase-hosted, free)
const facilitatorClient = new HTTPFacilitatorClient({
  url: "https://facilitator.x402.org",
});

// Register the Solana payment scheme
const resourceServer = new x402ResourceServer();
resourceServer.registerScheme(new ExactSvmScheme(facilitatorClient));

// Define protected routes with pricing
const routes = {
  "GET /api/market-data": {
    accepts: {
      scheme: "exact",
      price: "$0.001",         // 0.1 cents per request
      network: "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp",  // Solana mainnet (CAIP-2)
      payTo: "YOUR_SOLANA_WALLET_ADDRESS",
    },
    description: "Real-time market data feed",
  },
  "POST /api/ai-analysis": {
    accepts: {
      scheme: "exact",
      price: "$0.05",          // 5 cents per analysis
      network: "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp",
      payTo: "YOUR_SOLANA_WALLET_ADDRESS",
    },
    description: "AI-powered market analysis",
  },
};

// Apply middleware -- this single line gates all routes
app.use(paymentMiddleware(routes, resourceServer));

// Your actual route handlers (only reached after payment)
app.get("/api/market-data", (req, res) => {
  res.json({
    symbol: "SOL/USDC",
    price: 185.50,
    timestamp: Date.now(),
    source: "pyth",
  });
});

app.post("/api/ai-analysis", (req, res) => {
  res.json({
    analysis: "Bullish divergence on 4H chart...",
    confidence: 0.87,
  });
});

app.listen(4021, () => console.log("x402 server on :4021"));
```

**Client Code Example (Agent paying for API access):**

```typescript
import { wrapFetchWithPayment } from "@x402/fetch";
import { x402Client } from "@x402/core/client";
import { registerExactSvmScheme } from "@x402/svm/exact/client";
import { createKeyPairSignerFromBytes } from "@solana/kit";
import { base58 } from "@scure/base";

// Create Solana signer from private key
const privateKeyBytes = base58.decode(process.env.SOLANA_PRIVATE_KEY!);
const svmSigner = await createKeyPairSignerFromBytes(privateKeyBytes);

// Create x402 client and register Solana payment scheme
const client = new x402Client();
registerExactSvmScheme(client, { signer: svmSigner });

// Wrap native fetch with automatic payment handling
const fetchWithPayment = wrapFetchWithPayment(fetch, client);

// Use it like normal fetch -- 402 responses are handled automatically
const response = await fetchWithPayment("https://api.example.com/api/market-data");
const data = await response.json();
console.log("Market data:", data);
// The agent paid $0.001 in USDC automatically via Solana
```

### Option B: Native / DIY Implementation (No SDK)

**What:** A minimal, dependency-free x402 implementation using raw `@solana/web3.js` and Express. You handle the 402 response format and payment verification yourself without a facilitator.

**Architecture:**
- Server returns 402 with a JSON body containing wallet address, USDC mint, amount, and cluster
- Client reads the 402 response, builds a Solana SPL token transfer, submits it on-chain
- Client retries the original request with the transaction signature in an `X-Payment` header
- Server verifies the transaction on-chain by parsing the confirmed transaction

**Pros:**
- Zero external dependencies beyond `@solana/web3.js` and `@solana/spl-token`
- No facilitator trust required -- you verify directly on-chain
- Full control over verification logic, pricing, and settlement
- Minimal attack surface; you understand every line of code
- Great for learning how x402 works under the hood

**Cons:**
- You must handle replay protection, double-spend detection, and finality yourself
- No multi-chain support without additional work
- No built-in paywall UI for browser clients
- More code to maintain; protocol changes require manual updates
- No settlement abstraction -- you interact with Solana RPC directly

**Best for:**
- Developers who want to understand x402 internals
- Single-chain (Solana-only) APIs with simple pricing
- High-security applications that cannot trust a third-party facilitator
- Hackathon projects and learning exercises

**Server Code Example (Native Solana x402):**

```typescript
import express from "express";
import {
  Connection,
  PublicKey,
  ParsedTransactionWithMeta,
} from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  getAssociatedTokenAddress,
} from "@solana/spl-token";

const app = express();
app.use(express.json());

const connection = new Connection(
  process.env.SOLANA_RPC_URL || "https://api.mainnet-beta.solana.com",
  "confirmed"
);

// USDC mint addresses
const USDC_MINT = new PublicKey(
  "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"  // Mainnet
);
const RECIPIENT_WALLET = new PublicKey(process.env.WALLET_ADDRESS!);
const PRICE_USDC = 1000; // 0.001 USDC (6 decimals)

// Track used transaction signatures to prevent replay
const usedSignatures = new Set<string>();

async function verifyPayment(
  signature: string,
  expectedAmount: number
): Promise<boolean> {
  // Replay protection
  if (usedSignatures.has(signature)) return false;

  try {
    const tx = await connection.getParsedTransaction(signature, {
      commitment: "confirmed",
      maxSupportedTransactionVersion: 0,
    });

    if (!tx || !tx.meta || tx.meta.err) return false;

    // Check that the transaction is recent (within last 5 minutes)
    const blockTime = tx.blockTime;
    if (!blockTime || Date.now() / 1000 - blockTime > 300) return false;

    // Parse inner instructions for SPL token transfers
    const recipientAta = await getAssociatedTokenAddress(
      USDC_MINT,
      RECIPIENT_WALLET
    );

    for (const ix of tx.transaction.message.instructions) {
      if ("parsed" in ix && ix.programId.equals(TOKEN_PROGRAM_ID)) {
        const parsed = ix.parsed;
        if (
          parsed.type === "transferChecked" &&
          parsed.info.mint === USDC_MINT.toBase58() &&
          parsed.info.destination === recipientAta.toBase58() &&
          Number(parsed.info.tokenAmount.amount) >= expectedAmount
        ) {
          usedSignatures.add(signature);
          return true;
        }
      }
    }

    // Also check inner instructions
    if (tx.meta.innerInstructions) {
      for (const inner of tx.meta.innerInstructions) {
        for (const ix of inner.instructions) {
          if ("parsed" in ix && ix.programId.equals(TOKEN_PROGRAM_ID)) {
            const parsed = ix.parsed;
            if (
              parsed.type === "transferChecked" &&
              parsed.info.mint === USDC_MINT.toBase58() &&
              parsed.info.destination === recipientAta.toBase58() &&
              Number(parsed.info.tokenAmount.amount) >= expectedAmount
            ) {
              usedSignatures.add(signature);
              return true;
            }
          }
        }
      }
    }

    return false;
  } catch {
    return false;
  }
}

// x402-compliant endpoint
app.get("/api/premium", async (req, res) => {
  const paymentHeader = req.header("X-Payment");

  if (!paymentHeader) {
    // Return 402 with machine-readable payment requirements
    return res.status(402).json({
      x402Version: 1,
      accepts: [
        {
          scheme: "exact",
          network: "solana",
          maxAmountRequired: String(PRICE_USDC),
          resource: "/api/premium",
          description: "Premium market data access",
          payTo: RECIPIENT_WALLET.toBase58(),
          asset: USDC_MINT.toBase58(),
          extra: {
            name: "USDC",
            decimals: 6,
          },
        },
      ],
    });
  }

  // Verify the payment
  const verified = await verifyPayment(paymentHeader, PRICE_USDC);

  if (!verified) {
    return res.status(400).json({ error: "Payment verification failed" });
  }

  // Payment verified -- serve the content
  res.json({
    data: "Premium content here",
    paidAmount: PRICE_USDC / 1e6 + " USDC",
    txSignature: paymentHeader,
  });
});

app.listen(4021, () => console.log("Native x402 server on :4021"));
```

**Client Code Example (Native Solana x402 Agent):**

```typescript
import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import {
  createTransferCheckedInstruction,
  getAssociatedTokenAddress,
  getMint,
} from "@solana/spl-token";
import bs58 from "bs58";

const connection = new Connection(
  process.env.SOLANA_RPC_URL || "https://api.mainnet-beta.solana.com",
  "confirmed"
);

const payer = Keypair.fromSecretKey(
  bs58.decode(process.env.SOLANA_PRIVATE_KEY!)
);

async function payAndFetch(url: string): Promise<any> {
  // Step 1: Make initial request -- expect a 402
  const initial = await fetch(url);

  if (initial.status !== 402) {
    return initial.json(); // Resource is free or already paid
  }

  // Step 2: Parse payment requirements from 402 response
  const requirements = await initial.json();
  const payment = requirements.accepts[0];

  const recipientWallet = new PublicKey(payment.payTo);
  const usdcMint = new PublicKey(payment.asset);
  const amount = Number(payment.maxAmountRequired);

  // Step 3: Build and send USDC transfer
  const payerAta = await getAssociatedTokenAddress(usdcMint, payer.publicKey);
  const recipientAta = await getAssociatedTokenAddress(
    usdcMint,
    recipientWallet
  );
  const mintInfo = await getMint(connection, usdcMint);

  const tx = new Transaction().add(
    createTransferCheckedInstruction(
      payerAta,
      usdcMint,
      recipientAta,
      payer.publicKey,
      amount,
      mintInfo.decimals
    )
  );

  const signature = await sendAndConfirmTransaction(connection, tx, [payer]);
  console.log(`Payment sent: ${signature}`);

  // Step 4: Retry with payment proof in X-Payment header
  const paid = await fetch(url, {
    headers: { "X-Payment": signature },
  });

  return paid.json();
}

// Agent usage
const data = await payAndFetch("https://api.example.com/api/premium");
console.log("Received:", data);
```

### Option C: PayAI Facilitator (Solana-Native)

**What:** PayAI is a Solana-native x402 facilitator and AI agent marketplace. It provides payment verification, settlement, and a marketplace where AI agents can discover and pay for services autonomously.

**Architecture:**
- **Facilitator service** at `facilitator.payai.network` handles payment verification and settlement on Solana
- **MCPay**: MCP (Model Context Protocol) servers that are payment-gated via x402, so Claude, Cursor, or other MCP hosts can pay for tool access
- **Agent marketplace**: Agents can register services and other agents can discover and pay for them
- **x402-solana npm package**: Solana-specific client/server library with PayAI facilitator integration

**Pros:**
- Built specifically for Solana; deeply optimized for Solana's transaction model
- MCP integration lets AI coding assistants (Claude, Cursor) pay for tools
- Marketplace for agent discovery and commerce
- Active facilitator with sub-second verification on Solana

**Cons:**
- Solana-only; no EVM support
- Smaller ecosystem than the official Coinbase SDK
- Marketplace is still early; limited service catalog
- Dependency on PayAI's facilitator infrastructure

**Best for:**
- Solana-only projects
- AI agent marketplaces and agentic commerce
- MCP-based tool monetization
- Teams building agent-to-agent payment flows

**Server Code Example (x402-solana + PayAI):**

```typescript
import express from "express";
import { X402PaymentHandler } from "x402-solana/server";

const app = express();
app.use(express.json());

const x402 = new X402PaymentHandler({
  network: "solana",                                    // or "solana-devnet"
  treasuryAddress: process.env.TREASURY_WALLET_ADDRESS!,
  facilitatorUrl: "https://facilitator.payai.network",
});

app.post("/api/analyze", async (req, res) => {
  const resourceUrl = `${process.env.BASE_URL}/api/analyze`;

  // Extract payment header (v2 uses PAYMENT-SIGNATURE)
  const paymentHeader = x402.extractPayment(req.headers);

  // Create payment requirements
  const paymentRequirements = await x402.createPaymentRequirements(
    {
      amount: "50000",   // $0.05 USDC (6 decimals)
      description: "AI market analysis",
    },
    resourceUrl
  );

  if (!paymentHeader) {
    // Return 402 with payment requirements
    return res.status(402).json(paymentRequirements);
  }

  // Verify payment via PayAI facilitator
  const verified = await x402.verifyPayment(paymentHeader, paymentRequirements);
  if (!verified.success) {
    return res.status(400).json({ error: "Payment verification failed" });
  }

  // Serve the paid content
  res.json({ analysis: "SOL showing bullish momentum..." });
});

app.listen(4021);
```

### Option D: MoneyMQ Facilitator (Self-Hosted)

**What:** An open-source, self-hostable x402 facilitator that runs a local Solana validator for development and handles payment verification and settlement. Good for development/testing and for teams that want full control.

**Architecture:**
- Self-hosted facilitator server with embedded Solana validator
- Pre-seeded test accounts with USDC balance for development
- Works with standard `x402-express` middleware
- npm package: `@moneymq/x402`

**Pros:**
- Fully self-contained development environment (no mainnet, no external services)
- Pre-seeded wallets mean zero setup for testing
- Open source; you control the facilitator
- Compatible with standard x402 middleware patterns

**Cons:**
- Primarily designed for development/testing, not production
- Smaller community than Coinbase or PayAI
- Must run your own infrastructure for production deployment

**Best for:**
- Local development and testing
- Teams that require a self-hosted facilitator for compliance or security
- CI/CD pipelines that need deterministic x402 testing

**Code Example (MoneyMQ + Express):**

```typescript
import { Network, paymentMiddleware, SolanaAddress } from "x402-express";

const PAYOUT_ADDRESS = process.env.PAYOUT_RECIPIENT_ADDRESS as SolanaAddress;
const FACILITATOR_URL = process.env.FACILITATOR_URL; // http://localhost:7781

app.use(
  paymentMiddleware(
    PAYOUT_ADDRESS,
    {
      "GET /protected": {
        price: "$0.0001",
        network: "solana",
      },
      "GET /premium": {
        price: "$0.01",
        network: "solana",
      },
    },
    { url: FACILITATOR_URL },
  ),
);
```

## The Facilitator Pattern

The facilitator is a critical architectural component in x402. It acts as an intermediary that abstracts blockchain complexity from both the server and client.

**What a facilitator does:**
1. **Verify** (`POST /verify`): Receives a payment payload, checks cryptographic signatures, validates the payment amount and recipient on-chain
2. **Settle** (`POST /settle`): Submits the transaction to the blockchain and monitors for confirmation
3. **Abstract chain details**: The server never needs to import `@solana/web3.js` or parse transactions

**When to use a hosted facilitator (Coinbase, PayAI):**
- You want zero blockchain code on your server
- You trust the facilitator to settle honestly (Coinbase, a publicly-traded company, operates the primary one)
- You need multi-chain support without maintaining multiple RPC connections
- You want gasless settlement (the facilitator sponsors gas)

**When to self-host:**
- Regulatory requirements demand you control the payment pipeline
- You need custom verification logic (e.g., checking additional transaction fields)
- You want to avoid any third-party dependency
- High-volume applications where facilitator rate limits matter

**Self-hosted facilitator reference implementations:**
- Rust: `second-state/x402-facilitator` (235 stars, production-grade)
- Coinbase reference: `coinbase/x402` repo includes facilitator specs
- Community: `openlibx402` provides open-source facilitator implementations

## x402 Protocol Flow (Detailed)

```
 Client                        Server                      Facilitator
   |                              |                             |
   |  1. GET /api/data            |                             |
   |----------------------------->|                             |
   |                              |                             |
   |  2. 402 Payment Required     |                             |
   |  Headers:                    |                             |
   |    PAYMENT-REQUIRED: {       |                             |
   |      scheme: "exact",        |                             |
   |      network: "solana:...",  |                             |
   |      maxAmountRequired: ..., |                             |
   |      payTo: "...",           |                             |
   |      asset: "USDC mint"     }|                             |
   |<-----------------------------|                             |
   |                              |                             |
   |  3. Client signs payment     |                             |
   |  (partially-signed Solana tx)|                             |
   |                              |                             |
   |  4. GET /api/data            |                             |
   |  Headers:                    |                             |
   |    PAYMENT-SIGNATURE: <b64>  |                             |
   |----------------------------->|                             |
   |                              |  5. POST /verify            |
   |                              |  {payload, paymentReqs}     |
   |                              |----------------------------->|
   |                              |                             |
   |                              |  6. {valid: true}           |
   |                              |<-----------------------------|
   |                              |                             |
   |                              |  7. POST /settle            |
   |                              |  {payload}                  |
   |                              |----------------------------->|
   |                              |                             |
   |                              |  8. {tx: "5xK3...", ok}     |
   |                              |<-----------------------------|
   |                              |                             |
   |  9. 200 OK                   |                             |
   |  Headers:                    |                             |
   |    PAYMENT-RESPONSE: {       |                             |
   |      success: true,          |                             |
   |      transaction: "5xK3..."  |                             |
   |    }                         |                             |
   |  Body: { data: "..." }      |                             |
   |<-----------------------------|                             |
```

**v2 Protocol Headers:**

| Header | Direction | Purpose |
|---|---|---|
| `PAYMENT-REQUIRED` | Server -> Client | JSON with payment requirements (in 402 response body) |
| `PAYMENT-SIGNATURE` | Client -> Server | Base64-encoded signed payment payload |
| `PAYMENT-RESPONSE` | Server -> Client | Base64-encoded settlement result with tx hash |

**v1 vs v2 Header Differences:**

| Aspect | v1 | v2 (Current) |
|---|---|---|
| Payment Header | `X-PAYMENT` | `PAYMENT-SIGNATURE` |
| Response Header | `X-PAYMENT-RESPONSE` | `PAYMENT-RESPONSE` |
| Network Format | `solana`, `base-sepolia` | CAIP-2: `solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp` |
| Version Field | `x402Version: 1` | `x402Version: 2` |
| Packages | `x402`, `x402-express` | `@x402/core`, `@x402/express` |

Note: Many tutorials and implementations still use v1 headers. Both are widely supported. The official Coinbase SDK v2 packages (`@x402/*`) are recommended for new projects.

## Key Trade-offs

| Factor | Official SDK (@x402/*) | Native/DIY | PayAI | MoneyMQ |
|---|---|---|---|---|
| **Setup time** | Minutes | Hours | Minutes | Minutes |
| **Lines of code** | ~10 (server) | ~100+ (server) | ~15 (server) | ~10 (server) |
| **Facilitator** | Coinbase (hosted, free) | None (self-verify) | PayAI (hosted) | Self-hosted |
| **Chains** | Solana + Base + Ethereum | Solana only | Solana only | Solana only |
| **Production ready** | Yes | Requires hardening | Yes (Solana) | Dev/test primarily |
| **Replay protection** | Built-in | Must implement | Built-in | Built-in |
| **Dependencies** | Heavy (~8 packages) | Light (~2 packages) | Medium (~4 packages) | Medium (~4 packages) |
| **Trust model** | Trust Coinbase | Trust yourself | Trust PayAI | Trust yourself |
| **MCP integration** | Via community | Manual | Built-in (MCPay) | No |
| **Agent marketplace** | No | No | Yes | No |
| **v2 protocol** | Full support | Implement yourself | Partial | v1 |
| **Browser paywall UI** | Yes (built-in) | No | No | No |

## Cross-Chain Context: Stripe x402 on Base

In February 2026, Stripe launched x402 payment integration on Base (Coinbase's Ethereum L2), enabling developers to charge AI agents directly with USDC. This is significant because it brings traditional payment infrastructure (Stripe) into the x402 ecosystem. However, the Stripe integration is Base-only (EVM). For Solana developers, this means:

- **x402 is gaining legitimacy**: Stripe's endorsement validates the protocol for enterprise adoption
- **Multi-chain is the future**: Services may accept x402 on both Base (Stripe) and Solana (Coinbase/PayAI)
- **Solana's advantage**: Even with Stripe on Base, Solana's faster finality and lower fees make it preferred for high-frequency micropayments
- **Interoperability**: The official `@x402/express` middleware can accept payments on multiple chains simultaneously, so your API can serve both ecosystems

## Security Considerations

### 1. Payment Replay Attacks

**Risk:** An attacker captures a valid `PAYMENT-SIGNATURE` header and reuses it to access the same endpoint multiple times for a single payment.

**Mitigation:**
```typescript
// Server-side replay protection with TTL-based cleanup
const usedPayments = new Map<string, number>(); // signature -> timestamp

function isReplay(signature: string): boolean {
  if (usedPayments.has(signature)) return true;
  usedPayments.set(signature, Date.now());

  // Periodic cleanup: remove entries older than 1 hour
  if (usedPayments.size > 10000) {
    const oneHourAgo = Date.now() - 3600000;
    for (const [sig, ts] of usedPayments) {
      if (ts < oneHourAgo) usedPayments.delete(sig);
    }
  }
  return false;
}
```

**Note:** The official Coinbase SDK handles replay protection through the facilitator's `/verify` endpoint. If you self-host or go native, you must implement this yourself. An [open issue](https://github.com/coinbase/x402/issues/803) on the Coinbase repo highlights that replay protection is not explicitly enforced in all paths.

### 2. Double-Spend / Race Conditions

**Risk:** A client submits the same partially-signed transaction to multiple servers simultaneously before any of them settle it.

**Mitigation:**
- Wait for `confirmed` commitment level (not `processed`) before serving content
- Use the facilitator's `/settle` endpoint, which submits and waits for confirmation
- For high-value endpoints, wait for `finalized` commitment (31 confirmations on Solana)

### 3. Amount Verification

**Risk:** Client sends a payment for less than the required amount.

**Mitigation:**
```typescript
// Always verify the exact amount in the parsed transaction
if (Number(parsed.info.tokenAmount.amount) < expectedAmount) {
  return false; // Underpayment
}
```

### 4. Transaction Freshness

**Risk:** Client submits a legitimate old transaction that was meant for a different purpose.

**Mitigation:**
- Check `blockTime` and reject transactions older than a threshold (e.g., 5 minutes)
- Verify the recipient address matches your expected wallet
- Verify the USDC mint address matches (prevents paying with a different SPL token)

### 5. Facilitator Trust

**Risk:** A malicious facilitator could approve invalid payments or steal funds.

**Mitigation:**
- Use the Coinbase facilitator (backed by a publicly-traded company)
- Self-host a facilitator for critical applications
- Implement secondary on-chain verification for high-value transactions

## Real-World Use Cases

### API Monetization
Charge per request for premium data feeds, search APIs, or compute services. x402 eliminates the need for API key management, usage tiers, and billing infrastructure. An agent pays $0.001 per request; the payment IS the authentication.

### Dataset Access
Gate access to proprietary datasets behind x402 payments. AI agents training on specialized data can autonomously discover, evaluate, and purchase dataset access.

### Compute Purchasing
Sell GPU inference time or compute resources per request. An agent needing image generation, LLM inference, or data processing pays per invocation.

### Content Gates
Paywall articles, research papers, or media content with micropayments instead of subscriptions. A reader pays $0.02 to read one article instead of $15/month for a subscription.

### MCP Server Monetization
Payment-gate MCP tools so that AI coding assistants (Claude, Cursor) pay for premium tool access. Example: a BizNews MCP server charges $0.05 per breaking news query.

### Agent-to-Agent Commerce
AI agents can hire other agents. A research agent pays a data-scraping agent $0.01 per page, which pays a proxy agent $0.001 per request -- all settled autonomously via x402 on Solana.

## Recommendation

**For most Solana developers building x402 payment-gated APIs:**

Use **Option A (Coinbase Official SDK)** with the `@x402/express` middleware for servers and `@x402/fetch` for clients. This gives you production-ready x402 in under 10 lines of code, with built-in replay protection, multi-chain support, and free facilitator access. The v2 packages (`@x402/*`) are the current recommended path.

**For Solana-only projects building agent marketplaces or MCP monetization:**

Use **Option C (PayAI)** for its Solana-native facilitator and built-in marketplace/MCP integration. PayAI's `x402-solana` package is purpose-built for the Solana transaction model.

**For learning, auditing, or high-security applications:**

Use **Option B (Native/DIY)** to understand exactly what is happening. Then decide whether to adopt the official SDK or remain native. The Solana Foundation's guide at `solana.com/developers/guides/getstarted/intro-to-x402` provides an excellent starting point for native implementations.

**For development and testing:**

Use **Option D (MoneyMQ)** with its embedded Solana validator and pre-seeded test accounts. This gives you a fully self-contained environment with zero external dependencies. Migrate to the Coinbase SDK or PayAI for production.

**Key principle:** Start with the official SDK unless you have a specific reason not to. The protocol is evolving rapidly (v1 to v2 migration happened in early 2026), and staying on the official packages means you get upgrades, security patches, and multi-chain support automatically.

## Solana x402 Ecosystem Map

| Project | Role | URL |
|---|---|---|
| **Coinbase x402** | Reference implementation, SDK, hosted facilitator | github.com/coinbase/x402 |
| **x402 Foundation** | Protocol governance (Coinbase + Cloudflare) | x402.org |
| **PayAI** | Solana facilitator, agent marketplace | payai.network |
| **Corbits** | Solana-first x402 SDK | corbits.dev |
| **Faremeter** | OSS framework for agentic payments | github.com/faremeter |
| **x402scan** | Explorer for x402 ecosystem transactions | x402scan (linked from solana.com/x402) |
| **MoneyMQ** | Self-hosted Solana facilitator | github.com/txtx/moneymq-js |
| **OpenLibx402** | Community x402 libraries (Express, etc.) | openlibx402.github.io |
| **x402-solana** | Solana-specific client/server package | npmjs.com/package/x402-solana |
| **AnySpend x402** | Multi-token x402 (pay with any SPL token) | npmjs.com/package/@b3dotfun/anyspend-x402 |

## Sources

1. x402 Protocol Official Site: https://www.x402.org/
2. Coinbase x402 Documentation: https://docs.cdp.coinbase.com/x402/docs/welcome
3. Coinbase x402 GitHub Repository: https://github.com/coinbase/x402
4. Solana x402 Portal: https://solana.com/x402
5. Solana x402 Developer Guide: https://solana.com/developers/guides/getstarted/intro-to-x402
6. x402 Whitepaper (Coinbase): https://www.x402.org/x402-whitepaper.pdf
7. PayAI Documentation: https://docs.payai.network/x402/introduction
8. PayAI x402 Reference: https://docs.payai.network/x402/reference
9. @x402/express npm Package: https://www.npmjs.com/package/@x402/express
10. x402-solana npm Package: https://www.npmjs.com/package/x402-solana
11. MoneyMQ x402 Solana Template: https://templates.solana.com/zh/moneymq-x402
12. Circle: Autonomous Payments with USDC and x402: https://www.circle.com/blog/autonomous-payments-using-circle-wallets-usdc-and-x402
13. Cloudflare x402 Foundation Launch: https://blog.cloudflare.com/x402/
14. Stripe x402 Integration on Base: https://www.theblock.co/post/389352/stripe-adds-x402-integration-usdc-agent-payments
15. Zuplo: MCP API Payments with x402: https://zuplo.com/blog/mcp-api-payments-with-x402
16. Coinbase: APIs That Get Paid: https://www.coinbase.com/developer-platform/discover/launches/monetize-apis-on-x402
17. Developer DAO x402 Deep Dive: https://blog.developerdao.com/x402-deep-dive-a-payment-standard-for-the-internet
18. 7BlockLabs: x402 Security Review: https://www.7blocklabs.com/blog/x402-security-review-replay-double-spend-and-settlement-finality-pitfalls
19. 7BlockLabs: Facilitators in x402: https://www.7blocklabs.com/blog/facilitators-in-x402-when-to-self-host-vs-use-a-hosted-settlement-service
20. Privy: Building with x402: https://privy.io/blog/building-agentic-and-programmatic-payments-with-x402-and-privy
21. QuickNode: x402 Paywall Guide: https://www.quicknode.com/guides/infrastructure/how-to-use-x402-payment-required
22. SolanaFloor: x402 Market Share Data: https://solanafloor.com/news/solana-commands-49-of-x402-market-share-as-the-race-for-micropayment-dominance-intensifies
23. Braumiller Law: x402 Legal Framework: https://www.braumillerlaw.com/activating-http-402-the-x402-protocol-and-legal-framework-for-internet-native-stablecoin-payments/
24. Coinbase x402 Migration Guide (v1 to v2): https://docs.cdp.coinbase.com/x402/migration-guide
25. GitHub Issue #803 - Replay Protection: https://github.com/coinbase/x402/issues/803
26. 7BlockLabs: Embedding x402 in SDKs: https://www.7blocklabs.com/blog/embedding-x402-in-sdks-making-pay-required-developer-friendly
27. WhalesMarket: What is PayAI Network: https://whales.market/blog/what-is-payai-network/
28. James Bachini: Developer Guide to x402: https://jamesbachini.com/x402-protocol/
29. PROXIES.SX: x402 Protocol Explained: https://www.proxies.sx/blog/x402-protocol-explained-ai-agent-payments
30. PROXIES.SX: Build Paid API with x402: https://www.proxies.sx/blog/build-paid-api-x402-usdc-tutorial
31. Crypto Economy: Solana x402 Ecosystem Growth: https://crypto-economy.com/solana-becomes-number%e2%80%91one-payments-chain-amid-x402-ecosystem-growth/
32. Valkyrie Security: x402 Integration Security: https://blog.valkyrisec.com/x402-integration-security/
33. awesome-x402 Resource Hub: https://github.com/xpaysh/awesome-x402
34. Colosseum Agent Hackathon - x402 Middleware: https://colosseum.com/agent-hackathon/forum/3800

## Gaps & Caveats

**Protocol maturity:** x402 is evolving rapidly. The v1-to-v2 migration (new header names, CAIP-2 network identifiers, new package scopes) happened in early 2026. Further breaking changes are possible. Pin your SDK versions and monitor the changelog.

**Solana-specific SDK gaps:** The Coinbase reference implementation historically prioritized EVM (Base). Solana support in the official `@x402/*` packages was added later and, while functional, has fewer production deployments than the EVM path. Community packages like `x402-solana` and PayAI fill this gap.

**Facilitator centralization:** In practice, Coinbase operates the dominant facilitator. While the protocol is open and self-hosting is supported, most developers default to the Coinbase facilitator. This creates a soft centralization risk. The x402 Foundation's governance aims to address this, but it is early.

**Market volatility:** x402 transaction volumes have been volatile. After peaking in late 2025, weekly Solana x402 transactions dropped over 90% by February 2026 (from ~6.8M to ~510K weekly). This may reflect subsiding hype rather than fundamental problems, but it means the ecosystem is still proving product-market fit.

**Replay protection is not universal:** As documented in GitHub issue #803, the default x402 middleware does not enforce replay protection in all code paths. Production deployments should implement server-side signature deduplication (as shown in the Security section above).

**Regulatory uncertainty:** The legal framework for HTTP-native stablecoin payments is untested in most jurisdictions. The Braumiller Law Group analysis (source 23) explores this, but no definitive regulatory guidance exists.

**Confidence rationale (8/10):** The protocol is well-documented, backed by Coinbase and Cloudflare, has a clear whitepaper, and has processed 120M+ transactions across chains. Code examples are verified against official repos. Confidence is not 9 or 10 because: the ecosystem is still maturing (v1-to-v2 transition), Solana-specific tooling is younger than EVM tooling, market adoption metrics are volatile, and security best practices are still being formalized.

