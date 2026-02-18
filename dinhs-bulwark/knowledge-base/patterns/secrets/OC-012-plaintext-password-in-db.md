# OC-012: Plaintext Password in Database

**Category:** Secrets & Credentials
**Severity:** CRITICAL
**Auditors:** SEC-02, DATA-01
**CWE:** CWE-256 (Plaintext Storage of a Password)
**OWASP:** A02:2021 – Cryptographic Failures

## Description

Storing user passwords or service credentials in plaintext (or with reversible encoding like Base64) in a database means that any database access — whether through SQL injection, a backup leak, insider access, or a database breach — exposes every credential at once. This is one of the most well-understood and consistently exploited vulnerability classes in web application security.

Despite decades of guidance, plaintext password storage continues to appear in production systems. Verizon's DBIR consistently identifies credential theft as a primary breach vector, and exposed credentials (like API keys, passwords, and tokens) are cited as one of the most common breach causes. In off-chain crypto applications, plaintext storage of user authentication passwords enables account takeover, which can lead to unauthorized transaction approvals, withdrawal requests, or API key generation.

The danger extends beyond user passwords: service accounts, database connection passwords stored in config tables, and API keys stored in admin panels are all frequently stored in plaintext.

## Detection

```
grep -rn "password.*=.*req\.\|password.*=.*body\." --include="*.ts" --include="*.js"
grep -rn "INSERT.*password\|UPDATE.*password" --include="*.ts" --include="*.js"
grep -rn "\.create\(\{.*password\|\.update\(\{.*password" --include="*.ts" --include="*.js"
grep -rn "password.*:.*string" --include="*.ts" --include="*.prisma" --include="*.graphql"
```

Look for absence of: hashing imports (bcrypt, argon2, scrypt), hash comparison functions, salt generation. Look for: direct password assignment to database fields, password stored as VARCHAR/TEXT without hash prefix ($2b$, $argon2).

## Vulnerable Code

```typescript
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

// VULNERABLE: Password stored in plaintext
async function createUser(email: string, password: string) {
  return prisma.user.create({
    data: {
      email,
      password, // Stored as-is in the database — plaintext
    },
  });
}

async function verifyUser(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  // VULNERABLE: Direct string comparison of plaintext password
  return user?.password === password;
}
```

## Secure Code

```typescript
import { PrismaClient } from "@prisma/client";
import argon2 from "argon2";

const prisma = new PrismaClient();

// SECURE: Password hashed with Argon2id before storage
async function createUser(email: string, password: string) {
  const hashedPassword = await argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 65536, // 64 MB
    timeCost: 3,
    parallelism: 4,
  });

  return prisma.user.create({
    data: {
      email,
      password: hashedPassword, // Stored as Argon2id hash
    },
  });
}

async function verifyUser(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return false;
  // SECURE: Argon2 verify handles timing-safe comparison internally
  return argon2.verify(user.password, password);
}
```

## Impact

A database breach exposes every user's password in usable form. Attackers can use these credentials for direct account takeover, credential stuffing against other services (due to password reuse), and impersonation. In crypto applications, compromised user accounts can lead to unauthorized withdrawal requests, API key generation, and social engineering attacks against support staff.

## References

- CWE-256: Plaintext Storage of a Password — https://cwe.mitre.org/data/definitions/256.html
- OWASP Password Storage Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html
- OWASP A02:2021 – Cryptographic Failures
- Verizon DBIR: Credential theft as primary breach vector
