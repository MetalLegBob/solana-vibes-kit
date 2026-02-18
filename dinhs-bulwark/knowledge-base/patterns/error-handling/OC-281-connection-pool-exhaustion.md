# OC-281: Connection Pool Exhaustion

**Category:** Error Handling & Resilience
**Severity:** MEDIUM
**Auditors:** ERR-03
**CWE:** CWE-400 (Uncontrolled Resource Consumption)
**OWASP:** A10:2025 -- Mishandling of Exceptional Conditions

## Description

Connection pool exhaustion occurs when all connections in a database connection pool are in use and no new connections can be acquired, causing all subsequent database operations to hang or fail. This can happen organically under high load, but it can also be induced by an attacker who triggers slow queries, holds connections open via long-running requests, or exploits connection leaks.

The insidious aspect of pool exhaustion is that it manifests as a total application freeze even when the database itself is healthy. CPU is idle, memory is available, the database has spare capacity -- but the application cannot obtain a connection from the pool. This "silent outage" pattern makes it extremely difficult to diagnose in real time. A Substack post on connection pool exhaustion documented this as "the most insidious failure in distributed systems because it looks invisible until it destroys everything."

CVE-2025-14969 in Hibernate Reactive demonstrated a denial-of-service vulnerability via database connection pool exhaustion. The ChatterBot project (GHSA-v4w8-49pv-mf72) had a similar vulnerability. Sequelize GitHub issue #17535 documented persistent pool exhaustion after a MySQL 8 upgrade where connections were not being properly released. The common root causes are: connections not released after errors, missing connection timeouts, slow queries holding connections too long, and missing `connectionTimeoutMillis` configuration (defaulting to "wait forever").

## Detection

```
grep -rn "new Pool\|createPool\|connectionPool\|pool:" --include="*.ts" --include="*.js"
grep -rn "max:\s*\d\|connectionLimit\|pool_size" --include="*.ts" --include="*.js"
grep -rn "connectionTimeout\|acquireTimeout\|idleTimeout" --include="*.ts" --include="*.js"
grep -rn "pool\.query\|pool\.connect\|getConnection" --include="*.ts" --include="*.js" -A 10 | grep -v "release\|end\|finally"
```

Look for: pool creation without timeout configuration, queries without connection release in `finally` blocks, missing `connectionTimeoutMillis` or `acquireTimeout`, pool max size set too high (exhausting DB connections) or too low (bottlenecking the application).

## Vulnerable Code

```typescript
import { Pool } from "pg";

// VULNERABLE: No connection timeout, no idle timeout, no query timeout
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  // No connectionTimeoutMillis -- waits forever for a connection
  // No idleTimeoutMillis -- idle connections never released
  // No statement_timeout -- slow queries hold connections indefinitely
});

// VULNERABLE: Connection leak on error path
async function getUserOrders(userId: string) {
  const client = await pool.connect();
  // If the query throws, the client is never released
  const result = await client.query(
    "SELECT * FROM orders WHERE user_id = $1",
    [userId]
  );
  client.release(); // Never reached if query throws
  return result.rows;
}

// VULNERABLE: Long-running operation holds connection
async function generateReport(params: ReportParams) {
  const client = await pool.connect();
  // This query might take minutes, blocking a pool connection the entire time
  const data = await client.query(
    "SELECT * FROM transactions WHERE created_at > $1",
    [params.startDate]
  );
  const report = await formatReport(data.rows); // CPU-heavy, still holding connection
  client.release();
  return report;
}
```

## Secure Code

```typescript
import { Pool } from "pg";

// SECURE: Comprehensive pool configuration with timeouts
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,                        // Max connections per Node.js process
  min: 2,                         // Keep 2 idle connections warm
  connectionTimeoutMillis: 5_000, // Fail fast: 5s to acquire connection
  idleTimeoutMillis: 30_000,      // Release idle connections after 30s
  maxUses: 7500,                  // Recycle connections after 7500 queries
  statement_timeout: 30_000,      // Kill queries running longer than 30s
});

// Monitor pool health
pool.on("error", (err) => {
  logger.error("Unexpected pool error", { error: err.message });
});

setInterval(() => {
  metrics.gauge("db.pool.total", pool.totalCount);
  metrics.gauge("db.pool.idle", pool.idleCount);
  metrics.gauge("db.pool.waiting", pool.waitingCount);
}, 5000);

// SECURE: Always release connections in finally block
async function getUserOrders(userId: string) {
  const client = await pool.connect();
  try {
    const result = await client.query(
      "SELECT * FROM orders WHERE user_id = $1",
      [userId]
    );
    return result.rows;
  } finally {
    client.release(); // Always releases, even on error
  }
}

// SECURE: Use pool.query() for simple queries (auto-release)
async function getUser(userId: string) {
  // pool.query() automatically acquires, executes, and releases
  const result = await pool.query(
    "SELECT * FROM users WHERE id = $1",
    [userId]
  );
  return result.rows[0];
}

// SECURE: Stream large results instead of holding connections
async function generateReport(params: ReportParams) {
  const client = await pool.connect();
  try {
    const cursor = client.query(
      new Cursor("SELECT * FROM transactions WHERE created_at > $1", [params.startDate])
    );
    const rows: any[] = [];
    let batch;
    while ((batch = await cursor.read(100)).length > 0) {
      rows.push(...batch);
    }
    await cursor.close();
    return rows;
  } finally {
    client.release();
  }
}
```

## Impact

Connection pool exhaustion causes a complete application denial of service: all requests that need database access hang until the connection acquisition timeout (or forever, if no timeout is configured). An attacker can trigger this deliberately by sending slow queries, initiating many concurrent requests that each hold a connection, or exploiting endpoints with connection leaks. The application appears frozen while the database remains healthy, making diagnosis difficult.

## References

- CWE-400: Uncontrolled Resource Consumption -- https://cwe.mitre.org/data/definitions/400.html
- CVE-2025-14969: Hibernate Reactive DoS via connection pool exhaustion
- GHSA-v4w8-49pv-mf72: ChatterBot connection pool exhaustion DoS
- Sequelize #17535: Connection pool exhaustion on MySQL 8
- Michal Drozd: "Database Connection Pool Exhaustion: The Silent Outage Trigger"
- node-postgres Pool documentation -- https://node-postgres.com/features/pooling
