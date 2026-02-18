# OC-004: Secret Key in Client-Side Bundle

**Category:** Secrets & Credentials
**Severity:** CRITICAL
**Auditors:** SEC-01, FE-01
**CWE:** CWE-200 (Exposure of Sensitive Information to an Unauthorized Actor)
**OWASP:** A01:2021 – Broken Access Control

## Description

When a secret key — whether an API key, private signing key, or service credential — is included in a JavaScript bundle served to the browser, it is trivially extractable by any user. Webpack, Vite, and other bundlers inline environment variables at build time, meaning `process.env.SECRET_KEY` becomes a string literal in the compiled output. Browser DevTools, source maps, or simply searching the bundle makes extraction trivial.

Cyble Research (February 2026) discovered approximately 3,000 live production websites embedding active OpenAI API keys in client-side JavaScript, alongside 5,000+ GitHub repositories with hardcoded keys. Wiz Research (2025) documented emerging patterns where AI-assisted development accelerates the inclusion of secrets in client-side code because AI code generators default to inline configurations.

This is especially dangerous in crypto frontends where a signing key or authority keypair in the client bundle gives attackers direct access to fund-controlling operations.

## Detection

```
grep -rn "NEXT_PUBLIC_.*SECRET\|NEXT_PUBLIC_.*PRIVATE\|NEXT_PUBLIC_.*KEY" --include="*.ts" --include="*.tsx" --include="*.js" --include="*.env"
grep -rn "VITE_.*SECRET\|VITE_.*PRIVATE_KEY\|REACT_APP_.*SECRET" --include="*.ts" --include="*.tsx" --include="*.env"
grep -rn "process\.env\.\(SECRET\|PRIVATE\|SIGNING\|ADMIN\)" --include="*.tsx" --include="*.jsx"
```

Check build configurations for variables with `NEXT_PUBLIC_`, `VITE_`, or `REACT_APP_` prefixes that contain secret material. Inspect compiled bundles for base58 strings, long hex strings, or JSON key arrays.

## Vulnerable Code

```typescript
// VULNERABLE: Next.js component using a "public" env var for a secret
// In .env: NEXT_PUBLIC_ADMIN_SECRET_KEY=5KJxo9...base58...
import { Keypair } from "@solana/web3.js";
import bs58 from "bs58";

export function AdminPanel() {
  // This gets inlined into the client-side JavaScript bundle
  const adminKey = Keypair.fromSecretKey(
    bs58.decode(process.env.NEXT_PUBLIC_ADMIN_SECRET_KEY!)
  );

  const handleAction = async () => {
    // Signs transactions in the browser with the admin key
    const tx = buildAdminTransaction();
    tx.sign(adminKey);
    await sendTransaction(tx);
  };

  return <button onClick={handleAction}>Execute Admin Action</button>;
}
```

## Secure Code

```typescript
// SECURE: Admin operations happen server-side via authenticated API
export function AdminPanel() {
  const handleAction = async () => {
    // Client sends the intent; server signs with the key
    const response = await fetch("/api/admin/execute", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getAuthToken()}`,
      },
      body: JSON.stringify({ action: "executeAdminAction" }),
    });

    if (!response.ok) throw new Error("Admin action failed");
  };

  return <button onClick={handleAction}>Execute Admin Action</button>;
}

// Server-side: /api/admin/execute.ts
// Private key never leaves the server
```

## Impact

Any user visiting the site can extract the secret key from the JavaScript bundle. For crypto applications, this means an attacker can drain funds, impersonate the admin, or execute privileged operations. Automated scanners and browser extensions specifically target crypto wallet keys in frontend code. The attack requires zero technical sophistication — viewing page source or using DevTools is sufficient.

## References

- Cyble Research: 3,000+ production websites leaking OpenAI API keys in client-side JS (February 2026)
- Wiz Research: "Leaking Secrets in the Age of AI" — AI-accelerated secret exposure (2025)
- CWE-200: Exposure of Sensitive Information — https://cwe.mitre.org/data/definitions/200.html
- Next.js documentation: NEXT_PUBLIC_ prefix exposes variables to the browser
