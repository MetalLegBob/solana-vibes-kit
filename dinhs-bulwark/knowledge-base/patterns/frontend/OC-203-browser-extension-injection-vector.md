# OC-203: Browser Extension Injection Vector

**Category:** Frontend & Client
**Severity:** MEDIUM
**Auditors:** FE-02
**CWE:** CWE-829
**OWASP:** A08:2021 - Software and Data Integrity Failures

## Description

Browser extensions run with elevated privileges in the browser context. Malicious or compromised extensions can inject JavaScript into any web page, intercept network requests, read and modify DOM content, access browser storage, and exfiltrate data. In the crypto ecosystem, extension-based attacks are one of the primary vectors for wallet draining.

The Trust Wallet Chrome extension supply chain attack (December 2025) demonstrated catastrophic impact: a malicious version 2.68 published to the Chrome Web Store drained approximately $7 million in cryptocurrency from over 2,500 wallet addresses. The malicious code was embedded in the extension's analytics logic, making it harder to detect during code review. It exfiltrated seed phrases to an attacker-controlled server disguised as `api.metrics-trustwallet.com`.

Socket's Threat Research Team discovered "Safery: Ethereum Wallet," a malicious Chrome extension that stole seed phrases through hidden blockchain transactions. The extension was published on the Chrome Web Store on November 12, 2024, masquerading as a legitimate wallet.

While web applications cannot directly prevent malicious extensions from executing, they can reduce the attack surface by implementing CSP headers that limit inline scripts, using integrity checks on critical DOM elements, and avoiding patterns that make extension-based attacks easier (such as rendering seed phrases in the DOM or exposing private keys to JavaScript).

## Detection

```
# Check if the app renders seed phrases or private keys in the DOM
grep -rn "mnemonic\|seedPhrase\|seed_phrase\|privateKey\|private_key\|secretKey" --include="*.tsx" --include="*.jsx" --include="*.ts"

# Check for extension detection / protection code
grep -rn "chrome\.runtime\|browser\.runtime\|extension.*detected\|contentScript" --include="*.ts" --include="*.tsx"

# Wallet injection points
grep -rn "window\.solana\|window\.phantom\|window\.ethereum\|window\.solflare" --include="*.ts" --include="*.tsx"

# CSP headers that mitigate extension injection
grep -rn "Content-Security-Policy\|script-src\|style-src" --include="*.ts" --include="*.tsx" --include="*.html"

# Check for monitoring of DOM mutations (defense)
grep -rn "MutationObserver\|observeDOM\|domWatcher" --include="*.ts" --include="*.tsx"
```

## Vulnerable Code

```typescript
// Seed phrase backup flow that renders mnemonics in the DOM
function SeedPhraseBackup({ mnemonic }: { mnemonic: string }) {
  // VULNERABLE: Seed phrase rendered in DOM -- any extension can read it
  return (
    <div className="seed-phrase-container">
      <h2>Your Recovery Phrase</h2>
      <div className="seed-words">
        {mnemonic.split(' ').map((word, i) => (
          <span key={i} className="seed-word">
            {i + 1}. {word}
          </span>
        ))}
      </div>
      {/* VULNERABLE: Copy button puts seed phrase in clipboard -- extensions can read */}
      <button onClick={() => navigator.clipboard.writeText(mnemonic)}>
        Copy to Clipboard
      </button>
    </div>
  );
}

// Wallet connection that trusts any injected provider
function connectWallet() {
  // VULNERABLE: No verification that window.solana is the real Phantom
  const provider = (window as any).solana;
  if (provider?.isPhantom) {
    // A malicious extension can inject a fake provider
    return provider.connect();
  }
}
```

## Secure Code

```typescript
// Minimize seed phrase DOM exposure
function SeedPhraseBackup({ mnemonic }: { mnemonic: string }) {
  const [revealed, setRevealed] = useState(false);
  const [copiedWord, setCopiedWord] = useState<number | null>(null);
  const words = mnemonic.split(' ');

  return (
    <div className="seed-phrase-container">
      <h2>Your Recovery Phrase</h2>
      {/* SECURE: Only reveal words one at a time, with user interaction */}
      {revealed ? (
        <div className="seed-words">
          {words.map((word, i) => (
            <span
              key={i}
              className="seed-word"
              // Words shown briefly, individually, then hidden
              onMouseDown={() => setCopiedWord(i)}
              onMouseUp={() => setCopiedWord(null)}
            >
              {i + 1}. {copiedWord === i ? word : '****'}
            </span>
          ))}
        </div>
      ) : (
        <button onClick={() => setRevealed(true)}>
          Reveal (ensure no screen sharing is active)
        </button>
      )}
      {/* SECURE: No clipboard copy -- user writes down manually */}
      <p>Write these words down on paper. Do not copy to clipboard.</p>
    </div>
  );
}

// Wallet connection with provider verification
function connectWallet() {
  const provider = (window as any).solana;
  if (!provider) throw new Error('No wallet found');

  // Verify provider characteristics (not foolproof, but raises the bar)
  if (typeof provider.connect !== 'function' ||
      typeof provider.signTransaction !== 'function') {
    throw new Error('Invalid wallet provider');
  }
  return provider.connect();
}
```

## Impact

Malicious browser extensions can steal seed phrases displayed in the DOM, intercept transaction signing requests, replace destination addresses in transactions, exfiltrate authentication tokens, and inject phishing overlays. The Trust Wallet extension attack resulted in $7M+ in stolen crypto. While applications cannot fully prevent extension-based attacks, reducing DOM exposure of sensitive data significantly limits the attack surface.

## References

- Trust Wallet Chrome Extension v2.68 Supply Chain Attack (December 2025) -- $7M+ drained
- "Safery: Ethereum Wallet" malicious Chrome extension (November 2024) -- seed phrase theft
- Socket: "The Growing Risk of Malicious Browser Extensions" (June 2025)
- Nominis: "Are Your Crypto Wallet Extensions Safe?" (November 2025)
- CWE-829: Inclusion of Functionality from Untrusted Control Sphere
