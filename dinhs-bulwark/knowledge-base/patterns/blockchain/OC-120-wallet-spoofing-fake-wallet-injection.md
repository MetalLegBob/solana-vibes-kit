# OC-120: Wallet Spoofing / Fake Wallet Injection

**Category:** Blockchain Interaction
**Severity:** HIGH
**Auditors:** CHAIN-03
**CWE:** CWE-290 (Authentication Bypass by Spoofing)
**OWASP:** N/A — Blockchain-specific

## Description

Wallet spoofing occurs when a malicious browser extension or script registers itself as a legitimate Solana wallet, intercepting all dApp-to-wallet communication. The Wallet Standard protocol allows any extension to register as a wallet provider. A malicious extension can impersonate Phantom, Solflare, or any other wallet, presenting fake UI while intercepting signing requests.

The most dangerous form of wallet spoofing is a drainer extension that registers with a legitimate wallet's name and icon. When a user selects what they think is their trusted wallet from the dApp's wallet selection modal, they are actually connecting to the attacker's extension. The attacker can then modify transactions before presenting them for signing, substitute destination addresses, or exfiltrate the signed transaction to steal funds.

This attack vector was highlighted by Blockaid's research on wallet drainers, which showed that malicious dApps combined with spoofed wallet providers are responsible for hundreds of millions of dollars in losses across the crypto ecosystem. Phantom wallet has accused competitors and attackers of injecting fake wallet providers into users' browsers.

## Detection

```
grep -rn "wallets.*=.*\[" --include="*.ts" --include="*.tsx" | grep -i "adapter"
grep -rn "WalletProvider" --include="*.ts" --include="*.tsx"
grep -rn "getPhantomWallet\|getSolflareWallet" --include="*.ts" --include="*.tsx"
grep -rn "window\.solana\|window\.phantom" --include="*.ts" --include="*.tsx"
```

Look for: custom wallet detection logic that does not use the standard adapter framework, applications that auto-connect to the first available wallet without user selection, wallet provider lists that include unverified adapters.

## Vulnerable Code

```typescript
// VULNERABLE: Auto-connecting to first available wallet provider
async function autoConnect() {
  const providers = (window as any).__solana_wallets || [];
  // Connects to whatever claims to be a wallet — could be malicious
  if (providers.length > 0) {
    const wallet = providers[0];
    await wallet.connect();
    return wallet;
  }
  // Fallback to window.solana — easily spoofed
  if ((window as any).solana) {
    await (window as any).solana.connect();
    return (window as any).solana;
  }
  throw new Error("No wallet found");
}
```

## Secure Code

```typescript
import {
  ConnectionProvider,
  WalletProvider,
} from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { PhantomWalletAdapter, SolflareWalletAdapter } from "@solana/wallet-adapter-wallets";

// SECURE: Explicit adapter list with user-initiated connection only
function App() {
  const wallets = useMemo(
    () => [
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter(),
      // Only include adapters you have explicitly vetted
    ],
    []
  );

  return (
    <ConnectionProvider endpoint={process.env.NEXT_PUBLIC_RPC_URL!}>
      <WalletProvider wallets={wallets} autoConnect={false}>
        <WalletModalProvider>
          {/* User explicitly selects and connects wallet */}
          <WalletMultiButton />
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}
```

## Impact

A spoofed wallet can intercept all signing requests, modify transaction details before signing, substitute destination addresses, exfiltrate private key material (if the spoofed wallet handles key management), and present fake transaction previews to the user. This enables complete fund theft from any user who connects to the spoofed wallet.

## References

- Blockaid: Malicious dApps 101 — Wallet Drainers via provider spoofing
- Phantom wallet: critical vulnerability disclosure related to wallet injection
- Wallet Standard: provider registration protocol
- Chainalysis: Understanding Crypto Drainers — $494M stolen in 2024
