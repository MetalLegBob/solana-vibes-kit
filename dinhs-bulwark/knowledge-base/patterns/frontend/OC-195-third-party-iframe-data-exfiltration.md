# OC-195: Third-Party Iframe Data Exfiltration

**Category:** Frontend & Client
**Severity:** MEDIUM
**Auditors:** FE-02
**CWE:** CWE-829
**OWASP:** A08:2021 - Software and Data Integrity Failures

## Description

Web applications frequently embed third-party content via iframes: payment widgets, identity verification flows, social media embeds, chat widgets, and analytics dashboards. While the Same-Origin Policy prevents an iframe from directly reading the parent page's DOM, the embedded third-party code can still exfiltrate data through several channels: it can read any data passed to it via postMessage, it can observe URL fragments, and it can make arbitrary network requests to its own servers.

The risk increases when the parent application passes sensitive data into the iframe via query parameters, postMessage, or shared cookies. In the dApp ecosystem, embedded widgets may include on-ramp/off-ramp fiat payment flows, NFT marketplace embeds, or DeFi aggregator widgets. If the parent sends wallet addresses, transaction details, or auth tokens to the iframe, that data leaves the application's security perimeter entirely.

Additionally, if the `sandbox` attribute is not applied, embedded iframes can run scripts, submit forms, and access browser APIs. A compromised third-party widget can potentially access top-level navigation, invoke downloads, or present phishing overlays.

## Detection

```
# Iframe usage with external sources
grep -rn "<iframe\|<Iframe\|createElement.*iframe" --include="*.ts" --include="*.tsx" --include="*.html" --include="*.jsx"

# Check for sandbox attribute on iframes
grep -rn "<iframe" --include="*.tsx" --include="*.html" | grep -v "sandbox"

# Data being sent to iframes
grep -rn "iframe.*postMessage\|contentWindow\.postMessage" --include="*.ts" --include="*.tsx"

# Sensitive data in iframe src parameters
grep -rn "iframe.*src=.*token\|iframe.*src=.*key\|iframe.*src=.*wallet" -i --include="*.tsx" --include="*.html"
```

## Vulnerable Code

```typescript
// Embedding a third-party fiat on-ramp with sensitive data in URL
function FiatOnRamp({ walletAddress, email }: OnRampProps) {
  // VULNERABLE: Sensitive data passed in URL params -- visible to third party
  const iframeSrc = `https://third-party-onramp.com/widget?` +
    `wallet=${walletAddress}&email=${encodeURIComponent(email)}` +
    `&token=${getAuthToken()}`; // Auth token sent to third party!

  return (
    <iframe
      src={iframeSrc}
      // VULNERABLE: No sandbox attribute -- full script/form/navigation access
      style={{ width: '100%', height: '600px' }}
      allow="payment"
    />
  );
}
```

## Secure Code

```typescript
function FiatOnRamp({ walletAddress }: OnRampProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    // Send data via postMessage after iframe loads, with strict origin
    const handleLoad = () => {
      iframeRef.current?.contentWindow?.postMessage(
        { type: 'INIT', wallet: walletAddress }, // Only public key
        'https://trusted-onramp.com', // Strict target origin
      );
    };
    iframeRef.current?.addEventListener('load', handleLoad);
    return () => iframeRef.current?.removeEventListener('load', handleLoad);
  }, [walletAddress]);

  return (
    <iframe
      ref={iframeRef}
      src="https://trusted-onramp.com/widget"
      // SECURE: Sandbox restricts capabilities
      sandbox="allow-scripts allow-forms allow-same-origin"
      // No allow-top-navigation, no allow-popups
      style={{ width: '100%', height: '600px' }}
      referrerPolicy="no-referrer"
    />
  );
}
```

## Impact

Third-party iframes that receive sensitive data can exfiltrate it to their own servers. A compromised widget can steal wallet addresses, email addresses, auth tokens, and transaction details. Without sandboxing, the iframe can also navigate the top-level page (phishing), trigger downloads, or present fake UI overlays. The parent application has no visibility into what the iframe does with received data.

## References

- CWE-829: Inclusion of Functionality from Untrusted Control Sphere
- MDN: iframe sandbox attribute documentation
- OWASP: Third-Party JavaScript Management Cheat Sheet
- W3C: Content Security Policy frame-src directive
- Google: Permissions Policy for iframes
