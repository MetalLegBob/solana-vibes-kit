# Solana Domain Pack

Decision-support knowledge for Solana program development.

## What This Pack Knows

**Framework & Architecture**
- Anchor vs native program development — trade-offs, when to use each
- PDA design patterns — derivation strategies, account layout optimization
- CPI architecture — security patterns from real audits

**Token & DeFi**
- Token-2022 extensions — compatibility matrix, feature interactions
- Transfer hooks vs CPI tax — fee collection mechanisms
- Bonding curve variants — constant product, linear, sigmoid, custom math
- Oracle comparison — Pyth vs Switchboard vs alternatives

**Operations**
- On-chain automation — Clockwork, keeper networks, alternatives
- State compression — compressed accounts vs regular, when to use each
- Program upgrade strategies — upgradeability patterns and migration

**Security**
- Lessons from real audits — Trail of Bits, OtterSec, Neodyme findings
- Post-mortem analyses — Wormhole, Mango, Cashio, Crema incidents
- Common vulnerability patterns and mitigations

## Sources

Knowledge synthesized from: Solana official docs, Anchor book, Trail of Bits audits, OtterSec reports, Neodyme findings, Helius/Jito/Marinade engineering blogs, Solana StackExchange, and academic research.

## Signals

This pack activates when: `Cargo.toml` contains `anchor-lang` or `solana-program`, `Anchor.toml` is present, or the user mentions Solana/Anchor development.
