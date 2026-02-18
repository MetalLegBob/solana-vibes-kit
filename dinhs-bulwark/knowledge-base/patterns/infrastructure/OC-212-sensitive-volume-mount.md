# OC-212: Sensitive Volume Mount

**Category:** Infrastructure
**Severity:** HIGH
**Auditors:** INFRA-01
**CWE:** CWE-668 (Exposure of Resource to Wrong Sphere)
**OWASP:** A05:2021 - Security Misconfiguration

## Description

Mounting sensitive host paths into Docker containers breaks the isolation boundary between host and container. The most dangerous mount is the Docker socket (`/var/run/docker.sock`), which grants full control over the Docker daemon. An attacker who compromises a container with the Docker socket mounted can create new privileged containers, access any volume on the host, and effectively gain root access to the host system.

Other sensitive mounts include the host root filesystem (`/`), SSH keys (`/root/.ssh` or `/home/*/.ssh`), cloud credential directories (`~/.aws`, `~/.kube`), `/etc/shadow`, and `/proc` with elevated access. Each of these provides a direct escalation path from container compromise to host compromise.

The Docker socket mount pattern is particularly common in CI/CD systems (Jenkins agents, GitLab runners) and monitoring tools that need to query the Docker API. In these cases, a compromised CI job or monitoring container becomes a full host compromise. The 2024 Kubernetes penetration testing series from RBT Security demonstrated how an exposed Docker socket allowed escalation from a web application vulnerability to full worker node filesystem compromise.

## Detection

```
# Search for Docker socket mounts
grep -rn "docker.sock" **/docker-compose*.yml **/*.yml **/*.yaml **/Dockerfile*

# Search for sensitive host path mounts
grep -rn "/etc/shadow\|/etc/passwd\|/root\|\.ssh\|\.aws\|\.kube\|\.gnupg" **/docker-compose*.yml **/*.yml

# Search for host root filesystem mount
grep -rn "- /:/\|/:/rootfs\|/:/host" **/docker-compose*.yml **/*.yml

# Search for /proc or /sys mounts
grep -rn "/proc\|/sys" **/docker-compose*.yml **/*.yml | grep -i "volume\|mount"

# Search Kubernetes hostPath volumes
grep -A3 "hostPath:" **/*.yml **/*.yaml
```

## Vulnerable Code

```yaml
# docker-compose.yml
services:
  ci-runner:
    image: gitlab/gitlab-runner:latest
    volumes:
      # Docker socket = full host control
      - /var/run/docker.sock:/var/run/docker.sock
      # Host root filesystem
      - /:/host:rw
      # SSH keys exposed
      - ~/.ssh:/root/.ssh:ro
      # Cloud credentials
      - ~/.aws:/root/.aws:ro
```

```yaml
# kubernetes hostPath volume
apiVersion: v1
kind: Pod
spec:
  volumes:
    - name: docker-sock
      hostPath:
        path: /var/run/docker.sock
  containers:
    - name: builder
      volumeMounts:
        - name: docker-sock
          mountPath: /var/run/docker.sock
```

## Secure Code

```yaml
# docker-compose.yml - use named volumes, no host paths
services:
  ci-runner:
    image: gitlab/gitlab-runner:latest
    volumes:
      - runner-data:/data    # Named volume, not host path
    # Use Docker-in-Docker with TLS instead of socket mount
    environment:
      - DOCKER_HOST=tcp://docker:2376
      - DOCKER_TLS_CERTDIR=/certs
      - DOCKER_TLS_VERIFY=1

  docker:
    image: docker:dind
    privileged: true  # DinD still needs this, but is isolated
    volumes:
      - runner-data:/data
    command: ["--tls=true"]

volumes:
  runner-data:
```

```yaml
# kubernetes - use ephemeral volumes, avoid hostPath
apiVersion: v1
kind: Pod
spec:
  volumes:
    - name: tmp
      emptyDir:
        sizeLimit: 100Mi
  containers:
    - name: builder
      volumeMounts:
        - name: tmp
          mountPath: /tmp
      securityContext:
        readOnlyRootFilesystem: true
```

## Impact

An attacker who compromises a container with sensitive volume mounts can:
- Gain full control of the Docker daemon via the socket (create/destroy any container)
- Read/write to the host filesystem including /etc/shadow, SSH keys
- Steal cloud credentials from mounted directories
- Pivot to other hosts using stolen SSH keys or cloud credentials
- Persist on the host by modifying startup scripts or crontabs

## References

- Docker Socket Security Guide (InstaTunnel, September 2025)
- RBT Security: Kubernetes Penetration Testing Part Two - Docker socket escalation
- Wiz: Container Escape Detection and Prevention
- CWE-668: https://cwe.mitre.org/data/definitions/668.html
- Docker volumes security: https://docs.docker.com/storage/volumes/
