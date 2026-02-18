# OC-131: Mass Assignment / Over-Posting

**Category:** API & Network
**Severity:** HIGH
**Auditors:** API-01
**CWE:** CWE-915
**OWASP:** API6:2019 - Mass Assignment

## Description

Mass assignment (also called over-posting or auto-binding) occurs when an API endpoint directly binds client-supplied request data to internal data models without filtering which fields are allowed. Attackers exploit this by adding unexpected fields to requests -- such as `role`, `isAdmin`, `balance`, or `verified` -- to modify properties they should not control.

The most famous mass assignment incident was the 2012 GitHub breach, where security researcher Egor Homakov exploited a Rails mass assignment vulnerability to upload his SSH public key to the Ruby on Rails organization's repository. This forced GitHub to implement strong parameter filtering and prompted the Rails framework to change its default behavior to require explicit attribute whitelisting. The vulnerability class is ranked as OWASP API Security Top 10 #6 (2019 edition) and remains prevalent: a 2024 academic study of 100 REST APIs found 25 prone to mass assignment, confirming nine real vulnerable operations across six APIs.

In Node.js applications, mass assignment commonly appears when using Mongoose with `new User(req.body)`, Sequelize with `Model.create(req.body)`, or Prisma with `prisma.user.create({ data: req.body })`. Any ORM or ODM that accepts an object and maps it directly to database fields is susceptible.

## Detection

```
# Direct req.body binding to ORM create/update
grep -rn "\.create(req\.body" --include="*.ts" --include="*.js"
grep -rn "\.update(req\.body" --include="*.ts" --include="*.js"
grep -rn "\.findByIdAndUpdate.*req\.body" --include="*.ts" --include="*.js"
grep -rn "new.*Model(req\.body" --include="*.ts" --include="*.js"
# Spread operator passing all request fields
grep -rn "\.create({.*\.\.\.req\.body" --include="*.ts" --include="*.js"
grep -rn "Object\.assign.*req\.body" --include="*.ts" --include="*.js"
# Prisma direct binding
grep -rn "prisma\..*\.create.*data:.*req\.body" --include="*.ts" --include="*.js"
```

## Vulnerable Code

```typescript
import express from 'express';
import User from './models/User';

// VULNERABLE: Entire request body passed directly to ORM
app.post('/api/users', async (req, res) => {
  // Attacker adds { "role": "admin", "verified": true } to body
  const user = new User(req.body);
  await user.save();
  res.json(user);
});

app.put('/api/users/:id', authenticate, async (req, res) => {
  // Attacker adds { "balance": 99999 } to body
  const user = await User.findByIdAndUpdate(req.params.id, req.body, { new: true });
  res.json(user);
});
```

## Secure Code

```typescript
import express from 'express';
import { z } from 'zod';
import User from './models/User';

// DTO schema with explicit allowlisted fields
const CreateUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(100),
  password: z.string().min(8),
});

app.post('/api/users', async (req, res) => {
  const { email, name, password } = CreateUserSchema.parse(req.body);
  const user = await User.create({
    email,
    name,
    password: await bcrypt.hash(password, 12),
    role: 'user',      // Server-controlled, never from client
    verified: false,    // Server-controlled
  });
  res.json({ id: user.id, email: user.email, name: user.name });
});

const UpdateUserSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  email: z.string().email().optional(),
});

app.put('/api/users/:id', authenticate, async (req, res) => {
  const data = UpdateUserSchema.parse(req.body);
  const user = await User.findByIdAndUpdate(req.params.id, data, { new: true });
  res.json({ id: user.id, email: user.email, name: user.name });
});
```

## Impact

An attacker can escalate privileges by setting `role: "admin"` or `isAdmin: true`, grant themselves unearned balances or credits, bypass email verification by setting `verified: true`, modify other users' data by overwriting ownership fields, or disable security features by toggling boolean flags. In financial applications, this can directly lead to unauthorized fund transfers or theft.

## References

- OWASP API Security Top 10 - API6:2019 Mass Assignment: https://owasp.org/API-Security/editions/2019/en/0xa6-mass-assignment/
- CWE-915: Improperly Controlled Modification of Dynamically-Determined Object Attributes
- GitHub 2012 mass assignment incident: https://github.blog/news-insights/company-news/public-key-security-vulnerability-and-mitigation/
- "Mining REST APIs for Potential Mass Assignment Vulnerabilities" (2024 EASE paper): https://arxiv.org/html/2405.01111v2
- Snyk: Avoiding mass assignment vulnerabilities in Node.js: https://snyk.io/blog/avoiding-mass-assignment-node-js/
