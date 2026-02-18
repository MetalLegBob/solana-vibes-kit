# OC-160: Database User with Excessive Privileges

**Category:** Data Security
**Severity:** MEDIUM
**Auditors:** DATA-01
**CWE:** CWE-250 (Execution with Unnecessary Privileges)
**OWASP:** A01:2021 – Broken Access Control

## Description

Applications that connect to databases using overly permissive accounts (e.g., root, admin, or accounts with GRANT, DROP, or ALL PRIVILEGES) violate the principle of least privilege. If the application is compromised via SQL injection, credential theft, or any other attack vector, the attacker inherits the full privilege set of the database user, turning a limited data access vulnerability into complete database control.

This pattern is extremely common in development environments where developers use the root/admin account for convenience and then deploy with the same credentials. Cloud database services (RDS, Cloud SQL, Atlas) make it easy to create the initial admin user but require deliberate action to create restricted application users. The PostgreSQL JDBC driver vulnerability (CVE-2024-1597) demonstrated how SQL injection through driver-level flaws can escalate impact when the application connects with elevated privileges — an injection that could only read data with a read-only user could drop tables or create backdoor accounts with an admin user.

Database users for application connections should have only SELECT, INSERT, UPDATE, and DELETE permissions on the specific tables they need, with no schema modification, user management, or GRANT capabilities.

## Detection

```
grep -rn "root\|admin\|postgres\|sa\b" --include="*.ts" --include="*.js" --include="*.env"
grep -rn "GRANT ALL\|ALL PRIVILEGES\|SUPERUSER" --include="*.sql" --include="*.ts"
grep -rn "user.*['\"]root\|user.*['\"]admin\|user.*['\"]postgres" --include="*.ts" --include="*.js"
grep -rn "DB_USER\|DATABASE_USER\|PGUSER" --include="*.env" --include="*.env.*"
```

Look for: database connection configurations using `root`, `admin`, `postgres`, or `sa` as the username. Migration scripts that grant ALL PRIVILEGES to the application user. Absence of separate database users for application vs. migration operations.

## Vulnerable Code

```typescript
import { Pool } from "pg";

// VULNERABLE: Application connects as superuser
const pool = new Pool({
  host: process.env.DB_HOST,
  user: "postgres",          // Superuser account
  password: process.env.DB_PASSWORD,
  database: "production",
});

// VULNERABLE: Single account for all operations
async function handleRequest(userId: string) {
  // This account can DROP tables, CREATE users, ALTER schemas
  const result = await pool.query("SELECT * FROM users WHERE id = $1", [userId]);
  return result.rows[0];
}
```

## Secure Code

```typescript
import { Pool } from "pg";

// SECURE: Application connects with least-privilege user
const appPool = new Pool({
  host: process.env.DB_HOST,
  user: "app_readonly",     // Limited to SELECT on specific tables
  password: process.env.DB_READONLY_PASSWORD,
  database: "production",
  ssl: { rejectUnauthorized: true },
});

// Separate pool for write operations with slightly more permissions
const writePool = new Pool({
  host: process.env.DB_HOST,
  user: "app_writer",       // Limited to SELECT, INSERT, UPDATE on specific tables
  password: process.env.DB_WRITER_PASSWORD,
  database: "production",
  ssl: { rejectUnauthorized: true },
});

// SQL to create the restricted user (run by DBA, not application):
// CREATE ROLE app_readonly LOGIN PASSWORD '...';
// GRANT SELECT ON users, orders, products TO app_readonly;
// CREATE ROLE app_writer LOGIN PASSWORD '...';
// GRANT SELECT, INSERT, UPDATE ON users, orders TO app_writer;
```

## Impact

If the application is compromised, an attacker with superuser database access can read all tables across all schemas, modify or delete any data, create backdoor accounts, exfiltrate the entire database, and potentially execute operating system commands (via PostgreSQL `COPY` or MySQL `INTO OUTFILE`). With a least-privilege user, the blast radius of a compromise is contained to the specific tables and operations granted.

## References

- CVE-2024-1597: PostgreSQL JDBC SQL injection — impact amplified by connection privileges
- CWE-250: Execution with Unnecessary Privileges — https://cwe.mitre.org/data/definitions/250.html
- OWASP A01:2021 – Broken Access Control
- PostgreSQL GRANT documentation: https://www.postgresql.org/docs/current/sql-grant.html
- AWS RDS best practices: Creating application-specific database users
