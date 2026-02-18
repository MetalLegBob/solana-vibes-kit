# OC-053: Second-Order SQL Injection

**Category:** Injection
**Severity:** HIGH
**Auditors:** INJ-01
**CWE:** CWE-89
**OWASP:** A03:2021 Injection

## Description

Second-order SQL injection occurs when user input is safely stored in the database (properly escaped on insert) but is later retrieved and used unsafely in a subsequent SQL query. The initial input survives because the storage operation was parameterized, but the vulnerability manifests when the stored value is trusted and concatenated into another query without parameterization.

This is particularly dangerous because standard code review practices focus on the boundary between user input and the first query. Data retrieved from the database is often implicitly trusted as "safe" since it was stored by the application. In Node.js applications, this commonly appears when a user profile field (like a display name) is stored safely but later used in an admin report query or a search feature built with string concatenation.

The attack is also harder to detect with automated scanners because the injection payload and the vulnerable query are in completely different code paths, possibly in different services.

## Detection

```
# Database values used in string-built queries
const .* = .*\.rows\[0\]
const .* = user\.
# Then later used in interpolation
`SELECT.*\$\{.*\}`
`UPDATE.*\$\{.*\}`
# Patterns where DB results flow into raw queries
\.query\(`.*\$\{.*name\}
\.query\(`.*\$\{.*title\}
\.query\(`.*\$\{.*description\}
```

## Vulnerable Code

```typescript
// Step 1: User registers with malicious name (safely stored)
app.post('/register', async (req, res) => {
  const { username, email } = req.body;
  // SAFE insert — parameterized
  await pool.query(
    'INSERT INTO users (username, email) VALUES ($1, $2)',
    [username, email]  // username = "admin'--"
  );
});

// Step 2: Admin report retrieves and uses the name unsafely
app.get('/admin/report', async (req, res) => {
  const users = await pool.query('SELECT username FROM users');
  for (const user of users.rows) {
    // VULNERABLE: trusting database-sourced value
    const orders = await pool.query(
      `SELECT * FROM orders WHERE customer_name = '${user.username}'`
    );
    report.push({ user: user.username, orders: orders.rows });
  }
});
```

## Secure Code

```typescript
// Step 2 fixed: Always parameterize, even with DB-sourced data
app.get('/admin/report', async (req, res) => {
  const users = await pool.query('SELECT username FROM users');
  for (const user of users.rows) {
    // SAFE: parameterized even though data comes from DB
    const orders = await pool.query(
      'SELECT * FROM orders WHERE customer_name = $1',
      [user.username]
    );
    report.push({ user: user.username, orders: orders.rows });
  }
});
```

## Impact

Same as first-order SQL injection — full database compromise — but with a delayed trigger that is harder to trace. The attacker may register a payload and wait for a scheduled admin report or batch job to trigger it.

## References

- CWE-89: SQL Injection
- OWASP: Second Order SQL Injection
- CWE-564: SQL Injection: Hibernate (analogous ORM pattern)
- Snyk Learn: SQL injection — second-order variants
