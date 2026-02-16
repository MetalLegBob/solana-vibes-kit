---
pack: solana
topic: "web3.js v1 vs v2"
decision: "Should I use @solana/web3.js v1 or v2?"
confidence: 8/10
sources_checked: 15
last_updated: "2026-02-16"
---

# Should I Use @solana/web3.js v1 or v2?

## TL;DR

**For new projects (Feb 2026):** Use v2 (@solana/kit) if you're working with standard Solana programs (System, Token, etc.) and don't need Anchor.

**For existing projects:** Stay on v1 unless you have 2-4 weeks for migration and don't depend heavily on Anchor or ecosystem libraries that haven't migrated yet.

**Key consideration:** Anchor SDK still only supports v1 as of early 2026. If you're building custom on-chain programs with Anchor, stick with v1 or plan to generate manual clients for your programs.

## Architecture Comparison

### v1: Monolithic, Class-Based
```javascript
// v1 - everything in one package, class-based
import { Connection, Keypair, Transaction, PublicKey } from '@solana/web3.js';

const connection = new Connection(RPC_URL);
const keypair = Keypair.generate();
const transaction = new Transaction();
transaction.add(/* instructions */);
```

**Characteristics:**
- Single package with all functionality
- Object-oriented, mutable classes
- ~90KB minified bundle (entire library)
- Established ecosystem support
- Familiar to all existing Solana developers

### v2: Modular, Functional
```javascript
// v2 - modular packages, functional API
import { createSolanaRpc } from '@solana/rpc';
import { generateKeyPairSigner } from '@solana/keys';
import { pipe } from '@solana/functional';
import { createTransactionMessage } from '@solana/transaction-messages';

const rpc = createSolanaRpc(RPC_URL);
const signer = await generateKeyPairSigner();
const message = pipe(
  createTransactionMessage({ version: 0 }),
  // functional composition
);
```

**Characteristics:**
- 40+ modular packages (importable via @solana/kit)
- Functional, immutable patterns
- Tree-shakeable (~33KB minified when optimized)
- 10x faster crypto operations (native Ed25519)
- Modern TypeScript with enhanced type safety

## Bundle Size Reality Check

**Marketing vs Reality:**

The "70% smaller bundles" claim is true *only if you import individual functions*:

- **v1 full import:** 90KB minified
- **v2 tree-shaken:** 33KB minified (typical optimized app)
- **v2 full import:** 280KB minified (if you import everything)

**Real-world impact:** Solana Explorer homepage dropped from 311KB to 228KB (-26%) after migration. Wallet connection times improved from ~3 seconds to ~300ms.

## Major Breaking Changes

### 1. No Drop-In Replacement
v2 is a **complete rewrite**, not an upgrade. Every API changed:

| Concept | v1 | v2 |
|---------|-----|-----|
| **Connection** | `new Connection(url)` | `createSolanaRpc(url)` |
| **Keypairs** | `Keypair.generate()` | `generateKeyPairSigner()` |
| **Public Keys** | `new PublicKey(string)` | `address(string)` |
| **Transactions** | `new Transaction()` | `createTransactionMessage()` |
| **Subscriptions** | `connection.onAccountChange()` | Separate `createSolanaRpcSubscriptions()` |

### 2. Functional Composition Pattern
v2 uses `pipe()` for building transactions (immutable):

```javascript
// v1 - mutable object manipulation
const transaction = new Transaction();
transaction.add(instruction1);
transaction.add(instruction2);
transaction.feePayer = payer;

// v2 - immutable functional composition
const message = pipe(
  createTransactionMessage({ version: 0 }),
  tx => setTransactionMessageFeePayer(feePayer, tx),
  tx => appendTransactionMessageInstructions([instruction1, instruction2], tx)
);
```

### 3. Type Safety Improvements
v2 catches errors at compile time that v1 only caught at runtime:

- Lookup tables in legacy transactions → Type error
- Missing instruction accounts → Type error
- Missing transaction signatures → Type error
- Missing blockhash → Type error

### 4. Error Handling
Different error types and patterns:

```javascript
// v1
try {
  await connection.sendTransaction(transaction);
} catch (error) {
  if (error.message.includes('blockhash not found')) { }
}

// v2 - structured error codes
import { isSolanaError, SOLANA_ERROR__TRANSACTION__BLOCKHASH_NOT_FOUND } from '@solana/errors';

try {
  await rpc.sendTransaction(transaction).send();
} catch (error) {
  if (isSolanaError(error, SOLANA_ERROR__TRANSACTION__BLOCKHASH_NOT_FOUND)) { }
}
```

## Performance Improvements

**Measured gains (Triton One Ping Thing service):**
- ~200ms faster median transaction confirmation times
- 10x faster cryptographic operations (keypair generation, signing, verification)
- Reduced bundle size improves page load times

**Why it's faster:**
- Native WebCrypto APIs (Node 18+) instead of polyfills
- Native `BigInt` support (no wrapper conversions)
- Tree-shaking eliminates unused code
- Optimized RPC communication layer

## Ecosystem Compatibility (Feb 2026)

### What Works with v2 Now:
- Standard programs: System, Token, Associated Token
- Tensor Toolkit (migrated)
- Orca TS SDK (migrated)
- Lighthouse SDK (migrated)
- Custom RPC methods (extensible)
- QuickNode add-ons

### What Doesn't Work Yet:
- **Anchor SDK** - Still v1 only (GitHub issue #2847 has 400+ reactions)
- Many DeFi protocol SDKs
- Some wallet adapters
- Older tutorial code and documentation

### Workarounds for Anchor:
1. Use v1 alongside v2 (creates dual dependency nightmare - 500KB+ bundles)
2. Wait for Anchor v2 support
3. Generate manual clients using Kinobi for your programs

## Migration Timeline (Real-World)

**Plan for 2-4 weeks minimum for a production app:**

- **Week 1:** Update imports, fix compilation errors
- **Week 2:** Rewrite transaction logic, fix runtime errors
- **Week 3:** Update tests, fix error handling
- **Week 4:** Integration testing, performance validation

**What needs rewriting:**
- Every import statement (100% of them)
- All transaction construction code
- All RPC calls
- All error handling
- All tests that touch web3.js
- Mock objects for testing

**Migration tools:** None. No automated codemod exists due to fundamental API differences.

## When to Use v1

**Choose v1 if you:**
- Use Anchor SDK for custom programs
- Depend on ecosystem libraries that haven't migrated
- Have tight deadlines (can't afford 2-4 week migration)
- Need maximum ecosystem compatibility
- Are following tutorials/docs written for v1

**v1 Status (Nov 2024+):**
- Maintenance mode only (security patches, no new features)
- Will be supported long-term (used by thousands of apps)
- Still the `@latest` npm tag until Dec 16, 2024

## When to Use v2

**Choose v2 if you:**
- Starting a new project from scratch
- Only use standard Solana programs (no Anchor)
- Want ~200ms faster transaction times
- Need smaller bundle sizes (mobile, edge deployment)
- Want modern TypeScript type safety
- Building long-term projects (future-proofing)

**v2 officially recommended for general use (Nov 7, 2024)**

## Migration Strategy

### For New Projects:
```bash
# Install v2 (now called @solana/kit)
npm install @solana/kit

# Or specific version
npm install @solana/web3.js@2
```

### For Existing Projects:
```bash
# Lock to v1 explicitly
npm install @solana/web3.js@1

# Update package.json
{
  "dependencies": {
    "@solana/web3.js": "^1.95.0"
  }
}
```

### For Gradual Migration:
1. **Don't mix v1/v2** in the same codebase (leads to type conflicts and massive bundles)
2. **Use feature flags** to test v2 in development first
3. **Have rollback plan** ready (keep v1 implementation behind feature flag)
4. **Update CI/CD** to lock versions and prevent accidental upgrades

## Priority Fees Gotcha

**Critical difference:** v2 doesn't auto-set priority fees like v1 did.

```javascript
// v1 - automatically estimated priority fees
const transaction = new Transaction();
// (fees handled internally)

// v2 - MUST explicitly set priority fees or transactions get stuck
import { setTransactionFeePayer } from '@solana/transactions';

const message = pipe(
  createTransactionMessage({ version: 0 }),
  tx => setTransactionFeePayer(feePayer, tx),
  // Must add compute budget instructions for priority fees!
);
```

Use Helius Priority Fee API or similar to get recommended fees.

## Node.js Version Requirements

**v2 requires Node.js 18.0+** for WebCrypto API support.

**Avoid Node 18.2.0** specifically - has a WebCrypto bug that breaks signature verification. Use 18.15.0+ or later.

## Additional Resources

### Official Docs:
- Anza v2 Release Announcement: https://www.anza.xyz/blog/solana-web3-js-2-release
- Kit Documentation: https://solanakit.org
- Migration Examples: https://github.com/anza-xyz/kit/tree/main/examples

### Community Guides:
- Helius Migration Guide: https://www.helius.dev/blog/how-to-start-building-with-the-solana-web3-js-2-0-sdk
- QuickNode v2 Guide: https://blog.quicknode.com/solana-web3-js-2-0-a-new-chapter-in-solana-development/
- Triton One Performance Analysis: https://blog.triton.one/intro-to-the-new-solana-kit-formerly-web3-js-2/

### Code Examples:
- Runnable examples: https://github.com/anza-xyz/kit/tree/main/examples
- CodeSandbox demo: https://solana-labs.github.io/solana-web3.js/example/

## Recommendation Summary

**February 2026 guidance:**

1. **New greenfield projects:** Use v2 unless you need Anchor
2. **Existing production apps:** Stay on v1 until Anchor support lands or ecosystem stabilizes
3. **Simple scripts/tools:** v2 is great (faster, smaller)
4. **Complex DeFi apps:** Wait 6-12 months for better ecosystem support unless performance is critical

The v2 rewrite is architecturally superior and represents the future of Solana JavaScript development. However, the ecosystem migration is still in progress. Your decision should be driven by whether you can afford the migration cost and whether your dependencies support v2.

**Confidence: 8/10** - Well-documented migration path and clear tradeoffs. Deducted 2 points because ecosystem support is still evolving and Anchor compatibility timeline is uncertain.
