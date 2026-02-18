# OC-118: Wallet Adapter Event Injection

**Category:** Blockchain Interaction
**Severity:** HIGH
**Auditors:** CHAIN-03
**CWE:** CWE-346 (Origin Validation Error)
**OWASP:** N/A — Blockchain-specific

## Description

The Solana wallet adapter framework communicates between dApps and wallet extensions through browser events and the Wallet Standard interface. If a dApp does not properly validate the source of wallet events, an attacker can inject fake wallet events from a malicious browser extension, a compromised third-party script, or an injected iframe.

Wallet adapters expose events like `connect`, `disconnect`, and `accountChanged`. A malicious script running in the same browser context can dispatch fake events that trick the dApp into believing a different wallet is connected, switching the active public key, or resetting the session state. The `window.solana` provider object (deprecated but still widely referenced) can be overwritten by any script with page access.

The Wallet Standard protocol improved security by moving away from the global `window.solana` approach to a registration-based system. However, applications that still check for `window.solana` or `window.phantom?.solana` are vulnerable to provider injection. Malicious browser extensions can register themselves as Solana wallets and intercept signing requests, potentially modifying transactions before they reach the legitimate wallet.

## Detection

```
grep -rn "window\.solana" --include="*.ts" --include="*.js" --include="*.tsx"
grep -rn "window\.phantom" --include="*.ts" --include="*.js" --include="*.tsx"
grep -rn "on\(.*connect\|on\(.*disconnect" --include="*.ts" --include="*.js"
grep -rn "addEventListener.*wallet\|addEventListener.*solana" --include="*.ts" --include="*.js"
```

Look for: direct access to `window.solana` provider, custom event listeners on wallet objects without origin validation, wallet detection logic that trusts the first provider found.

## Vulnerable Code

```typescript
// VULNERABLE: Trusting window.solana without verifying the provider
function connectWallet() {
  const provider = (window as any).solana;
  if (provider?.isPhantom) {
    // Any extension can set window.solana and isPhantom = true
    provider.connect().then((resp: any) => {
      setPublicKey(resp.publicKey.toBase58());
      // Attacker-controlled provider could return any public key
    });
  }
}

// VULNERABLE: Listening for events without validation
(window as any).solana?.on("accountChanged", (pubkey: any) => {
  // Attacker can trigger this event with an arbitrary public key
  setActiveAccount(pubkey.toBase58());
});
```

## Secure Code

```typescript
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";

// SECURE: Use wallet-adapter framework which uses Wallet Standard
function WalletConnection() {
  // wallet-adapter handles provider detection via Wallet Standard registry
  const { publicKey, connected, wallet } = useWallet();

  // Validate the wallet is from a known, trusted source
  if (connected && publicKey) {
    // Verify the wallet adapter name matches expected wallets
    const trustedWallets = ["Phantom", "Solflare", "Backpack", "Ledger"];
    if (!trustedWallets.includes(wallet?.adapter.name || "")) {
      console.warn(`Unknown wallet connected: ${wallet?.adapter.name}`);
    }
    // Always verify public key server-side for authentication
    authenticateWithServer(publicKey.toBase58());
  }

  return <WalletMultiButton />;
}
```

## Impact

A fake wallet provider can intercept and modify all signing requests, redirect transactions to attacker-controlled addresses, capture signed messages for replay attacks, or present a fake connection that makes the dApp operate on behalf of the wrong account. This is a primary vector for wallet drainer attacks.

## References

- Wallet Standard: registration-based provider protocol replacing window.solana
- @solana/wallet-adapter: framework-level provider detection and validation
- Blockaid: Malicious dApps 101 — wallet drainer techniques via provider injection
- Phantom wallet: deprecation of window.solana in favor of Wallet Standard
