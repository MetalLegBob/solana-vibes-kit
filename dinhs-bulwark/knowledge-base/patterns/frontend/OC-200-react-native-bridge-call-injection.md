# OC-200: React Native Bridge Call Injection

**Category:** Frontend & Client
**Severity:** HIGH
**Auditors:** FE-03
**CWE:** CWE-94
**OWASP:** A03:2021 - Injection

## Description

React Native applications use a bridge to communicate between the JavaScript runtime and native modules (Java/Kotlin on Android, Objective-C/Swift on iOS). Native modules expose methods to JavaScript via the bridge, which can be invoked from any JavaScript context. If the application loads untrusted web content (via WebView) or processes unsanitized deep link parameters, an attacker can craft inputs that invoke native bridge methods in unintended ways.

CVE-2025-11953 (CVSS 9.8) in the `@react-native-community/cli` package demonstrated a critical OS command injection vulnerability affecting the Metro development server. While this was a development-time vulnerability, it highlights the risk surface of the React Native bridge architecture. CISA added CVE-2025-11953 to its Known Exploited Vulnerabilities catalog in February 2026, confirming active exploitation.

The risk is amplified in React Native dApp browsers and wallet apps where native modules handle cryptographic operations (key generation, transaction signing) and the JavaScript layer processes untrusted dApp content. If native module methods do not validate their inputs, injection from the JavaScript side can lead to unauthorized signing, key extraction, or native-level code execution.

## Detection

```
# React Native native module definitions
grep -rn "@ReactMethod\|@ReactModule" --include="*.java" --include="*.kt"
grep -rn "RCT_EXPORT_METHOD\|RCT_EXTERN_METHOD" --include="*.m" --include="*.swift"

# JavaScript-side native module invocations
grep -rn "NativeModules\.\|TurboModules\.\|requireNativeComponent" --include="*.ts" --include="*.tsx"

# Bridge message handling
grep -rn "\.callNative\|\.invokeNative\|nativeCall" --include="*.ts" --include="*.tsx"

# Native modules that handle crypto/signing
grep -rn "signTransaction\|getPrivateKey\|generateKeypair\|decrypt\|encrypt" --include="*.java" --include="*.kt" --include="*.swift" --include="*.m"

# WebView to native bridge
grep -rn "onMessage.*nativeEvent\|ReactNativeWebView\.postMessage" --include="*.ts" --include="*.tsx"
```

## Vulnerable Code

```typescript
// Native module exposed without input validation
// --- Android (Kotlin) ---
@ReactMethod
fun signTransaction(transactionBase64: String, promise: Promise) {
  // VULNERABLE: No validation of transaction content
  // Any JavaScript context can call this and get a signature
  try {
    val txBytes = Base64.decode(transactionBase64, Base64.DEFAULT)
    val keypair = getStoredKeypair() // Accesses secure storage
    val signature = nacl.sign.detached(txBytes, keypair.secretKey)
    promise.resolve(Base64.encodeToString(signature, Base64.DEFAULT))
  } catch (e: Exception) {
    promise.reject("SIGN_ERROR", e.message)
  }
}

// --- JavaScript (React Native) ---
// WebView content can trigger this through the bridge
import { NativeModules } from 'react-native';

async function handleWebViewMessage(event: WebViewMessageEvent) {
  const msg = JSON.parse(event.nativeEvent.data);
  if (msg.type === 'sign') {
    // VULNERABLE: Passes untrusted dApp data directly to native signing
    const signature = await NativeModules.WalletModule.signTransaction(msg.payload);
    webViewRef.current?.postMessage(JSON.stringify({ signature }));
  }
}
```

## Secure Code

```typescript
// --- Android (Kotlin) ---
@ReactMethod
fun signTransaction(transactionBase64: String, requireApproval: Boolean, promise: Promise) {
  try {
    val txBytes = Base64.decode(transactionBase64, Base64.DEFAULT)

    // SECURE: Parse and validate transaction before signing
    val transaction = Transaction.from(txBytes)

    // Validate transaction constraints
    if (transaction.instructions.size > MAX_INSTRUCTIONS) {
      promise.reject("INVALID_TX", "Too many instructions")
      return
    }

    // Check for known malicious program IDs
    if (transaction.instructions.any { it.programId in BLOCKED_PROGRAMS }) {
      promise.reject("BLOCKED", "Blocked program detected")
      return
    }

    // SECURE: Always require user approval for signing
    showTransactionApprovalDialog(transaction) { approved ->
      if (approved) {
        val keypair = getStoredKeypair()
        val signature = nacl.sign.detached(txBytes, keypair.secretKey)
        promise.resolve(Base64.encodeToString(signature, Base64.DEFAULT))
      } else {
        promise.reject("USER_REJECTED", "User rejected transaction")
      }
    }
  } catch (e: Exception) {
    promise.reject("SIGN_ERROR", "Invalid transaction data")
  }
}

// --- JavaScript (React Native) ---
async function handleWebViewMessage(event: WebViewMessageEvent) {
  const origin = new URL(event.nativeEvent.url).origin;
  if (!TRUSTED_DAPP_ORIGINS.has(origin)) return;

  const msg = JSON.parse(event.nativeEvent.data);
  if (msg.type === 'sign' && typeof msg.payload === 'string') {
    // Native module validates and shows approval UI
    const signature = await NativeModules.WalletModule.signTransaction(
      msg.payload,
      true, // requireApproval
    );
    webViewRef.current?.postMessage(JSON.stringify({ signature }));
  }
}
```

## Impact

An attacker who can execute JavaScript in the React Native context (via XSS in a WebView, compromised dependency, or deep link injection) can invoke native module methods to sign arbitrary transactions, extract key material, read secure storage, or execute native-level operations. In wallet apps, this leads directly to fund theft. CVE-2025-11953 demonstrated that the React Native CLI ecosystem itself is a target, with CVSS 9.8 severity.

## References

- CVE-2025-11953: Critical RCE in @react-native-community/cli (CVSS 9.8)
- CISA KEV Catalog: CVE-2025-11953 added February 2026
- JFrog: "CVE-2025-11953 Critical RCE in React Native CLI" -- detailed analysis
- OWASP MASVS-PLATFORM: Platform Interaction requirements
- React Native Security: Native Module Best Practices
