# OC-038: Session Not Invalidated on Password Change

**Category:** Authentication & Authorization
**Severity:** HIGH
**Auditors:** AUTH-02
**CWE:** CWE-613
**OWASP:** A07:2021 - Identification and Authentication Failures

## Description

When a user changes their password -- whether proactively or in response to a suspected compromise -- all existing sessions except the current one should be invalidated. If old sessions remain active, an attacker who has already compromised the account can continue using their existing session despite the password change.

This is a critical failure in incident response scenarios. A user discovers unauthorized access, changes their password, and believes they have secured their account. Meanwhile, the attacker's session remains valid and they retain full access. The same applies to administrative password resets performed after a breach.

The issue also affects JWT-based authentication, where changing a password does not automatically invalidate previously issued tokens. Without a mechanism to track and revoke tokens issued before the password change (e.g., storing the last password change timestamp and comparing it against the token's `iat` claim), old tokens remain valid.

## Detection

```
# Password change endpoints
grep -rn "change.*password\|update.*password\|reset.*password" -i --include="*.ts" --include="*.js"
# Password update without session invalidation
grep -rn "password" --include="*.ts" --include="*.js" -A 10 | grep -v "session.*destroy\|invalidate\|revoke"
# JWT-based apps without iat validation after password change
grep -rn "passwordChangedAt\|passwordUpdatedAt\|lastPasswordChange" --include="*.ts" --include="*.js"
```

## Vulnerable Code

```typescript
// VULNERABLE: Password changed but sessions not invalidated
app.post('/api/change-password', authenticate, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const user = await getUser(req.userId);

  if (!await bcrypt.compare(currentPassword, user.passwordHash)) {
    return res.status(401).json({ error: 'Current password incorrect' });
  }

  const newHash = await bcrypt.hash(newPassword, 12);
  await db.query('UPDATE users SET password_hash = $1 WHERE id = $2',
    [newHash, user.id]);

  // Other sessions remain active -- attacker keeps access
  res.json({ message: 'Password changed' });
});
```

## Secure Code

```typescript
// SECURE: Invalidate all other sessions on password change
app.post('/api/change-password', authenticate, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const user = await getUser(req.userId);

  if (!await bcrypt.compare(currentPassword, user.passwordHash)) {
    return res.status(401).json({ error: 'Current password incorrect' });
  }

  const newHash = await bcrypt.hash(newPassword, 12);
  const passwordChangedAt = new Date();
  await db.query(
    'UPDATE users SET password_hash = $1, password_changed_at = $2 WHERE id = $3',
    [newHash, passwordChangedAt, user.id]
  );

  // Invalidate all sessions for this user except current
  await sessionStore.destroyAllForUser(user.id, req.session.id);

  // For JWT: update token version so old tokens are rejected
  await db.query('UPDATE users SET token_version = token_version + 1 WHERE id = $1',
    [user.id]);

  res.json({ message: 'Password changed. All other sessions have been logged out.' });
});
```

## Impact

An attacker who has compromised an account retains access even after the legitimate user changes their password. This defeats the primary recovery mechanism users have after detecting unauthorized access.

## References

- CWE-613: Insufficient Session Expiration
- OWASP Session Management Cheat Sheet
- https://owasp.org/Top10/A07_2021-Identification_and_Authentication_Failures/
- NIST SP 800-63B: Reauthentication requirements
