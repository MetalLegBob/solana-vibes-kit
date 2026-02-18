# OC-144: Webhook Signature Not Verified

**Category:** API & Network
**Severity:** HIGH
**Auditors:** API-04
**CWE:** CWE-345
**OWASP:** API2:2023 - Broken Authentication

## Description

Webhook signature verification is the cryptographic proof that an incoming webhook event originated from the claimed sender and was not tampered with in transit. When a webhook endpoint does not verify signatures, any attacker who discovers or guesses the endpoint URL can forge arbitrary events, triggering internal automation, granting unauthorized access, or manipulating financial transactions.

The attack is straightforward: webhook endpoints are publicly accessible HTTP POST endpoints. An attacker sends a crafted POST request with a fake event payload (e.g., `checkout.session.completed` for Stripe, `payment_intent.succeeded`, or `user.verified`). Without signature verification, the server processes it as a legitimate event. In financial contexts, this can directly create fraudulent paid subscriptions, trigger product fulfillment, or credit user accounts.

Every major webhook provider (Stripe, GitHub, Shopify, Twilio, Slack) implements HMAC-SHA256 signatures in a request header. Stripe uses `Stripe-Signature`, GitHub uses `X-Hub-Signature-256`, Shopify uses `X-Shopify-Hmac-SHA256`. Despite this, a 2026 analysis found that "most webhook signatures are broken" due to implementation errors: parsing JSON before verifying the signature (changing the byte representation), using non-constant-time string comparison, or skipping verification entirely in development environments that persist to production.

## Detection

```
# Webhook endpoints
grep -rn "webhook\|hook" --include="*.ts" --include="*.js" | grep -i "route\|post\|app\.\|router\."
# Missing signature verification
grep -rn "webhook" --include="*.ts" --include="*.js" | grep -v "signature\|verify\|hmac\|hash"
# Stripe webhook without constructEvent
grep -rn "stripe.*event\|webhook.*stripe" --include="*.ts" --include="*.js" | grep -v "constructEvent\|verifyHeader"
# Direct JSON parsing without raw body for signature
grep -rn "req\.body" --include="*.ts" --include="*.js" | grep -i "webhook"
```

## Vulnerable Code

```typescript
import express from 'express';

const app = express();
app.use(express.json()); // Parses body before signature can be checked

// VULNERABLE: No signature verification at all
app.post('/api/webhooks/stripe', async (req, res) => {
  const event = req.body;

  // Processing forged events from any sender
  if (event.type === 'checkout.session.completed') {
    await activateSubscription(event.data.object.customer);
  }
  if (event.type === 'payment_intent.succeeded') {
    await creditAccount(event.data.object.metadata.userId, event.data.object.amount);
  }

  res.json({ received: true });
});

// VULNERABLE: Verifying parsed JSON instead of raw bytes
app.post('/api/webhooks/custom', (req, res) => {
  const signature = req.headers['x-signature'];
  const computed = crypto
    .createHmac('sha256', WEBHOOK_SECRET)
    .update(JSON.stringify(req.body)) // WRONG: re-serialized, not raw bytes
    .digest('hex');

  if (signature === computed) { // WRONG: non-constant-time comparison
    processWebhook(req.body);
  }
  res.sendStatus(200);
});
```

## Secure Code

```typescript
import express from 'express';
import Stripe from 'stripe';
import crypto from 'crypto';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const app = express();

// SECURE: Stripe webhook with proper signature verification
// Must use raw body -- NOT parsed JSON
app.post('/api/webhooks/stripe',
  express.raw({ type: 'application/json' }),
  async (req, res) => {
    const signature = req.headers['stripe-signature'] as string;

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(
        req.body,           // Raw bytes, not parsed JSON
        signature,
        process.env.STRIPE_WEBHOOK_SECRET,
      );
    } catch (err) {
      return res.status(400).json({ error: 'Invalid signature' });
    }

    // Only process verified events
    if (event.type === 'checkout.session.completed') {
      await activateSubscription(event.data.object.customer as string);
    }

    res.json({ received: true });
  },
);

// SECURE: Custom webhook with proper HMAC verification
app.post('/api/webhooks/custom',
  express.raw({ type: 'application/json' }),
  (req, res) => {
    const signature = req.headers['x-signature'] as string;
    const computed = crypto
      .createHmac('sha256', WEBHOOK_SECRET)
      .update(req.body) // Raw bytes
      .digest('hex');

    // Constant-time comparison prevents timing attacks
    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(computed))) {
      return res.status(401).json({ error: 'Invalid signature' });
    }

    const event = JSON.parse(req.body.toString());
    processWebhook(event);
    res.json({ received: true });
  },
);
```

## Impact

Without webhook signature verification, attackers can forge payment success events to get free products or subscriptions, trigger account provisioning or privilege escalation through fake user verification events, manipulate business workflows (e.g., fake CI/CD deployment triggers, fraudulent refund events), cause data corruption by injecting events with manipulated payloads, and abuse any automation tied to webhook processing. The impact scales with the sensitivity of the actions triggered by webhook events.

## References

- CWE-345: Insufficient Verification of Data Authenticity
- Stripe webhook signature verification: https://docs.stripe.com/webhooks/signature
- GitHub webhook delivery validation: https://docs.github.com/en/webhooks/using-webhooks/validating-webhook-deliveries
- "Most Webhook Signatures Are Broken" (2026): https://medium.com/@yusufhansacak/most-webhook-signatures-are-broken-4ad00acfb755
- OWASP API Security: Webhook Security Patterns: https://www.pentesttesting.com/webhook-security-best-practices/
