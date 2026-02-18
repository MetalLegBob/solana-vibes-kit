# Focus Manifest: Web Application Security
<!-- Lists KB files for this category's auditor agents to load. -->
<!-- Agent reads this manifest to know which pattern files + core reference to include in context. -->

## Core Patterns (always load)

### Web Application Security (OC-081–105)
- patterns/web/OC-081-reflected-xss.md
- patterns/web/OC-082-stored-xss.md
- patterns/web/OC-083-dom-based-xss.md
- patterns/web/OC-084-xss-via-dangerouslysetinnerhtml.md
- patterns/web/OC-085-xss-via-markdown-rendering.md
- patterns/web/OC-086-xss-via-svg-upload.md
- patterns/web/OC-087-postmessage-handler-without-origin-check.md
- patterns/web/OC-088-cors-wildcard-with-credentials.md
- patterns/web/OC-089-cors-origin-reflection.md
- patterns/web/OC-090-missing-content-security-policy.md
- patterns/web/OC-091-csp-with-unsafe-inline-unsafe-eval.md
- patterns/web/OC-092-missing-x-frame-options.md
- patterns/web/OC-093-missing-hsts-header.md
- patterns/web/OC-094-missing-x-content-type-options.md
- patterns/web/OC-095-csrf-on-state-changing-endpoint.md
- patterns/web/OC-096-csrf-token-not-validated-server-side.md
- patterns/web/OC-097-csrf-via-cors-misconfiguration.md
- patterns/web/OC-098-samesite-cookie-bypass.md
- patterns/web/OC-099-open-redirect-via-unvalidated-url.md
- patterns/web/OC-100-oauth-redirect-uri-open-redirect.md
- patterns/web/OC-101-javascript-protocol-in-redirect-url.md
- patterns/web/OC-102-clickjacking-via-missing-frame-protection.md
- patterns/web/OC-103-mixed-content.md
- patterns/web/OC-104-cookie-scope-too-broad.md
- patterns/web/OC-105-subdomain-takeover-via-dangling-dns.md

## Cross-Cutting Patterns (load if relevant)

### Data Security — stored XSS / upload overlap (OC-082, OC-170)
- patterns/data/OC-167-unrestricted-file-type-upload.md
- patterns/data/OC-169-server-side-file-execution-via-upload.md
- patterns/data/OC-170-stored-xss-via-uploaded-html-svg.md

### Frontend & Client — postMessage overlap (OC-087, OC-194)
- patterns/frontend/OC-194-postmessage-listener-trusting-any-origin.md
- patterns/frontend/OC-203-browser-extension-injection-vector.md

### Authentication & Authorization — cookie / session overlap
- patterns/auth/OC-034-missing-httponly-flag-on-session-cookie.md
- patterns/auth/OC-035-missing-secure-flag-on-session-cookie.md
- patterns/auth/OC-036-missing-samesite-attribute-on-cookies.md

## Core Reference (always load)
- core/common-false-positives.md
- core/secure-patterns.md
- core/severity-calibration.md

## AI Pitfalls (always load)
- ai-pitfalls/web.md
