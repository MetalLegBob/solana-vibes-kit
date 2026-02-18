# OC-145: Webhook Replay Attack (No Timestamp Check)

**Category:** API & Network
**Severity:** MEDIUM
**Auditors:** API-04
**CWE:** CWE-294
**OWASP:** API2:2023 - Broken Authentication

## Description

A webhook replay attack occurs when an attacker intercepts a legitimate, signed webhook delivery and re-sends it to the endpoint at a later time. If the endpoint only verifies the HMAC signature but does not check the timestamp of the event, the replayed request passes signature verification and is processed again. This can trigger duplicate payments, duplicate account activations, repeated privilege grants, or duplicate resource provisioning.

Most webhook providers include a timestamp in the signed payload or a dedicated header to enable replay protection. Stripe includes a `t=` parameter in the `Stripe-Signature` header, GitHub includes a timestamp in the payload, and many custom webhook implementations include an `X-Webhook-Timestamp` header. The receiving server must verify that the timestamp is within an acceptable window (typically 5 minutes) and reject events that fall outside it.

Only 30% of organizations implement replay attack protection according to a 2025 industry survey, despite it being a critical component of webhook security. The gap exists because signature verification feels "secure enough" and timestamp validation requires additional code. In practice, an attacker with network access (via a compromised proxy, log access, or MITM position) can capture signed webhook requests and replay them indefinitely.

## Detection

```
# Webhook handlers with signature check but no timestamp check
grep -rn "hmac\|signature\|verify" --include="*.ts" --include="*.js" | grep -i "webhook"
# Missing timestamp validation
grep -rn "webhook" --include="*.ts" --include="*.js" | grep -v "timestamp\|time\|tolerance\|replay\|expire"
# Stripe webhooks without tolerance
grep -rn "constructEvent" --include="*.ts" --include="*.js"
# Missing idempotency key tracking
grep -rn "webhook.*id\|event.*id\|idempoten" --include="*.ts" --include="*.js"
```

## Vulnerable Code

```typescript
import express from 'express';
import crypto from 'crypto';

app.post('/api/webhooks/payment',
  express.raw({ type: 'application/json' }),
  (req, res) => {
    const signature = req.headers['x-webhook-signature'] as string;
    const timestamp = req.headers['x-webhook-timestamp'] as string;

    // VULNERABLE: Verifies signature but ignores timestamp
    const payload = req.body;
    const computed = crypto
      .createHmac('sha256', WEBHOOK_SECRET)
      .update(payload)
      .digest('hex');

    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(computed))) {
      return res.status(401).end();
    }

    // Timestamp header exists but is never validated
    // Attacker replays a captured request days later and it still works
    const event = JSON.parse(payload.toString());
    processPayment(event); // Payment processed again
    res.json({ received: true });
  },
);
```

## Secure Code

```typescript
import express from 'express';
import crypto from 'crypto';

const TIMESTAMP_TOLERANCE_MS = 5 * 60 * 1000; // 5 minutes
const processedEventIds = new Set<string>(); // In production, use Redis with TTL

app.post('/api/webhooks/payment',
  express.raw({ type: 'application/json' }),
  (req, res) => {
    const signature = req.headers['x-webhook-signature'] as string;
    const timestamp = req.headers['x-webhook-timestamp'] as string;

    // SECURE: Validate timestamp freshness
    const eventTime = parseInt(timestamp, 10) * 1000;
    const now = Date.now();
    if (isNaN(eventTime) || Math.abs(now - eventTime) > TIMESTAMP_TOLERANCE_MS) {
      return res.status(401).json({ error: 'Timestamp out of tolerance' });
    }

    // Include timestamp in HMAC to prevent signature reuse with fake timestamps
    const signedPayload = `${timestamp}.${req.body.toString()}`;
    const computed = crypto
      .createHmac('sha256', WEBHOOK_SECRET)
      .update(signedPayload)
      .digest('hex');

    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(computed))) {
      return res.status(401).json({ error: 'Invalid signature' });
    }

    const event = JSON.parse(req.body.toString());

    // SECURE: Idempotency check prevents duplicate processing
    if (processedEventIds.has(event.id)) {
      return res.json({ received: true, duplicate: true });
    }
    processedEventIds.add(event.id);

    processPayment(event);
    res.json({ received: true });
  },
);
```

## Impact

Webhook replay attacks allow attackers to re-trigger payment processing causing duplicate charges or credits, re-activate expired subscriptions or licenses, duplicate resource provisioning (accounts, credits, tokens), repeat any business action tied to a webhook event, and compound damage over time by replaying the same event repeatedly. In financial systems, replay attacks can directly result in monetary loss.

## References

- CWE-294: Authentication Bypass by Capture-replay
- Stripe signature verification with timestamp tolerance: https://docs.stripe.com/webhooks/signature
- Webhook Security Implementation Workflow: https://inventivehq.com/blog/webhook-security-implementation-workflow
- "Most Webhook Signatures Are Broken" (2026): https://medium.com/@yusufhansacak/most-webhook-signatures-are-broken-4ad00acfb755
