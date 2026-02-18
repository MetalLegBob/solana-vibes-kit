# OC-009: No Secret Rotation Mechanism

**Category:** Secrets & Credentials
**Severity:** MEDIUM
**Auditors:** SEC-02
**CWE:** CWE-324 (Use of a Key Past its Expiration Date)
**OWASP:** A02:2021 – Cryptographic Failures

## Description

Secret rotation is the practice of periodically replacing credentials with new ones and invalidating the old values. When applications lack a rotation mechanism, secrets remain valid indefinitely, expanding the window of opportunity for attackers who obtain them through any means — code leaks, log exposure, insider threats, or breach of a third-party service.

GitGuardian's 2025 State of Secrets Sprawl report revealed that 70% of secrets leaked in 2022 were still active in 2024, indicating that most organizations lack effective rotation processes. This means a secret leaked two years ago still provides active access. In the crypto context, this is particularly dangerous because blockchain transactions are irreversible — a long-lived compromised key can be exploited at any time.

The absence of rotation also means there is no mechanism to recover from an undetected compromise. If a key is stolen without the owner's knowledge, it remains usable indefinitely, giving the attacker persistent access.

## Detection

```
grep -rn "rotation\|rotate\|expir\|ttl\|max.age\|key.version" --include="*.ts" --include="*.js" --include="*.json" --include="*.yaml"
grep -rn "createdAt\|lastRotated\|keyAge" --include="*.ts" --include="*.js"
```

Look for absence of: key rotation schedules in ops documentation, key versioning in configuration, automated rotation scripts in CI/CD, key age tracking in monitoring, expiration dates on API keys or tokens.

## Vulnerable Code

```typescript
// VULNERABLE: Static API key with no rotation mechanism
// This key has been the same since the project started
const EXCHANGE_API_KEY = process.env.EXCHANGE_API_KEY!;
const EXCHANGE_SECRET = process.env.EXCHANGE_SECRET!;

// No mechanism to check key age, rotate, or invalidate
async function initExchange() {
  return new Exchange({
    apiKey: EXCHANGE_API_KEY,
    secret: EXCHANGE_SECRET,
  });
}
```

## Secure Code

```typescript
// SECURE: Key rotation mechanism with age tracking and automated refresh
interface ManagedSecret {
  value: string;
  version: number;
  createdAt: Date;
  maxAgeDays: number;
}

class SecretManager {
  private secrets: Map<string, ManagedSecret> = new Map();

  async getSecret(name: string): Promise<string> {
    const secret = this.secrets.get(name);
    if (!secret || this.isExpired(secret)) {
      return this.rotateSecret(name);
    }
    return secret.value;
  }

  private isExpired(secret: ManagedSecret): boolean {
    const ageMs = Date.now() - secret.createdAt.getTime();
    const ageDays = ageMs / (1000 * 60 * 60 * 24);
    return ageDays >= secret.maxAgeDays;
  }

  private async rotateSecret(name: string): Promise<string> {
    // Fetch new secret from vault/secrets manager
    const newValue = await this.vault.getLatestVersion(name);
    this.secrets.set(name, {
      value: newValue,
      version: (this.secrets.get(name)?.version ?? 0) + 1,
      createdAt: new Date(),
      maxAgeDays: 90, // Rotate every 90 days
    });
    return newValue;
  }
}
```

## Impact

Without rotation, compromised secrets provide persistent access. An attacker who obtains a key through any means retains access until the key is manually discovered and revoked. In crypto applications, this means indefinite ability to sign transactions, drain funds, or impersonate accounts. The lack of rotation also eliminates the ability to detect compromise through key invalidation failures.

## References

- GitGuardian 2025: 70% of secrets leaked in 2022 remain active two years later
- CWE-324: Use of a Key Past its Expiration Date — https://cwe.mitre.org/data/definitions/324.html
- Google Cloud Secret Manager best practices: rotation schedules
- NIST SP 800-57: Recommendation for Key Management (key lifecycle)
