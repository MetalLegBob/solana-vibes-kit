# OC-134: Response Data Over-Exposure

**Category:** API & Network
**Severity:** MEDIUM
**Auditors:** API-01
**CWE:** CWE-200
**OWASP:** API3:2023 - Broken Object Property Level Authorization

## Description

Response data over-exposure occurs when an API returns more data than the client needs, including sensitive fields like password hashes, internal IDs, private keys, email addresses, financial details, or administrative metadata. This typically happens when developers return entire database objects instead of explicitly selecting which fields to include in the response.

OWASP elevated this to API3:2023 (Broken Object Property Level Authorization), merging the previous mass assignment and excessive data exposure categories because they share the root cause: APIs that do not properly control which object properties are readable or writable. The vulnerability is endemic in modern API development because ORMs and ODMs return full objects by default, and GraphQL by design lets clients request any field in the schema unless field-level authorization is enforced.

In practice, this vulnerability has led to major data breaches. APIs that return user objects with password hashes, internal flags, or linked records expose this data to any authenticated (or sometimes unauthenticated) user. The client application may only display the user's name and email, but the full JSON response is visible in browser developer tools or network proxies.

## Detection

```
# Returning full ORM objects without field selection
grep -rn "res\.json(user\b\|res\.json(result\b\|res\.send(user\b" --include="*.ts" --include="*.js"
# Missing select/projection in queries
grep -rn "\.find(\|\.findOne(\|\.findById(" --include="*.ts" --include="*.js" | grep -v "select\|projection\|\.lean"
# Spread operator returning full objects
grep -rn "res\.json({.*\.\.\.user\|\.\.\.doc\|\.\.\.record" --include="*.ts" --include="*.js"
# toJSON or toObject without field filtering
grep -rn "\.toJSON()\|\.toObject()" --include="*.ts" --include="*.js"
# Password hash or sensitive fields potentially in responses
grep -rn "password\|passwordHash\|secret\|internalId\|ssn\|creditCard" --include="*.ts" --include="*.js" | grep -i "res\."
```

## Vulnerable Code

```typescript
import express from 'express';
import User from './models/User';

// VULNERABLE: Returning entire user object including sensitive fields
app.get('/api/users/:id', authenticate, async (req, res) => {
  const user = await User.findById(req.params.id);
  // Response includes: passwordHash, internalNotes, stripeCustomerId,
  // socialSecurityNumber, role, loginAttempts, resetToken, etc.
  res.json(user);
});

// VULNERABLE: Array of full objects
app.get('/api/users', authenticate, async (req, res) => {
  const users = await User.find({});
  res.json(users); // Every user's full record exposed
});
```

## Secure Code

```typescript
import express from 'express';
import User from './models/User';

// Define explicit response shapes
const userPublicFields = { id: 1, name: 1, email: 1, avatar: 1, createdAt: 1 };

app.get('/api/users/:id', authenticate, async (req, res) => {
  const user = await User.findById(req.params.id).select(userPublicFields).lean();
  if (!user) return res.status(404).json({ error: 'Not found' });
  res.json(user);
});

app.get('/api/users', authenticate, async (req, res) => {
  const users = await User.find({}).select(userPublicFields).lean();
  res.json(users);
});

// Alternative: Use a DTO/serializer function
function toUserResponse(user: UserDocument) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    avatar: user.avatar,
    createdAt: user.createdAt,
  };
}

app.get('/api/users/:id', authenticate, async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ error: 'Not found' });
  res.json(toUserResponse(user));
});
```

## Impact

Over-exposed data enables attackers to harvest password hashes for offline cracking, collect PII (emails, phone numbers, SSNs) for identity theft, discover internal system architecture through metadata fields, access financial tokens (Stripe IDs, payment details), and map relationships between users and resources through exposed foreign keys. Even "low sensitivity" fields like creation timestamps or internal IDs can be used to enumerate objects or understand system behavior.

## References

- CWE-200: Exposure of Sensitive Information to an Unauthorized Actor
- OWASP API3:2023 - Broken Object Property Level Authorization: https://owasp.org/API-Security/editions/2023/en/0xa3-broken-object-property-level-authorization/
- OWASP API3:2019 - Excessive Data Exposure: https://owasp.org/API-Security/editions/2019/en/0xa3-excessive-data-exposure/
