# OC-148: Webhook Timing Attack in Signature Comparison

**Category:** API & Network
**Severity:** MEDIUM
**Auditors:** API-04
**CWE:** CWE-208
**OWASP:** API2:2023 - Broken Authentication

## Description

A timing attack against webhook signature verification exploits the fact that standard string comparison operators (`===`, `==`, `strcmp`) return early on the first differing byte. By measuring the time taken to compare a forged signature against the correct one, an attacker can determine how many leading bytes match and progressively reconstruct the valid signature byte by byte.

When a server uses `if (computedSignature === providedSignature)` to verify a webhook HMAC, the comparison returns `false` as soon as it finds the first non-matching character. A signature that matches the first 10 bytes takes slightly longer to compare than one that matches 0 bytes. By sending thousands of requests with different signature prefixes and measuring response times with microsecond precision, an attacker can reconstruct the full HMAC output without knowing the secret key.

While this attack requires high-precision timing measurements and many requests, it has been demonstrated to be practical in both local network and same-datacenter scenarios. The Node.js crypto module provides `crypto.timingSafeEqual()` specifically to prevent this class of attack, and every major security library recommends using it for HMAC comparison. Despite this, many custom webhook verification implementations use `===` because it appears correct and produces the right result.

## Detection

```
# String equality comparison on signatures/HMACs
grep -rn "===.*signature\|signature.*===\|===.*hmac\|hmac.*===" --include="*.ts" --include="*.js"
# String comparison operators near crypto operations
grep -rn "\.digest(" --include="*.ts" --include="*.js" -A3 | grep "===\|==\|!="
# Missing timingSafeEqual
grep -rn "hmac\|signature\|hash" --include="*.ts" --include="*.js" | grep -v "timingSafeEqual"
# Correct usage (should exist)
grep -rn "timingSafeEqual" --include="*.ts" --include="*.js"
```

## Vulnerable Code

```typescript
import express from 'express';
import crypto from 'crypto';

app.post('/api/webhooks/payment',
  express.raw({ type: 'application/json' }),
  (req, res) => {
    const providedSignature = req.headers['x-webhook-signature'] as string;

    const computedSignature = crypto
      .createHmac('sha256', process.env.WEBHOOK_SECRET)
      .update(req.body)
      .digest('hex');

    // VULNERABLE: Standard string comparison is not constant-time
    // Returns faster when fewer leading bytes match
    if (computedSignature !== providedSignature) {
      return res.status(401).json({ error: 'Invalid signature' });
    }

    // Also VULNERABLE: Using Buffer.compare (returns early on mismatch)
    // if (Buffer.from(computedSignature).compare(Buffer.from(providedSignature)) !== 0)

    const event = JSON.parse(req.body.toString());
    processEvent(event);
    res.json({ received: true });
  },
);
```

## Secure Code

```typescript
import express from 'express';
import crypto from 'crypto';

app.post('/api/webhooks/payment',
  express.raw({ type: 'application/json' }),
  (req, res) => {
    const providedSignature = req.headers['x-webhook-signature'] as string;

    if (!providedSignature) {
      return res.status(401).json({ error: 'Missing signature' });
    }

    const computedSignature = crypto
      .createHmac('sha256', process.env.WEBHOOK_SECRET)
      .update(req.body)
      .digest('hex');

    // SECURE: Convert to equal-length buffers, then constant-time compare
    const providedBuffer = Buffer.from(providedSignature, 'utf-8');
    const computedBuffer = Buffer.from(computedSignature, 'utf-8');

    // Ensure equal length before comparison (timingSafeEqual requires it)
    if (providedBuffer.length !== computedBuffer.length) {
      return res.status(401).json({ error: 'Invalid signature' });
    }

    if (!crypto.timingSafeEqual(computedBuffer, providedBuffer)) {
      return res.status(401).json({ error: 'Invalid signature' });
    }

    const event = JSON.parse(req.body.toString());
    processEvent(event);
    res.json({ received: true });
  },
);
```

## Impact

A successful timing attack against webhook signature verification allows an attacker to reconstruct a valid HMAC signature without knowing the webhook secret, forge arbitrary webhook events that pass signature verification, and achieve the same impact as having no signature verification at all (see OC-144). While the attack requires statistical precision and many requests, it is practical in low-latency environments and has been demonstrated in academic research and penetration tests.

## References

- CWE-208: Observable Timing Discrepancy
- Node.js crypto.timingSafeEqual documentation: https://nodejs.org/api/crypto.html#cryptotimingsafeequala-b
- "Most Webhook Signatures Are Broken" (2026): https://medium.com/@yusufhansacak/most-webhook-signatures-are-broken-4ad00acfb755
- OWASP: Timing attacks on HMAC comparison
