# OC-211: No Resource Limits on Container

**Category:** Infrastructure
**Severity:** MEDIUM
**Auditors:** INFRA-01
**CWE:** CWE-770 (Allocation of Resources Without Limits or Throttling)
**OWASP:** A05:2021 - Security Misconfiguration

## Description

Containers without CPU and memory limits can consume all available resources on the host, enabling denial-of-service attacks against co-located services. By default, Docker and Kubernetes place no resource constraints on containers, meaning a single runaway or malicious container can starve all other workloads on the same node.

In Kubernetes, pods without resource requests and limits are classified as "BestEffort" QoS, which means they are the first to be killed during resource pressure. However, before the OOM killer intervenes, they can cause cascading failures by exhausting shared resources. A cryptominer deployed inside a compromised container with no CPU limits will consume 100% of available CPU, degrading all other services.

Memory limits are equally critical. A memory leak in an unlimited container can trigger the Linux OOM killer, which may kill unrelated processes on the same host. This is a well-documented vector for denial-of-service in multi-tenant container environments.

## Detection

```
# Search docker-compose for missing resource limits
grep -L "mem_limit\|memory\|cpus\|deploy:" **/docker-compose*.yml

# Search for deploy section without limits in docker-compose
grep -A10 "deploy:" **/docker-compose*.yml | grep -L "limits"

# Search Kubernetes manifests for missing resource specs
grep -L "resources:" **/*.yml **/*.yaml | grep -i "deployment\|statefulset\|pod"

# Search for containers without limits in Kubernetes
grep -A5 "containers:" **/*.yml **/*.yaml | grep -L "limits:"

# Check for unlimited memory in docker run commands
grep -rn "docker run" **/*.sh | grep -v "\-\-memory\|\-m "
```

## Vulnerable Code

```yaml
# docker-compose.yml - no resource limits
services:
  api:
    image: myapp:latest
    ports:
      - "3000:3000"
    # No deploy.resources section - unlimited resources
```

```yaml
# kubernetes - no resource requests or limits
apiVersion: apps/v1
kind: Deployment
spec:
  template:
    spec:
      containers:
        - name: api
          image: myapp:latest
          ports:
            - containerPort: 3000
          # No resources section - BestEffort QoS
```

## Secure Code

```yaml
# docker-compose.yml - with resource limits
services:
  api:
    image: myapp:latest
    ports:
      - "3000:3000"
    deploy:
      resources:
        limits:
          cpus: "1.0"
          memory: 512M
        reservations:
          cpus: "0.25"
          memory: 128M
    # Also set pids limit to prevent fork bombs
    pids_limit: 100
```

```yaml
# kubernetes - with resource requests and limits
apiVersion: apps/v1
kind: Deployment
spec:
  template:
    spec:
      containers:
        - name: api
          image: myapp:latest
          resources:
            requests:
              cpu: "250m"
              memory: "128Mi"
            limits:
              cpu: "1000m"
              memory: "512Mi"
          ports:
            - containerPort: 3000
```

## Impact

Without resource limits, an attacker or a bug can:
- Exhaust all CPU on the host, causing denial-of-service for co-located services
- Consume all memory, triggering the OOM killer on unrelated processes
- Launch fork bombs to exhaust process IDs on the host
- Deploy cryptominers that monopolize compute resources
- Cause cascading failures across the entire node or cluster

## References

- CWE-770: https://cwe.mitre.org/data/definitions/770.html
- Docker resource constraints: https://docs.docker.com/config/containers/resource_constraints/
- Kubernetes Resource Management: https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/
- Kubernetes QoS classes: Guaranteed, Burstable, BestEffort
- Real-world: cryptominer deployments in unlimited containers (AWS $47K+ incidents)
