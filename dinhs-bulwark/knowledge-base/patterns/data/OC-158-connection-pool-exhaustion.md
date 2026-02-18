# OC-158: Connection Pool Exhaustion Vulnerability

**Category:** Data Security
**Severity:** MEDIUM
**Auditors:** DATA-01
**CWE:** CWE-400 (Uncontrolled Resource Consumption)
**OWASP:** A05:2021 – Security Misconfiguration

## Description

Connection pool exhaustion occurs when an application fails to properly limit, manage, or release database connections, allowing an attacker or abnormal load to consume all available connections. Once the pool is exhausted, the application cannot serve any requests that require database access, resulting in a denial-of-service condition.

This vulnerability commonly arises from missing pool size limits, connection leaks (connections acquired but never released), or lack of idle connection timeouts. In Node.js applications using libraries like `pg`, `mysql2`, or Prisma, the default pool sizes are often small (e.g., 10 connections), making them easy to exhaust. Redis CVE-2025-21605 demonstrated a related pattern: unauthenticated clients could exhaust server memory by causing unlimited output buffer growth, effectively denying service to legitimate clients.

Attackers can trigger pool exhaustion by sending many concurrent requests that each acquire a connection and hold it (via slow queries, long transactions, or simply overwhelming the server). Applications that create new pools per-request rather than sharing a singleton pool are especially vulnerable.

## Detection

```
grep -rn "new Pool\|createPool\|createConnection" --include="*.ts" --include="*.js"
grep -rn "max:\s*\d\+\|connectionLimit\|pool_size\|connection_limit" --include="*.ts" --include="*.js"
grep -rn "idleTimeoutMillis\|idle_in_transaction_session_timeout" --include="*.ts" --include="*.js"
grep -rn "acquire.*timeout\|connectionTimeout" --include="*.ts" --include="*.js"
```

Look for: pool creation without `max` or `connectionLimit`, missing `idleTimeoutMillis`, pools created inside request handlers rather than at module level, connections acquired without `.release()` or `.end()` in finally blocks.

## Vulnerable Code

```typescript
import { Pool } from "pg";
import express from "express";

const app = express();

// VULNERABLE: New pool created per request
app.get("/users/:id", async (req, res) => {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();
  // VULNERABLE: No try/finally — connection leaks on error
  const result = await client.query("SELECT * FROM users WHERE id = $1", [req.params.id]);
  res.json(result.rows[0]);
  // client.release() never called if query throws
});

// VULNERABLE: No pool size limits
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // No max, no idleTimeoutMillis, no connectionTimeoutMillis
});
```

## Secure Code

```typescript
import { Pool, PoolClient } from "pg";
import express from "express";

// SECURE: Singleton pool with proper limits
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,                       // Maximum connections
  idleTimeoutMillis: 30000,      // Close idle connections after 30s
  connectionTimeoutMillis: 5000, // Fail fast if pool exhausted
  allowExitOnIdle: true,         // Allow process to exit when idle
});

pool.on("error", (err) => {
  console.error("Unexpected pool error:", err);
});

const app = express();

app.get("/users/:id", async (req, res) => {
  let client: PoolClient | undefined;
  try {
    client = await pool.connect();
    const result = await client.query("SELECT * FROM users WHERE id = $1", [req.params.id]);
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  } finally {
    client?.release(); // Always release connection
  }
});
```

## Impact

An attacker can deny service to the entire application by exhausting the database connection pool. All subsequent requests that need database access will time out or fail. In microservice architectures, connection exhaustion in one service can cascade to dependent services. If connections leak over time without attacker action, the application will degrade progressively until a restart.

## References

- CVE-2025-21605: Redis DoS via unlimited output buffer growth by unauthenticated client
- CWE-400: Uncontrolled Resource Consumption — https://cwe.mitre.org/data/definitions/400.html
- OWASP A05:2021 – Security Misconfiguration
- node-postgres Pool documentation: https://node-postgres.com/apis/pool
