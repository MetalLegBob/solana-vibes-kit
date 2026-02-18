# OC-041: Horizontal Privilege Escalation (IDOR)

**Category:** Authentication & Authorization
**Severity:** HIGH
**Auditors:** AUTH-03
**CWE:** CWE-639
**OWASP:** A01:2021 - Broken Access Control

## Description

Insecure Direct Object References (IDOR) occur when an application uses user-supplied input (such as an ID in a URL parameter) to access objects without verifying that the user is authorized to access that specific object. This enables horizontal privilege escalation, where a user accesses another user's data by simply changing an identifier.

IDORs are among the most commonly reported vulnerabilities in bug bounty programs. In the Spree eCommerce framework, researchers found IDOR vulnerabilities that exposed full customer PII to unauthenticated users by navigating object lifecycles and testing different authentication states. IGI Global's website had an IDOR that granted unauthorized access to paid eBooks by manipulating download identifiers.

The vulnerability is especially prevalent in REST APIs where resource identifiers are predictable (sequential integers, UUIDs exposed in listings, etc.). Common attack vectors include modifying IDs in URL paths (`/api/users/123` to `/api/users/124`), request bodies, and query parameters.

## Detection

```
# Direct use of request params for database queries
grep -rn "req\.params\.\(id\|userId\|orderId\)" --include="*.ts" --include="*.js" -A 3 | grep "findById\|findOne\|query"
# Missing ownership check patterns
grep -rn "findById\|findOne\|getById" --include="*.ts" --include="*.js" | grep -v "userId\|owner\|req\.user"
# URL-based object access
grep -rn "\/users\/:id\|\/orders\/:id\|\/accounts\/:id" --include="*.ts" --include="*.js"
```

## Vulnerable Code

```typescript
// VULNERABLE: No ownership verification
app.get('/api/orders/:orderId', authenticate, async (req, res) => {
  // Any authenticated user can view any order by changing the ID
  const order = await db.query('SELECT * FROM orders WHERE id = $1',
    [req.params.orderId]);
  if (!order.rows[0]) return res.status(404).json({ error: 'Not found' });
  res.json(order.rows[0]); // Returns order regardless of who owns it
});

app.put('/api/profile/:userId', authenticate, async (req, res) => {
  // User A can modify User B's profile
  await db.query('UPDATE users SET name = $1 WHERE id = $2',
    [req.body.name, req.params.userId]);
  res.json({ message: 'Updated' });
});
```

## Secure Code

```typescript
// SECURE: Verify object ownership
app.get('/api/orders/:orderId', authenticate, async (req, res) => {
  const order = await db.query(
    'SELECT * FROM orders WHERE id = $1 AND user_id = $2',
    [req.params.orderId, req.user.id]
  );
  if (!order.rows[0]) return res.status(404).json({ error: 'Not found' });
  res.json(order.rows[0]);
});

app.put('/api/profile/:userId', authenticate, async (req, res) => {
  // Ensure users can only update their own profile
  if (req.params.userId !== req.user.id) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  await db.query('UPDATE users SET name = $1 WHERE id = $2',
    [req.body.name, req.user.id]); // Use authenticated user's ID
  res.json({ message: 'Updated' });
});
```

## Impact

An attacker can access, modify, or delete other users' data by manipulating object identifiers. Depending on the endpoint, this can expose personal information, financial data, private documents, or enable unauthorized modifications to any user's account.

## References

- CWE-639: Authorization Bypass Through User-Controlled Key
- IDOR in Spree eCommerce: exposed customer PII to unauthenticated users
- IDOR in IGI Global: unauthorized access to paid eBooks
- https://owasp.org/Top10/A01_2021-Broken_Access_Control/
- OWASP WSTG: Testing for IDOR (WSTG-ATHZ-04)
