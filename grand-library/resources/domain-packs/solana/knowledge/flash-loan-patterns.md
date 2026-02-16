---
pack: solana
topic: "Flash Loan Patterns"
decision: "How do I implement or defend against flash loans on Solana?"
confidence: 8/10
sources_checked: 12
last_updated: "2026-02-16"
---

# Flash Loan Patterns

> **Decision:** How do I implement or defend against flash loans on Solana?

## Context

Flash loans are uncollateralized loans that must be borrowed and repaid within a single blockchain transaction. On Solana, flash loans work fundamentally differently than on EVM chains due to architectural constraints. While EVM chains can implement flash loans through callback-based reentrancy, Solana's SVM runtime explicitly prevents cross-program reentrancy and limits CPI call depth to 4 levels. This means Solana flash loan protocols cannot use the traditional "borrow → callback → repay" pattern.

Instead, Solana flash loans rely on **instruction introspection** — a mechanism where a program examines all instructions in the current transaction via the Instructions sysvar. When you request a flash loan, the lending program introspects the transaction to verify that a repayment instruction exists later in the same transaction sequence. Because Solana transactions are atomic (all instructions succeed or all fail), the protocol can confidently lend funds knowing that either repayment will occur or the entire transaction reverts.

This architectural difference creates both opportunities and vulnerabilities unique to Solana. Flash loans on Solana have been involved in major exploits totaling over $13 million, including the $3.5M Nirvana Finance collapse (2022), the $2M Pump.fun bonding curve attack (2024), and the $5.8M Loopscale exploit (2025). Understanding how to implement and defend against flash loans is critical for any Solana DeFi protocol handling significant value.

## Options

### Option 1: Implement Flash Loans via Instruction Introspection

**How it works:**
1. User constructs a transaction with: Start Flash Loan → Arbitrary Instructions → End Flash Loan
2. The `start_flashloan` instruction uses `load_current_index_checked()` to get its position in the transaction
3. It uses `load_instruction_at_checked()` to verify an `end_flashloan` instruction exists later
4. The program validates that both start/end instructions are not in CPI (checking `get_stack_height() == TRANSACTION_LEVEL_STACK_HEIGHT`)
5. Accounts are flagged as `ACCOUNT_IN_FLASHLOAN` and funds are transferred to the borrower
6. The `end_flashloan` instruction validates repayment and clears the flag

**Example (from marginfi):**
```rust
pub fn lending_account_start_flashloan(
    ctx: Context<FlashLoan>,
    end_index: u64,
) -> MarginfiResult<()> {
    // Verify end_flashloan instruction exists and is valid
    check_flashloan_can_start(
        &ctx.accounts.marginfi_account,
        &ctx.accounts.ixs_sysvar,
        end_index as usize,
    )?;

    // Set flag to prevent nested operations
    let mut marginfi_account = ctx.accounts.marginfi_account.load_mut()?;
    marginfi_account.set_flag(ACCOUNT_IN_FLASHLOAN);

    // Transfer funds to borrower
    Ok(())
}
```

**Critical validations:**
- End flashloan ix index is after start flashloan ix index
- Both start and end instructions target the same program and account
- Neither instruction is in CPI (prevents nested flash loan attacks)
- Account is not already in a flash loan
- Account is not disabled

**Best for:** Lending protocols (Solend, marginfi, Loopscale) that want to offer flash loans as a feature.

### Option 2: Defend with CPI Guard Extension

**How it works:**
The Token-2022 `CpiGuardExtension` prevents token accounts from being transferred via CPI. When enabled, transfers can only happen through direct calls to the Token Extensions Program's transfer instruction.

```rust
use spl_token_2022::extension::cpi_guard::instruction::enable_cpi_guard;

let enable_cpi_guard_instruction = enable_cpi_guard(
    &TOKEN_2022_PROGRAM_ID,
    &token_account.pubkey(),
    &authority.pubkey(),
    &[&authority.pubkey()],
)?;
```

**What it blocks:**
- `transfer` via CPI must go through a delegate
- `approve` via CPI is banned entirely
- `set_authority` via CPI is banned
- `close_account` via CPI must go through close authority
- `burn` via CPI must go through delegate

**Best for:** User-facing wallets, treasury accounts, or any token account that should never allow implicit transfers through third-party programs.

### Option 3: Defend with Slot-Based Delays

**How it works:**
Track the slot number when key state changes occur (deposits, oracle updates, authority changes). Reject flash loan attempts if the state was modified in the current slot.

```rust
pub struct LendingPool {
    pub last_update_slot: u64,
    // ... other fields
}

pub fn borrow(ctx: Context<Borrow>) -> Result<()> {
    let current_slot = Clock::get()?.slot;
    require!(
        current_slot > ctx.accounts.pool.last_update_slot,
        ErrorCode::SameSlotFlashLoanAttempt
    );
    // ... borrow logic
}
```

**Best for:** Protecting against price manipulation attacks where an attacker deposits, borrows, manipulates price, and withdraws in a single transaction.

### Option 4: Defend with Oracle TWAP (Time-Weighted Average Price)

**How it works:**
Instead of using spot prices, use time-weighted average prices over multiple slots. This prevents single-transaction price manipulation.

```rust
pub struct PriceOracle {
    pub prices: [u64; 32],  // Ring buffer of recent prices
    pub slot_numbers: [u64; 32],
    pub current_index: u8,
}

pub fn get_twap(&self, num_slots: u8) -> u64 {
    // Calculate weighted average over last N slots
}
```

**Best for:** DeFi protocols that use AMM pricing or custom oracles, especially those vulnerable to bonding curve manipulation (like Pump.fun).

### Option 5: Flash Loans Without a Protocol (DIY)

**How it works:**
On Solana, you don't need a dedicated flash loan protocol. You can create "flash loan-like" behavior by constructing a transaction with:
1. Borrow from any protocol
2. Use funds for arbitrage/liquidation
3. Repay the loan

This is possible because Solana transactions are atomic and can contain up to 1232 bytes of instruction data.

**Example:** The Pump.fun attacker used marginfi flash loans to borrow SOL, manipulated bonding curves, and repaid in the same transaction.

**Best for:** Arbitrage bots, liquidation bots, or protocols that need temporary capital access.

## Key Trade-offs

| Approach | Implementation Complexity | Gas Cost | Security Level | Flexibility |
|----------|--------------------------|----------|----------------|-------------|
| **Instruction Introspection** | High (complex validation) | Medium | Medium (if done correctly) | High (enables DeFi composability) |
| **CPI Guard** | Low (use Token-2022 extension) | Low | High (blocks all CPI transfers) | Low (breaks composability) |
| **Slot-Based Delays** | Low | Low | Medium (blocks same-slot attacks) | Medium (delays legitimate use) |
| **Oracle TWAP** | Medium | Medium | High (for price attacks) | High (maintains usability) |
| **DIY Flash Loans** | Medium | Low | Depends on protocol used | High (no dedicated protocol) |

## Recommendation

**If you're building a lending protocol:**
- Implement flash loans using instruction introspection with rigorous validation
- Follow the marginfi checklist: validate ix indexes, program IDs, account matches, and CPI stack height
- Never use absolute indexes — always use relative positioning
- Test thoroughly with adversarial transactions that include duplicate instructions

**If you're building a DeFi protocol that handles user funds:**
- Use **CPI Guard** for treasury and user-facing token accounts
- Implement **slot-based delays** for critical state changes (deposits, withdrawals, oracle updates)
- Use **TWAP oracles** instead of spot prices for any pricing mechanism
- Validate all CPIs — check program IDs, account ownership, and data structure
- Never trust instruction introspection from other programs without validating the program ID

**If you're a security auditor:**
- Look for absolute index usage in instruction introspection (major vulnerability)
- Check if flash loan flags can be bypassed through account manipulation
- Test transactions with repeated target instructions to exploit logic flaws
- Verify that CPI stack height is checked for both start and end instructions
- Ensure health checks run after flash loan completion

**Conditional guidance:**
- **Enable flash loans IF:** You're a mature lending protocol with robust testing, audits, and clear use cases (arbitrage, liquidations)
- **Defend against flash loans IF:** You're a new protocol, handle bonding curves, use spot prices, or have complex CPI interactions

## Lessons from Production

### Nirvana Finance — $3.5M Flash Loan Exploit (July 2022)
The Solana-based stablecoin protocol suffered a flash loan attack that drained $3.5 million and caused the token to crash 90%. The attacker manipulated the protocol's bonding curve pricing mechanism using borrowed funds.

**Lesson:** Bonding curve protocols must use TWAP oracles and validate that price-impacting actions cannot occur in the same slot as withdrawals.

### Pump.fun — $2M Flash Loan Exploit (May 2024)
A former employee with privileged access to withdrawal authority used flash loans from marginfi to borrow SOL, manipulated the bonding curve contracts, and withdrew ~$2M. The attacker borrowed 12,300 SOL without proper authorization checks.

**Lesson:** Even with instruction introspection, privileged access controls (like withdrawal authority) must be rigorously managed. The attack combined insider access with flash loan capital to maximize damage.

### Loopscale — $5.8M Exploit (April 2025)
Just two weeks after launch, the Solana DeFi protocol was exploited for $5.8M. While full details aren't public, the attack involved flash loan manipulation of the lending protocol's liquidity pools.

**Lesson:** New protocols are especially vulnerable. Extensive testing and audits are critical before handling significant TVL.

### marginfi Flash Loan Vulnerability (Disclosed via Bug Bounty)
A critical vulnerability in marginfi's flash loan logic would have allowed attackers to borrow funds and skip repayment entirely, putting $160M at risk. The issue was found and patched before exploitation.

**The vulnerability:** A recent code change allowed a new instruction to break the flash loan validation sequence. The instruction introspection logic didn't account for this new instruction type appearing between start and end flashloan instructions, allowing the `ACCOUNT_IN_FLASHLOAN` flag to be manipulated.

**Lesson:** Every new instruction added to a program can potentially break flash loan validation logic. Comprehensive integration testing is essential.

## Sources

- [Threat Contained: marginfi Flash Loan Vulnerability](https://blog.asymmetric.re/threat-contained-marginfi-flash-loan-vulnerability/) — Detailed analysis of instruction introspection vulnerability in marginfi with $160M at risk
- [Solana Instruction Introspection - RareSkills](https://rareskills.io/post/solana-instruction-introspection) — Technical guide on implementing instruction introspection for flash loans
- [Instruction Introspection - Solana Docs](https://docs.solanalabs.com/implemented-proposals/instruction_introspection) — Official specification for the Instructions sysvar and helper functions
- [CPI Guard - Solana Token Extensions](https://solana.com/docs/tokens/extensions/cpi-guard) — Documentation for the CpiGuardExtension that blocks CPI transfers
- [My First Flash Loan Protocol: A Solana Adventure](https://dev.to/ola-zoll/my-first-flash-loan-protocol-a-solana-adventure-3i4k) — Hands-on implementation guide from a developer's perspective
- [Nirvana Finance $3.5M Flash Loan Exploit - The Block](https://www.theblock.co/post/159975/solana-stablecoin-nirvana-sinks-90-amid-3-5-million-flash-loan-exploit) — Coverage of the 2022 Solana flash loan attack on bonding curves
- [Pump.fun $2M Flash Loan Exploit - Bankless](https://www.bankless.com/read/pump-fun-hit-for-2m-in-flash-loan-exploit) — Analysis of insider attack using marginfi flash loans
- [Loopscale $5.8M Exploit - The Block](https://www.theblock.co/post/352083/solana-defi-protocol-loopscale-hit-with-5-8-million-exploit-two-weeks-after-launch) — Recent example of flash loan vulnerability in new protocol
- [Solana Hacks, Bugs, and Exploits: A Complete History - Helius](https://www.helius.dev/blog/solana-hacks) — Comprehensive database of Solana security incidents totaling ~$600M gross losses
- [Flash Loan Attacks: Borrowing Millions to Drain Protocols - Medium](https://medium.com/@instatunnel/flash-loan-attacks-borrowing-millions-to-drain-protocols-6629d97cc399) — Overview of flash loan attack patterns across DeFi
- [Protecting DeFi Platforms Against Non-Price Flash Loan Attacks - arXiv](https://arxiv.org/abs/2503.01944) — Academic research on defending against flash loan attacks beyond oracle manipulation
- [Cross Program Invocation - Solana](https://solana.com/docs/core/cpi) — Official documentation on CPI mechanics, depth limits, and PDA signers

## Gaps & Caveats

**What's uncertain:**
- No standardized flash loan interface exists on Solana yet (unlike ERC-3156 on Ethereum)
- The security implications of SIMD-0337 (upcoming Alpenglow consensus reducing finality to 100-150ms) on flash loan defense strategies are unclear
- Limited public post-mortems on flash loan attacks — many exploits lack detailed technical write-ups
- No clear guidance on whether Token-2022 CPI Guard will become the standard or if custom instruction introspection will remain dominant

**Limitations of this research:**
- Solend documentation indicates their flash loan implementation has "limited functionality due to the reentracy of Solana transactions" and is still in development
- The full technical details of the Loopscale and Pump.fun exploits are not publicly available
- Flash loan attack patterns are evolving rapidly — new vulnerabilities may emerge as programs add instructions

**Open questions:**
- How will Firedancer's multi-client environment affect flash loan validation?
- Should flash loan protocols implement rate limiting beyond instruction introspection?
- What's the optimal TWAP window for different types of DeFi protocols on Solana?
