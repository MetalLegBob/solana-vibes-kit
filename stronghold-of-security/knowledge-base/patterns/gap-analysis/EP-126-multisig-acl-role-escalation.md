# EP-126: Multisig / ACL Role Escalation
**Category:** Access Control  **Severity:** CRITICAL  **Solana-Specific:** No
**Historical Exploits:** CrediX ($4.5M, Aug 2025 — attacker added as Admin+Bridge to multisig via ACLManager 6 days before exploit, used Bridge role to mint collateral tokens and drain liquidity pool)

**Description:** Attacker gains elevated roles within a protocol's access control system (multisig, ACL manager, role-based permissions) through social engineering, compromised signer, or governance manipulation. Once added with a powerful role (Bridge, Pool Admin, Emergency Admin), the attacker uses those roles to mint fake collateral, drain pools, pause competitors, or bypass controls. Distinguished from EP-031 (duplicate signer bypass) in that the attacker is *legitimately added* as a new role holder, not exploiting a signature verification flaw.

**Attack Flow (CrediX):**
1. Attacker's account added as Admin + Bridge to CrediX Multisig via ACLManager (day 0)
2. Six days pass — no alarm raised (insufficient monitoring)
3. Attacker uses Bridge role to mint collateral tokens (fake credit)
4. Fake collateral used to borrow real assets from liquidity pool
5. $4.5M drained

**Vulnerable Pattern:**
```rust
pub fn add_role(ctx: Context<AddRole>, new_member: Pubkey, role: Role) -> Result<()> {
    // Only checks: is caller an admin?
    require!(ctx.accounts.admin.key() == config.admin, ErrorCode::Unauthorized);
    // BUG: No timelock, no multi-party approval, no role-specific restrictions
    // An admin (or compromised admin key) can instantly grant any role
    acl_manager.grant_role(new_member, role)?;
    Ok(())
}
```
**Secure Pattern:**
```rust
pub fn propose_role(ctx: Context<ProposeRole>, new_member: Pubkey, role: Role) -> Result<()> {
    // Step 1: Propose (requires admin)
    let proposal = &mut ctx.accounts.role_proposal;
    proposal.new_member = new_member;
    proposal.role = role;
    proposal.proposed_at = Clock::get()?.unix_timestamp;
    proposal.approvals = 1; // Proposer counts as first approval
    Ok(())
}

pub fn execute_role(ctx: Context<ExecuteRole>) -> Result<()> {
    let proposal = &ctx.accounts.role_proposal;
    // Require timelock (e.g., 48 hours)
    let elapsed = Clock::get()?.unix_timestamp - proposal.proposed_at;
    require!(elapsed >= ROLE_TIMELOCK_SECONDS, ErrorCode::TimelockNotExpired);
    // Require multiple approvals
    require!(proposal.approvals >= MIN_ROLE_APPROVALS, ErrorCode::InsufficientApprovals);
    // Restrict high-privilege roles (Bridge, Emergency) to stricter thresholds
    if proposal.role == Role::Bridge || proposal.role == Role::EmergencyAdmin {
        require!(proposal.approvals >= ELEVATED_ROLE_APPROVALS, ErrorCode::InsufficientApprovals);
    }
    acl_manager.grant_role(proposal.new_member, proposal.role)?;
    Ok(())
}
```
**Detection:** Audit all role assignment / ACL management instructions. Check if adding new signers/roles requires: (a) timelock delay, (b) multi-party approval, (c) on-chain event emission for monitoring. Flag any instruction that can instantly grant Bridge, Emergency Admin, Pool Admin, or Mint Authority roles. Check if role grants are monitored by off-chain alerting. Verify that powerful roles (especially Bridge/minting roles) have operational limits even after being granted.

**Source:** Halborn CrediX analysis (Aug 2025), CryptoBriefing, CoinLaw
