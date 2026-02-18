# OC-026: Bcrypt with Insufficient Rounds (< 10)

**Category:** Authentication & Authorization
**Severity:** MEDIUM
**Auditors:** AUTH-01
**CWE:** CWE-916
**OWASP:** A02:2021 - Cryptographic Failures

## Description

Bcrypt is a widely recommended password hashing function, but its security depends on the work factor (cost/rounds parameter). Each increment doubles the computation time. A cost factor below 10 provides insufficient resistance against modern GPU-based cracking, while the OWASP recommendation is a minimum of 10 with a target of 12 or higher as of 2024.

CVE-2022-22976 in Spring Security demonstrated a boundary case: when bcrypt was configured with the maximum work factor of 31, an integer overflow caused zero salt rounds to be applied, effectively eliminating the protection entirely. While the extreme high end is unlikely in practice, it shows that even a well-known library can have implementation flaws around the work factor.

Argon2id is now the OWASP-recommended modern alternative, offering resistance to both GPU attacks (via memory hardness) and side-channel attacks. However, bcrypt remains acceptable when properly configured with a cost factor of at least 10.

## Detection

```
# Bcrypt with low rounds
grep -rn "bcrypt.*salt\|genSalt\|saltRounds\|SALT_ROUNDS" --include="*.ts" --include="*.js"
# Hardcoded low cost factor
grep -rn "genSalt\s*(\s*[1-9]\s*)" --include="*.ts" --include="*.js"
# bcrypt.hash with inline low number
grep -rn "bcrypt\.hash\(.*,\s*[1-9]\s*[,)]" --include="*.ts" --include="*.js"
```

## Vulnerable Code

```typescript
import bcrypt from 'bcrypt';

// VULNERABLE: Cost factor of 4 is trivially fast to brute force
const SALT_ROUNDS = 4;

async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}
```

## Secure Code

```typescript
import bcrypt from 'bcrypt';

// SECURE: Cost factor of 12 per OWASP recommendation
const SALT_ROUNDS = 12;

async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

// BETTER: Use Argon2id for new applications
import argon2 from 'argon2';

async function hashPasswordArgon2(password: string): Promise<string> {
  return argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 65536,  // 64 MB
    timeCost: 3,
    parallelism: 4,
  });
}
```

## Impact

Low-cost-factor bcrypt hashes can be cracked significantly faster than properly configured ones. An attacker with a stolen database can recover weak and medium-strength passwords in hours instead of the years that a proper cost factor would require.

## References

- CVE-2022-22976: Spring Security BCrypt integer overflow at work factor 31
- OWASP Password Storage Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html
- CWE-916: Use of Password Hash With Insufficient Computational Effort
- https://arxiv.org/abs/2504.17121 - Evaluating Argon2 Adoption in Real-World Software
