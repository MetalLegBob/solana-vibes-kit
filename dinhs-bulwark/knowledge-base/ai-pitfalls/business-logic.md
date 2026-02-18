# AI-Generated Code Pitfalls: Business Logic
<!-- Domain: business-logic -->
<!-- Relevant auditors: LOGIC-01, LOGIC-02 -->

## Overview

AI code generators produce business logic code that "works" in the happy path but consistently fails to enforce invariants, validate domain constraints, or handle financial arithmetic correctly. LLMs are trained on tutorial-grade code where floating-point math, unchecked inputs, and sequential-only flows are the norm. The result is code that passes unit tests but contains exploitable business logic flaws: negative amounts accepted, fees that round to zero, race conditions in balance operations, and state machines that exist only in comments.

The core problem is that business logic correctness cannot be inferred from syntax alone -- it requires understanding the domain. AI generators have no concept of "money should never go negative," "a user should not pay less than the product costs," or "two concurrent requests must not both succeed." These are domain invariants that must be explicitly encoded, and AI-generated code almost never encodes them.

## Pitfalls

### AIP-159: Floating-Point Arithmetic for Money
**Frequency:** Frequent
**Why AI does this:** JavaScript's `Number` type is the default numeric type in all training data. When asked to calculate prices, taxes, or totals, AI generates native arithmetic (`price * quantity`, `subtotal * taxRate`) because that is what 99% of tutorial code uses. The model has no concept of IEEE 754 precision limitations or the distinction between "number" and "money."
**What to look for:**
- `price * quantity` or `amount * rate` using native `Number` type
- Absence of BigNumber, Big.js, Decimal.js, or BigInt imports
- `toFixed(2)` used for intermediate calculations (not just display)
- `parseFloat()` applied to monetary amounts from strings

**Vulnerable (AI-generated):**
```typescript
function calculateOrderTotal(items: Array<{ price: number; qty: number }>) {
  const subtotal = items.reduce((sum, item) => sum + item.price * item.qty, 0);
  const tax = subtotal * 0.0825;
  return parseFloat((subtotal + tax).toFixed(2));
  // 0.1 + 0.2 !== 0.3 in IEEE 754
}
```

**Secure (corrected):**
```typescript
import Big from "big.js";

function calculateOrderTotal(items: Array<{ price: string; qty: number }>) {
  const subtotal = items.reduce(
    (sum, item) => sum.plus(new Big(item.price).times(item.qty)),
    new Big(0)
  );
  const tax = subtotal.times("0.0825").round(2, Big.roundHalfEven);
  return subtotal.plus(tax).toFixed(2);
}
```

### AIP-160: No Negative Value Validation on Financial Inputs
**Frequency:** Frequent
**Why AI does this:** AI models generate input validation that checks type (is it a number?) but not domain range (is it positive?). Training data contains far more examples of type-checking than business-rule validation. When an AI writes a transfer endpoint, it validates that `amount` is a number and the account exists, but rarely checks `amount > 0`.
**What to look for:**
- Schema validation with `z.number()` or `Joi.number()` without `.positive()` or `.min(1)`
- `typeof amount === 'number'` without `amount > 0`
- `parseInt(amount)` or `Number(amount)` without range checks
- Arithmetic with user-supplied values where negative flips the operation direction

**Vulnerable (AI-generated):**
```typescript
const schema = z.object({
  fromAccount: z.string(),
  toAccount: z.string(),
  amount: z.number(), // No .positive() — negative amount reverses transfer!
});

app.post("/transfer", async (req, res) => {
  const { fromAccount, toAccount, amount } = schema.parse(req.body);
  await db.accounts.decrement(fromAccount, "balance", amount);
  await db.accounts.increment(toAccount, "balance", amount);
  // amount = -500 credits fromAccount and debits toAccount
});
```

**Secure (corrected):**
```typescript
const schema = z.object({
  fromAccount: z.string().uuid(),
  toAccount: z.string().uuid(),
  amount: z.number().positive().max(1_000_000),
});
```

### AIP-161: Non-Atomic Balance Check and Deduction
**Frequency:** Frequent
**Why AI does this:** AI generates the most readable pattern: fetch the record, check a condition, then update. This read-check-write pattern is the natural way to express business logic in code, and it appears in virtually all tutorial databases. The model does not understand that concurrent requests can interleave between the read and the write, because concurrency is a runtime property invisible in source code.
**What to look for:**
- `findOne` / `findById` followed by an `if` check followed by `.save()` or `.update()`
- Absence of `FOR UPDATE`, `forUpdate()`, or database transactions
- Balance check separated from balance deduction by any asynchronous operation
- Comments like "// check balance" followed later by "// deduct balance"

**Vulnerable (AI-generated):**
```typescript
app.post("/withdraw", async (req, res) => {
  const user = await db.users.findById(req.user.id);
  if (user.balance >= req.body.amount) {
    user.balance -= req.body.amount;
    await user.save();
    // Two concurrent requests both read balance=100, both pass check,
    // both deduct — user withdraws $200 from a $100 balance
    res.json({ balance: user.balance });
  }
});
```

**Secure (corrected):**
```typescript
app.post("/withdraw", async (req, res) => {
  const amount = req.body.amount;
  const result = await db.knex.transaction(async (trx) => {
    const user = await trx("users").where("id", req.user.id).forUpdate().first();
    if (user.balance < amount) throw new Error("Insufficient balance");
    await trx("users").where("id", req.user.id).decrement("balance", amount);
    return user.balance - amount;
  });
  res.json({ balance: result });
});
```

### AIP-162: State Machine Transitions Without Validation
**Frequency:** Common
**Why AI does this:** When generating CRUD APIs, AI creates endpoints like `updateOrderStatus` that accept any status value and write it directly. The model produces simple update operations without encoding the valid transition graph because state machines are a design pattern, not a language feature. LLMs generate the shortest working code, which is a direct field update.
**What to look for:**
- `status = req.body.status` — direct assignment from client input
- `order.update({ status: newStatus })` without checking `order.status`
- Absence of a transition map or valid-states constant
- Multiple endpoints that set status without checking the current value

**Vulnerable (AI-generated):**
```typescript
app.patch("/orders/:id", async (req, res) => {
  const { status } = req.body;
  await db.orders.update(req.params.id, { status });
  // Client can jump from "created" to "delivered" directly
  res.json({ success: true });
});
```

**Secure (corrected):**
```typescript
const TRANSITIONS: Record<string, string[]> = {
  created: ["pending_payment"],
  pending_payment: ["paid", "cancelled"],
  paid: ["shipped"],
  shipped: ["delivered"],
};

app.patch("/orders/:id/transition", async (req, res) => {
  const order = await db.orders.findById(req.params.id);
  const allowed = TRANSITIONS[order.status] || [];
  if (!allowed.includes(req.body.status)) {
    return res.status(409).json({
      error: `Cannot transition from '${order.status}' to '${req.body.status}'`,
    });
  }
  await db.orders.update(req.params.id, { status: req.body.status });
  res.json({ success: true });
});
```

### AIP-163: Client-Sent Prices and Totals Trusted by Backend
**Frequency:** Common
**Why AI does this:** When generating checkout or payment flows, AI creates endpoints that accept `totalPrice`, `discountAmount`, or `finalAmount` from the request body. This is because the model generates code that matches the frontend's request shape — if the frontend computed a total, the backend receives and uses it. The model does not distinguish between display values and source-of-truth values.
**What to look for:**
- `req.body.totalPrice` or `req.body.total` used in charge creation
- `req.body.discountAmount` applied without server-side recalculation
- Stripe/payment amount derived from client-sent values
- Backend endpoints that accept computed values instead of computing them

**Vulnerable (AI-generated):**
```typescript
app.post("/checkout", async (req, res) => {
  const { items, totalPrice, discountAmount } = req.body;
  const charge = await stripe.charges.create({
    amount: Math.round((totalPrice - discountAmount) * 100),
    currency: "usd",
    source: req.body.token,
  });
  // Attacker sends totalPrice: 0.01, gets products for a penny
});
```

**Secure (corrected):**
```typescript
app.post("/checkout", async (req, res) => {
  const { items, couponCode, token } = req.body;
  // Server computes ALL financial values from source data
  const prices = await db.products.findByIds(items.map((i) => i.id));
  const subtotal = items.reduce((sum, item) => {
    const product = prices.find((p) => p.id === item.id);
    return sum + product.priceInCents * item.quantity;
  }, 0);
  const discount = await discountService.calculate(couponCode, subtotal);
  const charge = await stripe.charges.create({
    amount: subtotal - discount,
    currency: "usd",
    source: token,
  });
});
```

### AIP-164: Fee Calculation That Rounds to Zero for Small Amounts
**Frequency:** Occasional
**Why AI does this:** When implementing percentage-based fees, AI uses integer division (`Math.floor(amount * rate / 10000)`) without considering that small amounts produce a zero fee. The model generates the mathematically correct formula but does not add a minimum fee floor because it is optimizing for the general case, not edge cases. Dust-amount fee avoidance is a domain-specific attack that LLMs do not anticipate.
**What to look for:**
- `Math.floor(amount * fee / denominator)` without minimum check
- Fee calculations that can return 0 for non-zero amounts
- Absence of `MIN_FEE`, `minimumFee`, or `Math.max(fee, 1)`
- Percentage fee without minimum transaction amount validation

**Vulnerable (AI-generated):**
```typescript
function calculateFee(amount: number, feeBps: number): number {
  return Math.floor(amount * feeBps / 10000);
  // amount=50, feeBps=30 -> fee=0 (50*30/10000=0.15, floors to 0)
}
```

**Secure (corrected):**
```typescript
function calculateFee(amount: bigint, feeBps: bigint): bigint {
  const MIN_FEE = 1n;
  const fee = (amount * feeBps + 9999n) / 10000n; // Ceiling division
  return fee > MIN_FEE ? fee : MIN_FEE;
}
```

### AIP-165: Coupon Application Without Atomic Uniqueness Check
**Frequency:** Occasional
**Why AI does this:** When generating coupon redemption code, AI writes a check-then-apply pattern: look up the coupon, verify it is valid, apply the discount, then increment the usage count. Each step is a separate database operation without a transaction wrapper. The model produces sequential logic because that is how humans think about the process, but concurrent requests can both pass the validity check before either increments the count.
**What to look for:**
- Coupon `findOne` followed by separate `update` for usage count
- No database transaction wrapping the check-and-apply sequence
- Absence of `FOR UPDATE` or row-level locking on coupon records
- Race condition window between reading coupon state and updating it

**Vulnerable (AI-generated):**
```typescript
app.post("/apply-coupon", async (req, res) => {
  const coupon = await db.coupons.findOne({ code: req.body.code, active: true });
  if (!coupon || coupon.usageCount >= coupon.maxUses) {
    return res.status(400).json({ error: "Invalid coupon" });
  }
  // Race window: concurrent requests both pass the check above
  cart.discount = cart.subtotal * (coupon.percentOff / 100);
  await cart.save();
  coupon.usageCount += 1;
  await coupon.save();
});
```

**Secure (corrected):**
```typescript
app.post("/apply-coupon", async (req, res) => {
  await db.transaction(async (trx) => {
    const claimed = await trx("coupons")
      .where("code", req.body.code)
      .where("active", true)
      .where("usage_count", "<", trx.raw("max_uses"))
      .increment("usage_count", 1);
    if (claimed === 0) throw new Error("Coupon unavailable");
    // Atomic: claim succeeded or failed, no race window
  });
});
```

### AIP-166: Token Amount Converted to Number (Precision Loss)
**Frequency:** Common
**Why AI does this:** When working with Solana token amounts (stored as `u64` lamports or smallest-unit integers), AI converts them to JavaScript `Number` for arithmetic using `Number()` or `parseInt()`. The model does not realize that `u64::MAX` (18.4 quintillion) far exceeds `Number.MAX_SAFE_INTEGER` (9 quadrillion). For tokens with 9+ decimals, even moderate holdings can exceed safe integer range.
**What to look for:**
- `Number(lamports)` or `parseInt(balance.toString())`
- `amount.toNumber()` on BN/BigNumber objects without safety checks
- Arithmetic on token amounts using native `*`, `+`, `-` operators
- `/ 1e9` or `/ Math.pow(10, decimals)` on large values

**Vulnerable (AI-generated):**
```typescript
const balance = await connection.getBalance(wallet);
const solAmount = balance / 1e9; // balance is number, but getBalance returns number
// For most cases this works, but intermediate calculations may overflow:
const rewardPool = Number(totalStaked) * Number(rewardRate) / Number(precision);
// If totalStaked = 5_000_000_000_000_000n, Number() loses precision
```

**Secure (corrected):**
```typescript
const balanceLamports = BigInt(await connection.getBalance(wallet));
const rewardPool = (totalStaked * rewardRate) / precision; // All BigInt
// Convert to display string only at the end
const displayAmount = formatLamports(balanceLamports); // string, not number
```

### AIP-167: Discount That Can Produce Negative Total
**Frequency:** Occasional
**Why AI does this:** When generating discount application logic, AI subtracts the discount from the subtotal without clamping to zero. If the discount exceeds the subtotal (due to fixed-amount coupons, stacking, or percentage rounding), the total goes negative. The model generates `total = subtotal - discount` because that is the obvious formula, without considering that `discount > subtotal` is a possible (and exploitable) state.
**What to look for:**
- `subtotal - discount` without `Math.max(0, ...)` or equivalent
- Discount calculation without cap at subtotal amount
- Multiple discounts applied without aggregate limit check
- No `total >= 0` assertion before proceeding to payment

**Vulnerable (AI-generated):**
```typescript
const subtotal = calculateSubtotal(items);
const discount = coupon.type === "fixed"
  ? coupon.amount
  : subtotal * (coupon.percentOff / 100);
const total = subtotal - discount;
// If coupon.amount = 50 and subtotal = 30, total = -20
// Attacker may receive a $20 credit or refund
await processPayment(total);
```

**Secure (corrected):**
```typescript
const subtotal = calculateSubtotal(items);
const rawDiscount = coupon.type === "fixed"
  ? coupon.amount
  : subtotal * (coupon.percentOff / 100);
const discount = Math.min(rawDiscount, subtotal); // Cap at subtotal
const total = Math.max(0, subtotal - discount);
if (total === 0 && !allowFreeOrders) {
  throw new Error("Order total cannot be zero");
}
await processPayment(total);
```

### AIP-168: Yield/Reward Calculation Without Overflow Protection
**Frequency:** Occasional
**Why AI does this:** When generating staking reward or yield calculation functions, AI uses native arithmetic without considering that `amount * rate * duration` can overflow. The model produces the mathematically correct formula but uses JavaScript `Number` or Rust's `u64` with bare `*` operator. In Rust release mode, overflow silently wraps around. In JavaScript, values above MAX_SAFE_INTEGER silently lose precision.
**What to look for:**
- Multiplication chains: `stake * rate * time / precision`
- `Math.pow(1 + rate, periods)` for compound calculations
- Rust: `a * b * c` without `checked_mul` or `overflow-checks = true`
- Large precision denominators (1e18, 1e9) in division

**Vulnerable (AI-generated):**
```typescript
function calculateReward(staked: number, rateBps: number, seconds: number) {
  return Math.floor(staked * rateBps * seconds / (10000 * 31557600));
  // staked=5e12 * 500 * 31557600 = 7.8e22, exceeds MAX_SAFE_INTEGER
}
```

**Secure (corrected):**
```typescript
function calculateReward(staked: bigint, rateBps: bigint, seconds: bigint): bigint {
  const numerator = staked * rateBps * seconds;
  const denominator = 10000n * 31557600n;
  return numerator / denominator; // BigInt: no overflow, no precision loss
}
```
