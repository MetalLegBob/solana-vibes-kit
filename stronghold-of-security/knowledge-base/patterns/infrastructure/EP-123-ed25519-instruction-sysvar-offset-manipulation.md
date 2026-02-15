# EP-123: Ed25519 Instruction Sysvar Offset Manipulation
**Category:** Cryptography / Account Validation  **Severity:** CRITICAL  **Solana-Specific:** Yes
**Historical Exploits:** Relay Protocol ($5B+ volume cross-chain bridge, Sep 2025 — contracts trusted Ed25519 verification without validating offsets, allowing forged allocator signatures and potential double-spends. Disclosed by Asymmetric Research, patched, no funds lost.)

**Description:** On Solana, programs verify Ed25519 signatures by reading the Ed25519 precompile instruction data from the instructions sysvar (`sysvar::instructions`). The program checks that a valid Ed25519 signature verification instruction exists in the same transaction. However, if the program does not validate the **offset** into the instruction data, an attacker can include a valid Ed25519 signature for a *different* message and manipulate the offset to make the program read the wrong data. This lets the attacker forge signatures for arbitrary messages.

**Vulnerable Pattern:**
```rust
// Program reads Ed25519 instruction from sysvar
let ed25519_ix = load_instruction_at_checked(
    ed25519_ix_index as usize,
    &ctx.accounts.instructions_sysvar,
)?;

// Verifies the instruction is Ed25519 program
require!(ed25519_ix.program_id == ed25519_program::ID);

// BUG: Reads signature data at attacker-controlled offset
// without verifying the offset points to the expected message
let sig_data = &ed25519_ix.data[offset..];
let pubkey = &sig_data[0..32];
let message = &sig_data[32..64]; // Attacker controls which bytes are read
```
**Secure Pattern:**
```rust
// Fully parse the Ed25519 instruction data structure
let ed25519_ix = load_instruction_at_checked(
    ed25519_ix_index as usize,
    &ctx.accounts.instructions_sysvar,
)?;
require!(ed25519_ix.program_id == ed25519_program::ID);

// Parse the Ed25519SignatureOffsets struct at known position
let offsets = Ed25519SignatureOffsets::unpack(&ed25519_ix.data[2..])?;

// Verify ALL offsets point to expected data within the instruction
require!(offsets.signature_offset == EXPECTED_SIG_OFFSET);
require!(offsets.public_key_offset == EXPECTED_KEY_OFFSET);
require!(offsets.message_data_offset == EXPECTED_MSG_OFFSET);

// Verify the actual message content matches what we expect
let message = &ed25519_ix.data[offsets.message_data_offset as usize..];
require!(message == &expected_message);

// Verify the public key matches the expected signer
let pubkey = &ed25519_ix.data[offsets.public_key_offset as usize..];
require!(pubkey == expected_authority.as_ref());
```
**Detection:** Search for `load_instruction_at`, `ed25519_program`, `Ed25519SignatureOffsets` usage. Verify the program validates ALL offset fields, not just the program ID. Check that the message content and public key are verified against expected values. Flag any pattern where offsets from the Ed25519 instruction are used without full validation. This pattern also applies to Secp256k1 signature verification via the secp256k1 precompile.
