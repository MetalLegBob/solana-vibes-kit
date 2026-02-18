# OC-051: NoSQL Injection via Operator ($gt, $ne)

**Category:** Injection
**Severity:** HIGH
**Auditors:** INJ-01
**CWE:** CWE-943
**OWASP:** A03:2021 Injection

## Description

NoSQL injection via MongoDB query operators occurs when user-supplied JSON objects are passed directly to MongoDB query methods. Unlike SQL injection which exploits string concatenation, NoSQL injection exploits the fact that MongoDB queries accept objects with special operators like `$gt`, `$ne`, `$regex`, and `$in`.

When Express parses `application/json` request bodies or uses `qs` to parse query strings, an attacker can submit `{"$ne": ""}` instead of a string value, transforming a simple equality check into a match-all query. This is especially dangerous in authentication flows where `{"username": {"$gt": ""}, "password": {"$ne": ""}}` can bypass login entirely.

This attack class is well-documented by PortSwigger Web Security Academy and remains one of the most common vulnerabilities in Node.js/MongoDB applications. The flexible typing of JavaScript makes it particularly easy to accidentally pass unsanitized objects to MongoDB drivers.

## Detection

```
# Direct user input to MongoDB queries
\.find\(\s*\{.*req\.(body|query|params)
\.findOne\(\s*\{.*req\.(body|query|params)
\.updateOne\(\s*\{.*req\.(body|query|params)
\.deleteOne\(\s*\{.*req\.(body|query|params)
# Missing type validation before query
collection\.(find|findOne|update|delete)
# Mongoose without schema validation
Model\.(find|findOne)\(\s*req\.body
```

## Vulnerable Code

```typescript
import { MongoClient } from 'mongodb';

app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  // VULNERABLE: req.body.password could be {"$ne": ""}
  const user = await db.collection('users').findOne({
    username: username,
    password: password
  });
  if (user) {
    res.json({ token: generateToken(user) });
  } else {
    res.status(401).json({ error: 'Invalid credentials' });
  }
});

// Attacker sends: {"username": "admin", "password": {"$ne": ""}}
// This matches any user named "admin" with a non-empty password
```

## Secure Code

```typescript
import { MongoClient } from 'mongodb';
import { z } from 'zod';

const loginSchema = z.object({
  username: z.string().min(1).max(100),
  password: z.string().min(1).max(200)
});

app.post('/login', async (req, res) => {
  // SAFE: Schema validation ensures strings only, no operators
  const { username, password } = loginSchema.parse(req.body);

  const user = await db.collection('users').findOne({
    username: username
  });

  if (user && await bcrypt.compare(password, user.passwordHash)) {
    res.json({ token: generateToken(user) });
  }
});
```

## Impact

Authentication bypass allowing login as any user including admin accounts. Data exfiltration via query manipulation. In combination with `$regex`, attackers can extract field values character-by-character in blind NoSQL injection attacks.

## References

- CWE-943: Improper Neutralization of Special Elements in Data Query Logic
- PortSwigger: NoSQL operator injection labs
- OWASP: Testing for NoSQL Injection
- Snyk Learn: NoSQL injection
- MongoDB security best practices: input validation
