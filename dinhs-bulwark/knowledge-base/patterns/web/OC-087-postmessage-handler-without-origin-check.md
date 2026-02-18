# OC-087: postMessage Handler Without Origin Check

**Category:** Web Application Security
**Severity:** HIGH
**Auditors:** WEB-01, FE-01
**CWE:** CWE-346
**OWASP:** A07:2021 - Identification and Authentication Failures

## Description

The `window.postMessage()` API enables cross-origin communication between browser windows, iframes, and tabs. When a page registers an event listener for `message` events without validating the `event.origin` property, any website can send arbitrary messages that the listener will process. This is a trust boundary violation -- the listener implicitly trusts all origins.

PostMessage vulnerabilities are increasingly common as modern web applications use cross-origin communication for embedded widgets, OAuth flows, third-party integrations, single sign-on, and iframe-based micro-frontends. Security researchers at Intigriti, CyberCX, and YesWeHack have documented numerous postMessage exploitation techniques, including information disclosure via wildcard target origins, DOM XSS via message content injection, and authentication bypass through forged OAuth callbacks.

The two main failure modes are: (1) a listener that processes messages from any origin without validation, and (2) a sender that uses wildcard `"*"` as the target origin, which broadcasts sensitive data to any listening window.

## Detection

```
# postMessage listeners without origin validation
grep -rn "addEventListener.*message" --include="*.ts" --include="*.js" --include="*.tsx"

# Check for missing origin check in message handlers
grep -rn "event\.data\|e\.data\|msg\.data" --include="*.ts" --include="*.js" | grep -v "event\.origin\|e\.origin"

# Wildcard target origin in postMessage calls
grep -rn "postMessage.*\*" --include="*.ts" --include="*.js" --include="*.tsx"

# postMessage sending sensitive data
grep -rn "postMessage.*token\|postMessage.*session\|postMessage.*cookie" --include="*.ts" --include="*.js"
```

## Vulnerable Code

```typescript
// VULNERABLE: OAuth callback handler trusts any origin
window.addEventListener('message', (event) => {
  // No origin validation - any page can send this message
  const { type, token, user } = event.data;

  if (type === 'oauth-callback') {
    // Attacker sends: { type: 'oauth-callback', token: 'malicious-token', user: {role:'admin'} }
    localStorage.setItem('auth_token', token);
    updateUserSession(user);
  }

  if (type === 'payment-confirmed') {
    processPayment(event.data.paymentId);
  }
});

// VULNERABLE: Sending sensitive data with wildcard target
const childFrame = document.getElementById('widget') as HTMLIFrameElement;
childFrame.contentWindow!.postMessage(
  { token: sessionStorage.getItem('auth_token'), userId: currentUser.id },
  '*', // Any origin can receive this message
);
```

## Secure Code

```typescript
const TRUSTED_ORIGINS = new Set([
  'https://auth.example.com',
  'https://payments.example.com',
]);

// SECURE: Validate origin before processing
window.addEventListener('message', (event) => {
  if (!TRUSTED_ORIGINS.has(event.origin)) {
    console.warn(`Rejected postMessage from untrusted origin: ${event.origin}`);
    return;
  }

  const { type } = event.data;

  if (type === 'oauth-callback' && event.origin === 'https://auth.example.com') {
    const { token, user } = event.data;
    if (typeof token === 'string' && token.length < 2048) {
      localStorage.setItem('auth_token', token);
      updateUserSession(user);
    }
  }

  if (type === 'payment-confirmed' && event.origin === 'https://payments.example.com') {
    processPayment(event.data.paymentId);
  }
});

// SECURE: Send data to specific origin only
const childFrame = document.getElementById('widget') as HTMLIFrameElement;
childFrame.contentWindow!.postMessage(
  { token: sessionStorage.getItem('auth_token'), userId: currentUser.id },
  'https://widget.example.com', // Only this origin can receive it
);
```

## Impact

Missing origin validation enables attackers to inject forged messages from malicious pages, leading to authentication bypass, session hijacking, unauthorized state changes, and DOM XSS. Wildcard target origins leak sensitive tokens and user data to any page that opens a reference to the target window. In OAuth flows, forged postMessages can redirect authentication tokens to attacker-controlled domains.

## References

- CWE-346: Origin Validation Error
- Intigriti: "Exploiting PostMessage Vulnerabilities: A Complete Guide" (2026)
- CyberCX: "Introduction to PostMessage Vulnerabilities" (2025)
- YesWeHack: "Introduction to postMessage() Vulnerabilities"
- OWASP: Testing for Web Messaging (WSTG-CLNT-11)
