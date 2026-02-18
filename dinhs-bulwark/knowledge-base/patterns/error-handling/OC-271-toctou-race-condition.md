# OC-271: TOCTOU Race Condition

**Category:** Error Handling & Resilience
**Severity:** HIGH
**Auditors:** ERR-02
**CWE:** CWE-367 (Time-of-check Time-of-use)
**OWASP:** A10:2025 -- Mishandling of Exceptional Conditions

## Description

A Time-of-Check to Time-of-Use (TOCTOU) race condition occurs when an application checks a condition and then acts on it, but the condition can change between the check and the use. An attacker exploits this gap by modifying the underlying state after the check passes but before the action completes.

In web applications, TOCTOU manifests whenever a check and its corresponding action are not atomic. Common examples include checking a user's permission and then performing the action in separate database queries, verifying a file exists and then reading it, or checking an account balance and then debiting it. CVE-2024-50379 and CVE-2024-56337 in Apache Tomcat demonstrated a critical TOCTOU race condition during JSP compilation on case-insensitive file systems, enabling remote code execution. CVE-2026-20796 in Mattermost exposed a TOCTOU vulnerability in channel membership checks. PortSwigger's Web Security Academy has designated race conditions as a first-class vulnerability category for web application testing.

The race window in web applications is often measured in milliseconds, but tools like Burp Suite's single-packet attack technique and HTTP/2 multiplexing can reliably exploit these windows by delivering multiple requests simultaneously.

## Detection

```
grep -rn "if.*await.*\n.*await" --include="*.ts" --include="*.js"
grep -rn "findOne\|findById\|count" --include="*.ts" --include="*.js" -A 5 | grep "update\|delete\|insert\|save"
grep -rn "exists\|has\|includes" --include="*.ts" --include="*.js" -A 3 | grep "create\|write\|set"
grep -rn "SELECT.*FROM" --include="*.ts" --include="*.js" -A 5 | grep "UPDATE\|INSERT\|DELETE"
```

Look for: separate check-then-act database operations not wrapped in a transaction, file existence checks followed by file operations, permission checks followed by state mutations in separate statements.

## Vulnerable Code

```typescript
import { Request, Response } from "express";

// VULNERABLE: Check and act are separate, non-atomic operations
async function redeemCoupon(req: Request, res: Response) {
  const { couponCode } = req.body;
  const userId = req.user.id;

  // Step 1: CHECK if coupon has already been used by this user
  const existing = await db.query(
    "SELECT id FROM coupon_redemptions WHERE user_id = ? AND coupon_code = ?",
    [userId, couponCode]
  );

  if (existing.length > 0) {
    return res.status(400).json({ error: "Coupon already redeemed" });
  }

  // RACE WINDOW: Between the check above and the insert below,
  // a concurrent request can pass the same check
  const coupon = await db.query(
    "SELECT discount FROM coupons WHERE code = ? AND active = true",
    [couponCode]
  );

  // Step 2: USE -- apply the coupon
  await db.query(
    "INSERT INTO coupon_redemptions (user_id, coupon_code, discount) VALUES (?, ?, ?)",
    [userId, couponCode, coupon[0].discount]
  );

  res.json({ discount: coupon[0].discount });
}
```

## Secure Code

```typescript
import { Request, Response } from "express";

// SECURE: Atomic check-and-act using database constraints + transaction
async function redeemCoupon(req: Request, res: Response) {
  const { couponCode } = req.body;
  const userId = req.user.id;

  const trx = await db.beginTransaction();
  try {
    // Use SELECT ... FOR UPDATE to lock the coupon row
    const coupon = await trx.query(
      "SELECT discount FROM coupons WHERE code = ? AND active = true FOR UPDATE",
      [couponCode]
    );

    if (!coupon.length) {
      await trx.rollback();
      return res.status(400).json({ error: "Invalid or inactive coupon" });
    }

    // INSERT with UNIQUE constraint on (user_id, coupon_code)
    // If a concurrent request already inserted, this throws a duplicate key error
    await trx.query(
      "INSERT INTO coupon_redemptions (user_id, coupon_code, discount) VALUES (?, ?, ?)",
      [userId, couponCode, coupon[0].discount]
    );

    await trx.commit();
    res.json({ discount: coupon[0].discount });
  } catch (error) {
    await trx.rollback();
    if (error.code === "ER_DUP_ENTRY") {
      return res.status(400).json({ error: "Coupon already redeemed" });
    }
    throw error;
  }
}
```

## Impact

An attacker exploiting a TOCTOU race condition can redeem coupons multiple times, bypass one-time-use restrictions, apply discounts repeatedly, or perform any action that is supposed to be limited to a single execution. In financial contexts, this enables double-spending. The PortSwigger research shows these attacks are reliable using modern HTTP/2 single-packet techniques.

## References

- CWE-367: Time-of-check Time-of-use (TOCTOU) -- https://cwe.mitre.org/data/definitions/367.html
- CVE-2024-50379: Apache Tomcat TOCTOU race condition leading to RCE
- CVE-2024-56337: Apache Tomcat TOCTOU incomplete fix for CVE-2024-50379
- CVE-2026-20796: Mattermost TOCTOU race condition
- PortSwigger Web Security Academy: Race Conditions -- https://portswigger.net/web-security/race-conditions
- Facundo Fernandez: Guide to Identifying and Exploiting TOCTOU Race Conditions in Web Applications
