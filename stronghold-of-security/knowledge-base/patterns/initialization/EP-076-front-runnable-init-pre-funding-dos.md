# EP-076: Front-Runnable Init / Pre-Funding DoS
**Category:** Initialization  **Severity:** HIGH  **Solana-Specific:** Yes
**Historical Exploits:** PDA accounts front-run initialized by attacker; Pre-funding DoS (attacker sends lamports to predictable PDA before legitimate init)

**Description:** Two sub-patterns:
1. **Front-run init:** Init tx visible in mempool. Attacker front-runs with their authority.
2. **Pre-funding DoS:** Attacker pre-funds a predictable PDA with lamports. `create_account` checks `lamports > 0` and fails with `AccountAlreadyInUse`, permanently blocking initialization. Anchor mitigates this (falls back to `transfer` + `allocate` + `assign`), but raw `invoke_signed` with `create_account` is vulnerable.

**Vulnerable Pattern:**
```rust
pub fn init(ctx: ...) { config.authority = authority.key(); } // Front-runnable!

// Pre-funding DoS variant:
invoke_signed(
    &system_instruction::create_account(payer, pda, rent, space, program_id),
    &[payer, pda, system_program],
    &[seeds], // FAILS if pda already has lamports > 0
)?;
```
**Secure Pattern:**
```rust
#[account(init, seeds = [b"config", DEPLOYER.as_ref()], bump)]
pub config: Account<'info, Config>, // Deployer-specific PDA + Anchor handles pre-funding

// Manual safe init (if not using Anchor):
if pda.lamports() > 0 {
    // Account already has lamports — use allocate + assign instead
    let needed_rent = rent.minimum_balance(space) - pda.lamports();
    if needed_rent > 0 { invoke(&transfer(payer, pda, needed_rent), ...)?; }
    invoke_signed(&allocate(pda, space), ..., &[seeds])?;
    invoke_signed(&assign(pda, program_id), ..., &[seeds])?;
} else {
    invoke_signed(&create_account(payer, pda, rent, space, program_id), ..., &[seeds])?;
}
```
**Detection:** Check if init uses raw `create_account` with predictable PDA (vulnerable to pre-funding). Check if init can be front-run. Verify PDA seeds prevent unauthorized init. Anchor's `init` is safe; raw `invoke_signed` with `create_account` is not.
