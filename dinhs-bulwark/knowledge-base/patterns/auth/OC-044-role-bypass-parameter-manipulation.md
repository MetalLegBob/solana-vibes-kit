# OC-044: Role Bypass via Parameter Manipulation

**Category:** Authentication & Authorization
**Severity:** HIGH
**Auditors:** AUTH-03
**CWE:** CWE-639, CWE-915
**OWASP:** A01:2021 - Broken Access Control

## Description

Role bypass via parameter manipulation occurs when an application includes role or permission data in user-controllable inputs (request body, query parameters, cookies, or hidden form fields) and trusts those values without server-side verification. An attacker modifies these parameters to elevate their privileges.

This vulnerability manifests in several forms. Mass assignment (over-posting) allows users to include unexpected fields like `role` or `isAdmin` in update requests that the server blindly accepts. Hidden form fields containing role information can be modified before submission. JWTs that include role claims without server-side validation against the database can be tampered with if the token is not properly signed or verified.

CVE-2025-55736 in FlaskBlog allowed any user to change their role to "admin" through the admin panel users route. CVE-2025-54596 in Abnormal Security's RBAC API allowed privilege modification through the user management endpoint.

## Detection

```
# User-controllable role fields
grep -rn "req\.body\.role\|req\.body\.isAdmin\|req\.body\.permission" --include="*.ts" --include="*.js"
# Mass assignment (spread operator on request body)
grep -rn "\.\.\.req\.body\|Object\.assign.*req\.body" --include="*.ts" --include="*.js"
# ORM create/update with unfiltered body
grep -rn "\.create(req\.body)\|\.update(req\.body)\|\.findOneAndUpdate.*req\.body" --include="*.ts" --include="*.js"
# Role in query params
grep -rn "req\.query\.role\|req\.query\.admin" --include="*.ts" --include="*.js"
```

## Vulnerable Code

```typescript
// VULNERABLE: Mass assignment allows role override
app.post('/api/register', async (req, res) => {
  // Attacker sends: { "email": "evil@test.com", "password": "...", "role": "admin" }
  const user = await User.create(req.body); // All fields accepted
  res.json({ user });
});

// VULNERABLE: Spread operator includes all body fields
app.put('/api/users/:id', authenticate, async (req, res) => {
  await User.findByIdAndUpdate(req.params.id, { ...req.body });
  res.json({ message: 'Updated' });
});
```

## Secure Code

```typescript
// SECURE: Whitelist allowed fields explicitly
app.post('/api/register', async (req, res) => {
  const { email, password, name } = req.body; // Only extract safe fields
  const user = await User.create({
    email,
    password: await bcrypt.hash(password, 12),
    name,
    role: 'user', // Always set server-side
  });
  res.json({ user: { id: user.id, email: user.email, name: user.name } });
});

// SECURE: Explicit field whitelist for updates
app.put('/api/users/:id', authenticate, async (req, res) => {
  if (req.params.id !== req.user.id) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  const allowedUpdates = ['name', 'email', 'avatar'];
  const updates = {};
  for (const field of allowedUpdates) {
    if (req.body[field] !== undefined) updates[field] = req.body[field];
  }
  await User.findByIdAndUpdate(req.user.id, updates);
  res.json({ message: 'Updated' });
});
```

## Impact

An attacker can escalate their privileges to admin, modify their own permissions, or manipulate role-based access controls. This often leads to complete application compromise with the ability to manage all users and data.

## References

- CVE-2025-55736: FlaskBlog role change via parameter manipulation
- CVE-2025-54596: Abnormal Security RBAC privilege manipulation
- CWE-915: Improperly Controlled Modification of Dynamically-Determined Object Attributes
- https://owasp.org/Top10/A01_2021-Broken_Access_Control/
- OWASP Mass Assignment: https://cheatsheetseries.owasp.org/cheatsheets/Mass_Assignment_Cheat_Sheet.html
