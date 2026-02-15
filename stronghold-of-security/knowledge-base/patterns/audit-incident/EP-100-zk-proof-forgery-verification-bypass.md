# EP-100: ZK Proof Forgery / Verification Bypass
**Category:** Cryptography  **Severity:** CRITICAL  **Solana-Specific:** Yes (ZK ElGamal Proof program)
**Historical Exploits:** Solana ZK ElGamal Bug #1 (Apr 2025 — unhashed algebraic components in Fiat-Shamir, reported by LonelySloth, patched in 2 days), ZK ElGamal Bug #2 (Jun 2025 — separate Fiat-Shamir omission, reported by zksecurityXYZ, confidential transfers disabled, ZK ElGamal Proof program disabled at epoch 805), ZK ElGamal Bug #3 (Jan/Feb 2026 — third vulnerability found during re-audit before re-enabling program, patched by Anza+Firedancer+Jito engineers, no exploit). Same class of vulnerability found THREE TIMES — ZK proof systems are extremely fragile.

**Description:** Zero-knowledge proof verification logic contains flaws that allow forged or invalid proofs to pass validation. In confidential transfer systems, this can enable unauthorized minting or withdrawals without detection, as the amounts are encrypted and hidden from public view.

**Vulnerable Pattern:**
```rust
// Conceptual: ZK proof verifier with incomplete validation
pub fn verify_transfer_proof(proof: &ConfidentialTransferProof) -> Result<()> {
    // BUG: Verification does not check all proof components
    // Attacker can craft proof that passes partial checks but represents invalid statement
    verify_range_proof(&proof.range_proof)?;
    // MISSING: verify_equality_proof, verify_ciphertext_validity, etc.
    Ok(())
}
```
**Secure Pattern:**
```rust
// Use well-audited, complete ZK verification from official Solana programs
// Do NOT implement custom ZK verification logic
// Verify the ZK ElGamal Proof program is enabled and at expected version
pub fn verify_confidential_transfer(ctx: &Context) -> Result<()> {
    // Verify using official program, not custom logic
    require!(
        ctx.accounts.zk_proof_program.key() == ZK_ELGAMAL_PROOF_PROGRAM_ID,
        ErrorCode::InvalidProofProgram
    );
    // Check program is enabled (was disabled after Apr 2025 vulnerability)
    // Use latest program version with all patches applied
    Ok(())
}
```
**Detection:** Identify any use of Token-2022 confidential transfers. Verify the ZK ElGamal Proof program version is current and enabled. Check for custom ZK proof verification logic (extremely high risk). Audit any protocol that hides amounts — verify the hiding mechanism's cryptographic soundness. Check if ConfidentialTransfer, ConfidentialTransferFee, ConfidentialMint, ConfidentialBurn extensions are used.
