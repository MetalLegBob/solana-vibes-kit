# OC-197: WebView JavaScript Bridge Exposure

**Category:** Frontend & Client
**Severity:** CRITICAL
**Auditors:** FE-03
**CWE:** CWE-749
**OWASP:** A04:2021 - Insecure Design

## Description

Hybrid mobile applications use WebViews to render web content within native apps. The JavaScript bridge (`addJavascriptInterface` on Android, `WKScriptMessageHandler` on iOS) allows web content running inside the WebView to invoke native methods -- accessing device storage, cryptographic keys, biometric auth, and other privileged capabilities. When the bridge is exposed to untrusted web content, an attacker who can inject scripts into the WebView gains native-level access.

Android's `addJavascriptInterface` exposes Java objects to all frames in the WebView. Prior to Android 4.2 (API 17), any public method on the exposed object was callable, including `getClass()`, enabling full remote code execution (CVE-2012-6636, CVE-2013-4710). On modern Android versions, only `@JavascriptInterface`-annotated methods are exposed, but overly broad interfaces still grant dangerous capabilities to web content.

In crypto wallet apps and dApp browsers, the JavaScript bridge is the mechanism that allows web-based dApps to request transaction signing, account access, and token transfers. If the bridge exposes signing methods without proper user confirmation flows, a malicious dApp loaded in the WebView can silently sign transactions or extract wallet data. Ostorlab's 2026 AI pentest engine demonstrated unauthenticated native method invocation via JavaScript bridge exposure through deep links.

## Detection

```
# Android JavaScript interface exposure
grep -rn "addJavascriptInterface\|@JavascriptInterface" --include="*.java" --include="*.kt"

# iOS WKScriptMessageHandler
grep -rn "WKScriptMessageHandler\|userContentController.*add\|evaluateJavaScript" --include="*.swift" --include="*.m"

# React Native WebView bridge configuration
grep -rn "injectedJavaScript\|onMessage\|postMessage.*ReactNative" --include="*.ts" --include="*.tsx"

# Cordova/Capacitor bridge exposure
grep -rn "exec(\|cordova\.exec\|Capacitor\.Plugins" --include="*.ts" --include="*.js"

# WebView settings that enable JavaScript
grep -rn "setJavaScriptEnabled\|javaScriptEnabled\|allowsInlineMediaPlayback" --include="*.java" --include="*.kt" --include="*.swift"
```

## Vulnerable Code

```typescript
// React Native dApp browser with overly permissive bridge
import { WebView } from 'react-native-webview';
import { Keypair, Transaction } from '@solana/web3.js';

function DAppBrowser({ url }: { url: string }) {
  const keypair = useKeypair(); // Has access to private key

  // VULNERABLE: Bridge exposes signing without user confirmation
  const injectedJS = `
    window.solana = {
      signTransaction: (txBase64) => {
        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: 'SIGN_TX',
          payload: txBase64
        }));
      },
      getPublicKey: () => '${keypair.publicKey.toBase58()}',
    };
  `;

  const handleMessage = (event: WebViewMessageEvent) => {
    const msg = JSON.parse(event.nativeEvent.data);
    if (msg.type === 'SIGN_TX') {
      // VULNERABLE: Signs any transaction without user approval
      const tx = Transaction.from(Buffer.from(msg.payload, 'base64'));
      tx.sign(keypair);
      // Sends signed tx back to untrusted web content
      webViewRef.current?.postMessage(JSON.stringify({
        type: 'TX_SIGNED',
        signature: tx.signature?.toString('base64'),
      }));
    }
  };

  return (
    <WebView
      source={{ uri: url }} // Any URL -- including malicious dApps
      injectedJavaScript={injectedJS}
      onMessage={handleMessage}
      javaScriptEnabled={true}
      // VULNERABLE: No URL allowlisting, no user confirmation
    />
  );
}
```

## Secure Code

```typescript
import { WebView, WebViewNavigation } from 'react-native-webview';
import { Alert } from 'react-native';

const ALLOWED_DAPP_ORIGINS = ['https://trusted-dapp.com', 'https://raydium.io'];

function DAppBrowser({ url }: { url: string }) {
  const webViewRef = useRef<WebView>(null);

  const handleNavigationChange = (nav: WebViewNavigation) => {
    const navUrl = new URL(nav.url);
    if (!ALLOWED_DAPP_ORIGINS.some((o) => navUrl.origin === o)) {
      webViewRef.current?.stopLoading();
      Alert.alert('Blocked', 'Navigation to untrusted dApp blocked.');
      return false;
    }
    return true;
  };

  const handleMessage = async (event: WebViewMessageEvent) => {
    const origin = event.nativeEvent.url;
    if (!ALLOWED_DAPP_ORIGINS.some((o) => origin.startsWith(o))) {
      return; // Reject messages from untrusted origins
    }

    const msg = JSON.parse(event.nativeEvent.data);
    if (msg.type === 'SIGN_TX') {
      // SECURE: Parse and display transaction details for user confirmation
      const tx = Transaction.from(Buffer.from(msg.payload, 'base64'));
      const details = parseTransactionForDisplay(tx);

      const approved = await showApprovalDialog(details);
      if (!approved) return;

      // Sign only after explicit user approval
      tx.sign(keypair);
      webViewRef.current?.postMessage(JSON.stringify({
        type: 'TX_SIGNED',
        signature: tx.signature?.toString('base64'),
      }));
    }
  };

  return (
    <WebView
      ref={webViewRef}
      source={{ uri: url }}
      onMessage={handleMessage}
      onShouldStartLoadWithRequest={handleNavigationChange}
      javaScriptEnabled={true}
      // Restrict WebView capabilities
      allowsInlineMediaPlayback={false}
      allowFileAccess={false}
    />
  );
}
```

## Impact

An attacker who loads a malicious page in the WebView can invoke any exposed bridge method. In a wallet dApp browser, this means silently signing transactions that drain funds, extracting private keys or seed phrases, accessing device storage, and performing actions with the user's native app permissions. This is equivalent to full device compromise within the app's sandbox.

## References

- CVE-2012-6636, CVE-2013-4710: Android addJavascriptInterface RCE
- OWASP MASVS-PLATFORM: Platform Interaction -- WebView Native Bridges
- Android Developer Docs: WebView Native Bridges security guidance
- Ostorlab: "JavaScript Interface Exposure" -- AI pentest case study (January 2026)
- BridgeScope: "Precisely and Scalably Vetting JavaScript Bridge in Android Hybrid Apps" (RAID 2017)
- Zellic: "You're Probably Using WebViews Wrong" (August 2025)
