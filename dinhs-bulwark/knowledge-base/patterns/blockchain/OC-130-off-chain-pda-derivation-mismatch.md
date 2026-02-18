# OC-130: Off-Chain PDA Derivation Mismatch with On-Chain

**Category:** Blockchain Interaction
**Severity:** HIGH
**Auditors:** CHAIN-06
**CWE:** CWE-436 (Interpretation Conflict)
**OWASP:** N/A — Blockchain-specific

## Description

Program Derived Addresses (PDAs) on Solana are deterministically derived from a program ID and a set of seeds using `PublicKey.findProgramAddress()` (off-chain) or `Pubkey::find_program_address()` (on-chain). When the off-chain code and on-chain program use different seeds, seed ordering, program IDs, or encoding to derive the same PDA, the addresses will not match — causing transactions to fail or, worse, operating on the wrong account.

This mismatch is a common integration bug between TypeScript client code and Rust on-chain programs. Typical causes include: using a string seed on the client but bytes on-chain, different seed ordering, encoding differences (UTF-8 vs raw bytes for numeric values), using `u64` as a little-endian byte array on-chain but big-endian or string representation off-chain, or forgetting to include a bump seed that the on-chain program expects.

With Anchor, this issue is partially mitigated by the `#[account]` macro that defines seed constraints. However, client-side code using `@coral-xyz/anchor` must still match the exact seed structure. Mismatches between the Anchor IDL's defined seeds and the client's manual PDA derivation are a frequent source of bugs.

## Detection

```
grep -rn "findProgramAddress\|findProgramAddressSync" --include="*.ts" --include="*.js"
grep -rn "PublicKey\.createWithSeed" --include="*.ts" --include="*.js"
grep -rn "seeds\s*=" --include="*.ts" --include="*.js"
grep -rn "Buffer\.from\|toBuffer\|toArrayLike" --include="*.ts" --include="*.js" | grep -i "seed"
```

Look for: PDA derivation using manual seeds instead of Anchor's built-in derivation, seed encoding that differs from on-chain program expectations, hardcoded bump seeds instead of using the canonical bump from `findProgramAddress`.

## Vulnerable Code

```typescript
import { PublicKey } from "@solana/web3.js";
import * as anchor from "@coral-xyz/anchor";

// VULNERABLE: Seed encoding mismatch with on-chain program
async function getUserAccount(programId: PublicKey, userId: number) {
  // Client uses string representation of userId
  const [pda] = PublicKey.findProgramAddressSync(
    [
      Buffer.from("user"),
      Buffer.from(userId.toString()),  // "123" as UTF-8 string bytes
    ],
    programId
  );
  return pda;
  // On-chain program uses: seeds = [b"user", user_id.to_le_bytes()]
  // These produce DIFFERENT addresses!
}

// VULNERABLE: Hardcoded bump seed instead of canonical bump
async function getVaultAccount(programId: PublicKey) {
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from("vault")],
    programId
  );
  // Using hardcoded bump from a previous derivation
  const bump = 254; // This may not be the canonical bump
  return { pda, bump };
}
```

## Secure Code

```typescript
import { PublicKey } from "@solana/web3.js";
import * as anchor from "@coral-xyz/anchor";
import { BN } from "bn.js";

// SECURE: Match on-chain seed encoding exactly
async function getUserAccount(programId: PublicKey, userId: number) {
  // Use little-endian u64 bytes to match Rust's to_le_bytes()
  const userIdBuffer = new BN(userId).toArrayLike(Buffer, "le", 8);
  const [pda, bump] = PublicKey.findProgramAddressSync(
    [
      Buffer.from("user"),
      userIdBuffer,  // Matches on-chain: user_id.to_le_bytes()
    ],
    programId
  );
  return { pda, bump }; // Always return canonical bump
}

// SECURE: Use Anchor's built-in PDA derivation when available
async function getUserAccountAnchor(
  program: anchor.Program,
  userId: number
) {
  // Anchor derives PDA from IDL-defined seeds automatically
  const userIdBN = new anchor.BN(userId);
  const [pda] = PublicKey.findProgramAddressSync(
    [
      Buffer.from("user"),
      userIdBN.toArrayLike(Buffer, "le", 8),
    ],
    program.programId
  );
  return pda;
}
```

## Impact

PDA derivation mismatches cause transactions to fail (account not found or owned by wrong program), or worse, the off-chain code operates on an unintended account. If the mismatched PDA happens to be an existing account, the application could read or modify the wrong user's data. In DeFi contexts, this can mean interacting with the wrong pool, vault, or authority account, potentially causing fund misdirection.

## References

- Solana docs: Program Derived Addresses — derivation mechanics
- Anchor docs: #[account] seeds constraint — PDA derivation in Anchor
- Helius: A Hitchhiker's Guide to Solana Program Security — PDA vulnerabilities
- Solana Stack Exchange: common PDA derivation bugs between client and program
