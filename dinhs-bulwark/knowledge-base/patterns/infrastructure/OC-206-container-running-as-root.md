# OC-206: Container Running as Root

**Category:** Infrastructure
**Severity:** MEDIUM
**Auditors:** INFRA-01
**CWE:** CWE-250 (Execution with Unnecessary Privileges)
**OWASP:** A05:2021 - Security Misconfiguration

## Description

Docker containers run as root by default, which means that if an attacker exploits a vulnerability inside the container, they obtain root-level access within the container's namespace. While Linux namespaces provide isolation, this isolation is not absolute. Kernel vulnerabilities such as CVE-2024-21626 (runc container escape via leaked file descriptors) and CVE-2019-5736 (runc container escape to host root) demonstrate that root inside a container can become root on the host.

Running containers as root dramatically increases the blast radius of any container escape vulnerability. Research from NSFOCUS Security Labs found that 76% of Docker Hub images contain security vulnerabilities. When a container escape occurs from a root-running container, the attacker immediately gains full host-level privileges, enabling lateral movement across the infrastructure.

The fix is straightforward: create a non-root user in the Dockerfile and switch to it with the `USER` directive. Most application workloads do not require root privileges at runtime.

## Detection

```
# Search Dockerfiles missing USER directive
grep -rL "^USER" **/Dockerfile*

# Search for explicit root user
grep -rn "USER root" **/Dockerfile*
grep -rn "USER 0" **/Dockerfile*

# Search docker-compose for user override
grep -rn "user:.*root" **/docker-compose*.yml
grep -rn "user:.*\"0" **/docker-compose*.yml

# Search for containers started without --user flag
grep -rn "docker run" --include="*.sh" --include="*.yml" | grep -v "\-\-user"
```

## Vulnerable Code

```dockerfile
FROM node:20

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .

EXPOSE 3000
# No USER directive - container runs as root (PID 1 is root)
CMD ["node", "server.js"]
```

## Secure Code

```dockerfile
FROM node:20

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .

# Create non-root user and group
RUN groupadd -r appuser && useradd -r -g appuser -d /app -s /sbin/nologin appuser
RUN chown -R appuser:appuser /app

# Switch to non-root user
USER appuser

EXPOSE 3000
CMD ["node", "server.js"]
```

## Impact

An attacker who exploits an application vulnerability in a root-running container can:
- Escape to the host system via kernel vulnerabilities (CVE-2024-21626, CVE-2019-5736)
- Read and modify files from mounted host volumes
- Access sensitive host resources if additional capabilities are granted
- Pivot to other containers on the same host
- Install persistent backdoors on the host filesystem

## References

- CVE-2024-21626: runc container escape via leaked file descriptors (January 2024)
- CVE-2019-5736: runc container escape to host root via /proc/self/exe overwrite
- CVE-2025-9074: Docker Desktop container escape (CVSS 9.3)
- CWE-250: https://cwe.mitre.org/data/definitions/250.html
- Docker Security Best Practices: https://docs.docker.com/engine/security/
- NSFOCUS Labs: 76% of Docker Hub images contain vulnerabilities
