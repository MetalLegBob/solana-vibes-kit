---
pack: solana
confidence: 8/10
sources_checked: 10
last_updated: "2026-02-16"
---

# How do I create tokens with transfer restrictions?

Solana's Token-2022 program enables "permissioned tokens on a permissionless network" - allowing institutions and projects to implement compliance requirements, whitelists, blacklists, and transfer restrictions directly in token logic. This guide covers proven patterns for creating restricted token transfers on Solana.

## Why Transfer Restrictions?

Transfer restrictions are critical for:
- **Compliance tokens**: Securities, RWAs requiring KYC/AML
- **Accredited investor tokens**: US Reg D, Reg S compliance
- **Geographic restrictions**: Tokens not available in certain jurisdictions
- **Community tokens**: Soulbound rewards, governance tokens with transfer limits
- **Game assets**: Bound items, achievement tokens
- **Organizational tokens**: Internal credits, employee stock options

## Token-2022 Extensions Overview

Token-2022 provides four key extensions for transfer restrictions:

| Extension | Use Case | Flexibility | Gas Cost |
|-----------|----------|-------------|----------|
| **Transfer Hook** | Custom logic per transfer | High | Medium-High |
| **Freeze Authority** | On/off switch per account | Low | Low |
| **Default Account State** | Frozen until approved | Medium | Low |
| **Permanent Delegate** | Override transfer capability | High | Low |

## Pattern 1: Transfer Hook with Whitelist

**Best for**: KYC compliance, accredited investors, regulatory restrictions

Transfer hooks execute custom program logic atomically with every token transfer. This is the most flexible pattern.

### Architecture

```
Token Transfer Initiated
    ↓
Token Program validates basic transfer
    ↓
Invokes Transfer Hook Program
    ↓
Hook checks whitelist/compliance
    ↓
Transfer succeeds or reverts atomically
```

### Implementation

```rust
use anchor_lang::prelude::*;

#[program]
pub mod transfer_hook_whitelist {
    use super::*;

    pub fn initialize_whitelist(ctx: Context<InitializeWhitelist>) -> Result<()> {
        let whitelist = &mut ctx.accounts.whitelist;
        whitelist.authority = ctx.accounts.authority.key();
        whitelist.mint = ctx.accounts.mint.key();
        Ok(())
    }

    pub fn add_to_whitelist(
        ctx: Context<ManageWhitelist>,
        wallet: Pubkey,
    ) -> Result<()> {
        let whitelist = &mut ctx.accounts.whitelist;

        require!(
            ctx.accounts.authority.key() == whitelist.authority,
            ErrorCode::Unauthorized
        );

        // Check if already whitelisted
        if whitelist.approved_wallets.contains(&wallet) {
            return Err(ErrorCode::AlreadyWhitelisted.into());
        }

        whitelist.approved_wallets.push(wallet);

        emit!(WhitelistEvent {
            wallet,
            action: "added".to_string(),
            timestamp: Clock::get()?.unix_timestamp,
        });

        Ok(())
    }

    pub fn transfer_hook(
        ctx: Context<TransferHook>,
        amount: u64,
    ) -> Result<()> {
        let whitelist = &ctx.accounts.whitelist;

        // Check sender is whitelisted
        require!(
            whitelist.approved_wallets.contains(&ctx.accounts.source_owner.key()),
            ErrorCode::SenderNotWhitelisted
        );

        // Check recipient is whitelisted
        require!(
            whitelist.approved_wallets.contains(&ctx.accounts.destination_owner.key()),
            ErrorCode::RecipientNotWhitelisted
        );

        // Optional: Check transfer amount limits
        if amount > MAX_SINGLE_TRANSFER {
            return Err(ErrorCode::TransferAmountExceeded.into());
        }

        msg!("Transfer approved: {} tokens from {} to {}",
            amount,
            ctx.accounts.source_owner.key(),
            ctx.accounts.destination_owner.key()
        );

        Ok(())
    }
}

#[derive(Accounts)]
pub struct TransferHook<'info> {
    pub source_token: Account<'info, TokenAccount>,
    pub mint: Account<'info, Mint>,
    pub destination_token: Account<'info, TokenAccount>,
    pub source_owner: Signer<'info>,
    /// CHECK: This account is validated in the transfer hook
    pub destination_owner: UncheckedAccount<'info>,

    #[account(
        seeds = [b"whitelist", mint.key().as_ref()],
        bump,
    )]
    pub whitelist: Account<'info, Whitelist>,
}

#[account]
pub struct Whitelist {
    pub authority: Pubkey,
    pub mint: Pubkey,
    pub approved_wallets: Vec<Pubkey>,
}

#[error_code]
pub enum ErrorCode {
    #[msg("Sender wallet is not whitelisted")]
    SenderNotWhitelisted,
    #[msg("Recipient wallet is not whitelisted")]
    RecipientNotWhitelisted,
    #[msg("Transfer amount exceeds maximum")]
    TransferAmountExceeded,
    #[msg("Unauthorized")]
    Unauthorized,
    #[msg("Already whitelisted")]
    AlreadyWhitelisted,
}
```

### Scalability Consideration

**Important**: Storing whitelist in a single account (as `Vec<Pubkey>`) is **not scalable** for large projects. Each account has a 10MB size limit, which caps the whitelist at ~163,000 addresses.

**Better approach**: Use external PDAs for each whitelisted address:

```rust
// Scalable whitelist pattern
#[derive(Accounts)]
pub struct TransferHook<'info> {
    pub source_token: Account<'info, TokenAccount>,
    pub mint: Account<'info, Mint>,
    pub destination_token: Account<'info, TokenAccount>,
    pub source_owner: Signer<'info>,
    pub destination_owner: UncheckedAccount<'info>,

    // Each whitelisted address gets its own PDA
    #[account(
        seeds = [b"whitelist-entry", mint.key().as_ref(), source_owner.key().as_ref()],
        bump,
    )]
    pub source_whitelist_entry: Account<'info, WhitelistEntry>,

    #[account(
        seeds = [b"whitelist-entry", mint.key().as_ref(), destination_owner.key().as_ref()],
        bump,
    )]
    pub dest_whitelist_entry: Account<'info, WhitelistEntry>,
}

#[account]
pub struct WhitelistEntry {
    pub wallet: Pubkey,
    pub approved_at: i64,
    pub approved_by: Pubkey,
    pub kyc_level: u8, // Optional: different compliance tiers
}
```

This scales to unlimited addresses (each gets its own account).

### Creating Token with Transfer Hook

```bash
# Create Token-2022 mint with transfer hook
spl-token create-token \
  --program-id TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb \
  --enable-transfer-hook

# Set the transfer hook program
spl-token set-transfer-hook <MINT_ADDRESS> <HOOK_PROGRAM_ID>

# Initialize extra account metas for the hook
# This defines which accounts the hook program needs
```

### Extra Account Metas Configuration

Transfer hooks need to specify additional accounts required during transfer:

```rust
// Define extra accounts needed by your hook
use spl_tlv_account_resolution::{account::ExtraAccountMeta, state::ExtraAccountMetaList};

pub fn initialize_extra_account_metas(
    ctx: Context<InitializeExtraAccountMetas>,
) -> Result<()> {
    let extra_metas = vec![
        // Whitelist account
        ExtraAccountMeta::new_with_seeds(
            &[
                Seed::Literal {
                    bytes: b"whitelist".to_vec(),
                },
                Seed::AccountKey { index: 2 }, // Mint account index
            ],
            false, // is_signer
            false, // is_writable
        )?,
    ];

    // Serialize into TLV format
    let account_size = ExtraAccountMetaList::size_of(extra_metas.len())?;
    let data = &mut ctx.accounts.extra_account_metas.data.borrow_mut();
    ExtraAccountMetaList::init::<ExecuteInstruction>(data, &extra_metas)?;

    Ok(())
}
```

## Pattern 2: Freeze Authority

**Best for**: Simple on/off controls, sanctions compliance, emergency pauses

The freeze authority can freeze individual token accounts, preventing all transfers.

### Implementation

```bash
# Create token with freeze authority
spl-token create-token \
  --program-id TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb \
  --enable-freeze

# Freeze a specific account
spl-token freeze <TOKEN_ACCOUNT> <MINT_ADDRESS>

# Unfreeze when approved
spl-token thaw <TOKEN_ACCOUNT> <MINT_ADDRESS>
```

### Programmatic Freeze Control

```rust
use anchor_spl::token_2022::{freeze_account, thaw_account};

pub fn freeze_token_account(ctx: Context<FreezeAccount>) -> Result<()> {
    freeze_account(
        CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            anchor_spl::token_2022::FreezeAccount {
                account: ctx.accounts.token_account.to_account_info(),
                mint: ctx.accounts.mint.to_account_info(),
                authority: ctx.accounts.freeze_authority.to_account_info(),
            },
        ),
    )?;
    Ok(())
}

pub fn approve_and_thaw(ctx: Context<ThawAccount>) -> Result<()> {
    // Perform KYC checks here
    verify_kyc(&ctx.accounts.user)?;

    thaw_account(
        CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            anchor_spl::token_2022::ThawAccount {
                account: ctx.accounts.token_account.to_account_info(),
                mint: ctx.accounts.mint.to_account_info(),
                authority: ctx.accounts.freeze_authority.to_account_info(),
            },
        ),
    )?;
    Ok(())
}
```

### Freeze Authority Pattern for Compliance

```rust
// Freeze all new accounts until KYC approved
pub fn initialize_token_account(ctx: Context<InitAccount>) -> Result<()> {
    // Create the token account
    create_token_account(...)?;

    // Immediately freeze it
    freeze_account(...)?;

    // User must complete KYC to get thawed
    Ok(())
}
```

## Pattern 3: Default Account State (Frozen)

**Best for**: Opt-in token access, mandatory KYC before first transfer

All newly created token accounts start frozen by default.

### Configuration

```bash
# Create token with default frozen state
spl-token create-token \
  --program-id TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb \
  --enable-freeze \
  --default-account-state frozen
```

### Implementation Pattern

```rust
// When user completes KYC
pub fn complete_kyc_and_activate(ctx: Context<ActivateAccount>) -> Result<()> {
    let kyc_data = &ctx.accounts.kyc_verification;

    // Verify KYC documents
    require!(kyc_data.verified, ErrorCode::KYCNotVerified);
    require!(kyc_data.expiry > Clock::get()?.unix_timestamp, ErrorCode::KYCExpired);

    // Thaw the account (enable transfers)
    thaw_account(
        CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            anchor_spl::token_2022::ThawAccount {
                account: ctx.accounts.token_account.to_account_info(),
                mint: ctx.accounts.mint.to_account_info(),
                authority: ctx.accounts.freeze_authority.to_account_info(),
            },
        ),
    )?;

    emit!(AccountActivated {
        user: ctx.accounts.user.key(),
        token_account: ctx.accounts.token_account.key(),
        activated_at: Clock::get()?.unix_timestamp,
    });

    Ok(())
}
```

**Security Warning**: Existing token accounts created before enabling default frozen state don't require reinitialization, potentially bypassing KYC. Always implement comprehensive whitelist systems.

## Pattern 4: Permanent Delegate

**Best for**: Legal recovery, forced transfers, regulatory compliance

The permanent delegate can transfer tokens from any account, regardless of owner approval.

### Use Cases

- **Legal recovery**: Court-ordered asset seizure
- **Estate management**: Transfer deceased user's assets
- **Protocol upgrades**: Migrate tokens to new contracts
- **Regulatory compliance**: Sanctions enforcement

### Implementation

```bash
# Create token with permanent delegate
spl-token create-token \
  --program-id TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb \
  --enable-permanent-delegate
```

```rust
pub fn emergency_transfer(ctx: Context<EmergencyTransfer>, amount: u64) -> Result<()> {
    // Verify permanent delegate authority
    require!(
        ctx.accounts.authority.key() == PERMANENT_DELEGATE_AUTHORITY,
        ErrorCode::Unauthorized
    );

    // Log the emergency transfer
    emit!(EmergencyTransferEvent {
        from: ctx.accounts.source.key(),
        to: ctx.accounts.destination.key(),
        amount,
        reason: "legal_recovery",
        authorized_by: ctx.accounts.authority.key(),
        timestamp: Clock::get()?.unix_timestamp,
    });

    // Execute transfer without source owner signature
    transfer_checked(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            anchor_spl::token_2022::TransferChecked {
                from: ctx.accounts.source.to_account_info(),
                mint: ctx.accounts.mint.to_account_info(),
                to: ctx.accounts.destination.to_account_info(),
                authority: ctx.accounts.permanent_delegate.to_account_info(),
            },
            signer_seeds,
        ),
        amount,
        ctx.accounts.mint.decimals,
    )?;

    Ok(())
}
```

## Combining Multiple Patterns

Most production tokens combine multiple restriction patterns:

```rust
// Example: Securities token with comprehensive compliance
pub struct ComplianceToken {
    // Transfer hook: Check whitelist + transfer limits
    transfer_hook: TransferHookExtension,

    // Freeze authority: Emergency pause capability
    freeze_authority: FreezeAuthorityExtension,

    // Default frozen: All new accounts start frozen
    default_account_state: DefaultAccountStateExtension,

    // Permanent delegate: Legal recovery capability
    permanent_delegate: PermanentDelegateExtension,
}
```

## Real-World Examples

### Example 1: Security Token (Reg D/Reg S)

```rust
pub fn security_token_transfer_hook(ctx: Context<TransferHook>, amount: u64) -> Result<()> {
    let compliance = &ctx.accounts.compliance_state;

    // Check sender accreditation
    require!(
        is_accredited_investor(&ctx.accounts.source_owner),
        ErrorCode::NotAccredited
    );

    // Check recipient accreditation
    require!(
        is_accredited_investor(&ctx.accounts.destination_owner),
        ErrorCode::NotAccredited
    );

    // Check geographic restrictions (Reg S compliance)
    require!(
        !is_us_person(&ctx.accounts.destination_owner) ||
        compliance.reg_d_exemption,
        ErrorCode::RegulationViolation
    );

    // Check lock-up period
    let current_time = Clock::get()?.unix_timestamp;
    require!(
        current_time > compliance.lockup_end,
        ErrorCode::LockupPeriodActive
    );

    Ok(())
}
```

### Example 2: Gaming Soulbound Item

```rust
pub fn transfer_hook_soulbound(ctx: Context<TransferHook>) -> Result<()> {
    // Only allow transfers TO the player (minting)
    // Never allow transfers FROM the player

    let source = &ctx.accounts.source_token;

    // Source must be the mint authority (initial distribution only)
    require!(
        ctx.accounts.source_owner.key() == MINT_AUTHORITY,
        ErrorCode::SoulboundTransferNotAllowed
    );

    // Once minted to player, it's permanently bound
    Ok(())
}
```

### Example 3: Community Token with Anti-Whale

```rust
pub fn transfer_hook_anti_whale(ctx: Context<TransferHook>, amount: u64) -> Result<()> {
    let dest_balance = ctx.accounts.destination_token.amount;

    // Prevent any single wallet from holding more than 2% of supply
    let max_holding = ctx.accounts.mint.supply / 50; // 2%

    require!(
        dest_balance + amount <= max_holding,
        ErrorCode::MaxHoldingExceeded
    );

    // Prevent transfers larger than 0.5% of supply in single tx
    let max_transfer = ctx.accounts.mint.supply / 200; // 0.5%

    require!(
        amount <= max_transfer,
        ErrorCode::TransferTooLarge
    );

    Ok(())
}
```

## Performance Considerations

| Pattern | Compute Units | Scalability | Flexibility |
|---------|--------------|-------------|-------------|
| Transfer Hook (Vec) | ~20,000 | Poor (163k limit) | High |
| Transfer Hook (PDA) | ~25,000 | Excellent | High |
| Freeze Authority | ~5,000 | Excellent | Low |
| Default Frozen | ~5,000 | Excellent | Low |
| Permanent Delegate | ~8,000 | Excellent | Medium |

## Best Practices

1. **Use PDA-based whitelists** for scalability beyond 10,000 addresses
2. **Combine multiple patterns** for defense in depth
3. **Log all compliance actions** with events for audit trails
4. **Implement emergency pause** via freeze authority
5. **Test edge cases**: What happens when whitelist account is closed? When authority is changed?
6. **Plan for key rotation**: How to update authorities safely?
7. **Document compliance logic** for regulators and auditors
8. **Consider upgrade paths**: Can you migrate to new compliance logic?

## Resources

- **Official Transfer Hook Guide**: https://solana.com/developers/guides/token-extensions/transfer-hook
- **Whitelist Example Code**: https://github.com/solana-developers/program-examples/tree/main/tokens/token-2022/transfer-hook/whitelist
- **Token-2022 Security Guide**: https://neodyme.io/en/blog/token-2022/
- **Compliance Token Tutorial**: https://www.quicknode.com/guides/solana-development/spl-tokens/token-2022/transfer-hooks

## Sources

Research for this document included:
- [Solana Transfer Hook Guide (QuickNode)](https://www.quicknode.com/guides/solana-development/spl-tokens/token-2022/transfer-hooks)
- [Token-2022 Security Analysis (Neodyme)](https://neodyme.io/en/blog/token-2022/)
- [Transfer Hook Whitelist Example](https://github.com/solana-developers/program-examples/tree/main/tokens/token-2022/transfer-hook/whitelist)
- [Token-2022 Guide (QuillAudits)](https://www.quillaudits.com/research/rwa-development/non-evm-standards/solana-token-2022)
- [Token Extensions Overview (Solana)](https://solana.com/solutions/token-extensions)
- [Transfer Hook Developer Guide](https://solana.com/developers/guides/token-extensions/transfer-hook)
