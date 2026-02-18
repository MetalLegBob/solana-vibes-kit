# OC-030: Account Enumeration via Error Messages

**Category:** Authentication & Authorization
**Severity:** MEDIUM
**Auditors:** AUTH-01
**CWE:** CWE-204
**OWASP:** A07:2021 - Identification and Authentication Failures

## Description

Account enumeration occurs when an application reveals whether a specific username or email address is registered through different error messages for valid vs. invalid usernames. For example, responding with "Invalid password" for a known user but "User not found" for an unknown one tells an attacker exactly which accounts exist.

This information leakage extends beyond the login endpoint. Registration forms that say "This email is already taken," password reset forms that say "No account found with that email," and API endpoints that return different HTTP status codes for existing vs. non-existing users all contribute to enumeration.

CVE-2025-52576 in Kanboard explicitly identified username enumeration as part of its vulnerability -- by analyzing login behavior, attackers could determine valid usernames. CVE-2025-55736 in FlaskBlog allowed users to discover admin accounts through the admin panel user route.

## Detection

```
# Different error messages for user-not-found vs wrong-password
grep -rn "user not found\|no account\|email not registered\|invalid username" -i --include="*.ts" --include="*.js"
# Separate checks with different responses
grep -rn "findUser\|findByEmail\|getUserBy" --include="*.ts" --include="*.js" -A 5 | grep "return\|res\.\(status\|json\)"
# Registration uniqueness check messages
grep -rn "already exists\|already taken\|already registered" -i --include="*.ts" --include="*.js"
```

## Vulnerable Code

```typescript
// VULNERABLE: Different messages reveal user existence
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  const user = await findUserByEmail(email);
  if (!user) {
    return res.status(404).json({ error: 'No account found with this email' });
  }
  if (!await verifyPassword(password, user.passwordHash)) {
    return res.status(401).json({ error: 'Incorrect password' });
  }
  res.json({ token: generateToken(user) });
});

// VULNERABLE: Password reset reveals user existence
app.post('/api/forgot-password', async (req, res) => {
  const user = await findUserByEmail(req.body.email);
  if (!user) {
    return res.status(404).json({ error: 'Email not found' });
  }
  await sendResetEmail(user);
  res.json({ message: 'Reset email sent' });
});
```

## Secure Code

```typescript
// SECURE: Generic error message regardless of cause
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  const user = await findUserByEmail(email);
  const valid = user && await verifyPassword(password, user.passwordHash);
  if (!valid) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }
  res.json({ token: generateToken(user) });
});

// SECURE: Always return success for password reset
app.post('/api/forgot-password', async (req, res) => {
  const user = await findUserByEmail(req.body.email);
  if (user) {
    await sendResetEmail(user);
  }
  // Always return same response regardless of user existence
  res.json({ message: 'If an account exists, a reset email has been sent' });
});
```

## Impact

Account enumeration allows attackers to compile a list of valid usernames or emails, which can then be used for targeted brute force attacks, credential stuffing, phishing, or social engineering. It significantly reduces the attacker's search space.

## References

- CVE-2025-52576: Kanboard username enumeration via login behavior analysis
- CVE-2025-55736: FlaskBlog admin account enumeration
- CWE-204: Observable Response Discrepancy
- OWASP Testing Guide: Testing for Account Enumeration (WSTG-IDNT-04)
