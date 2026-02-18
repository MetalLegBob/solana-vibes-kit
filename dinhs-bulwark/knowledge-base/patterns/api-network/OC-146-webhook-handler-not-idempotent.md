# OC-146: Webhook Handler Not Idempotent

**Category:** API & Network
**Severity:** MEDIUM
**Auditors:** API-04
**CWE:** CWE-841
**OWASP:** API8:2023 - Security Misconfiguration

## Description

Webhook handlers that are not idempotent produce different results when the same event is delivered multiple times. Webhook providers explicitly state that duplicate deliveries are expected: Stripe documents that "webhook endpoints might occasionally receive the same event more than once," GitHub may retry failed deliveries, and network issues can cause duplicate POST requests. If the handler does not guard against duplicates, each delivery triggers the same business action again.

Non-idempotent webhook handlers are a business logic vulnerability, not just a reliability issue. An attacker who can replay a single valid webhook event (see OC-145) can exploit non-idempotent handlers to multiply its effect. Even without an attacker, legitimate webhook retries from the provider can cause double payments, double account credits, or duplicate order fulfillment.

The most common failure pattern is processing a `payment_intent.succeeded` event by crediting a user's account balance without checking whether that specific event has already been processed. If the webhook is delivered three times (which Stripe's retry logic will do if the first two deliveries fail or timeout), the user receives three credits for one payment.

## Detection

```
# Webhook handlers without idempotency checks
grep -rn "webhook\|hook" --include="*.ts" --include="*.js" | grep -i "post\|handler\|process"
# Missing event ID tracking
grep -rn "event\.id\|eventId\|idempoten\|processed\|dedup" --include="*.ts" --include="*.js"
# Financial operations in webhook handlers
grep -rn "credit\|debit\|transfer\|balance\|fulfill\|provision\|activate" --include="*.ts" --include="*.js"
# Database operations without upsert or conflict handling
grep -rn "\.create(\|\.insert(\|INSERT INTO" --include="*.ts" --include="*.js" | grep -i "webhook\|event\|hook"
```

## Vulnerable Code

```typescript
app.post('/api/webhooks/stripe',
  express.raw({ type: 'application/json' }),
  async (req, res) => {
    const event = stripe.webhooks.constructEvent(
      req.body,
      req.headers['stripe-signature'],
      process.env.STRIPE_WEBHOOK_SECRET,
    );

    // VULNERABLE: No idempotency check -- duplicate deliveries process multiple times
    switch (event.type) {
      case 'payment_intent.succeeded':
        const payment = event.data.object;
        // Credits user balance EVERY time this event is received
        await db.query(
          'UPDATE accounts SET balance = balance + $1 WHERE user_id = $2',
          [payment.amount, payment.metadata.userId],
        );
        break;

      case 'customer.subscription.created':
        // Creates a new subscription record each time
        await db.query(
          'INSERT INTO subscriptions (user_id, plan, status) VALUES ($1, $2, $3)',
          [event.data.object.customer, event.data.object.plan.id, 'active'],
        );
        break;
    }

    res.json({ received: true });
  },
);
```

## Secure Code

```typescript
app.post('/api/webhooks/stripe',
  express.raw({ type: 'application/json' }),
  async (req, res) => {
    const event = stripe.webhooks.constructEvent(
      req.body,
      req.headers['stripe-signature'],
      process.env.STRIPE_WEBHOOK_SECRET,
    );

    // SECURE: Check if this event has already been processed
    const alreadyProcessed = await db.query(
      'SELECT 1 FROM processed_events WHERE event_id = $1',
      [event.id],
    );
    if (alreadyProcessed.rows.length > 0) {
      return res.json({ received: true, duplicate: true });
    }

    // SECURE: Process within a transaction with idempotency record
    await db.transaction(async (tx) => {
      // Record the event first (unique constraint on event_id)
      await tx.query(
        'INSERT INTO processed_events (event_id, type, processed_at) VALUES ($1, $2, NOW())',
        [event.id, event.type],
      );

      switch (event.type) {
        case 'payment_intent.succeeded':
          const payment = event.data.object;
          // Idempotent: only processes if event hasn't been recorded
          await tx.query(
            'UPDATE accounts SET balance = balance + $1 WHERE user_id = $2',
            [payment.amount, payment.metadata.userId],
          );
          break;

        case 'customer.subscription.created':
          // Upsert: handles duplicates gracefully
          await tx.query(
            `INSERT INTO subscriptions (stripe_sub_id, user_id, plan, status)
             VALUES ($1, $2, $3, $4)
             ON CONFLICT (stripe_sub_id) DO NOTHING`,
            [event.data.object.id, event.data.object.customer, event.data.object.plan.id, 'active'],
          );
          break;
      }
    });

    res.json({ received: true });
  },
);
```

## Impact

Non-idempotent webhook handlers allow duplicate financial credits or debits (double-charging or double-crediting), duplicate resource provisioning (multiple subscriptions, licenses, or accounts), duplicate notification delivery (email/SMS spam), data inconsistency in databases through duplicate records, and amplification of replay attack damage (see OC-145). In payment processing, this directly translates to financial loss.

## References

- CWE-841: Improper Enforcement of Behavioral Workflow
- Stripe: Handle duplicate events: https://docs.stripe.com/webhooks#handle-duplicate-events
- OWASP API8:2023 - Security Misconfiguration
- Webhook Security Implementation Workflow: https://inventivehq.com/blog/webhook-security-implementation-workflow
