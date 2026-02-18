# OC-283: No Timeout on External API Calls

**Category:** Error Handling & Resilience
**Severity:** MEDIUM
**Auditors:** ERR-03
**CWE:** CWE-400 (Uncontrolled Resource Consumption)
**OWASP:** A10:2025 -- Mishandling of Exceptional Conditions

## Description

When an application makes HTTP requests to external services without configuring timeouts, a slow or unresponsive external service can cause the calling application to hang indefinitely. Each hanging request holds an open socket, consumes memory for the pending response, and in the case of Express.js, occupies a slot in the connection pool or event loop callback queue. Under load, this cascading wait pattern can bring down the entire application.

The critical issue is that most HTTP clients in Node.js have no default timeout. The native `fetch()` API (available since Node.js 18) has no built-in timeout. The popular `axios` library defaults to `timeout: 0` (no timeout). Node.js's native `http.request()` has no default socket timeout. This means that unless a developer explicitly configures timeouts, every outbound HTTP request is a potential hang point.

A 2026 analysis of Node.js timeout best practices documented that "no timeout" should be treated as a bug: DNS lookups can hang, database drivers have very high default connection timeouts, and fetch/axios have no timeout unless explicitly set. The article identified the cascading failure pattern: one slow external service leads to request queuing, connection pool filling, and eventually a full server freeze.

## Detection

```
grep -rn "fetch\(\|axios\.\|http\.request\|https\.request" --include="*.ts" --include="*.js" | grep -v "timeout\|signal\|AbortController"
grep -rn "axios\.create\|axios\.get\|axios\.post" --include="*.ts" --include="*.js" | grep -v "timeout"
grep -rn "new AbortController\|AbortSignal\.timeout" --include="*.ts" --include="*.js"
grep -rn "got\(\|superagent\|node-fetch\|undici" --include="*.ts" --include="*.js" | grep -v "timeout"
```

Look for: `fetch()` calls without `AbortController` or `signal`, `axios` calls without `timeout` config, `http.request()` without socket timeout, absence of `AbortSignal.timeout()`.

## Vulnerable Code

```typescript
import axios from "axios";

// VULNERABLE: No timeout -- if the external API hangs, so does our server
async function getExchangeRate(pair: string): Promise<number> {
  const response = await axios.get(
    `https://api.external-exchange.com/rate/${pair}`
  );
  return response.data.rate;
}

// VULNERABLE: fetch() with no timeout
async function verifyIdentity(userId: string): Promise<boolean> {
  const response = await fetch(
    `https://kyc-provider.example.com/verify/${userId}`,
    { method: "POST", body: JSON.stringify({ userId }) }
  );
  const result = await response.json();
  return result.verified;
}

// VULNERABLE: Chained external calls -- total hang time multiplies
async function processPayment(orderId: string) {
  const fraud = await axios.get(`https://fraud-service.com/check/${orderId}`);
  const payment = await axios.post("https://payment-gateway.com/charge", { orderId });
  const receipt = await axios.post("https://receipt-service.com/generate", { orderId });
  return { fraud, payment, receipt };
}
```

## Secure Code

```typescript
import axios, { AxiosInstance } from "axios";

// SECURE: Create axios instance with default timeouts
const externalApi: AxiosInstance = axios.create({
  timeout: 5_000,                    // 5 second total timeout
  signal: AbortSignal.timeout(10_000), // Hard abort after 10s
});

async function getExchangeRate(pair: string): Promise<number> {
  const response = await externalApi.get(
    `https://api.external-exchange.com/rate/${pair}`
  );
  return response.data.rate;
}

// SECURE: fetch() with AbortController timeout
async function verifyIdentity(userId: string): Promise<boolean> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5_000);

  try {
    const response = await fetch(
      `https://kyc-provider.example.com/verify/${userId}`,
      {
        method: "POST",
        body: JSON.stringify({ userId }),
        signal: controller.signal,
        headers: { "Content-Type": "application/json" },
      }
    );
    const result = await response.json();
    return result.verified;
  } catch (error) {
    if (error.name === "AbortError") {
      logger.warn("KYC verification timed out", { userId });
      throw new Error("Identity verification timed out");
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

// SECURE: Using AbortSignal.timeout() (Node.js 18+)
async function verifyIdentityModern(userId: string): Promise<boolean> {
  const response = await fetch(
    `https://kyc-provider.example.com/verify/${userId}`,
    {
      method: "POST",
      body: JSON.stringify({ userId }),
      signal: AbortSignal.timeout(5_000), // Built-in timeout signal
    }
  );
  return (await response.json()).verified;
}

// SECURE: Chained calls with per-call and total timeout
async function processPayment(orderId: string) {
  const totalTimeout = AbortSignal.timeout(15_000); // 15s total budget

  const fraud = await externalApi.get(
    `https://fraud-service.com/check/${orderId}`,
    { signal: totalTimeout, timeout: 5_000 }
  );
  const payment = await externalApi.post(
    "https://payment-gateway.com/charge",
    { orderId },
    { signal: totalTimeout, timeout: 5_000 }
  );
  const receipt = await externalApi.post(
    "https://receipt-service.com/generate",
    { orderId },
    { signal: totalTimeout, timeout: 5_000 }
  );
  return { fraud, payment, receipt };
}
```

## Impact

Without timeouts, an attacker who controls or can influence an external service (or simply exploits a slow third-party API) can cause the application to accumulate hanging requests. Each hanging request holds memory and an event loop callback. Under sustained load, this exhausts available connections, memory, or file descriptors, causing a full denial of service. This is especially dangerous in microservice architectures where one slow service can cascade failures across the entire system.

## References

- CWE-400: Uncontrolled Resource Consumption -- https://cwe.mitre.org/data/definitions/400.html
- Arunangshu Das: "10 Best Practices for Node.js Timeouts" (2026)
- Node.js AbortSignal.timeout() documentation -- https://nodejs.org/api/globals.html#abortsignaltimeoutdelay
- AppSignal: "How to Use Timeouts in Node.js" -- https://blog.appsignal.com/2023/11/08/how-to-use-timeouts-in-nodejs.html
- OWASP A10:2025 -- Mishandling of Exceptional Conditions
