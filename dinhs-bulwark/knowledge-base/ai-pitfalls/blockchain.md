# AI-Generated Code Pitfalls: Blockchain Interaction
<!-- Domain: blockchain -->
<!-- Relevant auditors: CHAIN-01, CHAIN-02, CHAIN-03, CHAIN-04, CHAIN-05, CHAIN-06 -->

AI code generators (ChatGPT, Claude, Copilot, etc.) consistently produce dangerous patterns when generating Solana off-chain code. These pitfalls are especially insidious because the generated code compiles, runs, and appears correct during testing — but contains security flaws that only manifest in adversarial or production conditions.

---

## AIP-051: Using `"processed"` as Default Commitment Level

**Auditors:** CHAIN-02, CHAIN-04
**Related patterns:** OC-117, OC-126

AI generators frequently create `Connection` objects with `"processed"` commitment or omit the commitment parameter entirely (which defaults to `"finalized"` in web3.js v1 but is often misunderstood). When code explicitly sets `"processed"`, it reads unconfirmed state that can be rolled back. AI models choose `"processed"` because it appears in many tutorial snippets and produces the fastest responses during development.

```typescript
// AI-GENERATED (DANGEROUS):
const connection = new Connection(clusterApiUrl("mainnet-beta"), "processed");
const balance = await connection.getBalance(wallet.publicKey);
// Acting on a "processed" balance that may not persist

// CORRECT:
const connection = new Connection(rpcUrl, "confirmed"); // or "finalized" for financial ops
```

---

## AIP-052: Missing Transaction Simulation Before Sending

**Auditors:** CHAIN-01
**Related patterns:** OC-108, OC-109

AI generators almost always produce `sendTransaction` or `sendRawTransaction` calls without a preceding `simulateTransaction` step. The generated code optimizes for brevity, skipping the simulation that would catch errors, unexpected program invocations, and account state issues before committing the transaction on-chain.

```typescript
// AI-GENERATED (DANGEROUS):
const sig = await connection.sendTransaction(tx, [signer]);
await connection.confirmTransaction(sig);

// CORRECT:
const sim = await connection.simulateTransaction(tx, [signer]);
if (sim.value.err) throw new Error(`Simulation failed: ${JSON.stringify(sim.value.err)}`);
const sig = await connection.sendRawTransaction(tx.serialize());
```

---

## AIP-053: Hardcoded Slippage Tolerance in Swap Code

**Auditors:** CHAIN-05
**Related patterns:** OC-128, OC-129

When generating DEX swap code, AI models hardcode a single slippage value (typically 1-5%) for all pairs. They do not differentiate between stablecoin pairs (which need 0.05-0.1%), major pairs (0.1-0.5%), and volatile tokens (0.5-3%). The hardcoded value is usually set high to avoid transaction failures during testing.

```typescript
// AI-GENERATED (DANGEROUS):
const slippageBps = 500; // 5% for all swaps — massive MEV exposure

// CORRECT: Dynamic slippage based on pair characteristics
const slippageBps = isStablePair ? 10 : isMajorPair ? 50 : 100;
```

---

## AIP-054: Using `signTransaction` Instead of `signAndSendTransaction`

**Auditors:** CHAIN-01, CHAIN-03
**Related patterns:** OC-108, OC-111

AI models frequently generate code using `wallet.signTransaction(tx)` followed by `connection.sendRawTransaction()`. This bypasses the wallet's built-in simulation preview, meaning the user signs without seeing what the transaction will do. The `signAndSendTransaction` method allows the wallet to simulate, display effects, and submit — all in one step with proper user safeguards.

```typescript
// AI-GENERATED (DANGEROUS):
const signed = await wallet.signTransaction(tx);
const sig = await connection.sendRawTransaction(signed.serialize());

// CORRECT:
const sig = await wallet.sendTransaction(tx, connection);
// Or via provider: await wallet.signAndSendTransaction(tx);
```

---

## AIP-055: Trusting RPC Responses for Payment Verification

**Auditors:** CHAIN-02
**Related patterns:** OC-114, OC-117

AI generators produce payment verification code that calls `getBalance` or `getSignatureStatuses` and immediately trusts the response. They do not verify at `finalized` commitment, do not parse the actual transaction to confirm the expected transfer amount and recipient, and do not cross-validate with multiple RPC providers for high-value operations.

```typescript
// AI-GENERATED (DANGEROUS):
const status = await connection.getSignatureStatus(sig);
if (status.value?.confirmationStatus) { creditUser(); }

// CORRECT:
const tx = await connection.getTransaction(sig, { commitment: "finalized" });
if (!tx || tx.meta?.err) return false;
// Parse tx to verify amount, recipient, and program
```

---

## AIP-056: Static SIWS Message Without Nonce or Expiry

**Auditors:** CHAIN-03
**Related patterns:** OC-119, OC-121

AI models generate Sign-In-With-Solana (SIWS) implementations with static messages like "Welcome to MyApp" or "Please sign to verify your wallet." These messages contain no server-generated nonce, no domain binding, no timestamp, and no expiration. The resulting signature is a permanent, replayable authentication credential.

```typescript
// AI-GENERATED (DANGEROUS):
const message = "Sign in to verify your wallet ownership";
const sig = await wallet.signMessage(new TextEncoder().encode(message));

// CORRECT: Include nonce, domain, issued-at, and expiration per SIWS spec
const message = `myapp.com wants you to sign in...\nNonce: ${serverNonce}\nIssued At: ${now}`;
```

---

## AIP-057: Using Deprecated `window.solana` Provider Detection

**Auditors:** CHAIN-03
**Related patterns:** OC-118, OC-120

AI training data contains extensive examples of `window.solana` and `window.phantom?.solana` for wallet detection. These patterns are deprecated in favor of the Wallet Standard registration protocol. Code using `window.solana` is vulnerable to provider injection attacks where malicious extensions overwrite the global object.

```typescript
// AI-GENERATED (DANGEROUS):
const provider = window.solana;
if (provider?.isPhantom) { await provider.connect(); }

// CORRECT: Use @solana/wallet-adapter framework with explicit adapter list
import { PhantomWalletAdapter } from "@solana/wallet-adapter-wallets";
const wallets = [new PhantomWalletAdapter()];
```

---

## AIP-058: Using Legacy `Transaction.sign()` in Multi-Signer Flows

**Auditors:** CHAIN-01
**Related patterns:** OC-110

AI generators produce code that calls `transaction.sign(keypair)` when adding signatures to a partially-signed transaction. The legacy `Transaction.sign()` method resets all existing signatures, destroying any prior partial signatures. This is a subtle bug that only manifests in multi-signer workflows (server + client, multisig, etc.).

```typescript
// AI-GENERATED (DANGEROUS):
tx.sign(myKeypair); // Resets all existing signatures!

// CORRECT:
tx.partialSign(myKeypair); // Preserves existing signatures
// Or use VersionedTransaction which has safe sign behavior
```

---

## AIP-059: Skipping `skipPreflight: true` Consequences

**Auditors:** CHAIN-01
**Related patterns:** OC-108

AI models generate code with `skipPreflight: true` in `sendRawTransaction` options, copying patterns from high-frequency trading tutorials where speed is prioritized over safety. In general application code, this skips the RPC node's automatic simulation check, allowing broken transactions to be broadcast to validators.

```typescript
// AI-GENERATED (DANGEROUS):
await connection.sendRawTransaction(tx.serialize(), {
  skipPreflight: true,
  preflightCommitment: "processed",
});

// CORRECT:
await connection.sendRawTransaction(tx.serialize(), {
  skipPreflight: false,
  preflightCommitment: "confirmed",
});
```

---

## AIP-060: Incorrect PDA Seed Encoding

**Auditors:** CHAIN-06
**Related patterns:** OC-130

AI generators frequently produce PDA derivation code with incorrect seed encoding. Common mistakes include using `Buffer.from(number.toString())` (string bytes) when the on-chain program expects `number.to_le_bytes()` (little-endian integer bytes), using different seed ordering than the on-chain program, and forgetting to include the canonical bump seed.

```typescript
// AI-GENERATED (DANGEROUS):
const [pda] = PublicKey.findProgramAddressSync(
  [Buffer.from("vault"), Buffer.from(userId.toString())], // String encoding!
  programId
);

// CORRECT: Match on-chain Rust encoding
const [pda] = PublicKey.findProgramAddressSync(
  [Buffer.from("vault"), new BN(userId).toArrayLike(Buffer, "le", 8)], // LE bytes
  programId
);
```

---

## AIP-061: No Error Handling on Transaction Confirmation

**Auditors:** CHAIN-01, CHAIN-04
**Related patterns:** OC-108, OC-116

AI generators produce `confirmTransaction` calls that do not handle timeouts, expired blockhashes, or transaction failures. The generated code assumes confirmation always succeeds within a reasonable timeframe. On a congested Solana network, transactions can expire (blockhash becomes invalid after ~60 seconds) without ever being confirmed.

```typescript
// AI-GENERATED (DANGEROUS):
const sig = await sendTransaction(tx, connection);
await connection.confirmTransaction(sig); // Hangs indefinitely on failure

// CORRECT:
const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
tx.recentBlockhash = blockhash;
const sig = await sendTransaction(tx, connection);
const result = await connection.confirmTransaction({
  signature: sig, blockhash, lastValidBlockHeight,
});
if (result.value.err) throw new Error("Transaction failed");
```

---

## AIP-062: Sending Swap Transactions Through Public RPC

**Auditors:** CHAIN-05
**Related patterns:** OC-127, OC-128

AI generators always use `connection.sendRawTransaction()` through the standard RPC endpoint for swap transactions. They never include MEV protection patterns like Jito bundles, private transaction relays, or MEV-protected RPC endpoints. The generated code sends value-extractable transactions in the clear where validators and searchers can sandwich them.

```typescript
// AI-GENERATED (DANGEROUS):
const sig = await connection.sendRawTransaction(swapTx.serialize());

// CORRECT: Use MEV-protected submission for swap transactions
const protectedRpc = new Connection(process.env.MEV_PROTECTED_RPC_URL!);
const sig = await protectedRpc.sendRawTransaction(swapTx.serialize());
// Or use Jito bundle API for guaranteed ordering
```

---

## AIP-063: Blind Signing of Server-Built Transactions

**Auditors:** CHAIN-01, CHAIN-03
**Related patterns:** OC-106, OC-111

AI generators produce code that fetches a serialized transaction from a server API and passes it directly to `wallet.signTransaction()` without inspecting its contents. This is the exact pattern used by wallet drainers — the server can include any instructions (including drain instructions) and the user signs blindly.

```typescript
// AI-GENERATED (DANGEROUS):
const { tx } = await fetch("/api/build-tx").then(r => r.json());
const signed = await wallet.signTransaction(Transaction.from(Buffer.from(tx, "base64")));

// CORRECT: Build transaction client-side with known instructions, or at minimum
// simulate and display results before requesting user signature
```

---

## AIP-064: Using `getRecentBlockhash` (Deprecated)

**Auditors:** CHAIN-01
**Related patterns:** OC-116

AI training data contains widespread use of the deprecated `getRecentBlockhash` method. This method was deprecated in Solana RPC v1.7.0 in favor of `getLatestBlockhash`, which also returns `lastValidBlockHeight` for proper transaction expiry tracking. AI-generated code using the old method lacks the ability to detect expired transactions.

```typescript
// AI-GENERATED (DANGEROUS):
const { blockhash } = await connection.getRecentBlockhash(); // Deprecated!

// CORRECT:
const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash("confirmed");
tx.recentBlockhash = blockhash;
tx.lastValidBlockHeight = lastValidBlockHeight;
```

---

## AIP-065: No Reconnection Logic for WebSocket Subscriptions

**Auditors:** CHAIN-04
**Related patterns:** OC-122, OC-125

AI generators produce WebSocket subscription code (`onAccountChange`, `onLogs`) without reconnection handling, gap-filling, or health monitoring. When the WebSocket disconnects (which happens routinely in production), events are silently lost. The AI-generated code assumes the subscription persists indefinitely.

```typescript
// AI-GENERATED (DANGEROUS):
connection.onAccountChange(pubkey, (info) => {
  processUpdate(info); // Lost events on reconnect are never recovered
});

// CORRECT: Implement reconnection with gap-fill polling
// Monitor connection health, resubscribe on disconnect, poll for missed events
```
