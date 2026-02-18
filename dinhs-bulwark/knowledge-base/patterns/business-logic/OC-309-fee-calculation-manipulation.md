# OC-309: Fee Calculation Manipulation (Dust/Zero)

**Category:** Business Logic
**Severity:** MEDIUM
**Auditors:** LOGIC-02
**CWE:** CWE-682 (Incorrect Calculation)
**OWASP:** A04:2021 – Insecure Design

## Description

Fee calculation manipulation occurs when an attacker can craft transactions with amounts small enough ("dust") that the computed fee rounds to zero, or can otherwise manipulate input values to avoid or minimize fees. This is especially common when fees are calculated as a percentage of a transaction amount using integer division, where small amounts produce a zero-fee result.

The fundamental pattern is: `fee = amount * feeRate / DENOMINATOR`. If `amount * feeRate < DENOMINATOR`, integer division truncates the fee to zero. An attacker can then perform many dust-sized transactions (each with zero fee) that together move significant value. Alternatively, if fee calculation uses floating-point arithmetic, precision errors can produce fees slightly below the minimum threshold, allowing them to be waived.

In DeFi protocols, fee manipulation is a well-studied attack vector. DEX aggregators, lending platforms, and yield farms all charge fees on operations. Attackers exploit fee truncation by splitting a single large operation into many small ones, each below the fee threshold. Some protocols counter this with minimum fee amounts, but if the minimum is also vulnerable to manipulation or bypass, the defense is ineffective.

## Detection

```
grep -rn "fee\s*=\|feeRate\|feePercent\|feeBps" --include="*.ts" --include="*.js"
grep -rn "Math\.floor.*fee\|Math\.trunc.*fee\|parseInt.*fee" --include="*.ts" --include="*.js"
grep -rn "amount\s*\*.*\/\s*10000\|amount\s*\*.*\/\s*1000000" --include="*.ts" --include="*.js"
grep -rn "minimumFee\|minFee\|MIN_FEE" --include="*.ts" --include="*.js"
grep -rn "fee.*===\s*0\|fee.*==\s*0" --include="*.ts" --include="*.js"
```

Look for: percentage-based fee calculations using integer division without a minimum fee floor; fee calculations that can produce zero for non-zero amounts; absence of minimum transaction amount checks; splitting-friendly APIs that do not rate-limit or aggregate fees.

## Vulnerable Code

```typescript
// VULNERABLE: Fee rounds to zero for small amounts
function calculateFee(amountLamports: number, feeBps: number): number {
  // feeBps = 30 (0.30%)
  // For amount = 100 lamports: 100 * 30 / 10000 = 0.3, truncated to 0
  return Math.floor(amountLamports * feeBps / 10000);
}

app.post("/api/swap", async (req, res) => {
  const { inputAmount, inputMint, outputMint } = req.body;

  const fee = calculateFee(inputAmount, 30); // 0.30% fee
  const netAmount = inputAmount - fee;

  // Attacker sends 100 small swaps of 100 lamports each
  // Each swap has zero fee, totaling 10,000 lamports moved fee-free
  // A single 10,000-lamport swap would have paid 3 lamports in fees

  await executeSwap(netAmount, inputMint, outputMint);
  return res.json({ fee, netAmount });
});
```

## Secure Code

```typescript
// SECURE: Enforce minimum fee and minimum transaction amount
const MIN_FEE_LAMPORTS = 1n;
const MIN_TRANSACTION_AMOUNT = 1000n;

function calculateFee(amountLamports: bigint, feeBps: bigint): bigint {
  if (amountLamports < MIN_TRANSACTION_AMOUNT) {
    throw new Error(`Amount below minimum: ${MIN_TRANSACTION_AMOUNT}`);
  }

  // Round up (ceiling division) to prevent zero-fee dust attacks
  const feeNumerator = amountLamports * feeBps;
  const fee = (feeNumerator + 9999n) / 10000n; // Ceiling division

  // Enforce minimum fee
  return fee > MIN_FEE_LAMPORTS ? fee : MIN_FEE_LAMPORTS;
}

app.post("/api/swap", async (req, res) => {
  const inputAmount = BigInt(req.body.inputAmount);
  const { inputMint, outputMint } = req.body;

  // Rate-limit to prevent fee avoidance via many small transactions
  await rateLimiter.checkSwapRate(req.user.id);

  const fee = calculateFee(inputAmount, 30n);
  const netAmount = inputAmount - fee;

  if (netAmount <= 0n) {
    return res.status(400).json({ error: "Amount too small after fee" });
  }

  await executeSwap(netAmount, inputMint, outputMint);
  return res.json({
    fee: fee.toString(),
    netAmount: netAmount.toString(),
  });
});
```

## Impact

Fee manipulation through dust-value transactions allows attackers to use protocol services without paying fees, creating a free-riding problem. At scale, this can significantly reduce protocol revenue. In DeFi, zero-fee transactions can be automated to extract value from liquidity pools, perform arbitrage without cost, or grief the protocol's economic model. If fee income supports protocol operations (validators, liquidity providers, stakers), fee avoidance directly harms these stakeholders.

## References

- CWE-682: Incorrect Calculation — https://cwe.mitre.org/data/definitions/682.html
- SlowMist: Solana Smart Contract Security Best Practices — Loss of precision section
- Sec3: Understanding Arithmetic Overflow/Underflows — Division truncation and precision loss — https://www.sec3.dev/blog/understanding-arithmetic-overflow-underflows-in-rust-and-solana-smart-contracts
- DeFi audit reports: Multiple protocols found vulnerable to dust-amount fee avoidance
