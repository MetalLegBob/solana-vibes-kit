# OC-015: Default Credentials in Production

**Category:** Secrets & Credentials
**Severity:** CRITICAL
**Auditors:** SEC-02
**CWE:** CWE-1392 (Use of Default Credentials)
**OWASP:** A07:2021 – Identification and Authentication Failures

## Description

Default credentials — factory-set passwords, example API keys, or well-known admin accounts — left unchanged in production systems provide trivial entry points for attackers. Automated scanning tools continuously probe for default credentials across exposed services, and lists of default passwords for thousands of products are freely available.

CVE-2023-27584 (CVSS 9.8) in Dragonfly, a CNCF project, was caused by a hardcoded JWT secret defaulting to the literal string "Secret Key" — giving any attacker full administrative access. CVE-2024-28987 (CVSS 9.1) in SolarWinds Web Help Desk exposed a hardcoded credential that allowed remote unauthenticated access. CVE-2025-34034 documented hardcoded default accounts in Blue Angel Software Suite deployed on embedded systems. These are not edge cases — default credential exploitation is so common that CISA maintains a Known Exploited Vulnerabilities catalog where it regularly appears.

In off-chain crypto applications, default credentials in admin panels, monitoring dashboards (Grafana, Kibana), database management interfaces, and RPC node configurations are frequently exploited.

## Detection

```
grep -rn "admin\|password\|default\|changeme\|12345\|qwerty\|letmein" --include="*.ts" --include="*.js" --include="*.json" --include="*.yaml" --include="*.env"
grep -rn "username.*admin.*password\|user.*root.*pass" --include="*.ts" --include="*.js" --include="*.json"
grep -rn "TODO.*password\|FIXME.*credential\|HACK.*secret" --include="*.ts" --include="*.js"
grep -rn "Secret Key\|secret_key_base\|default_secret" --include="*.ts" --include="*.js" --include="*.json" --include="*.yaml"
```

Look for: TODO/FIXME comments near credential assignments, example credentials from documentation, common default passwords, database seeds with admin accounts.

## Vulnerable Code

```typescript
// VULNERABLE: Default admin credentials in application configuration
const DEFAULT_CONFIG = {
  admin: {
    username: "admin",
    password: "admin123",  // TODO: change before production
  },
  jwt: {
    secret: "Secret Key",  // Same pattern as CVE-2023-27584
  },
  database: {
    host: "localhost",
    user: "postgres",
    password: "postgres",  // Default PostgreSQL password
  },
};

// Configuration falls back to defaults if env vars are missing
const config = {
  admin: {
    username: process.env.ADMIN_USER || DEFAULT_CONFIG.admin.username,
    password: process.env.ADMIN_PASS || DEFAULT_CONFIG.admin.password,
  },
  jwt: {
    secret: process.env.JWT_SECRET || DEFAULT_CONFIG.jwt.secret,
  },
};
```

## Secure Code

```typescript
// SECURE: No default credentials — fail hard if not configured
function loadConfig() {
  const required = [
    "ADMIN_USER",
    "ADMIN_PASS",
    "JWT_SECRET",
    "DATABASE_PASSWORD",
  ];

  const missing = required.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(
      `Missing required configuration: ${missing.join(", ")}. ` +
      `Set these environment variables before starting the application.`
    );
  }

  // Validate secret strength
  if (process.env.JWT_SECRET!.length < 32) {
    throw new Error("JWT_SECRET must be at least 32 characters");
  }

  return {
    admin: {
      username: process.env.ADMIN_USER!,
      password: process.env.ADMIN_PASS!, // Should be hashed at first use
    },
    jwt: {
      secret: process.env.JWT_SECRET!,
    },
  };
}
```

## Impact

Default credentials provide immediate, unauthenticated access to production systems. Automated scanners test for default credentials within hours of a service being exposed to the internet. In the crypto context, default credentials on admin panels can lead to configuration changes, fund transfers, or key export. Default database passwords enable direct data access bypassing all application-level controls.

## References

- CVE-2023-27584: Dragonfly hardcoded JWT "Secret Key" — CVSS 9.8
- CVE-2024-28987: SolarWinds WHD hardcoded credential — CVSS 9.1 (CISA KEV)
- CVE-2025-34034: Blue Angel Software Suite hardcoded default accounts
- CWE-1392: Use of Default Credentials — https://cwe.mitre.org/data/definitions/1392.html
- OWASP A07:2021: Identification and Authentication Failures
