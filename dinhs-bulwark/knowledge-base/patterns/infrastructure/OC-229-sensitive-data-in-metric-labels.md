# OC-229: Sensitive Data in Metric Labels

**Category:** Infrastructure
**Severity:** HIGH
**Auditors:** INFRA-05
**CWE:** CWE-200 (Exposure of Sensitive Information to an Unauthorized Actor)
**OWASP:** A01:2021 - Broken Access Control

## Description

Prometheus metrics, StatsD tags, and other observability system labels that include user identifiers, wallet addresses, API keys, email addresses, IP addresses, or other sensitive data create a secondary data store that is rarely protected with the same access controls as the primary application database. When sensitive data appears in metric labels, it is replicated to every component in the observability pipeline: Prometheus, Grafana, alerting systems, and long-term storage backends.

High-cardinality labels (labels with many unique values like user IDs or wallet addresses) also cause performance problems in Prometheus, potentially leading to OOM (Out of Memory) crashes. Beyond performance, these labels mean that anyone with access to the metrics dashboard (which is often broadly shared across engineering teams) can see sensitive user data.

In web3 applications, wallet addresses in metric labels can be correlated with transaction patterns to deanonymize users. In financial applications, including account numbers or transaction amounts in metric labels creates regulatory compliance issues (PCI DSS, GDPR, SOX).

## Detection

```
# Search for metric definitions with sensitive label names
grep -rn "labelNames.*\(user_id\|wallet\|address\|email\|ip\|token\|key\|account\)" **/*.ts **/*.js

# Search for metric label values from user input
grep -rn "\.labels\(.*req\.\|\.labels\(.*user\.\|\.labels\(.*wallet" **/*.ts **/*.js

# Search for metric increment with user data
grep -rn "\.inc\(.*user\|\.observe\(.*wallet\|\.set\(.*address" **/*.ts **/*.js

# Search for sensitive data in custom metrics
grep -rn "new Counter\|new Histogram\|new Gauge\|new Summary" -A5 **/*.ts **/*.js | grep -i "user\|wallet\|email\|address\|ip"

# Search for Prometheus recording rules with sensitive labels
grep -rn "record:\|expr:" **/prometheus*.yml | grep -i "user\|wallet\|email"
```

## Vulnerable Code

```typescript
// metrics.ts - sensitive data in labels
import promClient from "prom-client";

const httpRequestDuration = new promClient.Histogram({
  name: "http_request_duration_seconds",
  help: "HTTP request duration",
  labelNames: [
    "method",
    "route",
    "status",
    "user_id",        // PII in metrics
    "wallet_address", // Deanonymization risk
    "ip_address",     // GDPR violation
  ],
});

const transactionCounter = new promClient.Counter({
  name: "transactions_total",
  help: "Total transactions",
  labelNames: [
    "type",
    "from_wallet",    // Sensitive wallet address
    "to_wallet",      // Sensitive wallet address
    "amount",         // Financial data in metrics
  ],
});

// Usage in middleware
app.use((req, res, next) => {
  const end = httpRequestDuration.startTimer();
  res.on("finish", () => {
    end({
      method: req.method,
      route: req.route?.path || req.path,
      status: res.statusCode,
      user_id: req.user?.id,              // PII leaked to metrics
      wallet_address: req.user?.wallet,    // Wallet leaked to Prometheus
      ip_address: req.ip,                  // IP address in metrics
    });
  });
  next();
});
```

## Secure Code

```typescript
// metrics.ts - anonymized labels
import promClient from "prom-client";
import crypto from "crypto";

const httpRequestDuration = new promClient.Histogram({
  name: "http_request_duration_seconds",
  help: "HTTP request duration",
  labelNames: [
    "method",
    "route",
    "status",
    "user_tier",  // Aggregated: "free", "premium", "enterprise"
  ],
  // Limit cardinality
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 5],
});

const transactionCounter = new promClient.Counter({
  name: "transactions_total",
  help: "Total transactions",
  labelNames: [
    "type",
    "amount_bucket",  // Bucketed: "small", "medium", "large"
  ],
});

// Helper to bucket amounts (never expose exact values)
function amountBucket(amount: number): string {
  if (amount < 100) return "small";
  if (amount < 10000) return "medium";
  return "large";
}

// Usage in middleware - no PII in labels
app.use((req, res, next) => {
  const end = httpRequestDuration.startTimer();
  res.on("finish", () => {
    end({
      method: req.method,
      route: req.route?.path || "unknown",
      status: res.statusCode,
      user_tier: req.user?.tier || "anonymous",
    });
  });
  next();
});
```

## Impact

Sensitive data in metric labels results in:
- PII exposure to anyone with access to Grafana or Prometheus
- Wallet address deanonymization by correlating metrics with blockchain data
- Regulatory non-compliance (GDPR right to erasure cannot apply to metric stores)
- PCI DSS violations if payment data appears in metrics
- High-cardinality labels causing Prometheus OOM and service outages
- Data retained indefinitely in metric storage backends
- Broad access: operations teams see data meant only for the application

## References

- Aqua Security: Prometheus instances leaking sensitive information (December 2024)
- CWE-200: https://cwe.mitre.org/data/definitions/200.html
- Prometheus Best Practices: "Do not use labels to store dimensions with high cardinality"
- GDPR Article 17: Right to erasure and its implications for observability data
- Grafana: "Securing Grafana" documentation
- PCI DSS Requirement 3: Protect stored cardholder data
