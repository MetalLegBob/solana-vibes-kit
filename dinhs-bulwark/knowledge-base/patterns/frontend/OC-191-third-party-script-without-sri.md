# OC-191: Third-Party Script Without SRI

**Category:** Frontend & Client
**Severity:** MEDIUM
**Auditors:** FE-02
**CWE:** CWE-353
**OWASP:** A08:2021 - Software and Data Integrity Failures

## Description

Subresource Integrity (SRI) is a browser security feature that verifies externally-hosted resources (JavaScript, CSS) have not been tampered with. By including a cryptographic hash in the `integrity` attribute, the browser refuses to execute a script whose content does not match the expected hash. Without SRI, a compromised CDN or supply chain attack can silently inject malicious code into every page that loads the resource.

The Polyfill.io supply chain attack (June 2024) is the canonical real-world example. After the Funnull company acquired the polyfill.io domain and its CDN, the service began injecting malicious JavaScript into over 110,000 websites. The malicious code redirected mobile users to phishing and scam sites. Had those sites used SRI hashes on their polyfill script tags, browsers would have refused to execute the tampered scripts. CVE-2024-38526 was published in connection with this incident.

In Solana dApp frontends, external scripts may include wallet adapter bundles, analytics SDKs, charting libraries, or RPC client bundles loaded from CDNs. Any of these, if loaded without SRI, becomes an attack vector for injecting transaction-hijacking or seed-phrase-stealing code.

## Detection

```
# Script tags without integrity attribute
grep -rn "<script.*src=" --include="*.html" --include="*.tsx" --include="*.jsx" | grep -v "integrity="

# Link tags without integrity for stylesheets
grep -rn "<link.*href=.*\.css" --include="*.html" | grep -v "integrity="

# Dynamic script loading without SRI
grep -rn "createElement.*script\|\.src\s*=" --include="*.ts" --include="*.tsx" --include="*.js"

# CDN references
grep -rn "cdn\.\|unpkg\.com\|cdnjs\.\|jsdelivr\." --include="*.html" --include="*.tsx" --include="*.jsx"
```

## Vulnerable Code

```html
<!-- Loading wallet adapter and charting library from CDN without SRI -->
<!DOCTYPE html>
<html>
<head>
  <!-- VULNERABLE: No integrity attribute -- CDN compromise = code injection -->
  <script src="https://cdn.jsdelivr.net/npm/@solana/web3.js@1.87.6/lib/index.iife.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
  <link rel="stylesheet" href="https://cdn.example.com/styles/main.css">
</head>
<body>
  <div id="app"></div>
</body>
</html>
```

## Secure Code

```html
<!-- All external resources include SRI hashes and crossorigin attribute -->
<!DOCTYPE html>
<html>
<head>
  <!-- SECURE: SRI hash ensures integrity, crossorigin enables CORS check -->
  <script
    src="https://cdn.jsdelivr.net/npm/@solana/web3.js@1.87.6/lib/index.iife.min.js"
    integrity="sha384-EXAMPLE_BASE64_HASH_HERE"
    crossorigin="anonymous"
  ></script>
  <script
    src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"
    integrity="sha384-EXAMPLE_BASE64_HASH_HERE"
    crossorigin="anonymous"
  ></script>
  <link
    rel="stylesheet"
    href="https://cdn.example.com/styles/main.css"
    integrity="sha384-EXAMPLE_BASE64_HASH_HERE"
    crossorigin="anonymous"
  >
</head>
<body>
  <div id="app"></div>
</body>
</html>
```

## Impact

Without SRI, a compromised CDN can inject arbitrary JavaScript into the application. In a dApp context, this could include code that intercepts wallet signing requests, replaces transaction destinations, exfiltrates seed phrases displayed during onboarding, or drains connected wallets. The Polyfill.io attack demonstrated this at scale, affecting over 100,000 sites.

## References

- CVE-2024-38526: Polyfill.io supply chain attack via CDN domain acquisition
- Snyk: "Polyfill supply chain attack embeds malware in JavaScript CDN assets" (June 2024)
- MDN: Subresource Integrity (https://developer.mozilla.org/en-US/docs/Web/Security/Subresource_Integrity)
- OWASP: Subresource Integrity (SRI) Control (https://owasp.org/www-community/controls/SubresourceIntegrity)
- W3C: Subresource Integrity Specification
