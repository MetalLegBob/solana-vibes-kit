---
pack: solana
confidence: 8/10
sources_checked: 12
last_updated: "2026-02-16"
---

# How do I minimize rent costs and manage account lifecycle?

Rent on Solana is a storage cost mechanism that charges accounts for occupying blockchain state. Unlike Ethereum's one-time storage fees, Solana uses a "rent-exempt threshold" model: accounts must maintain a minimum balance proportional to their size, or they get purged from the ledger. Understanding rent optimization is critical for building cost-efficient protocols.

## The Rent-Exempt Model

**Key principle**: Accounts holding enough lamports to cover 2 years of rent are "rent-exempt" and never pay fees. The 2-year threshold is based on the assumption that storage hardware costs drop 50% every 2 years.

### Calculating Rent-Exempt Minimum

```rust
use solana_program::rent::Rent;
use solana_program::sysvar::Sysvar;

let rent = Rent::get()?;
let account_size = 1024; // bytes
let min_balance = rent.minimum_balance(account_size);
// Returns lamports needed to be rent-exempt
```

**Current rate** (as of 2026): ~0.00089088 SOL per byte-year, which means:
- 1 KB account: ~6,960 lamports (~0.000006 SOL)
- 10 KB account: ~69,600 lamports (~0.00006 SOL)
- 100 KB account: ~696,000 lamports (~0.0006 SOL)

**RPC method**: `getMinimumBalanceForRentExemption(dataSize)`

### Non-Exempt Accounts (Legacy Behavior)

Historically, accounts below the rent-exempt threshold would be charged rent per epoch (~2.5 days). If an account's balance reached zero, it would be purged (deleted) from the ledger.

**As of 2024**: New accounts are **required** to be rent-exempt at creation. Non-exempt accounts can no longer be created, but legacy non-exempt accounts still exist and continue paying rent until they are upgraded or purged.

## Strategies for Minimizing Rent Costs

### Strategy 1: Right-Size Your Accounts

**Problem**: Over-allocating space wastes rent. Under-allocating prevents future data expansion.

```rust
#[account]
pub struct UserProfile {
    pub owner: Pubkey,        // 32 bytes
    pub username: [u8; 32],   // 32 bytes (fixed-size)
    pub created_at: i64,      // 8 bytes
    pub reputation: u64,      // 8 bytes
    // Total: 80 bytes + 8 bytes (discriminator) = 88 bytes
}
```

**Rent cost**: ~6,134 lamports (~0.000006 SOL) for 88 bytes.

**Anti-pattern**: Allocating 1024 bytes "just in case" costs 10x more rent.

**Best practice**: Use `#[account(zero_copy)]` for large, variable-size data structures that need to be efficiently accessed without full deserialization.

### Strategy 2: Use Dynamic Allocation with `realloc`

Anchor 0.27+ supports `realloc` to dynamically resize accounts:

```rust
#[derive(Accounts)]
pub struct AppendData<'info> {
    #[account(
        mut,
        realloc = user_data.to_account_info().data_len() + 64,
        realloc::payer = user,
        realloc::zero = false,
    )]
    pub user_data: Account<'info, UserData>,
    #[account(mut)]
    pub user: Signer<'info>,
    pub system_program: Program<'info, System>,
}
```

This grows the account by 64 bytes and charges the user for the additional rent. The payer is debited the extra lamports needed to maintain rent-exemption.

**Gotcha**: `realloc` can only grow accounts up to 10 KB per transaction due to transaction size limits. For larger data, use multiple transactions or consider off-chain storage (IPFS, Arweave).

### Strategy 3: Close Accounts to Reclaim Rent

Accounts can be closed to reclaim rent in full. This is the primary mechanism for rent optimization in 2026.

#### Anchor's `close` Constraint (Recommended)

```rust
#[derive(Accounts)]
pub struct CloseAccount<'info> {
    #[account(
        mut,
        close = recipient,  // Sends all lamports to recipient
        has_one = owner,    // Ensures only owner can close
    )]
    pub user_account: Account<'info, UserAccount>,
    pub owner: Signer<'info>,
    /// CHECK: Recipient of reclaimed rent
    #[account(mut)]
    pub recipient: AccountInfo<'info>,
}
```

**What `close` does**:
1. Transfers all lamports from `user_account` to `recipient`
2. Sets the account discriminator to `CLOSED_ACCOUNT_DISCRIMINATOR`
3. Prevents the account from being reused (revival attack mitigation)

#### Manual Account Closure (Low-Level)

```rust
pub fn close_account_manual(ctx: Context<CloseManual>) -> Result<()> {
    let account = &ctx.accounts.account_to_close;
    let recipient = &ctx.accounts.recipient;

    // Transfer all lamports
    let dest_starting_lamports = recipient.lamports();
    **recipient.lamports.borrow_mut() = dest_starting_lamports
        .checked_add(account.lamports())
        .unwrap();
    **account.lamports.borrow_mut() = 0;

    // Zero out data (prevents revival attacks)
    let mut data = account.try_borrow_mut_data()?;
    data.fill(0);

    Ok(())
}
```

**Critical**: Always zero out the account data after draining lamports, or an attacker can refund lamports to "revive" the account with stale data.

### Revival Attack Mitigation

**The attack**: After closing an account (draining lamports), an attacker refunds enough lamports to make it rent-exempt again. If the data wasn't zeroed, the account "revives" with stale data, potentially bypassing access controls.

**Example scenario**:
1. Protocol closes a UserAccount (sets `closed: true` but doesn't zero data)
2. Attacker sends 0.001 SOL to the account address (PDA)
3. Account is rent-exempt again, but with `closed: true` still in data
4. If the program doesn't check the discriminator, the attacker can reuse the account

**Anchor's defense**: The `close` constraint sets the discriminator to `CLOSED_ACCOUNT_DISCRIMINATOR = [255, 255, 255, 255, 255, 255, 255, 255]`, which causes any future instruction to fail with `AccountDiscriminatorMismatch`.

**Manual defense**: Always zero the entire data buffer:
```rust
let mut data = account.try_borrow_mut_data()?;
data.fill(0);
```

### Strategy 4: Who Pays Rent?

**Design decision**: Should users or the protocol pay rent for account creation?

#### User-Pays Pattern (Common)
```rust
#[derive(Accounts)]
pub struct CreateUserAccount<'info> {
    #[account(
        init,
        payer = user,  // User pays rent
        space = 8 + 80,
        seeds = [b"user", user.key().as_ref()],
        bump,
    )]
    pub user_account: Account<'info, UserAccount>,
    #[account(mut)]
    pub user: Signer<'info>,
    pub system_program: Program<'info, System>,
}
```

**Pros**: Scalable (protocol doesn't need to fund every user account), users are incentivized to close accounts to reclaim rent.

**Cons**: UX friction (users must hold SOL), can deter adoption.

#### Protocol-Pays Pattern (Subsidy)
```rust
#[derive(Accounts)]
pub struct CreateSubsidizedAccount<'info> {
    #[account(
        init,
        payer = protocol_treasury,  // Protocol pays rent
        space = 8 + 80,
    )]
    pub user_account: Account<'info, UserAccount>,
    #[account(mut)]
    pub protocol_treasury: Signer<'info>,
    pub system_program: Program<'info, System>,
}
```

**Pros**: Better UX (users don't need SOL), useful for airdrops or subsidized onboarding.

**Cons**: Protocol must fund all accounts, can be exploited (Sybil attacks), requires rent reclamation strategy.

**Hybrid approach**: Protocol pays rent but charges a refundable deposit (e.g., 0.01 SOL). When the user closes the account, they get their deposit back.

### Strategy 5: Temporary vs Permanent Accounts

**Temporary accounts** (e.g., swap quotes, flash loan data):
- Create account
- Use for 1-2 transactions
- Close immediately to reclaim rent

**Example**: Jupiter aggregator creates a temporary route account for each swap, then closes it in the same transaction.

**Permanent accounts** (e.g., user profiles, token accounts):
- Keep open indefinitely
- Users are responsible for closing them when no longer needed

**Design pattern**: Implement a `close_if_empty` instruction that checks if an account is unused (e.g., token balance = 0) and closes it automatically.

## Rent Costs for Common Account Sizes

| Account Type | Size (bytes) | Rent (lamports) | Rent (SOL) |
|-------------|--------------|-----------------|------------|
| Token Account (SPL) | 165 | ~1,150 | ~0.000001 |
| Mint Account (SPL) | 82 | ~571 | ~0.0000005 |
| Small PDA (user state) | 100 | ~696 | ~0.0000006 |
| Medium PDA (metadata) | 500 | ~3,480 | ~0.000003 |
| Large PDA (on-chain data) | 10 KB | ~69,600 | ~0.00006 |
| Max account (10 MB) | 10 MB | ~69.6M | ~0.06 |

**Note**: These are 2026 estimates. Actual rent costs depend on the network's rent rate, which can be adjusted via governance.

## Token Account Rent Reclamation

**Problem**: Users often create token accounts (via airdrops, swaps, etc.) and forget about them. Each token account costs ~0.002 SOL in rent, which adds up across thousands of tokens.

**Solution**: Tools like [Sol Rent Claimer](https://www.rentsolana.com/) and Bitget Wallet's "Rent Recovery" feature scan for empty token accounts (balance = 0) and close them in bulk, reclaiming rent.

**Programmatic approach**:
```rust
pub fn close_empty_token_account(ctx: Context<CloseEmptyToken>) -> Result<()> {
    let token_account = &ctx.accounts.token_account;
    require!(token_account.amount == 0, ErrorCode::AccountNotEmpty);

    // Close token account (SPL Token program handles this)
    token::close_account(CpiContext::new(
        ctx.accounts.token_program.to_account_info(),
        CloseAccount {
            account: ctx.accounts.token_account.to_account_info(),
            destination: ctx.accounts.owner.to_account_info(),
            authority: ctx.accounts.owner.to_account_info(),
        },
    ))
}
```

## 2026 Rent Optimization Landscape

### Firedancer + Rent Dynamics
With Firedancer's increased transaction throughput (1M+ TPS potential), protocols are creating and closing accounts at unprecedented rates. Rent optimization is now a performance consideration, not just a cost consideration.

### Localized Fee Markets (LFM) Impact
LFM (introduced in 2025) makes hot accounts expensive during congestion. If your protocol uses a shared rent treasury account, consider sharding it (per-user rent vaults) to avoid write-lock contention.

### State Compression (Upcoming)
Solana's state compression (using Merkle trees and off-chain data) is expected to launch in 2026, allowing accounts to store proofs instead of full data. This reduces rent costs by 1000x+ for large datasets.

**Example**: An NFT collection with 10,000 NFTs currently costs ~69,600 lamports × 10,000 = 696M lamports (~0.6 SOL). With state compression, the entire collection fits in a single Merkle tree account (~10 KB), costing only ~69,600 lamports (~0.00006 SOL).

## Summary

- **Rent-exempt threshold**: 2 years of rent, proportional to account size
- **Account sizing**: Only allocate space you need; use `realloc` for growth
- **Close accounts**: Reclaim rent by closing unused accounts (use Anchor's `close` constraint)
- **Revival attacks**: Always zero data or use `CLOSED_ACCOUNT_DISCRIMINATOR`
- **Who pays?**: User-pays scales better, protocol-pays improves UX but requires reclamation strategy
- **Token accounts**: Bulk-close empty token accounts to reclaim significant rent
- **2026 trends**: Rent optimization is now performance-critical due to high TPS and LFM congestion pricing

Rent is no longer just a cost—it's a resource. Treat account lifecycle management as a first-class concern in your protocol design.
