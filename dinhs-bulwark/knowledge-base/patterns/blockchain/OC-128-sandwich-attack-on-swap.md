# OC-128: Sandwich Attack on Swap

**Category:** Blockchain Interaction
**Severity:** HIGH
**Auditors:** CHAIN-05
**CWE:** N/A — Blockchain-specific
**OWASP:** N/A — Blockchain-specific

## Description

A sandwich attack targets DEX swap transactions by placing a buy order before the victim's transaction (front-run) and a sell order after (back-run). The attacker's front-run pushes the price up, the victim buys at the inflated price, and the attacker sells at the higher price — pocketing the difference at the victim's expense.

On Solana, sandwich attacks are facilitated by Jito's bundle infrastructure and validator sidecar systems. Despite Solana's lack of a public mempool, validators control transaction ordering within blocks, and the Jito block engine allows searchers to submit bundles that guarantee transaction ordering. This has made Solana a major venue for sandwich attacks.

Off-chain code contributes to sandwich vulnerability in several ways: setting slippage tolerance too high (giving the attacker room to operate), not using minimum output amounts, sending swap transactions through public RPC endpoints, and not leveraging MEV-protected transaction submission. The OKX DEX API and similar services accept slippage parameters — setting these too loosely invites sandwich attacks. Solflare's documentation notes that failed swaps are often caused by slippage tolerance being too low, creating pressure for users to increase it, which paradoxically increases MEV exposure.

## Detection

```
grep -rn "slippage\|slippageBps\|slippagePercent" --include="*.ts" --include="*.js"
grep -rn "minOut\|minimumAmountOut\|min_output" --include="*.ts" --include="*.js"
grep -rn "swap\|exchange" --include="*.ts" --include="*.js" -i
```

Look for: slippage tolerance above 1% for major pairs, slippage above 5% for any pair, missing minimum output amount in swap instructions, hardcoded slippage values that do not account for pair volatility.

## Vulnerable Code

```typescript
// VULNERABLE: High slippage tolerance invites sandwich attacks
async function swapTokens(
  connection: Connection,
  wallet: any,
  inputMint: PublicKey,
  outputMint: PublicKey,
  amount: number
) {
  const quote = await fetch(
    `https://quote-api.jup.ag/v6/quote?inputMint=${inputMint}` +
    `&outputMint=${outputMint}&amount=${amount}` +
    `&slippageBps=500`  // 5% slippage — far too high for major pairs
  ).then((r) => r.json());
  const swapTx = await fetch("https://quote-api.jup.ag/v6/swap", {
    method: "POST",
    body: JSON.stringify({
      quoteResponse: quote,
      userPublicKey: wallet.publicKey.toBase58(),
    }),
  }).then((r) => r.json());
  const tx = Transaction.from(Buffer.from(swapTx.swapTransaction, "base64"));
  const signed = await wallet.signTransaction(tx);
  // Sent via public RPC — visible to sandwich bots
  return connection.sendRawTransaction(signed.serialize());
}
```

## Secure Code

```typescript
// SECURE: Tight slippage, MEV-protected submission, and dynamic calculation
async function swapTokens(
  wallet: any,
  inputMint: PublicKey,
  outputMint: PublicKey,
  amount: number
) {
  // Step 1: Get quote with conservative slippage based on pair type
  const isStablePair = isStablecoin(inputMint) && isStablecoin(outputMint);
  const slippageBps = isStablePair ? 10 : 50; // 0.1% stables, 0.5% volatile
  const quote = await fetch(
    `https://quote-api.jup.ag/v6/quote?inputMint=${inputMint}` +
    `&outputMint=${outputMint}&amount=${amount}` +
    `&slippageBps=${slippageBps}`
  ).then((r) => r.json());
  // Step 2: Verify price impact is acceptable
  const priceImpact = parseFloat(quote.priceImpactPct);
  if (priceImpact > 1.0) {
    throw new Error(`Price impact too high: ${priceImpact}%`);
  }
  // Step 3: Build swap transaction
  const swapTx = await fetch("https://quote-api.jup.ag/v6/swap", {
    method: "POST",
    body: JSON.stringify({
      quoteResponse: quote,
      userPublicKey: wallet.publicKey.toBase58(),
    }),
  }).then((r) => r.json());
  const tx = VersionedTransaction.deserialize(
    Buffer.from(swapTx.swapTransaction, "base64")
  );
  // Step 4: Send via MEV-protected endpoint
  const protectedRpc = new Connection(process.env.MEV_PROTECTED_RPC_URL!);
  const signed = await wallet.signTransaction(tx);
  return protectedRpc.sendRawTransaction(Buffer.from(signed.serialize()));
}
```

## Impact

Sandwich attacks extract value directly from the user's swap. The user receives fewer output tokens than they would in a fair execution. Losses range from fractions of a percent on small trades to several percent on larger trades. In aggregate, Solana sandwich attacks extract thousands of SOL per month from users. A February 2026 analysis showed Solana "struggles with sandwich attacks" compared to other chains.

## References

- Sandwiched.me: State of Solana MEV May 2025 — comprehensive sandwich data
- OKBTC: MEV Situation on Different Blockchains (February 2026) — Solana sandwich focus
- Adevar Labs: Unpacking MEV on Solana — developer defenses
- Hacken: Front-Running in Blockchain — slippage protection best practices
- Carbium docs: Slippage settings — recommended values by pair type
