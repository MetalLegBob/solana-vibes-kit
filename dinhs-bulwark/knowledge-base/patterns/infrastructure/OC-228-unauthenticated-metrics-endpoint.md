# OC-228: Unauthenticated Metrics Endpoint

**Category:** Infrastructure
**Severity:** MEDIUM
**Auditors:** INFRA-05
**CWE:** CWE-306 (Missing Authentication for Critical Function)
**OWASP:** A07:2021 - Identification and Authentication Failures

## Description

Prometheus metrics endpoints (`/metrics`), health check endpoints (`/health`, `/healthz`), and status pages exposed without authentication leak operational data that attackers use for reconnaissance. Aqua Security's 2024 research discovered over 296,000 exposed Prometheus instances, many leaking credentials, API keys, and internal service topology through metric labels and endpoint responses.

Metrics endpoints commonly expose: request rates and error patterns (revealing when the system is under stress), database connection pool statistics, memory and CPU utilization, internal service hostnames and ports, HTTP endpoint paths and response codes, queue depths and consumer lag, and custom business metrics (user counts, transaction volumes). This information enables targeted attacks: an attacker who knows which endpoints return 500 errors can focus on those; an attacker who sees database connection exhaustion patterns can time a DoS attack.

In Kubernetes environments, Prometheus often scrapes metrics from all pods via service discovery, and the Prometheus server itself exposes a web UI with full query capabilities. If this UI is accessible without authentication (the default configuration), any attacker on the network can query all collected metrics.

## Detection

```
# Search for metrics endpoints without auth middleware
grep -rn "app\.\(get\|use\).*\/metrics\|app\.\(get\|use\).*\/health" **/*.ts **/*.js | grep -v "auth\|middleware\|protect"

# Search for Prometheus client setup
grep -rn "prom-client\|prometheus\|collectDefaultMetrics" **/*.ts **/*.js

# Search for exposed metrics port in Docker/Kubernetes
grep -rn "EXPOSE.*\(9090\|9100\|9091\)" **/Dockerfile*
grep -rn "containerPort.*\(9090\|9100\|9091\)" **/*.yml **/*.yaml

# Search for Prometheus configuration
grep -rn "metrics_path\|scrape_configs" **/prometheus*.yml **/*.yml

# Search for metrics in nginx/reverse proxy (should be blocked externally)
grep -rn "location.*/metrics\|location.*/health" **/nginx*.conf **/*.conf
```

## Vulnerable Code

```typescript
// server.ts - metrics exposed without auth
import express from "express";
import promClient from "prom-client";

const app = express();

// Collect default metrics
promClient.collectDefaultMetrics();

// Custom business metric
const txCounter = new promClient.Counter({
  name: "transactions_total",
  help: "Total transactions processed",
  labelNames: ["type", "wallet_address", "status"],
});

// Metrics endpoint with no authentication
app.get("/metrics", async (req, res) => {
  res.set("Content-Type", promClient.register.contentType);
  res.end(await promClient.register.metrics());
});

// Health endpoint leaking internals
app.get("/health", async (req, res) => {
  res.json({
    status: "ok",
    database: await checkDatabase(),
    redis: await checkRedis(),
    version: process.env.APP_VERSION,
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    env: process.env.NODE_ENV,  // Leaks environment info
  });
});
```

## Secure Code

```typescript
// server.ts - metrics on separate internal port with auth
import express from "express";
import promClient from "prom-client";

const app = express();       // Public application
const internal = express();  // Internal metrics/health

promClient.collectDefaultMetrics();

// Metrics on separate port, not exposed externally
internal.get("/metrics", async (req, res) => {
  // Optional: bearer token auth for metrics
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (token !== process.env.METRICS_TOKEN) {
    return res.status(401).end();
  }
  res.set("Content-Type", promClient.register.contentType);
  res.end(await promClient.register.metrics());
});

// Health endpoint: minimal information
app.get("/health", (req, res) => {
  res.json({ status: "ok" });  // No internals exposed
});

// Detailed health on internal port only
internal.get("/health/detailed", async (req, res) => {
  res.json({
    database: await checkDatabase(),
    redis: await checkRedis(),
  });
});

// Public app on port 3000, metrics on 9090 (internal only)
app.listen(3000);
internal.listen(9090, "127.0.0.1");  // Bind to localhost only
```

```yaml
# kubernetes - NetworkPolicy to restrict metrics access
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-prometheus-only
spec:
  podSelector:
    matchLabels:
      app: myapp
  ingress:
    - from:
        - podSelector:
            matchLabels:
              app: prometheus
      ports:
        - port: 9090
```

## Impact

An attacker who accesses unauthenticated metrics endpoints can:
- Enumerate internal service topology, hostnames, and ports
- Discover API endpoints and their error rates (targeting vulnerable ones)
- Extract credentials or tokens from metric labels
- Determine system capacity and plan resource exhaustion attacks
- Monitor business metrics (user counts, transaction volumes) for competitive intelligence
- In Prometheus deployments, query historical data across all services

## References

- Aqua Security: "300,000+ Prometheus Servers and Exporters Exposed to DoS Attacks" (December 2024)
- CWE-306: https://cwe.mitre.org/data/definitions/306.html
- Prometheus Security Model: https://prometheus.io/docs/operating/security/
- OWASP: Sensitive Data Exposure via metrics endpoints
- Criminal IP: "Securing Prometheus Instances: Mitigating Risks from an Expanded Attack Surface"
