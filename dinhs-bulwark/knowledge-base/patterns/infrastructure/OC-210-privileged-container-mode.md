# OC-210: Privileged Container Mode

**Category:** Infrastructure
**Severity:** HIGH
**Auditors:** INFRA-01
**CWE:** CWE-250 (Execution with Unnecessary Privileges)
**OWASP:** A05:2021 - Security Misconfiguration

## Description

Running a Docker container with the `--privileged` flag disables virtually all container isolation mechanisms. A privileged container has access to all host devices, can mount filesystems, load kernel modules, modify kernel parameters via sysfs, and access raw network interfaces. It effectively runs with the same capabilities as the Docker daemon itself, which typically runs as root on the host.

The danger of privileged mode was demonstrated dramatically with CVE-2025-9074 (CVSS 9.3), where Docker Desktop containers could access the Docker Engine API and launch additional containers without requiring the Docker socket to be mounted. In one real-world incident, a staging environment running privileged containers for "debugging purposes" was compromised through an exposed Redis instance, allowing the attacker to escape the container and deploy cryptominers across 200+ EC2 instances, generating a $47K AWS bill overnight.

In Kubernetes, privileged mode is set via `securityContext.privileged: true` in the pod spec. Many Kubernetes admission controllers (OPA Gatekeeper, Kyverno) explicitly deny privileged pods by default, but teams frequently add exceptions for monitoring agents or system-level tools without understanding the security implications.

## Detection

```
# Search docker-compose for privileged mode
grep -rn "privileged:\s*true" **/docker-compose*.yml **/*.yml **/*.yaml

# Search for --privileged flag in scripts
grep -rn "\-\-privileged" **/*.sh **/*.yml **/*.yaml **/Dockerfile*

# Search Kubernetes manifests for privileged security context
grep -rn "privileged:\s*true" **/*.yml **/*.yaml

# Search for excessive Linux capabilities
grep -rn "SYS_ADMIN\|SYS_PTRACE\|NET_ADMIN\|ALL" **/*.yml **/*.yaml | grep -i "capabilities"

# Search Helm charts
grep -rn "privileged:\s*true" **/templates/*.yml **/templates/*.yaml **/values.yml
```

## Vulnerable Code

```yaml
# docker-compose.yml
services:
  monitor:
    image: monitoring/system-monitor:latest
    privileged: true   # Full host access
    volumes:
      - /:/rootfs:ro
      - /var/run/docker.sock:/var/run/docker.sock
    ports:
      - "8080:8080"
```

```yaml
# kubernetes deployment
apiVersion: apps/v1
kind: Deployment
spec:
  template:
    spec:
      containers:
        - name: app
          image: myapp:latest
          securityContext:
            privileged: true    # Disables all isolation
            capabilities:
              add: ["ALL"]      # Grants all Linux capabilities
```

## Secure Code

```yaml
# docker-compose.yml - minimal capabilities
services:
  monitor:
    image: monitoring/system-monitor:latest
    read_only: true
    security_opt:
      - no-new-privileges:true
    cap_drop:
      - ALL
    cap_add:
      - NET_BIND_SERVICE   # Only the specific capability needed
    tmpfs:
      - /tmp
```

```yaml
# kubernetes - restrictive security context
apiVersion: apps/v1
kind: Deployment
spec:
  template:
    spec:
      containers:
        - name: app
          image: myapp:latest
          securityContext:
            privileged: false
            runAsNonRoot: true
            runAsUser: 1000
            readOnlyRootFilesystem: true
            allowPrivilegeEscalation: false
            capabilities:
              drop: ["ALL"]
```

## Impact

An attacker inside a privileged container can:
- Escape to the host system trivially (mount host filesystem, access /dev)
- Load malicious kernel modules
- Access all host network interfaces (sniff traffic)
- Manipulate other containers on the same host
- Deploy cryptominers or backdoors across the infrastructure
- Access host secrets, credentials, and SSH keys

## References

- CVE-2025-9074: Docker Desktop container escape (CVSS 9.3, August 2025)
- CVE-2024-21626: runc container escape via file descriptor leak (January 2024)
- Real-world incident: Privileged container led to $47K AWS bill via cryptomining
- Kubernetes Pod Security Standards: https://kubernetes.io/docs/concepts/security/pod-security-standards/
- CWE-250: https://cwe.mitre.org/data/definitions/250.html
- Docker capabilities documentation: https://docs.docker.com/engine/reference/run/#runtime-privilege-and-linux-capabilities
