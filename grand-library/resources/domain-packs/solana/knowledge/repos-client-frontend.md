---
pack: solana
topic: "Forkable Repos — Client & Frontend"
type: repo-catalogue
confidence: 8/10
sources_checked: 20
last_verified: "2026-02-16"
---

# Client & Frontend — Forkable Repo Catalogue

> **Verification status:** Live-verified on 2026-02-16 via GitHub API and Exa web search. Star/fork counts are approximate (±5%). License information confirmed against GitHub's license detection.

---

## Wallet Adapters

### Solana Wallet Adapter

- **URL:** https://github.com/anza-xyz/wallet-adapter (moved from solana-labs/wallet-adapter)
- **Framework:** React, TypeScript
- **License:** Apache 2.0
- **Use cases:** Reusable component
- **Category tags:** Wallet connection, React, multi-wallet support

**Trust signals:**
- Official Anza (formerly Solana Labs) maintained
- The de facto standard for wallet connection on Solana web apps
- ~2,000 stars, ~1,100 forks
- Used by virtually every Solana dApp
- Actively maintained (releases through 2025)

**Builder notes:**
> The standard wallet connection library. Supports 20+ wallets out of the box. Use this as a dependency — don't build your own wallet adapter unless you have a very specific reason. The React hooks (`useWallet`, `useConnection`) are clean and well-documented. For new projects, pair with `@solana/kit` (web3.js v2). The `WalletMultiButton` component provides a ready-made UI. If you need deep customization, study the adapter pattern and build a custom UI on top of the hooks.

**Complexity:** Low — well-documented React hooks and components
**Confidence:** 9/10
**Last verified:** 2026-02-16

---

### Unified Wallet Kit

- **URL:** https://github.com/TeamRaccoons/Unified-Wallet-Kit (NOT jup-ag — hosted by TeamRaccoons)
- **Framework:** React, TypeScript
- **License:** No license detected on GitHub — **risk flag for forking**
- **Use cases:** Reusable component, Fork candidate
- **Category tags:** Wallet UI, modal, multi-wallet, React

**Trust signals:**
- Built by Jupiter team (published as `@jup-ag/wallet-adapter` on npm)
- Modern wallet modal UI used on Jupiter's own frontend
- ~88 stars, ~44 forks
- Actively maintained

**Builder notes:**
> A polished wallet modal UI built on top of the standard wallet adapter. If the default `WalletMultiButton` UI doesn't fit your design, this provides a more modern, customizable alternative. Jupiter uses this in production. Fork candidate for custom wallet connection UIs — cleaner starting point than building a modal from scratch. **Note: no license file detected — verify before forking.**

**Complexity:** Low — React component library
**Confidence:** 7/10
**Last verified:** 2026-02-16

---

### Wallet Standard

- **URL:** https://github.com/wallet-standard/wallet-standard
- **Framework:** TypeScript (framework-agnostic)
- **License:** Apache 2.0 (confirmed)
- **Use cases:** Reference implementation, Reusable component
- **Category tags:** Wallet standard, cross-chain, protocol

**Trust signals:**
- Cross-chain standard supported by Anza and wallet teams
- Defines the interface wallets must implement
- Foundation for wallet-adapter's detection system
- ~333 stars, ~56 forks. Low-cadence commits expected for a mature specification.

**Builder notes:**
> The specification and reference implementation for how wallets register and communicate with dApps. You rarely interact with this directly — wallet-adapter abstracts it. Study it if building a wallet or extending wallet capabilities. The `registerWallet` and feature detection patterns are the key interfaces.

**Complexity:** Medium — protocol-level specification
**Confidence:** 8/10
**Last verified:** 2026-02-16

---

## Starters / Scaffolds

### create-solana-dapp

- **URL:** https://github.com/solana-foundation/create-solana-dapp (moved from solana-developers/)
- **Framework:** Next.js, React, TypeScript
- **License:** MIT (confirmed)
- **Use cases:** Fork candidate, Reusable component
- **Category tags:** Scaffold, full-stack, Next.js, React, Anchor integration

**Trust signals:**
- Official Solana Foundation (previously Solana Developers)
- Active development, used in official tutorials and bootcamps
- Follows current best practices
- ~602 stars, ~176 forks. Latest: v4.8.2 (Jan 2026).

**Builder notes:**
> `npx create-solana-dapp` — the fastest path to a working full-stack Solana app. Generates Next.js or React projects with wallet adapter pre-configured and Anchor program integration scaffolded. **Best for:** hackathons, MVPs, and getting started quickly. The generated code is opinionated (Next.js, specific UI library choices) — for production apps you'll restructure significantly but the patterns are sound.

**Complexity:** Low — scaffolding tool, run and go
**Confidence:** 9/10
**Last verified:** 2026-02-16

---

### dapp-scaffold

> **⚠️ ARCHIVED:** Archived by owner on January 7, 2025. Read-only. Superseded by `create-solana-dapp`.

- **URL:** https://github.com/solana-labs/dapp-scaffold
- **Framework:** Next.js, React, TypeScript
- **License:** Apache 2.0 (confirmed)
- **Use cases:** Historical reference (archived)
- **Category tags:** Scaffold, Next.js, wallet adapter, starter template

**Trust signals:**
- Official Solana Labs
- One of the oldest Solana dApp starters
- ~1,800 stars, ~1,000 forks
- **ARCHIVED** January 7, 2025. Superseded by create-solana-dapp.

**Builder notes:**
> The classic Solana dApp starter. Simpler than create-solana-dapp (fewer opinions, less scaffolding). **This repo is archived — use create-solana-dapp for new projects.** The code remains a reference but uses older patterns and dependencies.

**Complexity:** Low — minimal starter template
**Confidence:** 6/10 (archived)
**Last verified:** 2026-02-16

---

### Solana Program Examples

- **URL:** https://github.com/solana-developers/program-examples
- **Framework:** Anchor + Native Rust + TypeScript
- **License:** MIT (per GitHub — not Apache 2.0 as previously assumed)
- **Use cases:** Reference implementation
- **Category tags:** Examples, tutorials, Anchor, native Rust, Token-2022

**Trust signals:**
- Official Solana Developers
- Comprehensive collection of working examples
- Actively maintained and expanded
- ~1,368 stars, ~517 forks. Last push: Feb 2026. 50+ contributors.

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
- **License:** Apache 2.0 (confirmed)
- **Use cases:** Reusable component
- **Category tags:** Mobile, wallet connection, Android, React Native

**Trust signals:**
- Official Solana Mobile team
- Used by Saga phone and mobile dApps
- Actively maintained
- Multi-platform support
- ~315 stars, ~144 forks. 1,214 commits. Active MWA 2.0 spec work.

**Builder notes:**
> The mobile equivalent of wallet-adapter for web. If building a mobile Solana dApp, this is the standard way to connect wallets. Supports Android natively and React Native for cross-platform. The protocol handles deep-linking between your app and wallet apps. If building React Native, use the React Native bindings for the smoothest integration.

**Complexity:** Medium — mobile-specific concerns (deep linking, app lifecycle)
**Confidence:** 8/10
**Last verified:** 2026-02-16

---

### Solana Mobile dApp Scaffold

- **URL:** https://github.com/solana-mobile/solana-mobile-dapp-scaffold
- **Framework:** React Native, TypeScript
- **License:** No license detected on GitHub
- **Use cases:** Fork candidate (with caution)
- **Category tags:** Mobile, scaffold, React Native, Solana Mobile

**Trust signals:**
- Official Solana Mobile team
- Pre-configured with mobile wallet adapter
- ~61 stars, ~27 forks. No releases published.
- **⚠️ STALE:** No releases, low activity, no visible license. Consider `solana-mobile/solana-kotlin-compose-scaffold` as newer alternative.

**Builder notes:**
> The mobile equivalent of dapp-scaffold. Fork this to start a Solana mobile dApp with wallet connection pre-configured. If building a mobile-first Solana app, this saves significant setup time compared to wiring up mobile-wallet-adapter from scratch. **Verify license and check for more recent alternatives.**

**Complexity:** Low-Medium — React Native scaffold with mobile wallet integration
**Confidence:** 5/10 (stale, no license)
**Last verified:** 2026-02-16

---

## Client Libraries

### @solana/kit (web3.js v2)

- **URL:** https://github.com/solana-foundation/solana-web3.js (moved from solana-labs). New v2 development at `anza-xyz/kit`.
- **Framework:** TypeScript
- **License:** MIT
- **Use cases:** Reusable component
- **Category tags:** SDK, TypeScript, client, core infrastructure

**Trust signals:**
- Official Solana Foundation / Anza
- Core ecosystem SDK — ~2,697 stars, ~1,030 forks (v1 repo)
- v2 is a complete rewrite with modern TS patterns
- v1.x in maintenance-only mode; all new development at `anza-xyz/kit`
- **⚠️ Dec 2024 supply chain attack:** Malicious npm publish of v1.95.6/1.95.7 exfiltrated private keys. Patched in v1.95.8. No incidents since Feb 2025.

**Builder notes:**
> The official TypeScript SDK. v2 (@solana/kit) is a radical departure from v1 — functional, composable, tree-shakeable. **New projects should use v2.** The migration from v1 is significant but worth it. Codama generates clients targeting v2 natively. The functional API requires a mental model shift from v1's class-based approach — study the examples carefully.

**Complexity:** Medium — new functional API requires learning
**Confidence:** 9/10
**Last verified:** 2026-02-16

---

### Helius SDK

- **URL:** https://github.com/helius-labs/helius-sdk
- **Framework:** TypeScript
- **License:** MIT (confirmed)
- **Use cases:** Reusable component
- **Category tags:** SDK, enhanced transactions, DAS API, webhooks, RPC

**Trust signals:**
- Maintained by Helius Labs (major Solana infrastructure provider)
- Active development
- Wraps Helius's enhanced APIs
- ~268 stars, ~73 forks. Major v2.0 rewrite using `@solana/kit`.

**Builder notes:**
> SDK for Helius APIs: enhanced transaction parsing, Digital Asset Standard (DAS) API, webhooks, and priority fee estimation. The enhanced transaction API parses raw transactions into human-readable events (swaps, transfers, NFT sales). **API dependency** — you're dependent on Helius's service. The SDK is a thin client but the parsing quality is excellent for debugging and building transaction UIs.

**Complexity:** Low — straightforward SDK
**Confidence:** 8/10
**Last verified:** 2026-02-16

---

## Solana Pay

### Solana Pay

- **URL:** https://github.com/solana-foundation/solana-pay (moved from solana-labs)
- **Framework:** TypeScript
- **License:** Apache 2.0
- **Use cases:** Reusable component, Fork candidate
- **Category tags:** Payments, QR code, point-of-sale, commerce

**Trust signals:**
- Official Solana Foundation (moved from solana-labs)
- Production standard for Solana payments
- Used by Shopify Solana Pay integration
- ~1,500 stars, ~529 forks

**Builder notes:**
> The standard for Solana payment links and QR codes. Two modes: transfer requests (simple SOL/token send) and transaction requests (arbitrary transaction via URL callback — very powerful). If building commerce, point-of-sale, or payment features, start here. The transaction request pattern is underutilized — it can encode any Solana transaction in a QR code, making it useful far beyond simple payments. The POS app example is a good fork candidate for retail applications.

**Complexity:** Low-Medium — simple protocol, transaction requests add flexibility
**Confidence:** 9/10
**Last verified:** 2026-02-16

---

## Builder Recommendations

**Starting a web dApp:**
`npx create-solana-dapp` for full scaffold (dapp-scaffold is archived). Use wallet-adapter + @solana/kit.

**Starting a mobile dApp:**
Use mobile-wallet-adapter. Check for latest scaffold options (solana-mobile-dapp-scaffold is stale).

**Building commerce/payments:**
Start with Solana Pay. The transaction request pattern is powerful beyond basic payments.

**Need a polished wallet UI:**
Jupiter's Unified Wallet Kit (at TeamRaccoons org) on top of wallet-adapter. Note: no license detected.

## License Summary

| License | Repos | Fork-Friendly? |
|---|---|---|
| Apache 2.0 | Wallet Adapter, Wallet Standard, Solana Pay, Mobile Wallet Adapter | **Yes** |
| MIT | @solana/kit, create-solana-dapp, Helius SDK, Program Examples | **Yes** |
| No license | Unified Wallet Kit, Mobile dApp Scaffold | **⚠️ Risk** — verify before forking |
| Archived | dapp-scaffold (Apache 2.0) | Historical reference only |
