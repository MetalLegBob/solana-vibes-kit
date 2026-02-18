# OC-192: Analytics Script Capturing Sensitive Data

**Category:** Frontend & Client
**Severity:** HIGH
**Auditors:** FE-02
**CWE:** CWE-359
**OWASP:** A04:2021 - Insecure Design

## Description

Analytics and session replay tools (Google Analytics, Mixpanel, Hotjar, FullStory, Segment, etc.) capture user interactions to provide product insights. When improperly configured, these tools can inadvertently record sensitive data: form inputs containing passwords or seed phrases, wallet addresses in URLs, transaction amounts in page titles, API responses rendered in the DOM, and even clipboard contents.

Session replay tools are particularly dangerous because they record the full DOM, capturing every character typed into inputs, every modal displayed, and every piece of dynamic content. In a Solana dApp, this could mean recording the user's transaction signing flow, wallet balances, or partially-revealed private keys during backup flows.

Even basic analytics tools send page URLs and titles to third-party servers. If the application includes wallet addresses, transaction signatures, or token amounts in URL paths or query parameters, these values are transmitted to the analytics provider's servers, where they persist in logs and dashboards accessible to the entire product team -- or to an attacker who compromises the analytics account.

## Detection

```
# Analytics SDK initialization
grep -rn "gtag\|ga(\|analytics\.\|mixpanel\.\|hotjar\.\|fullstory\.\|segment\.\|heap\.\|amplitude\." --include="*.ts" --include="*.tsx" --include="*.js" --include="*.html"

# Session replay tools
grep -rn "FullStory\|LogRocket\|Hotjar\|mouseflow\|smartlook\|SessionStack" --include="*.ts" --include="*.tsx" --include="*.html"

# Custom event tracking with potentially sensitive data
grep -rn "\.track(\|\.identify(\|\.page(\|sendEvent" --include="*.ts" --include="*.tsx"

# Check for data masking configuration
grep -rn "maskAllInputs\|maskTextContent\|privatize\|redact\|exclude" --include="*.ts" --include="*.tsx"
```

## Vulnerable Code

```typescript
import * as FullStory from '@fullstory/browser';
import mixpanel from 'mixpanel-browser';

// Session replay initialized WITHOUT data masking
FullStory.init({ orgId: 'XXXX' });
// VULNERABLE: Records all DOM content including wallet data

// Analytics tracking with sensitive data
function trackSwap(swap: SwapDetails) {
  mixpanel.track('Token Swap', {
    // VULNERABLE: Sensitive financial data sent to third-party
    walletAddress: swap.walletAddress,
    fromToken: swap.fromToken,
    toToken: swap.toToken,
    amount: swap.amount,
    txSignature: swap.signature,
    slippage: swap.slippage,
  });
}

// URL contains sensitive data that analytics auto-captures
// e.g., /portfolio/7xKXtg2CW87d97TXJSDpbD5jBkheTqA93MSXvGC8hDNs
```

## Secure Code

```typescript
import * as FullStory from '@fullstory/browser';
import mixpanel from 'mixpanel-browser';

// Session replay with privacy controls
FullStory.init({
  orgId: 'XXXX',
  maskAllInputs: true,        // Mask all form inputs
  maskTextContent: true,      // Mask text content by default
  allowlistElements: ['.fs-unmask'], // Only show explicitly allowed elements
});

// Analytics tracking with only non-sensitive aggregated data
function trackSwap(swap: SwapDetails) {
  mixpanel.track('Token Swap', {
    // SECURE: Only non-identifying, aggregated data
    fromTokenSymbol: swap.fromToken,
    toTokenSymbol: swap.toToken,
    amountBucket: bucketize(swap.amount), // "$10-$100" not exact amount
    success: swap.success,
    // NO wallet address, NO tx signature, NO exact amounts
  });
}

// Use opaque identifiers in URLs instead of wallet addresses
// /portfolio/usr_abc123 instead of /portfolio/7xKXtg2CW87d97TXJSDpbD5jBkheTqA93MSXvGC8hDNs
```

## Impact

Sensitive data captured by analytics tools is transmitted to and stored on third-party servers outside the application's security perimeter. This exposes wallet addresses, transaction details, portfolio values, and potentially PII to the analytics provider, their employees, and anyone who breaches their systems. It also creates regulatory liability (GDPR, CCPA) for transmitting PII to third parties without consent.

## References

- CWE-359: Exposure of Private Personal Information to an Unauthorized Actor
- FullStory Privacy Documentation: Element Masking and Allowlisting
- OWASP: Third-Party Content Security Risks
- Mixpanel: Data Governance and Privacy Controls
- GDPR Article 44: Transfers of Personal Data to Third Countries
