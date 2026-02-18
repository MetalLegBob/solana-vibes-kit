# OC-193: CDN Compromise / Supply Chain via Scripts

**Category:** Frontend & Client
**Severity:** HIGH
**Auditors:** FE-02
**CWE:** CWE-830
**OWASP:** A08:2021 - Software and Data Integrity Failures

## Description

Web applications that load JavaScript from third-party CDNs or external domains inherit the security posture of those providers. If the CDN is compromised, the domain is acquired by a malicious actor, or the upstream package is tampered with, every application loading that script becomes a vector for the attacker's code.

The Polyfill.io supply chain attack (February-June 2024) is the most significant recent example. After Funnull acquired the polyfill.io domain, they injected malicious JavaScript that redirected mobile users to scam sites. Over 110,000 websites were affected, including sites belonging to publicly traded companies. CVE-2024-38526 was issued. The Trust Wallet Chrome extension supply chain attack (December 2025) demonstrated similar risks in the crypto ecosystem: a malicious version 2.68 of the extension was published to the Chrome Web Store, draining approximately $7 million in cryptocurrency from over 2,500 wallet addresses.

Solana dApp frontends are high-value targets because they handle wallet connections and transaction signing. A compromised script running in the dApp's origin has full access to the wallet adapter, can modify transaction instructions before signing, and can exfiltrate any data visible to the page.

## Detection

```
# External script sources
grep -rn "src=.*http" --include="*.html" --include="*.tsx" --include="*.jsx"
grep -rn "cdn\.\|unpkg\.\|cdnjs\.\|jsdelivr\.\|cloudflare\." --include="*.html" --include="*.tsx"

# Dynamic script injection
grep -rn "document\.createElement.*script\|\.appendChild.*script" --include="*.ts" --include="*.tsx" --include="*.js"

# Import from external URLs
grep -rn "import.*from.*https\:\|require.*https\:" --include="*.ts" --include="*.tsx" --include="*.js"

# Check for SRI on external scripts
grep -rn "<script.*src=.*http" --include="*.html" | grep -v "integrity="

# Check CSP for script-src restrictions
grep -rn "script-src\|Content-Security-Policy" --include="*.ts" --include="*.tsx" --include="*.html"
```

## Vulnerable Code

```typescript
// Next.js _document.tsx loading external scripts
import { Html, Head, Main, NextScript } from 'next/document';

export default function Document() {
  return (
    <Html>
      <Head>
        {/* VULNERABLE: External scripts without SRI or CSP restrictions */}
        <script src="https://cdn.polyfill.io/v3/polyfill.min.js" />
        <script src="https://unpkg.com/some-charting-lib@latest/dist/bundle.js" />
        <script src="https://third-party-analytics.com/tracker.js" />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}

// package.json using unpinned CDN imports
// "importmap": { "imports": { "lodash": "https://cdn.skypack.dev/lodash" } }
```

## Secure Code

```typescript
// Self-host critical dependencies; use SRI for anything external
import { Html, Head, Main, NextScript } from 'next/document';

export default function Document() {
  return (
    <Html>
      <Head>
        {/* SECURE: Self-hosted critical deps, SRI for external */}
        <script src="/vendor/polyfill.min.js" /> {/* Self-hosted */}
        <script
          src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"
          integrity="sha384-verified-hash-here"
          crossOrigin="anonymous"
        />
        {/* CSP restricts script sources */}
        <meta
          httpEquiv="Content-Security-Policy"
          content="script-src 'self' https://cdn.jsdelivr.net; object-src 'none';"
        />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
```

## Impact

A compromised external script runs with full privileges in the application's origin. In a dApp context, this means the attacker can intercept wallet connections, modify transaction instructions (replacing the recipient address), exfiltrate auth tokens and user data, inject phishing overlays, and drain connected wallets. The Polyfill.io attack affected 110,000+ sites; the Trust Wallet extension attack drained $7M+ in crypto assets.

## References

- CVE-2024-38526: Polyfill.io supply chain attack
- Trust Wallet Chrome Extension v2.68 Supply Chain Attack (December 2025) -- $7M drained
- Snyk: "Polyfill supply chain attack embeds malware in JavaScript CDN assets" (June 2024)
- FOSSA: "Polyfill Supply Chain Attack: Details and Fixes"
- OWASP: Third-Party JavaScript Management Cheat Sheet
