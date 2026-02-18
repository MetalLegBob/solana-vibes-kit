# OC-156: Database Connection Without TLS

**Category:** Data Security
**Severity:** HIGH
**Auditors:** DATA-01
**CWE:** CWE-319 (Cleartext Transmission of Sensitive Information)
**OWASP:** A02:2021 – Cryptographic Failures

## Description

Database connections that lack TLS encryption transmit all queries, results, and credentials in plaintext over the network. An attacker with network access (via ARP spoofing, compromised switch, or cloud VPC misconfiguration) can passively intercept every database operation, capturing passwords, PII, financial records, and session tokens in transit.

The MongoBleed vulnerability (CVE-2025-14847, December 2025) demonstrated how critical database connection security is: an unauthenticated attacker could leak sensitive heap memory from MongoDB instances over the network, and over 87,000 instances were found exposed worldwide. While MongoBleed was a memory leak flaw rather than a TLS issue, it underscored that databases accessible without proper transport security are high-value targets. Similarly, PostgreSQL connections default to plaintext unless `sslmode` is explicitly configured, and many Node.js ORMs connect without TLS by default.

In cloud environments, the assumption that "internal traffic is safe" is frequently wrong. AWS VPC traffic can be intercepted via compromised instances, and Kubernetes pod-to-pod traffic is unencrypted by default. Every database connection must enforce TLS regardless of network topology.

## Detection

```
grep -rn "ssl.*false\|ssl.*disable\|sslmode.*disable\|rejectUnauthorized.*false" --include="*.ts" --include="*.js" --include="*.json"
grep -rn "mongoose\.connect\|createConnection\|createPool\|new Pool\|new Client" --include="*.ts" --include="*.js"
grep -rn "mongodb://\|postgres://\|mysql://" --include="*.ts" --include="*.js" --include="*.env"
grep -rn "ssl:\s*false\|tls:\s*false" --include="*.ts" --include="*.js" --include="*.yaml"
```

Look for: database connection strings without `ssl=true` or `sslmode=require`, connection options with `ssl: false` or missing SSL config entirely, `rejectUnauthorized: false` disabling certificate validation.

## Vulnerable Code

```typescript
import { Pool } from "pg";
import mongoose from "mongoose";

// VULNERABLE: PostgreSQL connection without TLS
const pool = new Pool({
  host: "db.production.internal",
  port: 5432,
  user: "app_user",
  password: process.env.DB_PASSWORD,
  database: "production",
  // No SSL configuration — all traffic is plaintext
});

// VULNERABLE: MongoDB connection without TLS
await mongoose.connect("mongodb://app_user:password@mongo.internal:27017/production", {
  // No TLS options specified
});

// VULNERABLE: Explicitly disabling SSL
const insecurePool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: false, // Intentionally disabled
});
```

## Secure Code

```typescript
import { Pool } from "pg";
import mongoose from "mongoose";
import { readFileSync } from "fs";

// SECURE: PostgreSQL connection with TLS and certificate validation
const pool = new Pool({
  host: "db.production.internal",
  port: 5432,
  user: "app_user",
  password: process.env.DB_PASSWORD,
  database: "production",
  ssl: {
    rejectUnauthorized: true,
    ca: readFileSync("/etc/ssl/certs/rds-combined-ca-bundle.pem").toString(),
  },
});

// SECURE: MongoDB connection with TLS
await mongoose.connect(process.env.MONGODB_URI!, {
  tls: true,
  tlsCAFile: "/etc/ssl/certs/mongo-ca.pem",
  tlsAllowInvalidCertificates: false,
});
```

## Impact

An attacker with network access can intercept all database traffic including credentials, query parameters, and result sets containing PII or financial data. This enables credential theft, data exfiltration, and potential man-in-the-middle modification of queries or results. In regulated industries, unencrypted database connections violate PCI DSS, HIPAA, and GDPR requirements.

## References

- CVE-2025-14847: MongoBleed — unauthenticated information leak in MongoDB Server
- CWE-319: Cleartext Transmission of Sensitive Information — https://cwe.mitre.org/data/definitions/319.html
- OWASP A02:2021 – Cryptographic Failures
- PostgreSQL SSL Support documentation: https://www.postgresql.org/docs/current/libpq-ssl.html
- AWS RDS: Requiring SSL/TLS for all connections
