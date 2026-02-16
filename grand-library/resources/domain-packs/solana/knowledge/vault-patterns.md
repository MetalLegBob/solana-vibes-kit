---
pack: solana
topic: "Vault Patterns"
decision: "How do I build secure token vaults on Solana?"
confidence: 8/10
sources_checked: 40
last_updated: "2026-02-16"
---

# Vault Patterns on Solana

## Overview

Token vaults are fundamental DeFi primitives on Solana that allow users to deposit assets and receive proportional share tokens representing ownership. The ERC-4626 tokenized vault standard from Ethereum has been adapted to Solana's account model, with implementations in Anchor that handle deposit/mint/withdraw/redeem flows using share-based accounting.

**Critical distinction**: Solana vaults use PDAs (Program Derived Addresses) as vault authorities instead of private keys, enabling programs to "sign" for token transfers without exposing secrets.

## Core Vault Architecture

### Account Model

A minimal vault implementation requires these accounts:

1. **VaultState** - Stores vault configuration and metadata
2. **Vault Token Account (PDA)** - Holds underlying assets
3. **Share Mint** - SPL token mint for vault shares
4. **User Share Accounts** - Associated token accounts holding user shares

```rust
#[account]
pub struct VaultState {
    pub authority: Pubkey,        // Vault manager
    pub underlying_mint: Pubkey,  // Asset being vaulted (e.g., USDC)
    pub share_mint: Pubkey,       // Vault share token mint
    pub vault_bump: u8,           // PDA bump for vault token account
    pub authority_bump: u8,       // PDA bump for vault authority
    pub total_assets: u64,        // Total assets under management
    pub total_shares: u64,        // Total shares issued
}
```

### PDA Authority Pattern

**The vault token account must be owned by a PDA that only the program can sign for**:

```rust
// Vault token account PDA derivation
#[account(
    init,
    payer = payer,
    seeds = [b"vault", vault_state.key().as_ref()],
    bump,
    token::mint = underlying_mint,
    token::authority = vault_authority  // PDA can sign
)]
pub vault_token_account: Account<'info, TokenAccount>

// Vault authority PDA (the signer)
#[account(
    seeds = [b"authority", vault_state.key().as_ref()],
    bump = authority_bump
)]
pub vault_authority: UncheckedAccount<'info>
```

This pattern ensures:
- Only the program can move assets from the vault
- The vault address is deterministic
- No private key can compromise the vault

## Share-Based Vault Math

### Exchange Rate Calculation

The fundamental vault math follows ERC-4626 conventions:

```
shares = assets × totalShares / totalAssets
assets = shares × totalAssets / totalShares
```

**Critical rounding rules**:
- **Deposit/Mint** (entry): Round DOWN shares to favor vault
- **Withdraw/Redeem** (exit): Round DOWN assets to favor vault

### The Four Core Operations

```rust
// 1. DEPOSIT - User specifies exact assets, receives shares
pub fn deposit(ctx: Context<Deposit>, assets: u64) -> Result<()> {
    let vault = &ctx.accounts.vault;

    // Calculate shares (round DOWN)
    let shares = if vault.total_shares == 0 {
        assets  // First depositor gets 1:1
    } else {
        assets
            .checked_mul(vault.total_shares)
            .unwrap()
            .checked_div(vault.total_assets)
            .unwrap()
    };

    require!(shares > 0, VaultError::ZeroShares);

    // Transfer assets: user → vault
    token::transfer(
        CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.user_token_account.to_account_info(),
                to: ctx.accounts.vault_token_account.to_account_info(),
                authority: ctx.accounts.user.to_account_info(),
            },
        ),
        assets,
    )?;

    // Mint shares to user
    token::mint_to(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            MintTo {
                mint: ctx.accounts.share_mint.to_account_info(),
                to: ctx.accounts.user_share_account.to_account_info(),
                authority: ctx.accounts.vault_authority.to_account_info(),
            },
            &[&[
                b"authority",
                vault.key().as_ref(),
                &[vault.authority_bump]
            ]]
        ),
        shares,
    )?;

    vault.total_assets += assets;
    vault.total_shares += shares;

    Ok(())
}

// 2. MINT - User specifies exact shares, pays assets
pub fn mint(ctx: Context<Mint>, shares: u64) -> Result<()> {
    let vault = &ctx.accounts.vault;

    // Calculate required assets (round UP to favor vault)
    let assets = if vault.total_shares == 0 {
        shares
    } else {
        shares
            .checked_mul(vault.total_assets)
            .unwrap()
            .checked_add(vault.total_shares - 1)  // Round up
            .unwrap()
            .checked_div(vault.total_shares)
            .unwrap()
    };

    // Transfer & mint (similar to deposit)
    // ...
}

// 3. WITHDRAW - User specifies exact assets, burns shares
pub fn withdraw(ctx: Context<Withdraw>, assets: u64) -> Result<()> {
    let vault = &ctx.accounts.vault;

    // Calculate shares to burn (round UP to favor vault)
    let shares = assets
        .checked_mul(vault.total_shares)
        .unwrap()
        .checked_add(vault.total_assets - 1)  // Round up
        .unwrap()
        .checked_div(vault.total_assets)
        .unwrap();

    require!(
        ctx.accounts.user_share_account.amount >= shares,
        VaultError::InsufficientShares
    );

    // Burn shares from user
    token::burn(
        CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            Burn {
                mint: ctx.accounts.share_mint.to_account_info(),
                from: ctx.accounts.user_share_account.to_account_info(),
                authority: ctx.accounts.user.to_account_info(),
            },
        ),
        shares,
    )?;

    // Transfer assets: vault → user (requires PDA signer)
    let authority_seeds = &[
        b"authority",
        vault.key().as_ref(),
        &[vault.authority_bump],
    ];
    let signer = &[&authority_seeds[..]];

    token::transfer(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.vault_token_account.to_account_info(),
                to: ctx.accounts.user_token_account.to_account_info(),
                authority: ctx.accounts.vault_authority.to_account_info(),
            },
            signer,
        ),
        assets,
    )?;

    vault.total_assets -= assets;
    vault.total_shares -= shares;

    Ok(())
}

// 4. REDEEM - User burns exact shares, receives assets
pub fn redeem(ctx: Context<Redeem>, shares: u64) -> Result<()> {
    // Calculate assets (round DOWN to favor vault)
    let assets = shares
        .checked_mul(vault.total_assets)
        .unwrap()
        .checked_div(vault.total_shares)
        .unwrap();

    // Burn & transfer (similar to withdraw)
    // ...
}
```

## Critical Vulnerability: Inflation Attack

### The Attack Mechanism

An attacker can manipulate the exchange rate on a new vault to steal deposits from subsequent users:

**Step-by-step exploit**:

1. **Vault is empty**: `totalAssets = 0`, `totalShares = 0`
2. **Attacker deposits 1 wei**: Gets 1 share (1:1 ratio)
   - `totalAssets = 1`, `totalShares = 1`
3. **Attacker donates 100 tokens directly** to vault token account (bypassing deposit logic)
   - `totalAssets = 101`, `totalShares = 1`
   - Exchange rate: 1 share = 101 tokens
4. **Victim deposits 100 tokens**:
   - Shares minted: `100 × 1 / 101 = 0.99` → **rounds down to 0 shares**
   - Victim receives NOTHING
5. **Attacker redeems 1 share**: Gets all 201 tokens
   - Profit: 100 tokens stolen from victim

### Defense: Virtual Shares/Assets Offset

**OpenZeppelin's solution**: Add virtual shares and assets to calculations to make manipulation prohibitively expensive.

```rust
const OFFSET_DECIMALS: u8 = 3;  // For 6-decimal USDC
const VIRTUAL_SHARES: u64 = 10u64.pow(OFFSET_DECIMALS as u32);  // 1000
const VIRTUAL_ASSETS: u64 = 1;

// Modified share calculation
pub fn convert_to_shares(assets: u64, vault: &VaultState) -> u64 {
    if vault.total_shares == 0 {
        assets  // First deposit still 1:1
    } else {
        assets
            .checked_mul(vault.total_shares + VIRTUAL_SHARES)
            .unwrap()
            .checked_div(vault.total_assets + VIRTUAL_ASSETS)
            .unwrap()
    }
}

pub fn convert_to_assets(shares: u64, vault: &VaultState) -> u64 {
    shares
        .checked_mul(vault.total_assets + VIRTUAL_ASSETS)
        .unwrap()
        .checked_div(vault.total_shares + VIRTUAL_SHARES)
        .unwrap()
}
```

**Why this works**: With `VIRTUAL_SHARES = 1000`, the attacker would need to donate ~1000× more tokens to achieve the same exchange rate manipulation, making the attack economically infeasible.

### Alternative Defense: Dead Shares

Initialize the vault with a permanent first deposit that can never be redeemed:

```rust
pub fn initialize_vault(ctx: Context<InitializeVault>) -> Result<()> {
    // Mint 1000 dead shares to the vault itself
    const DEAD_SHARES: u64 = 1000;

    token::mint_to(
        CpiContext::new_with_signer(/* ... */),
        DEAD_SHARES,
    )?;

    ctx.accounts.vault.total_shares = DEAD_SHARES;
    ctx.accounts.vault.total_assets = DEAD_SHARES;

    Ok(())
}
```

## Advanced Vault Strategies

### Passive Yield Vaults

Deposit assets into lending protocols (e.g., Kamino, Solend) and auto-compound interest.

```rust
pub fn harvest(ctx: Context<Harvest>) -> Result<()> {
    // 1. Claim rewards from lending protocol
    let rewards = lending_protocol::claim_rewards(ctx)?;

    // 2. Swap rewards for underlying asset
    let assets = dex::swap(rewards, underlying_mint)?;

    // 3. Reinvest into lending protocol
    lending_protocol::deposit(assets)?;

    // 4. Update total_assets (increases share value)
    ctx.accounts.vault.total_assets += assets;

    emit!(HarvestEvent {
        rewards_claimed: rewards,
        assets_reinvested: assets,
    });

    Ok(())
}
```

**Key insight**: `total_assets` increases without minting new shares, so the share price appreciates for all holders.

### Active Strategy Vaults

Vault managers can borrow assets to execute strategies (e.g., delta-neutral positions).

**Kamino Lend V2 pattern**:

```rust
pub fn manager_borrow(ctx: Context<ManagerBorrow>, amount: u64) -> Result<()> {
    require!(
        ctx.accounts.signer.key() == ctx.accounts.vault.manager,
        VaultError::Unauthorized
    );

    // Manager borrows from vault to execute strategy
    token::transfer(
        CpiContext::new_with_signer(/* vault → manager */),
        amount,
    )?;

    ctx.accounts.vault.manager_debt += amount;

    Ok(())
}

pub fn manager_repay(ctx: Context<ManagerRepay>, amount: u64) -> Result<()> {
    // Manager returns borrowed assets + profit
    token::transfer(
        CpiContext::new(/* manager → vault */),
        amount,
    )?;

    let vault = &mut ctx.accounts.vault;
    let profit = amount.saturating_sub(vault.manager_debt);

    vault.manager_debt = 0;
    vault.total_assets += profit;  // Profit accrues to all depositors

    Ok(())
}
```

### Withdrawal Queues

For vaults holding illiquid assets (e.g., RWAs), implement asynchronous withdrawals (ERC-7540 pattern).

```rust
#[account]
pub struct WithdrawalRequest {
    pub user: Pubkey,
    pub shares: u64,
    pub requested_at: i64,
    pub fulfilled: bool,
}

pub fn request_withdrawal(ctx: Context<RequestWithdrawal>, shares: u64) -> Result<()> {
    // Lock user's shares
    token::transfer(
        CpiContext::new(/* user → escrow */),
        shares,
    )?;

    ctx.accounts.request.user = ctx.accounts.user.key();
    ctx.accounts.request.shares = shares;
    ctx.accounts.request.requested_at = Clock::get()?.unix_timestamp;
    ctx.accounts.request.fulfilled = false;

    Ok(())
}

pub fn fulfill_withdrawal(ctx: Context<FulfillWithdrawal>) -> Result<()> {
    let request = &ctx.accounts.request;
    require!(!request.fulfilled, VaultError::AlreadyFulfilled);

    // Manager has sold illiquid assets for liquid tokens
    let assets = convert_to_assets(request.shares, &ctx.accounts.vault);

    // Burn escrowed shares
    token::burn(/* ... */)?;

    // Transfer assets to user
    token::transfer(/* vault → user */, assets)?;

    ctx.accounts.request.fulfilled = true;

    Ok(())
}
```

## Performance Fees

Charge management fees on profits.

```rust
pub struct VaultState {
    // ... existing fields
    pub performance_fee_bps: u16,  // Basis points (1000 = 10%)
    pub last_harvest_assets: u64,  // Assets at last harvest
}

pub fn harvest_with_fee(ctx: Context<Harvest>) -> Result<()> {
    let vault = &mut ctx.accounts.vault;
    let current_assets = calculate_total_assets(ctx)?;

    if current_assets > vault.last_harvest_assets {
        let profit = current_assets - vault.last_harvest_assets;
        let fee_assets = profit
            .checked_mul(vault.performance_fee_bps as u64)
            .unwrap()
            .checked_div(10_000)
            .unwrap();

        // Mint fee shares to manager (dilutes other holders)
        let fee_shares = convert_to_shares(fee_assets, vault);
        token::mint_to(
            CpiContext::new_with_signer(/* ... */),
            fee_shares,
        )?;

        vault.total_shares += fee_shares;
    }

    vault.last_harvest_assets = current_assets;

    Ok(())
}
```

## Real-World Exploits

### Perennial Vault Hack (2025)

**Vulnerability**: Missing virtual offset protection on new vault deployment.

**Attack**:
1. Attacker deposited 1 wei as first user
2. Donated 1 million USDC directly to vault
3. Victim deposited 1 million USDC, received 0 shares (rounding)
4. Attacker redeemed for 2 million USDC

**Loss**: $1M+

**Fix**: Implemented `VIRTUAL_SHARES = 10^9` offset.

### BakerFi Vault (2024)

**Issue**: Vault allowed first depositor to manipulate exchange rate through donation attack.

**Status**: Identified in audit, not exploited.

**Mitigation**: Added dead shares on initialization.

## Drift Vaults Architecture

Drift's vault platform demonstrates production-grade patterns:

```rust
pub struct Vault {
    pub name: [u8; 32],
    pub manager: Pubkey,
    pub token_account: Pubkey,       // Vault's asset ATA
    pub user_shares: Pubkey,         // Share mint
    pub total_deposits: u64,
    pub total_withdraws: u64,
    pub total_shares: u64,
    pub manager_debt: u64,           // Manager borrow tracking
    pub profit_share: u16,           // Manager's profit share (bps)
    pub max_tokens: u64,             // Deposit cap
    pub min_deposit_amount: u64,
    pub last_fee_update_ts: i64,
    pub protocol_fee: u64,           // Accumulated protocol fees
    pub redeem_period: i64,          // Lock-up duration
    pub total_deposits_at_update: u64,
    pub total_withdraws_at_update: u64,
}
```

**Key features**:
- Manager can borrow/repay from vault
- Profit sharing between manager and depositors
- Deposit caps and minimums
- Time-locked withdrawals
- Protocol fee accrual

## Implementation Checklist

### Security

- [ ] Implement virtual shares/assets offset (recommended: 9 decimals internal precision)
- [ ] OR initialize with dead shares on first deposit
- [ ] Protect against donation-based exchange rate manipulation
- [ ] Use PDA as vault token account authority
- [ ] Validate all account ownership in constraints
- [ ] Check for overflow in all arithmetic operations
- [ ] Implement reentrancy guards if calling external protocols

### Functional

- [ ] Implement all 4 core operations: deposit, mint, withdraw, redeem
- [ ] Add preview functions for off-chain simulation
- [ ] Emit events for indexing (Deposit, Withdraw, Harvest)
- [ ] Support both Token and Token-2022 programs
- [ ] Handle edge cases (first deposit, total redemption, zero amounts)

### Advanced

- [ ] Withdrawal queue for illiquid vaults
- [ ] Performance fee mechanism
- [ ] Manager borrow/repay if active strategy
- [ ] Deposit/withdrawal caps
- [ ] Emergency pause functionality
- [ ] Time-locked withdrawals if needed

## Code References

**Production implementations**:
- [huybuidac/solana-tokenized-vault-4626](https://github.com/huybuidac/solana-tokenized-vault-4626) - Full ERC-4626 with inflation protection
- [Splyce-Finance/splyce-solana-vaults](https://github.com/splyce-finance/splyce-solana-vaults) - Multi-strategy vaults
- [drift-labs/drift-vaults](https://github.com/drift-labs/drift-vaults) - Production vault platform

## Further Reading

- ERC-4626 Specification: https://ethereum.org/developers/docs/standards/tokens/erc-4626
- OpenZeppelin Inflation Attack Defense: https://www.openzeppelin.com/news/a-novel-defense-against-erc4626-inflation-attacks
- Kamino Lend V2 Architecture: https://docs.kamino.finance/kamino-lend-litepaper
- Solana EVM-to-SVM Guide: https://solana.com/developers/evm-to-svm/erc4626
- Anchor Token Extensions: https://book.anchor-lang.com/docs/tokens
