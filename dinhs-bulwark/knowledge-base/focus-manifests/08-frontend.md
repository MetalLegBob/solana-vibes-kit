# Focus Manifest: Frontend & Client
<!-- Lists KB files for this category's auditor agents to load. -->
<!-- Agent reads this manifest to know which pattern files + core reference to include in context. -->

## Core Patterns (always load)

### Frontend & Client (OC-186–205)
- patterns/frontend/OC-186-sensitive-data-in-localstorage.md
- patterns/frontend/OC-187-auth-token-in-localstorage.md
- patterns/frontend/OC-188-client-side-data-not-cleared-on-logout.md
- patterns/frontend/OC-189-pii-stored-in-indexeddb-without-encryption.md
- patterns/frontend/OC-190-cross-tab-state-synchronization-leak.md
- patterns/frontend/OC-191-third-party-script-without-sri.md
- patterns/frontend/OC-192-analytics-script-capturing-sensitive-data.md
- patterns/frontend/OC-193-cdn-compromise-supply-chain-via-scripts.md
- patterns/frontend/OC-194-postmessage-listener-trusting-any-origin.md
- patterns/frontend/OC-195-third-party-iframe-data-exfiltration.md
- patterns/frontend/OC-196-deep-link-parameter-injection.md
- patterns/frontend/OC-197-webview-javascript-bridge-exposure.md
- patterns/frontend/OC-198-mobile-local-storage-without-keychain.md
- patterns/frontend/OC-199-missing-certificate-pinning.md
- patterns/frontend/OC-200-react-native-bridge-call-injection.md
- patterns/frontend/OC-201-client-side-crypto-with-math-random.md
- patterns/frontend/OC-202-exposure-of-internal-apis-via-client-bundle.md
- patterns/frontend/OC-203-browser-extension-injection-vector.md
- patterns/frontend/OC-204-service-worker-cache-poisoning.md
- patterns/frontend/OC-205-client-side-route-guard-bypass.md

## Cross-Cutting Patterns (load if relevant)

### Web Application Security — XSS / postMessage overlap (OC-081–087)
- patterns/web/OC-081-reflected-xss.md
- patterns/web/OC-082-stored-xss.md
- patterns/web/OC-083-dom-based-xss.md
- patterns/web/OC-084-xss-via-dangerouslysetinnerhtml.md
- patterns/web/OC-087-postmessage-handler-without-origin-check.md
- patterns/web/OC-090-missing-content-security-policy.md
- patterns/web/OC-091-csp-with-unsafe-inline-unsafe-eval.md

### Secrets — client-side key exposure (OC-004)
- patterns/secrets/OC-004-secret-key-in-client-side-bundle.md

## Core Reference (always load)
- core/common-false-positives.md
- core/secure-patterns.md
- core/severity-calibration.md

## AI Pitfalls (always load)
- ai-pitfalls/frontend.md
