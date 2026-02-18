# OC-311: Negative Amount Handling (Credit Instead of Debit)

**Category:** Business Logic
**Severity:** CRITICAL
**Auditors:** LOGIC-02
**CWE:** CWE-20 (Improper Input Validation), CWE-839 (Numeric Range Comparison Without Minimum Check)
**OWASP:** A04:2021 – Insecure Design

## Description

This vulnerability occurs when a financial operation that should only debit (subtract from) an account accepts a negative amount, causing it to credit (add to) the account instead. This is the critical-severity cousin of OC-301 (negative quantity), specifically focused on the reversal of fund flows rather than just invalid input.

The key distinction from OC-301 is the direct financial impact: where a negative quantity in a shopping cart may reduce the total, a negative amount in a transfer, withdrawal, or payment endpoint directly reverses the flow of funds. Submitting a withdrawal of `-$500` credits $500 to the attacker's account. Submitting a payment of `-$100` generates a $100 refund instead of a charge. This is compounded when the system also debits the target account, effectively stealing from the recipient.

In Solana/DeFi applications, this manifests in off-chain services that construct transaction instructions. If a withdrawal API accepts a negative amount parameter and the backend signs a transfer instruction with that value, the on-chain program may interpret the instruction differently. Many Solana programs use `u64` for amounts (which cannot be negative), but the off-chain TypeScript code often uses `number` or `string` that can represent negative values. The vulnerability lives in the gap between off-chain input processing and on-chain execution.

## Detection

```
grep -rn "withdraw\|debit\|charge\|payment" --include="*.ts" --include="*.js" | grep "amount\|value"
grep -rn "amount\s*[<>]=?\s*0" --include="*.ts" --include="*.js"
grep -rn "Math\.abs\|abs(" --include="*.ts" --include="*.js" | grep -i "amount\|value"
grep -rn "subtract\|minus\|decrement" --include="*.ts" --include="*.js" | grep -v "test\|spec"
grep -rn "transfer\|send\|payout" --include="*.ts" --include="*.js" | grep "amount"
```

Look for: financial endpoints that do not validate amounts are strictly positive; use of `Math.abs()` to "fix" negative amounts (silently accepting bad input); signed integer types where unsigned is appropriate; subtraction operations using user-supplied values without sign validation; absence of `> 0` checks on withdrawal, transfer, and payment amounts.

## Vulnerable Code

```typescript
// VULNERABLE: Negative withdrawal credits the account
app.post("/api/wallet/withdraw", async (req, res) => {
  const { walletId, amount, destinationAddress } = req.body;

  const wallet = await db.wallets.findById(walletId);

  // Check: balance >= amount
  // If amount = -500: balance (100) >= (-500) is TRUE
  if (wallet.balance < amount) {
    return res.status(400).json({ error: "Insufficient balance" });
  }

  // Deduction: balance -= amount
  // If amount = -500: balance = 100 - (-500) = 600 (CREDITS the wallet!)
  wallet.balance -= amount;
  await wallet.save();

  // The attacker's wallet now has $600 instead of $100
  // No actual withdrawal was sent to destinationAddress
  return res.json({ newBalance: wallet.balance });
});

// Also vulnerable: using Math.abs silently accepts negative input
app.post("/api/payment", async (req, res) => {
  const amount = Math.abs(req.body.amount); // Silently converts -500 to 500
  // This masks the bug instead of rejecting the invalid input
  // The attacker intended a different operation, and silent correction
  // can lead to unexpected double-charges or inconsistent state
});
```

## Secure Code

```typescript
import { z } from "zod";

const withdrawSchema = z.object({
  walletId: z.string().uuid(),
  amount: z.number()
    .positive("Withdrawal amount must be positive")
    .max(1_000_000, "Exceeds maximum withdrawal"),
  destinationAddress: z.string().min(32).max(44),
});

app.post("/api/wallet/withdraw", async (req, res) => {
  const parsed = withdrawSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues });
  }

  const { walletId, amount, destinationAddress } = parsed.data;

  // amount is guaranteed positive by schema validation
  const result = await db.transaction(async (trx) => {
    const wallet = await trx("wallets")
      .where("id", walletId)
      .where("user_id", req.user.id)
      .forUpdate()
      .first();

    if (!wallet || wallet.balance < amount) {
      throw new Error("Insufficient balance");
    }

    // Atomic deduction with positive amount
    await trx("wallets")
      .where("id", walletId)
      .where("balance", ">=", amount)
      .decrement("balance", amount);

    return wallet.balance - amount;
  });

  // Queue actual blockchain withdrawal with validated positive amount
  await withdrawalQueue.add({
    walletId,
    amount,
    destinationAddress,
    userId: req.user.id,
  });

  return res.json({ newBalance: result, status: "pending" });
});
```

## Impact

Negative amount acceptance in financial operations enables direct theft of funds. An attacker can credit their account by submitting negative withdrawals, generate refunds via negative payments, and reverse fund flows in transfer operations. This is a critical vulnerability because exploitation is trivial (change a number to negative), the impact is immediate financial loss, and it is often automatable. In DeFi off-chain services, negative amounts can cause the signing of transaction instructions that move funds in the wrong direction.

## References

- CWE-20: Improper Input Validation — https://cwe.mitre.org/data/definitions/20.html
- CWE-839: Numeric Range Comparison Without Minimum Check — https://cwe.mitre.org/data/definitions/839.html
- OWASP Testing Guide: WSTG-BUSL-01 – Test Business Logic Data Validation
- PortSwigger: Business logic vulnerabilities — Domain-specific flaws — https://portswigger.net/web-security/logic-flaws/examples
- HackerOne: Multiple disclosed reports of negative amount exploitation in payment APIs
