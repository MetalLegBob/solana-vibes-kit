---
pack: solana
topic: "Yield Aggregation"
decision: "How do I build yield aggregation on Solana?"
confidence: 9/10
sources_checked: 25
last_updated: "2026-02-16"
---

# How do I build yield aggregation on Solana?

Yield aggregation on Solana combines automated vault systems with multi-protocol yield optimization. This guide covers real production architectures from Kamino, Meteora, and other battle-tested protocols.

## Core Architecture Patterns

### 1. Vault Structure (ERC-4626 Model on Solana)

Solana yield vaults follow the ERC-4626 tokenized vault pattern adapted for SVM:

**Key Accounts:**
- **Vault State PDA**: Stores config (share mint, total assets, fee rates, strategy addresses)
- **Vault Token Account (ATA)**: Holds underlying assets (USDC, SOL, etc.) owned by PDA signer
- **Share Mint**: SPL token representing proportional vault ownership
- **Token Account Owner PDA**: Derived signer authority for all vault operations

**Share Math (Critical):**
```rust
// On DEPOSIT (first depositor gets 1:1 ratio)
if total_supply == 0 {
    shares = assets
} else {
    shares = (assets * total_supply) / total_assets
}

// On WITHDRAW/REDEEM
assets = (shares * total_assets) / total_supply

// Inflation attack protection (OpenZeppelin pattern)
// Use virtual shares/assets with offset
offset_decimals = 9 - asset_decimals
virtual_shares = total_shares + 10^offset_decimals
virtual_assets = total_assets + 1

shares = (assets * virtual_shares) / virtual_assets
```

**Rounding Rules:**
- `deposit()`: Round DOWN shares (favors vault)
- `withdraw()`: Round UP shares to burn (favors vault)
- `mint()`: Round UP assets required (favors vault)
- `redeem()`: Round DOWN assets returned (favors vault)

This ensures the vault never becomes insolvent through rounding errors.

### 2. Strategy Layer Architecture

**Single-Asset Strategies:**
- Deposit USDC/SOL into lending protocols (Kamino Lend, MarginFi, Solend)
- Auto-compound interest every N hours (Kamino: multiple times/day)
- Example: Gauntlet USDC Prime vault on Kamino Lend

**LP Token Strategies (Concentrated Liquidity):**
- Open CLMM positions on Raydium/Orca with vault funds
- Automated rebalancing to stay in range
- Harvest swap fees + LP incentives + protocol rewards
- Compound back into position
- Example: Kamino's automated Raydium vaults

**Leveraged Strategies:**
- Deposit collateral → borrow same asset → re-deposit (loop)
- Common pattern: 3-5x leverage on SOL staking yield
- Risk: liquidation if collateral ratio falls below threshold
- Kamino offers unified lending/borrowing for leverage automation

**Multi-Protocol Allocation (Meteora Dynamic Vaults):**
```
Architecture:
1. Vault contract holds user deposits
2. Off-chain keeper (Hermes) monitors yields across protocols
3. Rebalances every 60 seconds to optimal allocation
4. Max 30% per protocol (risk mitigation)
5. Auto-withdraws if utilization > safety threshold

Protocols tracked:
- Kamino Lend
- MarginFi
- Solend
- Others as integrated
```

### 3. Auto-Compounding Mechanics

**On-Chain Compounding Flow:**
```rust
pub fn compound(ctx: Context<Compound>) -> Result<()> {
    let vault = &mut ctx.accounts.vault;

    // 1. Harvest yield from all strategies
    for strategy in vault.active_strategies.iter() {
        strategy.claim_rewards()?; // CPI to lending protocol
    }

    // 2. Swap rewards to underlying asset (if needed)
    // e.g., KMNO rewards → USDC via Jupiter aggregator
    swap_rewards_to_underlying(ctx)?;

    // 3. Reinvest underlying back into strategies
    let total_harvested = ctx.accounts.vault_ata.amount - vault.total_assets;

    // 4. Update total_assets (increases share value)
    vault.total_assets += total_harvested;

    // Share price automatically increases
    // (shares supply unchanged, assets increased)

    emit!(CompoundEvent {
        vault: vault.key(),
        assets_compounded: total_harvested,
        new_share_price: vault.total_assets / vault.share_supply,
    });

    Ok(())
}
```

**Compound Triggers:**
- **Time-based**: Every N hours/days (Kamino: multiple/day)
- **APY-based**: When pending rewards exceed gas costs
- **Utilization-based**: When idle cash exceeds threshold
- **Keeper network**: Off-chain bots with incentives

**Gas Optimization:**
- Batch compound across all users (shared cost)
- Only compound when yield > tx fees
- Use keeper incentives (small % of compounded yield)

### 4. Rebalancing Logic

**Allocation Rebalancing (Multi-Protocol):**
```typescript
// Meteora Hermes keeper logic (simplified)
async function rebalance() {
    // 1. Fetch current APYs from all protocols
    const yields = await Promise.all([
        kamino.getSupplyAPY('USDC'),
        marginfi.getSupplyAPY('USDC'),
        solend.getSupplyAPY('USDC'),
    ]);

    // 2. Calculate optimal allocation
    // Target: Highest yield, max 30% per protocol
    const optimal = calculateOptimalAllocation(yields, {
        maxPerProtocol: 0.30,
        minLiquidity: MIN_LIQUIDITY_THRESHOLD
    });

    // 3. Withdraw from low-yield protocols
    for (const protocol of toWithdraw) {
        await vault.methods.withdrawFromStrategy(protocol).rpc();
    }

    // 4. Deposit into high-yield protocols
    for (const protocol of toDeposit) {
        await vault.methods.depositToStrategy(protocol, amount).rpc();
    }
}

// Runs every 60 seconds
setInterval(rebalance, 60_000);
```

**CLMM Range Rebalancing (LP vaults):**
- Monitor price deviation from range center
- Trigger rebalance when price moves >X% from optimal
- Withdraw LP position → swap to rebalance ratio → create new position
- Consider fee tier changes if volume shifts

**Risk-Based Rebalancing:**
- Monitor protocol utilization rates (>90% = risky)
- Auto-withdraw if protocol shows stress signals
- Meteora proved this during USDC depeg (March 2023) and USDH exploit

### 5. Fee Structure Patterns

**Performance Fees (Most Common):**
```rust
pub struct VaultConfig {
    pub performance_fee_bps: u16,  // e.g., 1000 = 10%
    pub fee_recipient: Pubkey,
    // ... other config
}

// On harvest/compound
let yield_earned = new_total_assets - old_total_assets;
let performance_fee = (yield_earned * performance_fee_bps) / 10000;

// Mint shares to fee_recipient (dilutes existing holders)
// OR transfer assets directly
```

**Gauntlet/Kamino Pattern:**
- 0-10% performance fee on generated yield
- No deposit/withdrawal fees
- Management fee: 0-2% annually (rare)

**Withdrawal Fee Pattern:**
```rust
// Anti-whale manipulation
pub fn withdraw(ctx: Context<Withdraw>, assets: u64) -> Result<()> {
    let withdrawal_fee_bps = 10; // 0.1%
    let fee = (assets * withdrawal_fee_bps) / 10000;
    let assets_after_fee = assets - fee;

    // Transfer fee to vault (stays in pool)
    // Transfer assets_after_fee to user
}
```

**Avoid:** High withdrawal fees can trap users. Kamino/Meteora use 0% withdrawal fees.

## Share Token Math Deep Dive

### Deposit/Withdraw Rounding Attack Prevention

**The Problem:**
```
Scenario: Empty vault
1. Attacker deposits 1 wei, gets 1 share
2. Attacker directly transfers 10,000 tokens to vault (donation)
3. Vault state: totalAssets = 10,001, totalSupply = 1
4. Victim deposits 10,000 tokens
5. Victim gets: (10,000 * 1) / 10,001 = 0 shares (rounds down)
6. Attacker redeems 1 share for 20,001 tokens
```

**Solution 1: Virtual Shares (OpenZeppelin Pattern)**
```rust
const OFFSET_DECIMALS: u8 = 9 - asset_decimals;
const VIRTUAL_SHARES: u64 = 10_u64.pow(OFFSET_DECIMALS as u32);
const VIRTUAL_ASSETS: u64 = 1;

// Attack fails:
// Victim gets: (10,000 * (1 + VIRTUAL_SHARES)) / (10,001 + VIRTUAL_ASSETS)
// With offset=9: (10,000 * 1_000_000_000) / 10,001 = ~999,900,000 shares
```

**Solution 2: Minimum First Deposit**
```rust
require!(
    ctx.accounts.vault.total_supply > 0 || assets >= MIN_FIRST_DEPOSIT,
    VaultError::FirstDepositTooSmall
);
const MIN_FIRST_DEPOSIT: u64 = 1_000_000; // 1 USDC or 0.001 SOL
```

**Solution 3: Dead Shares (Burn first minter's shares)**
```rust
if vault.total_supply == 0 {
    let shares = assets;
    let dead_shares = 1000;
    vault.mint_shares(dead_address, dead_shares)?;
    vault.mint_shares(user, shares - dead_shares)?;
}
```

### Precision Handling

**Problem:** SOL (9 decimals), USDC (6 decimals) → inconsistent share precision

**Solution:**
```rust
// Normalize all vaults to 9 decimals for shares
pub fn calculate_shares(assets: u64, asset_decimals: u8) -> u64 {
    const SHARE_DECIMALS: u8 = 9;
    if asset_decimals < SHARE_DECIMALS {
        let multiplier = 10_u64.pow((SHARE_DECIMALS - asset_decimals) as u32);
        (assets * multiplier * total_shares) / (total_assets * multiplier)
    } else {
        (assets * total_shares) / total_assets
    }
}
```

## Risk & Security Patterns

### 1. Strategy Risk Layering

**Kamino's Risk Tiers:**
- **Conservative**: Only supply to blue-chip lending markets (SOL, USDC, BTC)
- **Balanced**: Mix of lending + safe LP pairs (SOL-USDC)
- **Aggressive**: Leveraged strategies, exotic pairs, newer protocols

**Gauntlet's Curation Model:**
- Institutional-grade risk assessment per strategy
- Real-time monitoring of utilization, liquidity, oracle health
- Auto-blacklist strategies that breach risk params

### 2. Common Vault Vulnerabilities

**Missing Signer Checks (Solana-Specific):**
```rust
// VULNERABLE
pub fn withdraw(ctx: Context<Withdraw>) -> Result<()> {
    // No check that user owns the shares!
    vault.transfer_assets(ctx.accounts.user)?;
}

// SECURE
pub fn withdraw(ctx: Context<Withdraw>) -> Result<()> {
    require_keys_eq!(
        ctx.accounts.user_shares_ata.owner,
        ctx.accounts.user.key(),
        VaultError::UnauthorizedWithdrawal
    );
    // ... rest of logic
}
```

**Unverified Account Ownership:**
```rust
#[derive(Accounts)]
pub struct Withdraw<'info> {
    #[account(mut)]
    pub vault: Account<'info, VaultState>,

    // MUST verify this is vault's token account
    #[account(
        mut,
        constraint = vault_ata.owner == vault_authority.key(),
        constraint = vault_ata.mint == vault.underlying_mint
    )]
    pub vault_ata: Account<'info, TokenAccount>,

    // ... other accounts
}
```

**Oracle Manipulation (Leveraged Vaults):**
```rust
// Check oracle staleness
let clock = Clock::get()?;
require!(
    clock.unix_timestamp - price_feed.timestamp < MAX_ORACLE_STALENESS,
    VaultError::StaleOracle
);

// Use TWAP for critical operations
let safe_price = oracle.get_twap(TWAP_PERIOD)?;
```

**Reentrancy via CPI:**
```rust
// Use anchor's reentrancy guard
#[account]
pub struct VaultState {
    pub locked: bool, // Reentrancy flag
    // ... other fields
}

pub fn deposit(ctx: Context<Deposit>) -> Result<()> {
    require!(!ctx.accounts.vault.locked, VaultError::Reentrancy);
    ctx.accounts.vault.locked = true;

    // ... CPI calls to other programs

    ctx.accounts.vault.locked = false;
    Ok(())
}
```

### 3. Liquidity Risk Management

**Meteora's Auto-Withdrawal Pattern:**
```rust
// Hermes keeper monitors every 60s
if protocol.utilization_rate() > 0.90 {
    // Withdraw to vault's idle reserves
    vault.emergency_withdraw_from_strategy(protocol)?;
}

if vault.idle_liquidity() < MIN_LIQUIDITY_BUFFER {
    // Withdraw from lowest-yield strategy
    rebalance_for_liquidity()?;
}
```

**Withdrawal Queue Pattern:**
```rust
pub struct WithdrawalRequest {
    pub user: Pubkey,
    pub shares: u64,
    pub requested_at: i64,
}

// If instant liquidity unavailable
pub fn request_withdrawal(ctx: Context<RequestWithdrawal>, shares: u64) -> Result<()> {
    // Queue withdrawal
    vault.withdrawal_queue.push(WithdrawalRequest {
        user: ctx.accounts.user.key(),
        shares,
        requested_at: Clock::get()?.unix_timestamp,
    });

    // Process when liquidity available (keeper)
    Ok(())
}
```

## Production Examples

### 1. Kamino Vaults

**Architecture:**
- **Unified platform**: Lend, borrow, leverage in single interface
- **Auto-compound**: Multiple times per day
- **Vault types**:
  - Concentrated Liquidity (Raydium/Orca positions)
  - Lending Supply (Kamino Lend markets)
  - Leveraged Staking (loop SOL staking)

**Integration Pattern:**
```typescript
import { Kamino } from '@hubbleprotocol/kamino-sdk';

const kamino = new Kamino('mainnet-beta');

// Deposit into USDC vault
const strategy = await kamino.getStrategyByAddress(STRATEGY_PUBKEY);
const depositIx = await kamino.deposit(
    strategy,
    new BN(1000000), // 1 USDC
    userPublicKey
);

await sendTransaction([depositIx]);

// Withdraw
const withdrawIx = await kamino.withdraw(
    strategy,
    new BN(shares),
    userPublicKey
);
```

**Key Learnings:**
- Separate keeper infrastructure for compounding
- Support Token-2022 alongside SPL Token
- Whale-proof: Supply caps per strategy
- Risk framework: Conservative/Balanced/Aggressive tiers

### 2. Meteora Dynamic Vaults

**Architecture:**
- **Off-chain keeper**: Hermes (Rust service)
- **Rebalance frequency**: Every 60 seconds
- **Max allocation**: 30% per protocol
- **Integrated with**: Kamino, MarginFi, Solend

**Safety Mechanisms:**
```typescript
// From Meteora docs
const SAFETY_PARAMS = {
    maxUtilization: 0.90,        // Withdraw if protocol >90% utilized
    minLiquidity: 0.10,          // Keep 10% in vault as buffer
    maxProtocolAllocation: 0.30, // Max 30% in any single protocol
    rebalanceThreshold: 0.05     // Rebalance if allocation drift >5%
};
```

**Proven Resilience:**
- **USDC depeg (March 2023)**: Auto-withdrew all funds
- **USDH exploit (2022)**: Detected and withdrew before major loss
- **Continuous operation**: No vault exploits in 2+ years

### 3. Voltr (Modular Infrastructure)

**Design:**
- **Vault-as-a-Service**: Anyone can create custom vaults
- **Adaptor System**: Pluggable strategies via standardized interface
- **Go-to-Market**: Frontend templates for vault creators

**Adaptor Pattern:**
```rust
pub trait StrategyAdaptor {
    fn deposit(&self, ctx: Context, amount: u64) -> Result<()>;
    fn withdraw(&self, ctx: Context, amount: u64) -> Result<()>;
    fn harvest(&self, ctx: Context) -> Result<u64>;
    fn total_assets(&self, ctx: Context) -> Result<u64>;
}

// Implement for each protocol
impl StrategyAdaptor for KaminoAdaptor {
    fn deposit(&self, ctx: Context, amount: u64) -> Result<()> {
        // CPI to Kamino Lend
    }
    // ... other methods
}
```

## Implementation Checklist

### Phase 1: Basic Vault
- [ ] Define vault state (PDA, share mint, token accounts)
- [ ] Implement deposit with share calculation
- [ ] Implement withdraw with share burning
- [ ] Add inflation attack protection (virtual shares)
- [ ] Write deposit/withdraw tests

### Phase 2: Single Strategy
- [ ] Add strategy state (protocol address, allocation)
- [ ] Implement CPI to lending protocol (Kamino/MarginFi)
- [ ] Build harvest function (claim rewards)
- [ ] Build compound function (reinvest rewards)
- [ ] Add time-based compound keeper

### Phase 3: Multi-Strategy
- [ ] Define strategy queue (supply/withdraw order)
- [ ] Implement rebalance logic (move funds between strategies)
- [ ] Add allocation caps per strategy
- [ ] Build off-chain keeper for auto-rebalance
- [ ] Add emergency withdraw function

### Phase 4: Risk & Fees
- [ ] Implement performance fee (mint shares to fee recipient)
- [ ] Add strategy risk scoring
- [ ] Implement utilization monitoring
- [ ] Add oracle staleness checks
- [ ] Build admin functions (pause, emergency withdraw)

### Phase 5: Production Hardening
- [ ] Full test coverage (unit, integration, fuzz)
- [ ] External security audit (minimum 2 firms)
- [ ] Deploy to devnet with monitoring
- [ ] Gradual mainnet rollout with TVL caps
- [ ] Set up real-time alerting (Datadog, PagerDuty)

## Code References

**Solana Vault Examples:**
- [Euler Earn Vault Kit](https://github.com/euler-xyz/euler-earn) - ERC-4626 reference (Ethereum, but logic applies)
- [Splyce Solana Vaults](https://github.com/Splyce-Finance/splyce-solana-vaults) - Full Solana implementation
- [Meteora Vault SDK](https://github.com/mercurial-finance/vault-sdk) - Production-grade TypeScript SDK
- [Solana 4626 Implementation](https://github.com/huybuidac/solana-tokenized-vault-4626) - Anchor-based with Token-2022

**Math References:**
- [OpenZeppelin ERC-4626](https://eips.ethereum.org/EIPS/eip-4626) - Standard specification
- [Smart Contract Programmer Vault Math](https://www.youtube.com/watch?v=k7WNibJOBXE) - Video explanation
- [Solana ERC-4626 Guide](https://solana.com/developers/evm-to-svm/erc4626) - Official Solana docs

## Common Pitfalls

1. **First Depositor Attack**: Always use virtual shares or minimum deposit
2. **Share Price Manipulation**: Never allow direct transfers to vault without minting shares
3. **Rounding Errors**: Always round in vault's favor (prevent insolvency)
4. **Unchecked Strategy Returns**: Always verify strategy total_assets matches expected
5. **Missing Access Controls**: Use `has_one` constraints on vault authority
6. **Oracle Reliance**: Use TWAP or multiple oracles for leverage calculations
7. **No Pause Mechanism**: Critical for emergency response
8. **Unlimited Approval**: Scope token approvals to exact amounts needed

## Performance Optimization

**Compute Unit Management:**
```rust
// Batch operations to minimize CPI overhead
pub fn batch_compound(ctx: Context<BatchCompound>, strategies: Vec<Pubkey>) -> Result<()> {
    // Request higher compute units
    solana_program::msg!("Setting compute units: 400000");

    for strategy in strategies {
        harvest_strategy(strategy)?;
    }

    // Single swap at end (cheaper than multiple small swaps)
    swap_all_rewards_to_underlying()?;
    reinvest_all()?;

    Ok(())
}
```

**Account Caching:**
```rust
// Cache frequently accessed data in stack
let vault_snapshot = VaultSnapshot {
    total_assets: vault.total_assets,
    total_shares: vault.total_shares,
    // ... other fields
};

// Use snapshot for calculations (avoid repeated deserialization)
let share_price = calculate_share_price(&vault_snapshot);
```

## Monitoring & Alerting

**Critical Metrics:**
- Share price delta (should only increase or stay flat)
- Total assets vs. sum of strategy balances (should match)
- Utilization rates per strategy (alert if >85%)
- Withdrawal queue depth (alert if >10 pending)
- Oracle staleness (alert if >60s old)
- Failed compound attempts (alert after 3 consecutive)

**Dashboard Template:**
```typescript
const metrics = {
    tvl: await vault.totalAssets(),
    sharePrice: await vault.sharePrice(),
    apy: calculateRolling30DayAPY(),
    strategyBreakdown: await getStrategyAllocations(),
    pendingWithdrawals: await vault.withdrawalQueue.length(),
    lastCompound: await vault.lastCompoundTimestamp(),
};

// Alert if share price decreased
if (metrics.sharePrice < previousSharePrice) {
    alert('CRITICAL: Share price decreased!');
}
```

## Further Reading

- [Kamino Institutional Credit Report](https://www.linkedin.com/pulse/kamino-solanas-battle-tested-path-institutional-on-chain-chetan-kale-tw2vf)
- [Meteora Design Goals](https://docs.meteora.ag/overview/other-products/dynamic-vault/design-goals)
- [Solana Vault Tutorial](https://blog.blockmagnates.com/vaults-in-solana-67cc1614d66c)
- [History of Solana Security Incidents](https://collinsdefipen.medium.com/history-of-solana-security-incidents-a-deep-dive-2332d17e6375)
- [Halborn Vaultka Audit Report](https://www.halborn.com/audits/vaultka/waterusdc-and-vaultka-solana-programs)
- [Step Finance $27M Exploit (Jan 2026)](https://www.coindesk.com/business/2026/01/31/solana-based-defi-platform-step-finance-hit-by-usd30-million-treasury-hack-as-token-price-craters)

---

**Architecture Decision:** Use ERC-4626-style vaults with virtual share inflation protection. Build single-strategy first, expand to multi-protocol with off-chain keeper. Always round in vault's favor. Audit before mainnet.

**Confidence: 9/10** - Based on production implementations from Kamino ($3.4B TVL), Meteora (battle-tested since 2022), extensive code examples, and documented security patterns. Deduct 1 point for limited public documentation on some newer protocols.
