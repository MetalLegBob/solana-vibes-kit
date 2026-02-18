# OC-031: Account Enumeration via Timing

**Category:** Authentication & Authorization
**Severity:** MEDIUM
**Auditors:** AUTH-01
**CWE:** CWE-208
**OWASP:** A07:2021 - Identification and Authentication Failures

## Description

Even when error messages are identical for valid and invalid usernames, timing side-channels can reveal account existence. The most common pattern occurs when bcrypt password verification (200-400ms) is only performed for existing users, while non-existing users return immediately after a fast database lookup (1-5ms). This measurable timing difference allows statistical enumeration.

CVE-2026-26185 in Directus demonstrated a particularly subtle timing attack: the application implemented a stall mechanism to hide user existence during password resets, but validated the `reset_url` parameter after the user lookup but before the stall for existing users, creating a 500ms timing discrepancy. CVE-2026-23849 in File Browser exposed the same pattern -- the JSONAuth handler returned immediately for invalid users but invoked bcrypt for valid ones. GHSA-6f65-4fv2-wwch in Vendure's NativeAuthenticationStrategy also returned immediately on user-not-found, producing a 200-400ms timing difference.

This attack is effective even remotely over the internet. Statistical analysis across multiple requests can reliably distinguish sub-100ms timing differences.

## Detection

```
# Early return on user not found (before password check)
grep -rn "findUser\|findByEmail\|getUserBy" --include="*.ts" --include="*.js" -A 5 | grep "return false\|return null\|return res"
# bcrypt.compare only called conditionally
grep -rn "bcrypt\.compare\|verifyPassword\|checkPassword" --include="*.ts" --include="*.js" -B 3 | grep "if.*user"
# Missing dummy hash operation
grep -rn "authenticate\|login\|signIn" --include="*.ts" --include="*.js" -A 15
```

## Vulnerable Code

```typescript
import bcrypt from 'bcrypt';

// VULNERABLE: Timing reveals user existence
async function authenticate(email: string, password: string) {
  const user = await db.query('SELECT * FROM users WHERE email = $1', [email]);
  if (!user.rows[0]) {
    return false; // Returns in ~1-5ms (DB lookup only)
  }
  // bcrypt.compare takes ~200-400ms
  const match = await bcrypt.compare(password, user.rows[0].password_hash);
  return match ? user.rows[0] : false;
}
```

## Secure Code

```typescript
import bcrypt from 'bcrypt';

// Pre-computed dummy hash to use when user is not found
const DUMMY_HASH = '$2b$12$LJ3m4ys3Lk0TSwHgFJgOxuHPpI4eHvMIiC7lFqE.AI8GH2JFQC6Vm';

// SECURE: Constant-time response regardless of user existence
async function authenticate(email: string, password: string) {
  const user = await db.query('SELECT * FROM users WHERE email = $1', [email]);
  const hash = user.rows[0]?.password_hash || DUMMY_HASH;
  // Always run bcrypt.compare, even for non-existent users
  const match = await bcrypt.compare(password, hash);
  if (!user.rows[0] || !match) {
    return false;
  }
  return user.rows[0];
}
```

## Impact

An attacker can compile a list of valid accounts by sending login requests and measuring response times. This narrows the attack surface for subsequent brute force, credential stuffing, or phishing campaigns.

## References

- CVE-2026-26185: Directus user enumeration via password reset timing side-channel
- CVE-2026-23849: File Browser username enumeration via bcrypt timing in /api/login
- GHSA-6f65-4fv2-wwch: Vendure timing attack in NativeAuthenticationStrategy
- GHSA-2h46-8gf5-fmxv: Fides timing-based username enumeration
- CWE-208: Observable Timing Discrepancy
