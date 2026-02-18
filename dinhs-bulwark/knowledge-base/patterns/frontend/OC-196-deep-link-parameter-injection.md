# OC-196: Deep Link Parameter Injection

**Category:** Frontend & Client
**Severity:** HIGH
**Auditors:** FE-03
**CWE:** CWE-939
**OWASP:** A07:2021 - Identification and Authentication Failures

## Description

Deep links allow URLs to open specific screens or trigger actions within mobile applications. In mobile dApp browsers and wallet apps, deep links handle wallet connections, transaction signing requests, and dApp-to-wallet communication. If the application does not validate deep link parameters, an attacker can craft a malicious link that injects arbitrary values into the app's internal routing, authentication flows, or transaction construction.

CVE-2021-0334 demonstrated deep link hijacking at the OS level in Android, where a malicious app could become the default handler for arbitrary domains via the `onTargetSelected` function in ResolverActivity.java. Microsoft discovered a TikTok vulnerability where deep link exploitation via an open redirect allowed one-click account takeover affecting 1.5 billion installations. Research by DeepStrike.io documented full account takeover through deep link path traversal and open redirect chains that leaked access tokens.

In the Solana mobile ecosystem, the Mobile Wallet Adapter (MWA) protocol uses deep links and app links to route signing requests between dApps and wallet apps. If a dApp constructs deep link URLs using unvalidated user input, an attacker can inject parameters that redirect signing flows, modify transaction payloads, or hijack auth callbacks.

## Detection

```
# Deep link URL construction
grep -rn "solana:\|phantom:\|solflare:\|backpack:" --include="*.ts" --include="*.tsx" --include="*.swift" --include="*.kt"

# URL scheme handling
grep -rn "Linking\.addEventListener\|Linking\.getInitialURL\|useURL\|useLink" --include="*.ts" --include="*.tsx"

# React Navigation deep link config
grep -rn "linking.*config\|deepLinks\|prefixes" --include="*.ts" --include="*.tsx"

# Intent/URL parameter extraction without validation
grep -rn "getParam\|route\.params\|searchParams\|URLSearchParams" --include="*.ts" --include="*.tsx"

# Universal/app link handlers
grep -rn "applinks:\|webcredentials:\|associated-domains" --include="*.plist" --include="*.json"
```

## Vulnerable Code

```typescript
// React Native dApp handling wallet callback deep links
import { Linking } from 'react-native';
import { useEffect } from 'react';

function WalletCallbackHandler() {
  useEffect(() => {
    const handleDeepLink = (event: { url: string }) => {
      const url = new URL(event.url);
      const params = new URLSearchParams(url.search);

      // VULNERABLE: No validation of deep link parameters
      const walletAddress = params.get('wallet');
      const signature = params.get('signature');
      const redirectUrl = params.get('redirect');

      if (signature) {
        // Trusts signature from deep link without verification
        submitSignedTransaction(signature);
      }

      if (redirectUrl) {
        // VULNERABLE: Open redirect via deep link parameter
        Linking.openURL(redirectUrl);
      }
    };

    Linking.addEventListener('url', handleDeepLink);
    return () => Linking.removeAllListeners('url');
  }, []);

  return null;
}
```

## Secure Code

```typescript
import { Linking } from 'react-native';
import { useEffect } from 'react';
import { PublicKey } from '@solana/web3.js';
import nacl from 'tweetnacl';

const ALLOWED_REDIRECT_HOSTS = new Set(['myapp.com', 'app.myapp.com']);

function WalletCallbackHandler() {
  useEffect(() => {
    const handleDeepLink = (event: { url: string }) => {
      const url = new URL(event.url);

      // SECURE: Validate URL scheme
      if (url.protocol !== 'myapp:' && url.hostname !== 'app.myapp.com') {
        console.warn('Rejected deep link from unexpected source');
        return;
      }

      const params = new URLSearchParams(url.search);
      const walletAddress = params.get('wallet');
      const signature = params.get('signature');
      const redirectUrl = params.get('redirect');

      // SECURE: Validate wallet address format
      if (walletAddress) {
        try {
          new PublicKey(walletAddress); // Throws if invalid
        } catch {
          return;
        }
      }

      // SECURE: Verify signature cryptographically, don't just trust it
      if (signature && walletAddress) {
        verifyAndSubmit(walletAddress, signature);
      }

      // SECURE: Validate redirect against allowlist
      if (redirectUrl) {
        try {
          const rUrl = new URL(redirectUrl);
          if (!ALLOWED_REDIRECT_HOSTS.has(rUrl.hostname)) {
            console.warn('Blocked redirect to untrusted host');
            return;
          }
          Linking.openURL(redirectUrl);
        } catch {
          return; // Invalid URL
        }
      }
    };

    Linking.addEventListener('url', handleDeepLink);
    return () => Linking.removeAllListeners('url');
  }, []);

  return null;
}
```

## Impact

An attacker can craft a malicious deep link that, when clicked by the victim, hijacks authentication flows (stealing access tokens via redirect), triggers unintended transactions, or redirects the user to a phishing site. In the mobile wallet ecosystem, deep link injection can intercept the wallet-to-dApp communication channel, allowing transaction manipulation or session theft.

## References

- CVE-2021-0334: Android deep link hijacking via intent filter -- $5,000 bounty
- Microsoft: TikTok deep link vulnerability enabling account takeover (2022)
- DeepStrike.io: "Full Account Takeover Through Deeplink Vulnerability" (2025)
- OWASP MASVS-PLATFORM: Platform Interaction security requirements
- Solana Mobile Wallet Adapter Protocol specification
