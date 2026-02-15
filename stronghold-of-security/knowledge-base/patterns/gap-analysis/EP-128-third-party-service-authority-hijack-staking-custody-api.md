# EP-128: Third-Party Service Authority Hijack (Staking/Custody API)
**Category:** Key Management / Supply Chain  **Severity:** CRITICAL  **Solana-Specific:** Yes (Solana staking authority model)
**Historical Exploits:** SwissBorg/Kiln ($41.5M, Sep 2025 — compromised GitHub token of Kiln infra engineer → malicious payload injected into Kiln Connect API → 8 hidden `SetAuthority` instructions embedded in routine unstake transaction → 192,600 SOL stake authority transferred to attacker)

**Description:** Protocols that delegate custody or staking operations to third-party service providers (staking-as-a-service, custody APIs, yield aggregators) are vulnerable when the provider's infrastructure is compromised. The attacker injects malicious authority-transfer instructions into routine operations (stake, unstake, compound), silently redirecting control of assets. On Solana, the staking authority model (stake authority + withdraw authority) makes this particularly dangerous — a single `SetAuthority` instruction can irrevocably transfer control.

**Attack Flow (SwissBorg/Kiln):**
1. Attacker compromises Kiln infra engineer's GitHub access token (phishing/credential theft)
2. Injects malicious payload into Kiln Connect API codebase
3. Payload activates when client with >150,000 SOL sends routine unstake request
4. API response includes 8 hidden `SetAuthority` instructions alongside legitimate unstake
5. Client signs the composite transaction (trusts the API)
6. Stake account authorities transferred from client to attacker on-chain
7. Attacker unstakes and drains 192,600 SOL ($41.5M)

**Vulnerable Pattern:**
```rust
// Client blindly signs transaction constructed by third-party API
let tx = staking_api.build_unstake_transaction(stake_accounts)?;
// BUG: No verification of transaction contents before signing
// API could inject SetAuthority, transfer, or any other instruction
wallet.sign_and_send(tx)?;
```
**Secure Pattern:**
```rust
// Verify all instructions in API-constructed transactions before signing
let tx = staking_api.build_unstake_transaction(stake_accounts)?;

// Parse and validate every instruction
for ix in &tx.message.instructions {
    let program_id = tx.message.account_keys[ix.program_id_index as usize];
    match program_id {
        STAKE_PROGRAM_ID => {
            // Only allow Deactivate — reject SetAuthority, Authorize, etc.
            let stake_ix = StakeInstruction::deserialize(&ix.data)?;
            require!(matches!(stake_ix, StakeInstruction::Deactivate), "Unexpected stake instruction");
        }
        _ => return Err("Unexpected program in transaction"),
    }
}
wallet.sign_and_send(tx)?;
```
**Detection:** For protocols using third-party staking/custody APIs: (a) verify transaction contents are validated before signing, (b) check for allowlisted instruction types per operation, (c) verify authority changes require separate multi-party approval flow (not embedded in routine operations), (d) check for on-chain monitoring of `SetAuthority` events on managed accounts, (e) audit the third-party's security practices (code signing, access controls, deployment pipeline). Flag any pattern where externally-constructed transactions are signed without instruction-level verification.

**Source:** SwissBorg security update (Nov 2025), Halborn SwissBorg analysis (Sep 2025), CoinDesk, CoinTelegraph
