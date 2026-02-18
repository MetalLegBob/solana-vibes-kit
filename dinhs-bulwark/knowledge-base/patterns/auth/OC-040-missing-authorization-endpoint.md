# OC-040: Missing Authorization on Endpoint

**Category:** Authentication & Authorization
**Severity:** CRITICAL
**Auditors:** AUTH-03
**CWE:** CWE-862
**OWASP:** A01:2021 - Broken Access Control

## Description

Missing authorization on an API endpoint means any authenticated user (or in the worst case, unauthenticated users) can access resources or perform actions that should be restricted. This is the single most common web application vulnerability according to OWASP, and it consistently ranks as the number one finding in penetration tests.

This vulnerability is especially common in REST APIs where new endpoints are added incrementally. Developers may add authentication middleware globally but forget to add authorization checks for specific endpoints that require elevated privileges. Admin endpoints, internal APIs, debug endpoints, and newly added features are frequently left unprotected.

CVE-2025-55736 in FlaskBlog demonstrated this pattern: the admin panel user route allowed any authenticated user to change their role to "admin", gaining full administrative privileges including the ability to delete users, posts, and comments. The missing authorization check on the role-change endpoint was the root cause.

## Detection

```
# Routes without auth middleware
grep -rn "app\.\(get\|post\|put\|delete\|patch\)\s*(" --include="*.ts" --include="*.js" | grep -v "auth\|authenticate\|authorize\|protect\|guard"
# Admin routes
grep -rn "\/admin\|\/internal\|\/debug\|\/management" --include="*.ts" --include="*.js"
# Express router without middleware
grep -rn "router\.\(get\|post\|put\|delete\)" --include="*.ts" --include="*.js" | grep -v "auth\|middleware"
```

## Vulnerable Code

```typescript
// VULNERABLE: Admin endpoint with no authorization check
app.get('/api/admin/users', async (req, res) => {
  // No authentication or authorization middleware
  const users = await db.query('SELECT * FROM users');
  res.json(users.rows);
});

app.delete('/api/admin/users/:id', async (req, res) => {
  // Anyone can delete any user
  await db.query('DELETE FROM users WHERE id = $1', [req.params.id]);
  res.json({ message: 'User deleted' });
});

// VULNERABLE: Auth present but no role check
app.post('/api/settings/global', authenticate, async (req, res) => {
  // Any authenticated user can change global settings
  await updateGlobalSettings(req.body);
  res.json({ message: 'Settings updated' });
});
```

## Secure Code

```typescript
// SECURE: Authentication + authorization middleware
function requireRole(...roles: string[]) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
}

app.get('/api/admin/users', authenticate, requireRole('admin'), async (req, res) => {
  const users = await db.query('SELECT id, email, role, created_at FROM users');
  res.json(users.rows);
});

app.delete('/api/admin/users/:id', authenticate, requireRole('admin'), async (req, res) => {
  if (req.params.id === req.user.id) {
    return res.status(400).json({ error: 'Cannot delete yourself' });
  }
  await db.query('DELETE FROM users WHERE id = $1', [req.params.id]);
  res.json({ message: 'User deleted' });
});

app.post('/api/settings/global', authenticate, requireRole('admin'), async (req, res) => {
  await updateGlobalSettings(req.body);
  res.json({ message: 'Settings updated' });
});
```

## Impact

Missing authorization allows any user (or anonymous visitor) to access admin functionality, view sensitive data, modify system configuration, delete records, and perform any action the endpoint exposes. This is often a complete application compromise.

## References

- CVE-2025-55736: FlaskBlog missing authorization on admin role change
- CWE-862: Missing Authorization
- https://owasp.org/Top10/A01_2021-Broken_Access_Control/
- OWASP WSTG: Testing for Bypassing Authorization Schema (WSTG-ATHZ-02)
