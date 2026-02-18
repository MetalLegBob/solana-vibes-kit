# OC-157: Database Credentials Hardcoded

**Category:** Data Security
**Severity:** CRITICAL
**Auditors:** DATA-01, SEC-02
**CWE:** CWE-798 (Use of Hard-coded Credentials)
**OWASP:** A07:2021 – Identification and Authentication Failures

## Description

Hardcoded database credentials occur when usernames, passwords, or connection strings containing credentials are embedded directly in source code, configuration files committed to version control, or Docker images. This is one of the most common and dangerous patterns in off-chain applications.

GitGuardian's 2025 report found 23.8 million new secrets leaked on public GitHub in 2024, with database credentials among the most frequently leaked types. The EY data breach (October 2025) demonstrated the catastrophic consequences: a 4TB SQL Server backup containing credentials, API keys, and session tokens was found publicly accessible on Azure, enabling potential access to EY's entire database infrastructure. Even when credentials are later removed from source code, they persist in git history and must be rotated.

Connection string injection (Connection String Parameter Pollution) is a related attack where an attacker injects additional parameters into a dynamically constructed connection string, potentially changing the target database or authentication method. This was documented at Black Hat DC 2010 and remains relevant when connection strings are built from user input.

## Detection

```
grep -rn "password.*=.*['\"]" --include="*.ts" --include="*.js" --include="*.json"
grep -rn "mongodb://.*:.*@\|postgres://.*:.*@\|mysql://.*:.*@" --include="*.ts" --include="*.js"
grep -rn "DB_PASSWORD\s*=\s*['\"]" --include="*.env" --include="*.env.*"
grep -rn "connectionString.*password\|host.*password" --include="*.ts" --include="*.js"
grep -rn "PGPASSWORD\|MYSQL_ROOT_PASSWORD\|MONGO_INITDB_ROOT_PASSWORD" --include="*.yml" --include="*.yaml" --include="*.env"
```

Look for: connection strings with embedded passwords, password fields in configuration objects, `.env` files committed to git, Docker Compose files with database passwords.

## Vulnerable Code

```typescript
import { Pool } from "pg";
import mongoose from "mongoose";

// VULNERABLE: Credentials in source code
const pool = new Pool({
  host: "production-db.internal",
  user: "admin",
  password: "SuperSecret123!", // Hardcoded password
  database: "main_app",
});

// VULNERABLE: Full connection string with credentials
const MONGO_URI = "mongodb://admin:P@ssw0rd@mongo.prod:27017/app?authSource=admin";
await mongoose.connect(MONGO_URI);

// VULNERABLE: Connection string built from user input (CSPP risk)
function getConnection(dbName: string) {
  return new Pool({
    connectionString: `postgres://user:pass@host:5432/${dbName}`,
  });
}
```

## Secure Code

```typescript
import { Pool } from "pg";
import mongoose from "mongoose";
import { SecretsManager } from "@aws-sdk/client-secrets-manager";

// SECURE: Credentials from secrets manager
async function createPool(): Promise<Pool> {
  const client = new SecretsManager({ region: "us-east-1" });
  const secret = await client.getSecretValue({ SecretId: "prod/db/credentials" });
  const { username, password, host, port, dbname } = JSON.parse(secret.SecretString!);

  return new Pool({
    host,
    port: parseInt(port),
    user: username,
    password,
    database: dbname,
    ssl: { rejectUnauthorized: true },
  });
}

// SECURE: Connection string from environment variable (not committed)
await mongoose.connect(process.env.MONGODB_URI!, {
  tls: true,
  tlsCAFile: "/etc/ssl/certs/mongo-ca.pem",
});
```

## Impact

Exposed database credentials grant an attacker direct access to the database with the privileges of the hardcoded account. This typically enables full read access to all application data, modification or deletion of records, and extraction of other secrets stored in the database. If the credentials belong to an admin account, the attacker gains schema modification and user management capabilities.

## References

- CVE-2024-1597: PostgreSQL JDBC SQL injection via connection parameters
- EY Data Breach (October 2025): 4TB SQL Server backup with credentials exposed on Azure
- CWE-798: Use of Hard-coded Credentials — https://cwe.mitre.org/data/definitions/798.html
- Connection String Parameter Pollution (CSPP) — Black Hat DC 2010
- OWASP A07:2021 – Identification and Authentication Failures
