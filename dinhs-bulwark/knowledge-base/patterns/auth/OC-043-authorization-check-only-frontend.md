# OC-043: Authorization Check Only on Frontend

**Category:** Authentication & Authorization
**Severity:** HIGH
**Auditors:** AUTH-03
**CWE:** CWE-602
**OWASP:** A01:2021 - Broken Access Control

## Description

Client-side authorization checks (hiding buttons, disabling menu items, or conditional rendering based on user roles in React/Vue/Angular) provide no security. They improve the user experience by hiding irrelevant UI elements, but an attacker can bypass them entirely by making direct API calls with tools like `curl`, Postman, or browser developer tools.

This is fundamentally a violation of the security principle that the server must be the sole enforcer of access control. Any check performed only in client-side JavaScript can be modified, bypassed, or ignored. Browser extensions, proxy tools, and direct HTTP requests all circumvent frontend guards.

CVE-2025-55736 in FlaskBlog demonstrated this: although the admin panel was not linked in the UI for non-admin users, the route itself (`/adminPanelUsers`) had no server-side role check. Any authenticated user who knew (or guessed) the URL could access it and escalate privileges.

## Detection

```
# Frontend role checks (React)
grep -rn "user\.role\|user\.isAdmin\|currentUser\.role" --include="*.tsx" --include="*.jsx" --include="*.vue"
# Conditional rendering for auth
grep -rn "isAdmin\|hasPermission\|canAccess" --include="*.tsx" --include="*.jsx" --include="*.vue"
# Client-side route guards
grep -rn "PrivateRoute\|ProtectedRoute\|AuthGuard\|RoleGuard" --include="*.tsx" --include="*.jsx"
# Compare: does the API endpoint have server-side checks?
grep -rn "\/admin\|\/manage" --include="*.ts" --include="*.js" | grep -v "requireRole\|authorize\|isAdmin"
```

## Vulnerable Code

```typescript
// Frontend: Admin panel hidden but not protected on server
// React component
function Dashboard({ user }) {
  return (
    <div>
      <h1>Dashboard</h1>
      {user.role === 'admin' && <AdminPanel />}  {/* Only hides UI */}
    </div>
  );
}

// Server: No role check on the API
app.get('/api/admin/dashboard', authenticate, async (req, res) => {
  // Any authenticated user can access admin data
  const stats = await getAdminStats();
  res.json(stats);
});
```

## Secure Code

```typescript
// Frontend: UI hint only (defense in depth, not security boundary)
function Dashboard({ user }) {
  return (
    <div>
      <h1>Dashboard</h1>
      {user.role === 'admin' && <AdminPanel />}
    </div>
  );
}

// Server: MANDATORY role check (the actual security boundary)
app.get('/api/admin/dashboard',
  authenticate,
  requireRole('admin'),
  async (req, res) => {
    const stats = await getAdminStats();
    res.json(stats);
  }
);

function requireRole(...roles: string[]) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    next();
  };
}
```

## Impact

Any user who discovers or guesses protected API endpoints can access admin functionality, sensitive data, or privileged operations. Frontend-only guards provide zero security against an attacker with basic HTTP knowledge.

## References

- CVE-2025-55736: FlaskBlog admin route accessible without server-side role check
- CWE-602: Client-Side Enforcement of Server-Side Security
- https://owasp.org/Top10/A01_2021-Broken_Access_Control/
- OWASP WSTG: Testing for Bypassing Authorization Schema (WSTG-ATHZ-02)
