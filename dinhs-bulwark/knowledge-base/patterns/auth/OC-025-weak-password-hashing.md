# OC-025: Weak Password Hashing (MD5/SHA1/no salt)

**Category:** Authentication & Authorization
**Severity:** HIGH
**Auditors:** AUTH-01
**CWE:** CWE-916, CWE-328
**OWASP:** A02:2021 - Cryptographic Failures

## Description

Using fast, non-salted hash functions like MD5, SHA-1, or unsalted SHA-256 for password storage makes credentials trivially recoverable through rainbow tables and brute force. Modern GPUs can compute billions of MD5 hashes per second, meaning an entire database of MD5-hashed passwords can be cracked in hours.

This vulnerability has led to massive real-world breaches. LinkedIn's 2012 breach exposed 6.5 million unsalted SHA-1 password hashes, most of which were cracked within days. Adobe's 2013 breach exposed 153 million passwords stored with 3DES encryption (not even hashing) in ECB mode. CVE-2025-49197 in SICK Media Server exposed this exact pattern -- using weak password hashing that allowed password recovery via cracking.

Even SHA-256 without salting is insufficient, as precomputed rainbow tables cover common passwords. The fundamental issue is that general-purpose cryptographic hash functions are designed to be fast, while password hashing requires deliberate slowness to resist brute force.

## Detection

```
# MD5 usage for passwords
grep -rn "md5\|createHash.*md5\|crypto\.MD5" --include="*.ts" --include="*.js"
# SHA1 for passwords
grep -rn "sha1\|createHash.*sha1" --include="*.ts" --include="*.js"
# Plain SHA256 without key stretching
grep -rn "createHash.*sha256" --include="*.ts" --include="*.js" | grep -i "password\|passwd\|pwd"
# Missing salt
grep -rn "\.hash\(password\)\|hash(password)" --include="*.ts" --include="*.js"
```

## Vulnerable Code

```typescript
import crypto from 'crypto';

// VULNERABLE: MD5 without salt
async function registerUser(username: string, password: string) {
  const passwordHash = crypto.createHash('md5').update(password).digest('hex');
  await db.query('INSERT INTO users (username, password_hash) VALUES ($1, $2)',
    [username, passwordHash]);
}

// VULNERABLE: SHA-256 without salt
async function verifyUser(username: string, password: string) {
  const hash = crypto.createHash('sha256').update(password).digest('hex');
  const user = await db.query('SELECT * FROM users WHERE username=$1 AND password_hash=$2',
    [username, hash]);
  return user.rows[0];
}
```

## Secure Code

```typescript
import bcrypt from 'bcrypt';

const SALT_ROUNDS = 12;

// SECURE: bcrypt with proper cost factor
async function registerUser(username: string, password: string) {
  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  await db.query('INSERT INTO users (username, password_hash) VALUES ($1, $2)',
    [username, passwordHash]);
}

async function verifyUser(username: string, password: string) {
  const user = await db.query('SELECT * FROM users WHERE username=$1', [username]);
  if (!user.rows[0]) return null;
  const valid = await bcrypt.compare(password, user.rows[0].password_hash);
  return valid ? user.rows[0] : null;
}
```

## Impact

An attacker who obtains the database (via SQL injection, backup leak, or breach) can recover plaintext passwords for most users within hours. This enables account takeover not just on the compromised service, but on any other service where users reuse passwords.

## References

- CVE-2025-49197: SICK Media Server weak password hashing (CWE-328)
- CVE-2025-69929: N3uron broken cryptographic algorithm for password hashing
- CWE-916: Use of Password Hash With Insufficient Computational Effort
- https://owasp.org/Top10/A02_2021-Cryptographic_Failures/
- OWASP Password Storage Cheat Sheet
