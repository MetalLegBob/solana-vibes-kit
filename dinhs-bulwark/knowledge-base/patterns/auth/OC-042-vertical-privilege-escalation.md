# OC-042: Vertical Privilege Escalation

**Category:** Authentication & Authorization
**Severity:** CRITICAL
**Auditors:** AUTH-03
**CWE:** CWE-269, CWE-863
**OWASP:** A01:2021 - Broken Access Control

## Description

Vertical privilege escalation occurs when a lower-privileged user gains access to functionality or data reserved for higher-privileged roles (e.g., a regular user accessing admin functions). Unlike horizontal escalation (IDOR), which accesses peer-level resources, vertical escalation crosses privilege boundaries.

CVE-2025-7784 in Keycloak demonstrated this pattern: when FGAPv2 was enabled, a user with `manage-users` privileges could self-assign `realm-admin` rights through the admin REST interface due to missing privilege boundary checks in role mapping operations. CVE-2025-54596 in Abnormal Security's RBAC API allowed downgrading other users' privileges via the user management endpoint. CVE-2026-25510 in CI4MS CMS allowed users with file editor permissions to achieve remote code execution by leveraging file creation endpoints.

Common causes include: role checks performed only on the frontend, missing middleware on admin routes, parameter-based role manipulation, and incomplete RBAC enforcement in API layers.

## Detection

```
# Role assignment endpoints
grep -rn "role\|permission\|privilege\|isAdmin\|admin" --include="*.ts" --include="*.js" | grep -i "update\|assign\|set\|change"
# Frontend-only role checks
grep -rn "user\.role\|user\.isAdmin\|currentUser\.role" --include="*.tsx" --include="*.jsx" | grep -v "server\|api\|middleware"
# Role in request body (user-controlled)
grep -rn "req\.body\.role\|req\.body\.isAdmin\|req\.body\.permissions" --include="*.ts" --include="*.js"
# Admin route definitions
grep -rn "\/admin\|\/manage\|\/internal" --include="*.ts" --include="*.js"
```

## Vulnerable Code

```typescript
// VULNERABLE: User can set their own role
app.put('/api/users/:id', authenticate, async (req, res) => {
  const { name, email, role } = req.body;
  // Attacker sends: { "role": "admin" }
  await db.query(
    'UPDATE users SET name=$1, email=$2, role=$3 WHERE id=$4',
    [name, email, role, req.params.id]
  );
  res.json({ message: 'Updated' });
});

// VULNERABLE: Role check only on frontend
// Frontend: {user.role === 'admin' && <AdminPanel />}
// API has no role verification:
app.delete('/api/admin/posts/:id', authenticate, async (req, res) => {
  await db.query('DELETE FROM posts WHERE id = $1', [req.params.id]);
  res.json({ message: 'Deleted' });
});
```

## Secure Code

```typescript
// SECURE: Whitelist allowed fields, enforce roles server-side
const SELF_EDITABLE_FIELDS = ['name', 'email', 'avatar'];

app.put('/api/users/:id', authenticate, async (req, res) => {
  if (req.params.id !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden' });
  }
  // Only allow safe fields for self-edit; admin can edit role
  const allowedFields = req.user.role === 'admin'
    ? [...SELF_EDITABLE_FIELDS, 'role']
    : SELF_EDITABLE_FIELDS;
  const updates = Object.fromEntries(
    Object.entries(req.body).filter(([k]) => allowedFields.includes(k))
  );
  await updateUser(req.params.id, updates);
  res.json({ message: 'Updated' });
});

// SECURE: Server-side role enforcement on admin routes
app.delete('/api/admin/posts/:id',
  authenticate,
  requireRole('admin'),
  async (req, res) => {
    await db.query('DELETE FROM posts WHERE id = $1', [req.params.id]);
    res.json({ message: 'Deleted' });
  }
);
```

## Impact

An attacker gains full administrative access to the application, enabling them to manage users, access all data, modify configurations, and potentially compromise the entire system.

## References

- CVE-2025-7784: Keycloak privilege escalation via self-assigning realm-admin
- CVE-2025-54596: Abnormal Security RBAC privilege downgrade via API
- CVE-2026-25510: CI4MS CMS RCE via file editor privilege escalation
- CVE-2025-55736: FlaskBlog arbitrary role change to admin
- https://owasp.org/Top10/A01_2021-Broken_Access_Control/
