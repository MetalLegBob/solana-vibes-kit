# OC-054: Blind SQL Injection in Search/Filter

**Category:** Injection
**Severity:** HIGH
**Auditors:** INJ-01
**CWE:** CWE-89
**OWASP:** A03:2021 Injection

## Description

Blind SQL injection occurs when an application is vulnerable to SQL injection but does not return the results of the injected query or database error messages in the HTTP response. Instead, the attacker infers information by observing differences in application behavior — either through boolean conditions (content-based blind) or time delays (time-based blind).

Search and filter endpoints are prime targets because they typically accept free-text user input and build dynamic WHERE clauses. In Node.js applications, this commonly appears in product search, user lookup, and data filtering features where developers construct LIKE clauses or complex WHERE conditions with string interpolation.

Time-based blind SQL injection using `pg_sleep()` (PostgreSQL), `SLEEP()` (MySQL), or `WAITFOR DELAY` (MSSQL) allows attackers to extract the entire database contents one bit at a time by measuring response timing differences.

## Detection

```
# Dynamic WHERE/LIKE construction
`%.*\$\{.*\}%`
LIKE.*\+.*req\.(query|body|params)
`WHERE.*\$\{.*\}.*AND`
`WHERE.*\$\{.*\}.*OR`
# Dynamic column/table in filter
ORDER BY.*\$\{
GROUP BY.*\$\{
HAVING.*\$\{
```

## Vulnerable Code

```typescript
app.get('/search', async (req, res) => {
  const { q, category, sort } = req.query;
  // VULNERABLE: multiple injection points
  let query = `SELECT id, name, price FROM products WHERE 1=1`;

  if (q) {
    query += ` AND name LIKE '%${q}%'`;
  }
  if (category) {
    query += ` AND category = '${category}'`;
  }
  if (sort) {
    query += ` ORDER BY ${sort}`;
  }

  const results = await pool.query(query);
  res.json(results.rows);
  // Attacker: ?q=x' AND (SELECT CASE WHEN (1=1) THEN 1
  //   ELSE 1/(SELECT 0) END)-- &sort=name
});
```

## Secure Code

```typescript
app.get('/search', async (req, res) => {
  const { q, category, sort } = req.query;
  const conditions: string[] = [];
  const params: any[] = [];
  let idx = 1;

  if (q) {
    conditions.push(`name ILIKE $${idx++}`);
    params.push(`%${q}%`);
  }
  if (category) {
    conditions.push(`category = $${idx++}`);
    params.push(category);
  }

  const where = conditions.length > 0
    ? 'WHERE ' + conditions.join(' AND ')
    : '';

  const allowedSorts = ['name', 'price', 'created_at'];
  const orderBy = allowedSorts.includes(sort) ? sort : 'name';

  const query = `SELECT id, name, price FROM products ${where} ORDER BY ${orderBy}`;
  const results = await pool.query(query, params);
  res.json(results.rows);
});
```

## Impact

Attackers can extract the entire database contents through boolean or time-based inference. This includes usernames, password hashes, tokens, and any other stored data. The attack is slower than direct SQL injection but equally devastating.

## References

- CWE-89: SQL Injection
- OWASP: Blind SQL Injection
- PortSwigger: Blind SQL injection techniques
- SQLMap: Automated blind SQL injection tool documentation
