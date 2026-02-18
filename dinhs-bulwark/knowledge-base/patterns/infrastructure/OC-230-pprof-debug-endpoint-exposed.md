# OC-230: pprof/Debug Endpoint Exposed in Production

**Category:** Infrastructure
**Severity:** HIGH
**Auditors:** INFRA-05
**CWE:** CWE-489 (Active Debug Code)
**OWASP:** A05:2021 - Security Misconfiguration

## Description

Go's `net/http/pprof` package and similar runtime profiling endpoints expose detailed runtime information including heap profiles, goroutine dumps, CPU profiling data, memory allocation traces, and mutex contention stats. When these endpoints are accessible in production, they leak internal application state and can be abused for denial-of-service attacks by triggering expensive profiling operations.

Aqua Security's 2024 research found over 296,000 exposed Prometheus instances vulnerable to DoS attacks via `/debug/pprof` endpoints. CVE-2019-11248 documented the exposure of `/debug/pprof` over the unauthenticated Kubelet health port in Kubernetes, affecting versions prior to 1.15.0. The endpoint is particularly dangerous because simply importing the `net/http/pprof` package in Go automatically registers handler functions on the default HTTP mux, meaning developers may not realize they are exposing it.

Beyond Go's pprof, similar risks exist with Node.js's `--inspect` debug protocol, Java's JMX endpoints, Python's `faulthandler`, and any application-level debug or profiling endpoints. These endpoints should never be accessible from the public internet or by unauthorized internal users.

## Detection

```
# Search for pprof import in Go code
grep -rn "\"net/http/pprof\"\|_ \"net/http/pprof\"" **/*.go

# Search for debug endpoints in route definitions
grep -rn "/debug/pprof\|/debug/vars\|/debug/requests" **/*.go **/*.ts **/*.js **/*.yml

# Search for profiling endpoints in nginx configs
grep -rn "debug\|pprof\|profil" **/nginx*.conf **/*.conf | grep "location"

# Search for debug port exposure
grep -rn "EXPOSE.*\(6060\|8080\)" **/Dockerfile* | grep -i "debug\|pprof\|profil"

# Search for Kubernetes services exposing pprof port
grep -rn "6060\|debug" **/*.yml **/*.yaml | grep -i "port\|service"

# Search for Node.js profiling libraries
grep -rn "v8-profiler\|clinic\|0x\|node --prof" **/*.ts **/*.js **/package.json
```

## Vulnerable Code

```go
package main

import (
    "net/http"
    // Importing pprof auto-registers handlers on DefaultServeMux
    _ "net/http/pprof"
)

func main() {
    http.HandleFunc("/api/data", dataHandler)

    // pprof is now available at /debug/pprof/* on the SAME port
    // Accessible to anyone who can reach port 8080
    http.ListenAndServe(":8080", nil)
}
```

```dockerfile
FROM golang:1.22-alpine AS builder
RUN go build -o /app ./cmd/server

FROM alpine:3.19
COPY --from=builder /app /app
# Both app and pprof exposed on same port
EXPOSE 8080
CMD ["/app"]
```

## Secure Code

```go
package main

import (
    "net/http"
    "net/http/pprof"
    "os"
)

func main() {
    // Application routes on dedicated mux (NOT DefaultServeMux)
    appMux := http.NewServeMux()
    appMux.HandleFunc("/api/data", dataHandler)

    // pprof on separate internal mux, only in non-production
    if os.Getenv("ENABLE_PROFILING") == "true" {
        debugMux := http.NewServeMux()
        debugMux.HandleFunc("/debug/pprof/", pprof.Index)
        debugMux.HandleFunc("/debug/pprof/cmdline", pprof.Cmdline)
        debugMux.HandleFunc("/debug/pprof/profile", pprof.Profile)
        debugMux.HandleFunc("/debug/pprof/symbol", pprof.Symbol)
        debugMux.HandleFunc("/debug/pprof/trace", pprof.Trace)

        // Listen only on localhost, separate port
        go http.ListenAndServe("127.0.0.1:6060", debugMux)
    }

    // Application server - no pprof endpoints
    http.ListenAndServe(":8080", appMux)
}
```

```go
// Alternative: use build tags to exclude pprof entirely
// +build !production

package debug

import _ "net/http/pprof"

func init() {
    // Only compiled into non-production builds
}
```

```yaml
# kubernetes - NetworkPolicy blocking pprof port
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: block-debug-ports
spec:
  podSelector:
    matchLabels:
      app: myapp
  ingress:
    - ports:
        - port: 8080  # Only app port allowed
    # Port 6060 (pprof) is implicitly denied
```

## Impact

An attacker who accesses exposed pprof/debug endpoints can:
- Trigger expensive CPU and memory profiling, causing denial-of-service
- Extract heap dumps containing sensitive data (secrets, keys, user data in memory)
- Map internal application structure from goroutine and stack traces
- Determine library versions and dependencies from symbol information
- Monitor real-time application behavior for reconnaissance
- Extract internal memory addresses to aid in exploit development

## References

- CVE-2019-11248: Kubernetes exposed /debug/pprof on unauthenticated Kubelet port
- Aqua Security: 296,000+ exposed Prometheus instances with pprof endpoints (December 2024)
- Red Sentry: "Securing Go Applications Against debug/pprof Exploits" (December 2025)
- Bearer CLI: go_gosec_leak_pprof_endpoint rule
- Amazon Q Detector Library: Pprof Endpoint detector
- CWE-489: https://cwe.mitre.org/data/definitions/489.html
