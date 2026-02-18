# OC-227: Internal Service Communication Without TLS

**Category:** Infrastructure
**Severity:** HIGH
**Auditors:** INFRA-04
**CWE:** CWE-319 (Cleartext Transmission of Sensitive Information)
**OWASP:** A02:2021 - Cryptographic Failures

## Description

Microservices communicating over plaintext HTTP, unencrypted gRPC, or unencrypted database connections within a container network or VPC are vulnerable to traffic interception by any attacker who gains access to the internal network. The common assumption that "internal traffic is safe" is dangerous: network segmentation is routinely bypassed via SSRF, container escapes, or compromised adjacent services.

In Docker environments, containers on the same Docker network can observe each other's traffic using ARP spoofing or by compromising the Docker bridge. In Kubernetes, pod-to-pod traffic is unencrypted by default; any pod compromised by an attacker can sniff traffic from other pods on the same node. Cloud VPCs provide network isolation from the internet but not from other workloads within the same VPC.

Zero-trust architecture requires that every service-to-service connection be authenticated and encrypted, regardless of network location. This is achievable through mutual TLS (mTLS) either at the application level or via a service mesh (Istio, Linkerd). For database connections, TLS should always be enforced with `sslmode=require` or `sslmode=verify-full`.

## Detection

```
# Search for HTTP URLs to internal services (not HTTPS)
grep -rn "http://\(localhost\|127\.0\.0\.1\|10\.\|172\.\|192\.168\.\|internal\|svc\.cluster\)" **/*.ts **/*.js **/*.yml

# Search for database connections without SSL
grep -rn "sslmode=disable\|ssl=false\|useSSL=false\|ssl:\s*false" **/*.ts **/*.js **/.env* **/*.yml

# Search for unencrypted Redis connections
grep -rn "redis://[^s]" **/*.ts **/*.js **/.env*  # redis:// vs rediss://

# Search for unencrypted gRPC channels
grep -rn "createInsecure\|grpc\.credentials\.createInsecure" **/*.ts **/*.js

# Search for unencrypted AMQP/RabbitMQ
grep -rn "amqp://[^s]" **/*.ts **/*.js **/.env*  # amqp:// vs amqps://

# Search for internal service URLs in docker-compose
grep -rn "http://\w" **/docker-compose*.yml
```

## Vulnerable Code

```typescript
// services.ts - unencrypted internal communication
import axios from "axios";
import { createClient } from "redis";
import { Pool } from "pg";

// Unencrypted HTTP to internal service
const userService = axios.create({
  baseURL: "http://user-service:3001",  // Plaintext HTTP
});

// Unencrypted Redis connection
const redis = createClient({
  url: "redis://redis-server:6379",  // No TLS
});

// Database without SSL
const db = new Pool({
  host: "postgres-primary",
  port: 5432,
  ssl: false,  // Plaintext database connection
});
```

```yaml
# docker-compose.yml - all internal traffic unencrypted
services:
  api:
    environment:
      - USER_SERVICE_URL=http://user-service:3001
      - DATABASE_URL=postgres://user:pass@postgres:5432/app
      - REDIS_URL=redis://redis:6379
```

## Secure Code

```typescript
// services.ts - encrypted internal communication
import axios from "axios";
import { createClient } from "redis";
import { Pool } from "pg";
import fs from "fs";

const internalCA = fs.readFileSync("/etc/ssl/certs/internal-ca.pem");

// HTTPS with mTLS for internal services
const userService = axios.create({
  baseURL: "https://user-service:3001",
  httpsAgent: new https.Agent({
    ca: internalCA,
    cert: fs.readFileSync("/etc/ssl/certs/client.pem"),
    key: fs.readFileSync("/etc/ssl/private/client-key.pem"),
  }),
});

// TLS-encrypted Redis connection
const redis = createClient({
  url: "rediss://redis-server:6379",  // rediss:// = TLS
  socket: {
    tls: true,
    ca: internalCA,
  },
});

// Database with SSL required
const db = new Pool({
  host: "postgres-primary",
  port: 5432,
  ssl: {
    rejectUnauthorized: true,
    ca: internalCA,
  },
});
```

```yaml
# docker-compose.yml - encrypted internal traffic
services:
  api:
    environment:
      - USER_SERVICE_URL=https://user-service:3001
      - DATABASE_URL=postgres://user:pass@postgres:5432/app?sslmode=verify-full
      - REDIS_URL=rediss://redis:6379
    volumes:
      - ./certs:/etc/ssl/certs:ro
```

## Impact

An attacker with access to the internal network can:
- Intercept authentication tokens, session data, and API keys between services
- Read sensitive data (PII, financial data) from unencrypted database queries
- Modify inter-service messages to manipulate business logic
- Impersonate internal services to other services
- Exfiltrate data from Redis/Memcached containing cached credentials or session data
- In shared hosting or cloud environments, adjacent tenants may observe traffic

## References

- CWE-319: https://cwe.mitre.org/data/definitions/319.html
- NIST Zero Trust Architecture (SP 800-207)
- Istio mTLS documentation: https://istio.io/latest/docs/concepts/security/
- PostgreSQL SSL documentation: https://www.postgresql.org/docs/current/ssl-tcp.html
- Redis TLS documentation: https://redis.io/docs/management/security/encryption/
- OWASP: "Insecure Transport" vulnerability
