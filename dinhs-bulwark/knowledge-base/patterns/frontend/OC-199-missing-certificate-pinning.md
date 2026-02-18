# OC-199: Missing Certificate Pinning

**Category:** Frontend & Client
**Severity:** MEDIUM
**Auditors:** FE-03
**CWE:** CWE-295
**OWASP:** A07:2021 - Identification and Authentication Failures

## Description

Certificate pinning (also called SSL pinning or public key pinning) restricts which TLS certificates a mobile application will accept when connecting to its backend servers. Without pinning, the app trusts any certificate signed by any CA in the device's trust store. An attacker who installs a rogue CA certificate (via MDM profile, social engineering, or device access) can perform a man-in-the-middle (MITM) attack, intercepting and modifying all HTTPS traffic between the app and server.

On mobile devices, this is a practical attack. Corporate proxies, public WiFi captive portals, and forensic tools all rely on installed CA certificates to intercept HTTPS. For crypto wallet apps that transmit transaction signing requests, RPC calls, and authentication tokens over HTTPS, a MITM attacker can intercept and modify transactions in transit, steal session tokens, or replace RPC responses with malicious data.

Certificate pinning is particularly important for React Native and Flutter apps, where the default HTTP clients (fetch, dio) use the OS trust store without any additional verification. Adding pinning requires explicit configuration or a library like `react-native-ssl-pinning` or TrustKit.

## Detection

```
# Check for SSL pinning libraries
grep -rn "ssl-pinning\|TrustKit\|CertificatePinning\|SSLPinning\|pinning" -i --include="*.ts" --include="*.tsx" --include="*.swift" --include="*.kt" --include="*.java"

# React Native network configuration
grep -rn "react-native-ssl-pinning\|cert-pinner\|okhttp.*CertificatePinner" --include="*.ts" --include="*.tsx" --include="*.java" --include="*.kt"

# iOS App Transport Security
grep -rn "NSAppTransportSecurity\|NSAllowsArbitraryLoads" --include="*.plist"

# Android network security config
grep -rn "network_security_config\|trust-anchors\|pin-set" --include="*.xml"

# Check for disabled TLS verification (anti-pattern)
grep -rn "rejectUnauthorized.*false\|DISABLE_SSL\|SSL_VERIFY.*false" -i --include="*.ts" --include="*.tsx" --include="*.js"
```

## Vulnerable Code

```typescript
// React Native app making API calls without certificate pinning
import { useWallet } from './hooks/useWallet';

async function submitTransaction(signedTx: string): Promise<string> {
  // VULNERABLE: Uses default fetch -- trusts any CA in device trust store
  const response = await fetch('https://api.mydapp.com/transaction/submit', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${await getAuthToken()}`,
    },
    body: JSON.stringify({ signedTransaction: signedTx }),
  });

  // A MITM attacker with a rogue CA cert can:
  // 1. Read the signed transaction
  // 2. Read the auth token
  // 3. Modify the response to fake confirmation
  return response.json();
}
```

## Secure Code

```typescript
// Using certificate pinning for critical API calls
import { fetch as pinnedFetch } from 'react-native-ssl-pinning';

const API_PINS = {
  'api.mydapp.com': {
    // Pin the Subject Public Key Info (SPKI) hash
    certs: ['sha256/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA='],
  },
  'rpc.helius.xyz': {
    certs: ['sha256/BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB='],
  },
};

async function submitTransaction(signedTx: string): Promise<string> {
  // SECURE: Certificate pinning prevents MITM even with rogue CA
  const response = await pinnedFetch('https://api.mydapp.com/transaction/submit', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${await getAuthToken()}`,
    },
    body: JSON.stringify({ signedTransaction: signedTx }),
    sslPinning: {
      certs: ['api_mydapp_com'], // DER certificate in app bundle
    },
    timeoutInterval: 10000,
  });

  return response.json();
}
```

## Impact

Without certificate pinning, an attacker who can install a CA certificate on the target device (or who controls a network proxy) can intercept all HTTPS traffic. For dApp and wallet applications, this enables: reading auth tokens, modifying RPC responses to show fake balances, intercepting signed transactions, and injecting malicious transaction data. The attack is particularly practical on corporate-managed devices and public WiFi networks.

## References

- CWE-295: Improper Certificate Validation
- OWASP MASVS-NETWORK: Network Communication requirements
- OWASP Mobile Top 10 2024: M5 - Insecure Communication
- OWASP: Certificate Pinning Cheat Sheet
- Google: Network Security Configuration for Android
- Apple: App Transport Security for iOS
