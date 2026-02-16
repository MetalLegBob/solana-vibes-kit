---
pack: solana
topic: "Forkable Repos — Client & Frontend"
type: repo-catalogue
confidence: 8/10
sources_checked: 20
last_verified: "2026-02-16"
---

# Client & Frontend — Forkable Repo Catalogue

> **Verification note:** Fields marked [VERIFY] need live confirmation. Run `gh repo view <org/repo> --json licenseInfo,stargazerCount,forkCount,updatedAt` to verify.

---

## Wallet Adapters

### Solana Wallet Adapter

- **URL:** https://github.com/anza-xyz/wallet-adapter
- **Framework:** React, TypeScript
- **License:** Apache 2.0
- **Use cases:** Reusable component
- **Category tags:** Wallet connection, React, multi-wallet support

**Trust signals:**
- Official Anza (formerly Solana Labs) maintained
- The de facto standard for wallet connection on Solana web apps
- ~1,500+ stars [VERIFY]
- Used by virtually every Solana dApp
- Actively maintained

**Builder notes:**
> The standard wallet connection library. Supports 20+ wallets out of the box. Use this as a dependency — don't build your own wallet adapter unless you have a very specific reason. The React hooks (`useWallet`, `useConnection`) are clean and well-documented. For new projects, pair with `@solana/kit` (web3.js v2). The `WalletMultiButton` component provides a ready-made UI. If you need deep customization, study the adapter pattern and build a custom UI on top of the hooks.

**Complexity:** Low — well-documented React hooks and components
**Confidence:** 9/10
**Last verified:** 2026-02-16

---

### Unified Wallet Kit

- **URL:** https://github.com/jup-ag/unified-wallet-kit
- **Framework:** React, TypeScript
- **License:** [VERIFY] — likely MIT or Apache 2.0
- **Use cases:** Reusable component, Fork candidate
- **Category tags:** Wallet UI, modal, multi-wallet, React

**Trust signals:**
- Built by Jupiter — #1 DEX aggregator on Solana
- Modern wallet modal UI used on Jupiter's own frontend
- Actively maintained

**Builder notes:**
> A polished wallet modal UI built on top of the standard wallet adapter. If the default `WalletMultiButton` UI doesn't fit your design, this provides a more modern, customizable alternative. Jupiter uses this in production. Fork candidate for custom wallet connection UIs — cleaner starting point than building a modal from scratch.

**Complexity:** Low — React component library
**Confidence:** 7/10
**Last verified:** 2026-02-16

---

### Wallet Standard

- **URL:** https://github.com/wallet-standard/wallet-standard
- **Framework:** TypeScript (framework-agnostic)
- **License:** Apache 2.0 [VERIFY]
- **Use cases:** Reference implementation, Reusable component
- **Category tags:** Wallet standard, cross-chain, protocol

**Trust signals:**
- Cross-chain standard supported by Anza and wallet teams
- Defines the interface wallets must implement
- Foundation for wallet-adapter's detection system

**Builder notes:**
> The specification and reference implementation for how wallets register and communicate with dApps. You rarely interact with this directly — wallet-adapter abstracts it. Study it if building a wallet or extending wallet capabilities. The `registerWallet` and feature detection patterns are the key interfaces.

**Complexity:** Medium — protocol-level specification
**Confidence:** 8/10
**Last verified:** 2026-02-16

---

## Starters / Scaffolds

### create-solana-dapp

- **URL:** https://github.com/solana-developers/create-solana-dapp
- **Framework:** Next.js, React, TypeScript
- **License:** MIT [VERIFY]
- **Use cases:** Fork candidate, Reusable component
- **Category tags:** Scaffold, full-stack, Next.js, React, Anchor integration

**Trust signals:**
- Official Solana Developers (developer relations team)
- Active development, used in official tutorials and bootcamps
- Follows current best practices

**Builder notes:**
> `npx create-solana-dapp` — the fastest path to a working full-stack Solana app. Generates Next.js or React projects with wallet adapter pre-configured and Anchor program integration scaffolded. **Best for:** hackathons, MVPs, and getting started quickly. The generated code is opinionated (Next.js, specific UI library choices) — for production apps you'll restructure significantly but the patterns are sound.

**Complexity:** Low — scaffolding tool, run and go
**Confidence:** 9/10
**Last verified:** 2026-02-16

---

### dapp-scaffold

- **URL:** https://github.com/solana-labs/dapp-scaffold
- **Framework:** Next.js, React, TypeScript
- **License:** Apache 2.0 [VERIFY]
- **Use cases:** Fork candidate
- **Category tags:** Scaffold, Next.js, wallet adapter, starter template

**Trust signals:**
- Official Solana Labs
- One of the oldest Solana dApp starters
- ~1,500+ stars [VERIFY]
- Well-known in the ecosystem

**Builder notes:**
> The classic Solana dApp starter. Simpler than create-solana-dapp (fewer opinions, less scaffolding). Good starting point if you want a minimal Next.js + wallet-adapter setup without the full scaffolding that create-solana-dapp provides. May use older patterns — verify it targets @solana/kit (web3.js v2) and current wallet-adapter versions.

**Complexity:** Low — minimal starter template
**Confidence:** 8/10
**Last verified:** 2026-02-16

---

### Solana Program Examples

- **URL:** https://github.com/solana-developers/program-examples
- **Framework:** Anchor + Native Rust + TypeScript
- **License:** Apache 2.0 [VERIFY]
- **Use cases:** Reference implementation
- **Category tags:** Examples, tutorials, Anchor, native Rust, Token-2022

**Trust signals:**
- Official Solana Developers
- Comprehensive collection of working examples
- Actively maintained and expanded

**Builder notes:**
> Not a starter template — a comprehensive library of working Solana program examples organized by category (basics, tokens, compression, oracles, etc.). The go-to resource for "how do I do X on Solana?" questions. Each example includes both the program and client code. Study before building — your pattern is likely already demonstrated here.

**Complexity:** Varies — from simple (hello world) to medium (Token-2022 extensions)
**Confidence:** 9/10
**Last verified:** 2026-02-16

---

## Mobile SDKs

### Mobile Wallet Adapter

- **URL:** https://github.com/solana-mobile/mobile-wallet-adapter
- **Framework:** Android (Kotlin/Java), React Native, TypeScript
- **License:** Apache 2.0 [VERIFY]
- **Use cases:** Reusable component
- **Category tags:** Mobile, wallet connection, Android, React Native

**Trust signals:**
- Official Solana Mobile team
- Used by Saga phone and mobile dApps
- Actively maintained
- Multi-platform support

**Builder notes:**
> The mobile equivalent of wallet-adapter for web. If building a mobile Solana dApp, this is the standard way to connect wallets. Supports Android natively and React Native for cross-platform. The protocol handles deep-linking between your app and wallet apps. If building React Native, use the React Native bindings for the smoothest integration.

**Complexity:** Medium — mobile-specific concerns (deep linking, app lifecycle)
**Confidence:** 8/10
**Last verified:** 2026-02-16

---

### Solana Mobile dApp Scaffold

- **URL:** https://github.com/solana-mobile/solana-mobile-dapp-scaffold
- **Framework:** React Native, TypeScript
- **License:** Apache 2.0 [VERIFY]
- **Use cases:** Fork candidate
- **Category tags:** Mobile, scaffold, React Native, Solana Mobile

**Trust signals:**
- Official Solana Mobile team
- Pre-configured with mobile wallet adapter

**Builder notes:**
> The mobile equivalent of dapp-scaffold. Fork this to start a Solana mobile dApp with wallet connection pre-configured. If building a mobile-first Solana app, this saves significant setup time compared to wiring up mobile-wallet-adapter from scratch.

**Complexity:** Low-Medium — React Native scaffold with mobile wallet integration
**Confidence:** 7/10
**Last verified:** 2026-02-16

---

## Client Libraries

### @solana/kit (web3.js v2)

- **URL:** https://github.com/solana-labs/solana-web3.js
- **Framework:** TypeScript
- **License:** MIT
- **Use cases:** Reusable component
- **Category tags:** SDK, TypeScript, client, core infrastructure

**Trust signals:**
- Official Solana Labs / Anza
- Core ecosystem SDK — thousands of stars
- v2 is a complete rewrite with modern TS patterns
- Actively maintained

**Builder notes:**
> The official TypeScript SDK. v2 (@solana/kit) is a radical departure from v1 — functional, composable, tree-shakeable. **New projects should use v2.** The migration from v1 is significant but worth it. Codama generates clients targeting v2 natively. The functional API requires a mental model shift from v1's class-based approach — study the examples carefully.

**Complexity:** Medium — new functional API requires learning
**Confidence:** 9/10
**Last verified:** 2026-02-16

---

### Helius SDK

- **URL:** https://github.com/helius-labs/helius-sdk
- **Framework:** TypeScript
- **License:** MIT [VERIFY]
- **Use cases:** Reusable component
- **Category tags:** SDK, enhanced transactions, DAS API, webhooks, RPC

**Trust signals:**
- Maintained by Helius Labs (major Solana infrastructure provider)
- Active development
- Wraps Helius's enhanced APIs

**Builder notes:**
> SDK for Helius APIs: enhanced transaction parsing, Digital Asset Standard (DAS) API, webhooks, and priority fee estimation. The enhanced transaction API parses raw transactions into human-readable events (swaps, transfers, NFT sales). **API dependency** — you're dependent on Helius's service. The SDK is a thin client but the parsing quality is excellent for debugging and building transaction UIs.

**Complexity:** Low — straightforward SDK
**Confidence:** 8/10
**Last verified:** 2026-02-16

---

## Solana Pay

### Solana Pay

- **URL:** https://github.com/solana-labs/solana-pay
- **Framework:** TypeScript
- **License:** Apache 2.0
- **Use cases:** Reusable component, Fork candidate
- **Category tags:** Payments, QR code, point-of-sale, commerce

**Trust signals:**
- Official Solana Labs
- Production standard for Solana payments
- Used by Shopify Solana Pay integration
- ~1,200+ stars [VERIFY]

**Builder notes:**
> The standard for Solana payment links and QR codes. Two modes: transfer requests (simple SOL/token send) and transaction requests (arbitrary transaction via URL callback — very powerful). If building commerce, point-of-sale, or payment features, start here. The transaction request pattern is underutilized — it can encode any Solana transaction in a QR code, making it useful far beyond simple payments. The POS app example is a good fork candidate for retail applications.

**Complexity:** Low-Medium — simple protocol, transaction requests add flexibility
**Confidence:** 9/10
**Last verified:** 2026-02-16

---

## Builder Recommendations

**Starting a web dApp:**
`npx create-solana-dapp` for full scaffold, or fork dapp-scaffold for minimal setup. Use wallet-adapter + @solana/kit.

**Starting a mobile dApp:**
Fork solana-mobile-dapp-scaffold. Use mobile-wallet-adapter.

**Building commerce/payments:**
Start with Solana Pay. The transaction request pattern is powerful beyond basic payments.

**Need a polished wallet UI:**
Jupiter's Unified Wallet Kit on top of wallet-adapter.

## License Summary

| License | Repos | Fork-Friendly? |
|---|---|---|
| Apache 2.0 | Wallet Adapter, Wallet Standard, Solana Pay, Mobile Wallet Adapter, dapp-scaffold | **Yes** |
| MIT | @solana/kit, create-solana-dapp, Helius SDK | **Yes** |
| VERIFY | Unified Wallet Kit, Mobile dApp Scaffold | **Likely yes** |
