# OC-194: postMessage Listener Trusting Any Origin

**Category:** Frontend & Client
**Severity:** HIGH
**Auditors:** FE-02, WEB-01
**CWE:** CWE-346
**OWASP:** A07:2021 - Identification and Authentication Failures

## Description

The `window.postMessage()` API enables cross-origin communication between browser windows, iframes, and tabs. Security depends on two checks: the sender should specify a target origin (not `*`), and the receiver must validate `event.origin` before processing the message. When either check is missing, an attacker-controlled page can send messages that the application processes as trusted.

CVE-2024-49038 (CVSS 9.3) in Microsoft Copilot Studio demonstrated how a missing origin validation in a postMessage listener led to cross-site scripting and privilege escalation. Bug bounty researchers routinely report postMessage vulnerabilities resulting in account takeover, with the majority classified as high severity.

In Solana dApp frontends, postMessage is used for wallet adapter communication (especially with popup-based wallets like Phantom and Solflare), OAuth flows, and cross-origin widget embedding. If the dApp's message handler does not validate the origin, an attacker can open the dApp in an iframe or popup from a malicious page and send crafted messages to trigger wallet connections, modify transaction parameters, or exfiltrate displayed data.

## Detection

```
# postMessage listeners without origin check
grep -rn "addEventListener.*message\|onmessage" --include="*.ts" --include="*.tsx" --include="*.js"
# Then check if event.origin is validated in the handler

# postMessage sending with wildcard origin
grep -rn "postMessage.*\*\|postMessage.*'\*'" --include="*.ts" --include="*.tsx" --include="*.js"

# Wallet adapter postMessage patterns
grep -rn "window\.opener\.postMessage\|parent\.postMessage\|iframe.*postMessage" --include="*.ts" --include="*.tsx"

# Check for origin validation
grep -rn "event\.origin\|e\.origin\|msg\.origin" --include="*.ts" --include="*.tsx"
```

## Vulnerable Code

```typescript
// Wallet connection callback via postMessage -- no origin validation
interface WalletMessage {
  type: 'WALLET_CONNECTED' | 'TRANSACTION_SIGNED' | 'SIGN_REJECTED';
  payload: {
    publicKey?: string;
    signature?: string;
  };
}

window.addEventListener('message', (event: MessageEvent<WalletMessage>) => {
  // VULNERABLE: No origin check -- any page can send these messages
  switch (event.data.type) {
    case 'WALLET_CONNECTED':
      setConnectedWallet(event.data.payload.publicKey!);
      fetchUserPortfolio(event.data.payload.publicKey!);
      break;
    case 'TRANSACTION_SIGNED':
      submitSignedTransaction(event.data.payload.signature!);
      break;
  }
});

// Also vulnerable: sending with wildcard
walletPopup.postMessage({ type: 'SIGN_REQUEST', tx: serializedTx }, '*');
```

## Secure Code

```typescript
const TRUSTED_WALLET_ORIGINS = new Set([
  'https://phantom.app',
  'https://solflare.com',
  'https://backpack.app',
]);

window.addEventListener('message', (event: MessageEvent<WalletMessage>) => {
  // SECURE: Validate origin before processing
  if (!TRUSTED_WALLET_ORIGINS.has(event.origin)) {
    console.warn(`Rejected postMessage from untrusted origin: ${event.origin}`);
    return;
  }

  // SECURE: Validate message structure
  if (!event.data?.type || typeof event.data.type !== 'string') {
    return;
  }

  switch (event.data.type) {
    case 'WALLET_CONNECTED':
      if (typeof event.data.payload?.publicKey === 'string') {
        setConnectedWallet(event.data.payload.publicKey);
      }
      break;
    case 'TRANSACTION_SIGNED':
      if (typeof event.data.payload?.signature === 'string') {
        submitSignedTransaction(event.data.payload.signature);
      }
      break;
  }
});

// Send to specific origin, never wildcard
walletPopup.postMessage({ type: 'SIGN_REQUEST', tx: serializedTx }, 'https://phantom.app');
```

## Impact

An attacker can craft a malicious page that opens the target dApp and sends forged postMessage events. Without origin validation, the attacker can trigger wallet connections with attacker-controlled keys, submit malicious transaction signatures, extract sensitive data from the application's responses, or perform actions on behalf of the connected user. In bug bounty programs, postMessage vulnerabilities frequently lead to account takeover (high severity).

## References

- CVE-2024-49038: Microsoft Copilot Studio postMessage XSS (CVSS 9.3)
- CWE-346: Origin Validation Error
- SecureFlag: "Unchecked Origin in postMessage Vulnerability"
- Intigriti: "Exploiting PostMessage Vulnerabilities: A Complete Guide" (January 2026)
- Ryuku: "Hunting postMessage Vulnerabilities" -- 10 real-world findings, mostly account takeover
- MDN: Window.postMessage() -- Security Concerns
