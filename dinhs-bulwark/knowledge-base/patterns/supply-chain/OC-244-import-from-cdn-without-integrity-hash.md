# OC-244: Import from CDN without Integrity Hash

**Category:** Supply Chain & Dependencies
**Severity:** MEDIUM
**Auditors:** DEP-01, FE-02
**CWE:** CWE-353 (Missing Support for Integrity Check), CWE-829 (Inclusion of Functionality from Untrusted Control Sphere)
**OWASP:** A08:2021 -- Software and Data Integrity Failures

## Description

Loading JavaScript or CSS from a Content Delivery Network (CDN) without Subresource Integrity (SRI) means the browser will execute whatever the CDN serves, even if the content has been tampered with. If the CDN is compromised, misconfigured, or subject to DNS hijacking, the attacker-controlled code runs with full access to the page's DOM, cookies, localStorage, and any wallet connections.

SRI works by embedding a cryptographic hash in the `integrity` attribute of `<script>` or `<link>` tags. The browser downloads the resource, computes its hash, and refuses to execute it if the hash does not match. This provides a cryptographic guarantee that the content has not been modified in transit or at the source. Without SRI, the security of the application is entirely dependent on the CDN's infrastructure security -- a trust assumption that has been violated repeatedly.

In 2024-2025, CDN trust assumptions were challenged by the Polyfill.io incident, where the polyfill.io domain (used by over 100,000 websites) was acquired by a Chinese company that injected malicious redirects into the served JavaScript. Any website loading `<script src="https://polyfill.io/v3/polyfill.min.js">` without SRI silently received the modified code. The W3C SRI specification itself has documented weaknesses: an open issue (September 2025) noted that malformed integrity strings with incorrect algorithm names are silently ignored rather than causing a blocking error, potentially allowing attackers to craft `integrity` attributes that look protective but provide no actual validation.

## Detection

```
# Search HTML for external script/link tags without integrity attribute
grep -rn '<script.*src=.*http' --include="*.html" --include="*.ejs" --include="*.hbs" | grep -v "integrity="
grep -rn '<link.*href=.*http' --include="*.html" --include="*.ejs" --include="*.hbs" | grep -v "integrity="

# Search JSX/TSX for dynamic CDN imports
grep -rn "cdn\.\|jsdelivr\|unpkg\|cdnjs\|cloudflare" --include="*.tsx" --include="*.jsx" --include="*.html"

# Check for script tags without crossorigin attribute (required for SRI)
grep -rn '<script.*integrity=' --include="*.html" | grep -v 'crossorigin='
```

Look for: `<script>` tags with external `src` URLs lacking `integrity` attributes, `<link>` tags loading external stylesheets without SRI, dynamic script injection from CDNs in JavaScript code, missing `crossorigin="anonymous"` on SRI-protected resources.

## Vulnerable Code

```html
<!-- VULNERABLE: No SRI on CDN-loaded scripts -->
<script src="https://cdn.jsdelivr.net/npm/[email protected]/lodash.min.js"></script>
<script src="https://unpkg.com/@solana/web3.js@latest/lib/index.iife.min.js"></script>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/[email protected]/dist/css/bootstrap.min.css">

<!-- VULNERABLE: Using 'latest' tag means content changes without notice -->
<script src="https://cdn.jsdelivr.net/npm/axios/dist/axios.min.js"></script>
```

## Secure Code

```html
<!-- SECURE: SRI hashes with pinned versions and crossorigin -->
<script
  src="https://cdn.jsdelivr.net/npm/[email protected]/lodash.min.js"
  integrity="sha384-OYoay0VFnzSJZo8QmLwnYfPXEBhSjGaxRoaR3WKdnAEibXOHOFXgjBhJfZT76FI"
  crossorigin="anonymous"></script>

<link
  rel="stylesheet"
  href="https://cdn.jsdelivr.net/npm/[email protected]/dist/css/bootstrap.min.css"
  integrity="sha384-9ndCyUaIbzAi2FUVXJi0CjmCapSmO7SnpJef0486qhLnuZ2cdeRhO02iuK6FUUVM"
  crossorigin="anonymous">

<!-- Generate SRI hash: -->
<!-- curl -s URL | openssl dgst -sha384 -binary | openssl base64 -A | sed 's/^/sha384-/' -->

<!-- BEST: Self-host critical dependencies instead of relying on CDN -->
<script src="/vendor/lodash-4.17.21.min.js"
  integrity="sha384-OYoay0VFnzSJZo8QmLwnYfPXEBhSjGaxRoaR3WKdnAEibXOHOFXgjBhJfZT76FI"></script>
```

```javascript
// Fallback pattern for SRI failures
window._ || document.write('<script src="/vendor/lodash-4.17.21.min.js"><\/script>');
```

## Impact

Without SRI, a CDN compromise grants the attacker full JavaScript execution in the context of every page that loads the resource. For Solana dApps, this means the attacker can intercept wallet adapter connections, modify transaction content before signing, replace destination addresses, or exfiltrate private keys from applications that handle them client-side. The Polyfill.io incident demonstrated that CDN compromise can affect over 100,000 websites simultaneously. For cryptocurrency applications specifically, CDN-loaded scripts have direct access to the wallet signing flow and can silently redirect funds.

## References

- Polyfill.io incident (2024): CDN domain acquired and injected with malicious redirects, 100,000+ sites affected
- W3C SRI specification issue #155: Malformed integrity strings silently ignored (September 2025)
- Mozilla: Subresource Integrity -- https://developer.mozilla.org/en-US/docs/Web/Security/Subresource_Integrity
- Tenable: Invalid Subresource Integrity plugin (WAS-98649)
- SecurityScorecard: Unsafe Implementation of SRI findings (2026)
- CWE-353: https://cwe.mitre.org/data/definitions/353.html
