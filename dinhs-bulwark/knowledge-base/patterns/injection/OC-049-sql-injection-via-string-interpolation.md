# OC-049: SQL Injection via String Interpolation

**Category:** Injection
**Severity:** CRITICAL
**Auditors:** INJ-01
**CWE:** CWE-89
**OWASP:** A03:2021 Injection

## Description

SQL injection via string interpolation occurs when user-supplied input is directly concatenated or template-literal-interpolated into SQL query strings. This is the most fundamental and dangerous injection vulnerability class. Despite decades of awareness, it remains prevalent in Node.js applications where developers build queries with template literals or string concatenation rather than parameterized queries.

In the JavaScript/TypeScript ecosystem, this commonly appears with raw database drivers (pg, mysql2, better-sqlite3) where developers bypass the parameterization API. Even when using ORMs, developers sometimes drop to raw queries for complex operations and introduce interpolation vulnerabilities.

The Sequelize ORM itself was found vulnerable to SQL injection via its `replacements` feature (CVE-2023-25813, CVSS 9.8), where parameters passed through replacements were not properly escaped when used alongside the `where` option.

## Detection

```
# String interpolation in SQL queries
`SELECT .* FROM .* WHERE .*\$\{`
`INSERT INTO .* VALUES.*\$\{`
`UPDATE .* SET .* = .*\$\{`
`DELETE FROM .* WHERE .*\$\{`
# String concatenation with SQL
"SELECT " +
"WHERE " + req.
'SELECT ' +
query(` ... ${
```

## Vulnerable Code

```typescript
import { Pool } from 'pg';
const pool = new Pool();

app.get('/users', async (req, res) => {
  const { search } = req.query;
  // VULNERABLE: direct interpolation into SQL
  const result = await pool.query(
    `SELECT * FROM users WHERE username = '${search}'`
  );
  res.json(result.rows);
});

app.get('/products', async (req, res) => {
  const sort = req.query.sort;
  // VULNERABLE: interpolated ORDER BY
  const result = await pool.query(
    `SELECT * FROM products ORDER BY ${sort}`
  );
  res.json(result.rows);
});
```

## Secure Code

```typescript
import { Pool } from 'pg';
const pool = new Pool();

app.get('/users', async (req, res) => {
  const { search } = req.query;
  // SAFE: parameterized query
  const result = await pool.query(
    'SELECT * FROM users WHERE username = $1',
    [search]
  );
  res.json(result.rows);
});

app.get('/products', async (req, res) => {
  const sort = req.query.sort;
  const allowedColumns = ['name', 'price', 'created_at'];
  // SAFE: allowlist for dynamic identifiers
  const column = allowedColumns.includes(sort) ? sort : 'name';
  const result = await pool.query(
    `SELECT * FROM products ORDER BY ${column}`
  );
  res.json(result.rows);
});
```

## Impact

An attacker can read, modify, or delete arbitrary data in the database. In worst cases, SQL injection enables authentication bypass, privilege escalation, data exfiltration of the entire database, and in some configurations, OS command execution via database functions like `xp_cmdshell` or `COPY TO PROGRAM`.

## References

- CVE-2023-25813: Sequelize SQL injection via replacements (CVSS 9.8)
- CVE-2023-22578: Sequelize SQL injection vulnerability
- CWE-89: Improper Neutralization of Special Elements used in an SQL Command
- OWASP SQL Injection: https://owasp.org/www-community/attacks/SQL_Injection
- Snyk: Sequelize ORM found vulnerable to SQL injection attacks
