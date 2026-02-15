# Wave 2: Exa Deep-Dive Research
<!-- Source: Exa MCP searches from main thread, 2026-02-06 -->
<!-- Covers: Technical deep-dives on 12+ key incidents -->

---

## 1. Cetus DEX Hack (May 22, 2025, ~$223M-$260M)

**Root Cause:** Integer overflow in `checked_shlw(u256)` function within `get_delta_a` liquidity calculation.

**Category:** Arithmetic / Integer Overflow

**Technical Mechanism (Step-by-Step):**
1. The `get_delta_a` function calculates how many tokens of Token A are needed when adding liquidity
2. It uses `checked_shlw` to shift a value left by 64 bits (multiply by 2^64) for fixed-point precision
3. `checked_shlw` was supposed to prevent overflow by checking if the value was too large to shift
4. **THE BUG:** The constant used in the overflow check was INCORRECT — it was too permissive
5. Sufficiently large values passed the check but silently wrapped modulo 2^256 after the shift
6. The wrapping caused the numerator to collapse to a tiny value (often just **1**)
7. Result: attacker deposits only **1 unit of Token A** but gets credited with **full liquidity amount (L)**

**Attack Sequence:**
1. Flash-swap to acquire large amount of Token B (SUI)
2. Open a very narrow liquidity position (small tick range)
3. Add liquidity with manipulated parameters — supply only 1 unit of Token A
4. Due to overflow bug, full liquidity L is minted
5. Remove liquidity — get back the FULL amount of Token A for the full L
6. Repay flash loan, keep the profit (massive Token B surplus)

**Vulnerable Code Pattern (Move pseudocode):**
```rust
// In clmm_math.move - get_delta_a function
fn checked_shlw(value: u256) -> u256 {
    // BUG: Incorrect overflow mask - threshold too high
    // Allows values that WILL overflow when shifted
    assert!(value <= INCORRECT_MAX_THRESHOLD);
    value << 64  // Wraps silently in Move language!
}

fn get_delta_a(liquidity: u128, sqrt_price_a: u128, sqrt_price_b: u128) -> u64 {
    let numerator = checked_shlw(liquidity as u256 * (sqrt_price_b - sqrt_price_a) as u256);
    // When overflow wraps to ~1, division produces ~1
    let result = numerator / (sqrt_price_a as u256 * sqrt_price_b as u256);
    result as u64  // Returns 1 instead of massive number
}
```

**Secure Code Pattern:**
```rust
fn checked_shlw(value: u256) -> u256 {
    // CORRECT: Check that the top 64 bits are zero before shifting
    assert!(value >> 192 == 0);  // Ensures no overflow after << 64
    value << 64
}
```

**Detection Strategy:**
- Look for custom bit-shift functions with manual overflow checks
- Verify overflow guard constants are mathematically correct
- Check if the language silently wraps on overflow (Move does, Rust panics by default)
- Audit any `get_delta_a` / `get_delta_b` functions in CLMM implementations
- Check for third-party math libraries (`integer-mate` was the vulnerable library)

**Key Insight:** The vulnerable `integer-mate` library was used across multiple projects. A similar bug was found in an Aptos version in 2023 but the fix was NOT correctly ported to Sui.

**Sources:**
- https://blog.verichains.io/p/cetus-protocol-hacked-analysis
- https://dedaub.com/blog/the-cetus-amm-200m-hack-how-a-flawed-overflow-check-led-to-catastrophic-loss/
- https://www.halborn.com/blog/post/explained-the-cetus-hack-may-2025
- https://www.merklescience.com/blog/hack-track-how-a-shared-library-bug-triggered-the-223m-cetus-hack

---

## 2. Wormhole Bridge Exploit (Feb 2, 2022, $326M)

**Root Cause:** Signature verification bypass via fake sysvar account injection.

**Category:** Missing Account Validation / Signature Verification

**Technical Mechanism:**
1. Wormhole's `verify_signatures` function used deprecated `load_instruction_at` / `load_current_index`
2. This function loads instruction data from the Solana Instructions sysvar
3. **THE BUG:** `load_instruction_at` did NOT validate that the provided account was actually the real Instructions sysvar
4. Attacker created a FAKE sysvar account pre-loaded with data showing Secp256k1 had been called
5. Passed fake sysvar to `verify_signatures` — function accepted forged signatures as valid
6. Created valid `SignatureSet` → called `post_vaa` with forged VAA
7. VAA specified minting 120,000 wETH
8. Called `complete_wrapped` which minted 120,000 wETH using the forged VAA

**Vulnerable Code Pattern:**
```rust
// Wormhole verify_signatures - VULNERABLE
pub fn verify_signatures(ctx: Context<VerifySignatures>, data: VerifySigData) -> Result<()> {
    // BUG: Uses deprecated load_instruction_at which does NOT validate
    // that the account is actually the Instructions sysvar
    let ix = load_instruction_at(
        0,
        &ctx.accounts.instruction_sysvar  // Could be ANY account!
    )?;

    // Checks that Secp256k1 was called - but instruction data is from fake account
    verify_secp256k1_instruction(&ix)?;

    // Marks signatures as verified based on fake data
    signature_set.verified = true;
    Ok(())
}
```

**Secure Code Pattern:**
```rust
pub fn verify_signatures(ctx: Context<VerifySignatures>, data: VerifySigData) -> Result<()> {
    // SECURE: Use load_instruction_at_checked which validates the sysvar account
    let ix = load_instruction_at_checked(
        0,
        &ctx.accounts.instruction_sysvar
    )?;
    // OR: Validate sysvar address explicitly
    require!(
        ctx.accounts.instruction_sysvar.key() == sysvar::instructions::ID,
        WormholeError::InvalidSysvar
    );

    verify_secp256k1_instruction(&ix)?;
    signature_set.verified = true;
    Ok(())
}
```

**Detection Strategy:**
- Search for `load_instruction_at` (deprecated) — should be `load_instruction_at_checked`
- Check any account claimed to be a sysvar is validated against the known sysvar address
- Look for Secp256k1 signature verification that trusts instruction data without validating source
- Any cross-program message verification that doesn't validate the instruction sysvar

**Sources:**
- https://www.certik.com/resources/blog/wormhole-bridge-exploit-incident-analysis
- https://www.halborn.com/blog/post/explained-the-wormhole-hack-february-2022
- https://research.kudelskisecurity.com/2022/02/03/quick-analysis-of-the-wormhole-attack/

---

## 3. Cashio Exploit (Mar 23, 2022, $52.8M)

**Root Cause:** Missing validation of `mint` field in `saber_swap.arrow` account + missing root of trust.

**Category:** Missing Account Validation / Incomplete Constraint Chain

**Technical Mechanism:**
1. Cashio's `print_cash` (mint) instruction required Saber LP tokens as collateral
2. Validation chain: bank → collateral_tokens → saber_swap.arrow → actual LP token
3. **BUG 1:** Code checked that deposited token type matched `saber_swap.arrow` account, but did NOT validate the `mint` field within that account
4. **BUG 2:** No "root of trust" — attacker could create fake accounts "all the way down"
5. Attacker created fake `saber_swap.arrow` with worthless token as collateral
6. Created fake bank using `crate_mint` setting collateral to worthless token
7. Minted 2 billion CASH tokens with zero real collateral
8. Redeemed CASH for real USDT/USDC stablecoins, draining $52.8M

**Vulnerable Code Pattern:**
```rust
#[derive(Accounts)]
pub struct PrintCash<'info> {
    #[account(mut)]
    pub collateral_tokens: Account<'info, TokenAccount>,
    // BUG: Only checks token type matches, NOT the mint field
    pub saber_swap_arrow: AccountInfo<'info>,  // No validation!
    pub bank: Account<'info, Bank>,
    // Missing: no root of trust connecting bank → arrow → actual Saber LP
}

pub fn print_cash(ctx: Context<PrintCash>, amount: u64) -> Result<()> {
    // Checks collateral type matches arrow, but arrow itself is unvalidated
    let arrow = deserialize_arrow(&ctx.accounts.saber_swap_arrow)?;
    require!(ctx.accounts.collateral_tokens.mint == arrow.lp_token);
    // BUG: arrow.lp_token can be anything — attacker controls the arrow account!

    mint_cash(amount)?;
    Ok(())
}
```

**Secure Code Pattern:**
```rust
#[derive(Accounts)]
pub struct PrintCash<'info> {
    #[account(mut)]
    pub collateral_tokens: Account<'info, TokenAccount>,
    // SECURE: Validate arrow account ownership AND mint field
    #[account(
        constraint = saber_swap_arrow.owner == &saber_program::ID,
        constraint = saber_swap_arrow.lp_mint == KNOWN_LP_MINT,
    )]
    pub saber_swap_arrow: Account<'info, SaberArrow>,
    #[account(
        constraint = bank.collateral_mint == KNOWN_COLLATERAL_MINT,
        has_one = collateral_mint,
    )]
    pub bank: Account<'info, Bank>,
}
```

**Detection Strategy:**
- Look for account validation chains where intermediate accounts aren't fully validated
- Check for "root of trust" — is there an unbroken validation chain from a known, trusted value?
- Search for `AccountInfo<'info>` (unchecked accounts) in minting/burning logic
- Verify that every account in a collateral chain is owned by the expected program
- Check that mint fields are validated, not just token types

**Sources:**
- https://medium.com/coinmonks/cashioapp-attack-whats-the-vulnerability-and-how-soteria-detects-it
- https://www.halborn.com/blog/post/explained-the-cashio-hack-march-2022
- https://ibtimes.com/infinite-mint-glitch-hits-solana-based-cashio-app-cash-stablecoin-crashes-zero-3449165

---

## 4. Mango Markets Exploit (Oct 11, 2022, $116M)

**Root Cause:** Oracle price manipulation via thin-liquidity perpetual futures market.

**Category:** Oracle Manipulation / Economic Attack

**Technical Mechanism:**
1. Avraham Eisenberg funded two accounts with ~$10M USDC total
2. Account A: took massive SHORT position on MNGO perpetual futures
3. Account B: took massive LONG position on MNGO perpetual futures
4. Then pumped MNGO spot price across exchanges (FTX, AscendEX) from $0.038 to $0.91 — a 2,394% increase
5. MNGO had very thin liquidity — small buys caused huge price moves
6. Mango's oracle (Pyth) picked up the inflated spot price
7. Account B's long position was now worth ~$420M in unrealized PnL
8. Used inflated account equity as collateral to borrow $116M from Mango's lending pools
9. Withdrew $116M — protocol was drained
10. Account A's short position was liquidated but covered by Account B's gains

**Vulnerable Pattern:**
```rust
// Oracle-dependent collateral valuation with thin liquidity
fn calculate_account_equity(account: &MangoAccount, oracle: &OraclePrice) -> u64 {
    let position_value = account.perp_position * oracle.price;  // Uses spot oracle
    // BUG: No check on oracle price deviation from TWAP
    // BUG: No check on liquidity depth of the oracle source
    // BUG: No position size limits relative to market liquidity
    account.deposits + position_value - account.borrows
}
```

**Secure Pattern:**
```rust
fn calculate_account_equity(account: &MangoAccount, oracle: &OraclePrice) -> u64 {
    // Validate oracle price against TWAP
    require!(oracle.price_deviation_from_twap() < MAX_DEVIATION);
    // Check confidence interval
    require!(oracle.confidence < oracle.price * MAX_CONFIDENCE_RATIO);
    // Apply position-size-weighted discount for large positions
    let discount = calculate_liquidity_discount(account.position_size, market.liquidity);
    let position_value = account.perp_position * oracle.price * (1 - discount);
    // Cap borrowing against unrealized PnL
    let borrowable_equity = min(account.realized_equity, account.total_equity * MAX_BORROW_RATIO);
    borrowable_equity
}
```

**Detection Strategy:**
- Check if protocol allows borrowing against unrealized PnL from perpetual futures
- Look for oracle price feeds on thin-liquidity tokens used as collateral
- Check for TWAP vs. spot price deviation checks
- Look for position size limits relative to market liquidity/depth
- Verify confidence interval checks on oracle prices

**Sources:**
- https://immunebytes.com/blog/mango-markets-exploit-oct-11-2022-detailed-analysis/
- https://blockworks.co/news/mango-markets-exploit-plot-revealed

---

## 5. Crema Finance Exploit (Jul 3, 2022, $8.8M)

**Root Cause:** Fake tick account creation bypassing owner verification in CLMM.

**Category:** Missing Account Validation / CLMM Logic

**Technical Mechanism:**
1. Crema's CLMM used "tick accounts" to store price tick data for concentrated liquidity positions
2. **BUG:** The `claim()` function did not verify the owner of the tick account
3. Attacker created a fake tick account with manipulated fee data
4. Wrote the initialized tick address of the pool into the fake account
5. Used flash loan from Solend to get initial capital
6. Called `DepositFixTokenType()` with flash-loaned tokens to add liquidity
7. Called `claim()` with the fake tick account — protocol calculated enormous fee claims
8. Drained funds from multiple liquidity pools
9. Bridged stolen funds to Ethereum

**Vulnerable Pattern:**
```rust
pub fn claim_fees(ctx: Context<ClaimFees>) -> Result<()> {
    let tick_account = &ctx.accounts.tick_account;
    // BUG: No owner check on tick account!
    // Attacker can pass any account with fabricated fee data
    let fees_owed = calculate_fees(tick_account)?;
    transfer_fees(fees_owed, &ctx.accounts.user)?;
    Ok(())
}
```

**Secure Pattern:**
```rust
#[derive(Accounts)]
pub struct ClaimFees<'info> {
    #[account(
        constraint = tick_account.owner == &program_id,  // Owner check
        seeds = [b"tick", pool.key().as_ref(), &tick_index.to_le_bytes()],
        bump = tick_account.bump,  // PDA validation
    )]
    pub tick_account: Account<'info, TickAccount>,
}
```

**Detection Strategy:**
- In CLMM protocols, verify all tick/position accounts are PDA-derived and validated
- Check that fee claim functions validate account ownership
- Look for `AccountInfo<'info>` (unchecked) in fee calculation paths
- Verify flash loan protections in fee claim logic

**Sources:**
- https://www.halborn.com/blog/post/explained-the-crema-finance-hack-july-2022
- https://www.certik.com/resources/blog/crema-finance-exploit
- https://www.coindesk.com/tech/2022/07/04/solana-defi-protocol-crema-loses-88m-in-exploit

---

## 6. Aurory SyncSpace Exploit (Dec 17, 2023, $830K)

**Root Cause:** Race condition in off-chain marketplace buy endpoint.

**Category:** Race Condition / Off-Chain Logic

**Technical Mechanism:**
1. SyncSpace acts as Aurory's bridge between off-chain game and on-chain assets
2. The marketplace had a "buy" endpoint for purchasing items
3. **BUG:** The buy endpoint was not atomic — multiple simultaneous requests could be processed concurrently
4. Attacker sent multiple simultaneous buy requests to the marketplace endpoint
5. Race condition: each request individually checked balance, but concurrent execution meant balance wasn't decremented before other requests checked
6. Result: attacker's AURY balance in SyncSpace was inflated beyond what they paid
7. Attacker withdrew ~600K AURY tokens to Arbitrum via the bridge
8. Immediately market-sold on Camelot DEX, draining 80% of AURY-USDC pool liquidity

**Key Details:**
- Exploit was in the OFF-CHAIN backend, not the on-chain program
- A previous audit had failed to detect the vulnerability
- No user funds or NFTs were affected (tokens came from team wallet)
- SyncSpace bridge was disabled for maintenance after discovery

**Vulnerable Pattern (pseudocode):**
```python
# Off-chain marketplace buy endpoint - VULNERABLE
async def buy_item(user_id, item_id, amount):
    user_balance = await get_balance(user_id)       # Check balance
    item_price = await get_item_price(item_id)

    if user_balance >= item_price * amount:          # Validate
        await credit_item(user_id, item_id, amount)  # Credit item
        await debit_balance(user_id, item_price * amount)  # Debit balance
    # BUG: Between check and debit, another request can pass the check!
```

**Secure Pattern:**
```python
# SECURE: Use database-level locking or atomic operations
async def buy_item(user_id, item_id, amount):
    async with database.transaction() as tx:
        # Lock the user's balance row
        user_balance = await tx.select_for_update("balances", user_id)
        item_price = await get_item_price(item_id)

        if user_balance >= item_price * amount:
            await tx.credit_item(user_id, item_id, amount)
            await tx.debit_balance(user_id, item_price * amount)
        else:
            raise InsufficientBalance()
        # Transaction commit ensures atomicity
```

**Detection Strategy:**
- Check off-chain endpoints for TOCTOU (time-of-check-time-of-use) vulnerabilities
- Look for balance checks separated from balance updates in non-transactional code
- Test concurrent request handling on buy/sell/withdraw endpoints
- Verify database-level locking for balance-modifying operations
- Check if bridges validate on-chain state before allowing withdrawals

**Sources:**
- https://coinmarketcap.com/academy/article/aurorys-syncspace-bridge-on-arbitrum-camelot-dex-reportedly-exploited
- https://www.web3isgoinggreat.com/single/aurory-bridge-hack
- https://coinjournal.net/news/solana-based-aurory-exploited-80-of-liquidity-lost/
- https://cointelegraph.com/news/aurory-usdc-pool-drained-arbitrum-dex-camelot

---

## 7. Pump.fun Exploit (May 16, 2024, $1.9M)

**Root Cause:** Insider access + flash loan bonding curve manipulation.

**Category:** Insider Threat / Flash Loan / Bonding Curve

**Technical Mechanism:**
1. Former employee ("staccoverflow") used privileged withdrawal authority access
2. Borrowed flash loans in SOL
3. Used borrowed SOL to purchase tokens on bonding curves, pushing them to 100%
4. At 100% bonding curve, liquidity was unlocked for migration to Raydium
5. Attacker accessed the unlocked liquidity (via privileged access)
6. Repaid flash loans, kept profit
7. Total: ~12.3K SOL (~$1.9M) drained from $45M total liquidity
8. Attacker apparently airdropped some funds to random wallets

**Vulnerable Pattern:**
```rust
// Bonding curve with privileged withdrawal
pub fn migrate_to_raydium(ctx: Context<Migrate>) -> Result<()> {
    let curve = &ctx.accounts.bonding_curve;
    require!(curve.progress == 100);  // Curve must be complete

    // BUG: Withdrawal authority is a single key, not multisig
    // BUG: No timelock on migration
    // BUG: Former employees may still have access
    require!(ctx.accounts.authority.key() == curve.withdraw_authority);

    transfer_liquidity_to_raydium(curve)?;
    Ok(())
}
```

**Secure Pattern:**
```rust
pub fn migrate_to_raydium(ctx: Context<Migrate>) -> Result<()> {
    let curve = &ctx.accounts.bonding_curve;
    require!(curve.progress == 100);

    // SECURE: Multisig authority required
    require!(ctx.accounts.multisig.threshold_met());
    // SECURE: Timelock — migration must wait N hours after proposal
    require!(Clock::get()?.unix_timestamp >= curve.migration_proposed_at + TIMELOCK_SECONDS);
    // SECURE: Migration goes directly to Raydium pool, not to any wallet
    create_raydium_pool_directly(curve)?;
    Ok(())
}
```

**Detection Strategy:**
- Check for single-key withdrawal authorities on protocol liquidity
- Look for privileged functions without timelocks
- Verify key rotation procedures for former team members
- Check bonding curve migration/graduation logic for fund routing

**Sources:**
- https://markets.businessinsider.com/news/currencies/solana-meme-coin-factory-pumpfun-compromised-by-bonding-curve-exploit-1033394868
- https://forklog.com/en/pump-fun-suffers-1-9-million-loss-in-insider-attack/
- https://coinmarketcap.com/academy/article/popular-solana-memecoin-launcher-pumpfun-suffers-dollar2m-flash-loan-exploit

---

## 8. @solana/web3.js Supply Chain Attack (Dec 3, 2024, ~$130K)

**Root Cause:** npm publish account compromised via spear phishing; malicious package versions published.

**Category:** Supply Chain / Dependency

**CVE:** CVE-2024-54134 (CVSS 8.3 HIGH)

**Technical Mechanism:**
1. Attacker sent spear phishing email to an @solana npm account maintainer
2. Captured username, password, AND two-factor authentication details
3. Used compromised account to publish malicious versions 1.95.6 and 1.95.7
4. **Malicious code:** Added `addToQueue` function that exfiltrated private keys through seemingly legitimate Cloudflare headers
5. Any dapp (especially bots) that handled private keys AND updated to the malicious version had keys stolen
6. Compromise window: 3:20 PM UTC to 8:25 PM UTC on December 3, 2024 (~5 hours)
7. Non-custodial wallets were NOT affected (don't expose private keys)
8. Malicious versions deprecated by 8:52 PM UTC, removed from npm by 12:22 AM UTC Dec 4

**Detection Strategy:**
- Monitor npm package checksums and unexpected version publications
- Lock dependency versions in production (use lockfiles)
- Never handle private keys in frontend code
- Use package signing and reproducible builds
- Monitor for unexpected network calls in dependencies
- Use tools like Socket.dev for supply chain monitoring

**Sources:**
- https://cvefeed.io/vuln/detail/CVE-2024-54134
- https://advisories.gitlab.com/pkg/npm/%40solana/web3.js/CVE-2024-54134
- https://www.theregister.com/2024/12/05/solana_javascript_sdk_compromised/

---

## 9. Loopscale Exploit (Apr 26-29, 2025, $5.8M recovered)

**Root Cause:** Oracle price manipulation of RateX Principal Token (PT) collateral.

**Category:** Oracle Manipulation / Collateral Pricing

**Technical Mechanism:**
1. Loopscale allowed borrowing using RateX Principal Tokens (PT) as collateral
2. Protocol had its own pricing function for RateX PT tokens
3. **BUG:** The pricing function could be manipulated — not a RateX bug, but Loopscale's integration
4. Attacker manipulated the oracle price feed, inflating perceived value of RateX PT tokens
5. Used inflated collateral to take out undercollateralized loans
6. Drained ~5.7M USDC and 1,200 SOL from Genesis vaults
7. Markets paused within hours; funds recovered by April 29 via 10% bounty negotiation

**Detection Strategy:**
- Audit collateral pricing functions for novel/exotic token types
- Verify oracle integration for new collateral types — especially PT/YT tokens
- Check if collateral price can be manipulated by a single actor
- Look for missing sanity checks on collateral value changes
- Verify that lending protocol has circuit breakers for unusual collateral valuations

**Sources:**
- https://www.halborn.com/blog/post/explained-the-loopscale-hack-april-2025
- https://holder.io/news/loopscale-labs-oracle-exploit-loss/
- https://www.cryptopolitan.com/solana-defi-protocol-loopscale-hacked/

---

## 10. DEXX Exploit (Nov 16, 2024, $30M)

**Root Cause:** Private keys stored in plaintext on servers; inadequate encryption during transmission.

**Category:** Key Management / Plaintext Secrets

**Technical Mechanism:**
1. DEXX used centralized custody model — server held user private keys
2. **BUG:** Private keys were stored in PLAINTEXT on official servers
3. **BUG:** Keys were displayed in plaintext during `export_wallet` requests
4. **BUG:** Lack of encryption during key transmission
5. Attacker gained access to the key storage (method unknown — possibly server breach)
6. Drained 8,620+ Solana wallets affecting 900+ users
7. Hacker's drain script continued operating even after discovery
8. Total losses: ~$30M (initially reported as $21M, later revised upward)

**Detection Strategy:**
- Check how private keys are stored — MUST be encrypted at rest
- Verify key export functionality doesn't expose plaintext keys
- Check for centralized custody models that hold user keys
- Verify encryption in transit for all key-related operations
- Look for plaintext key logging in any code path

**Sources:**
- https://cointelegraph.com/news/solana-dexx-hack-november-2024-suspicious-wallets
- https://www.binance.com/en/square/post/16382456353746

---

## 11. Solana JIT Cache Bug (Feb 6, 2024, 5-hour outage)

**Root Cause:** Infinite recompile loop in LoadedPrograms cache for legacy loader programs.

**Category:** Runtime / Cache Bug / Consensus Halt

**Technical Mechanism:**
1. Solana's `LoadedPrograms` cache manages JIT-compiled program bytecode
2. Programs deployed with legacy loaders used sentinel **effective slot height of zero** for cache tracking
3. When a legacy program's JIT output was evicted from cache:
   - System recompiled the program
   - New JIT output inserted at sentinel slot zero
   - This made the new entry appear "behind" the unloaded entry in accounting
   - System saw the program as still unloaded → triggered recompile again
4. Created **infinite recompile loop** — program never appeared as loaded
5. Single leader hitting this loop would stall
6. But the triggering transaction could be packed into a block and distributed
7. When other validators replayed the block, THEY hit the same infinite loop
8. Consensus halted across 95% of cluster stake for ~5 hours
9. Fix: disabled the "v2" legacy loader to eliminate preconditions for the bug

**Detection Strategy (for auditors reviewing validator/runtime code):**
- Look for sentinel values in cache accounting (slot 0, u64::MAX, etc.)
- Verify cache eviction/reinsertion logic maintains monotonic ordering
- Check that recompiled entries are properly visible after insertion
- Test legacy program loader interactions with JIT cache

**Sources:**
- https://solana.com/news/02-06-24-solana-mainnet-beta-outage-report

---

## 12. Solana ELF Address Alignment Vulnerability (Aug 7-9, 2024, patched preemptively)

**Root Cause:** Invalid alignment assumption in rBPF `CALL_REG` opcode.

**Category:** Runtime / Memory Safety

**Technical Mechanism:**
1. Solana's rBPF runtime executes on-chain programs (BPF/SBF bytecode)
2. The `CALL_REG` opcode assumed the `.text` section of loaded ELF files would always be properly aligned
3. Programs compiled with the standard Solana toolchain ARE properly aligned
4. But programs compiled with non-standard toolchains could have improper alignment
5. **THE BUG:** When an unpatched node executed a program with misaligned .text section:
   - `CALL_REG` boundary checks failed due to alignment assumption
   - Triggered **Host Segmentation Fault** → node crash
6. Any malicious actor could deploy a program with intentional misalignment
7. When validators executed the program, they would crash → network halt
8. Patch: Added explicit alignment enforcement (`RAX &= !(INSN_SIZE - 1)`) and direct bounds comparison

**Patch Details:**
```rust
// Before (vulnerable):
// Assumed text section alignment - no enforcement

// After (patched):
// 1. Force alignment to instruction size boundaries
RAX &= !(INSN_SIZE - 1);

// 2. Direct bounds comparison
if RAX >= number_of_instructions * INSN_SIZE {
    jump ANCHOR_CALL_OUTSIDE_TEXT_SEGMENT;
}
```

**Detection Strategy:**
- Check BPF/SBF bytecode execution for alignment assumptions
- Verify bounds checks in all opcode handlers
- Test with intentionally misaligned ELF files
- Review custom toolchain compatibility with runtime assumptions

**Key Insight:** Patch was deployed secretly — Solana Foundation privately contacted operators, secured 66.6% stake before public disclosure.

**Sources:**
- https://medium.com/@astralaneio/postmortem-analysis-a-case-study-on-agave-network-patch-3a5c44a04e3d
