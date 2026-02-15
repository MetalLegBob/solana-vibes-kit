# Focus Manifest: Access Control
<!-- Lists KB files for this focus area's agent to load. -->
<!-- Agent reads this manifest to know which pattern files + core reference to include in context. -->

## Core Patterns (always load)

### Account Validation (EP-001–014)
- patterns/account-validation/EP-001-missing-signer-check.md
- patterns/account-validation/EP-002-missing-owner-check.md
- patterns/account-validation/EP-003-account-type-cosplay-discriminator-bypass.md
- patterns/account-validation/EP-004-pda-seed-collision.md
- patterns/account-validation/EP-005-bump-seed-canonicalization.md
- patterns/account-validation/EP-006-unchecked-sysvar-account.md
- patterns/account-validation/EP-007-account-relationship-not-verified.md
- patterns/account-validation/EP-008-cross-account-data-mismatch.md
- patterns/account-validation/EP-009-duplicate-mutable-accounts.md
- patterns/account-validation/EP-010-unchecked-token-mint.md
- patterns/account-validation/EP-011-rent-siphoning.md
- patterns/account-validation/EP-012-account-realloc-without-safeguards.md
- patterns/account-validation/EP-013-mint-authority-not-verified.md
- patterns/account-validation/EP-014-alt-account-substitution.md

### Access Control (EP-026–032)
- patterns/access-control/EP-026-missing-authority-constraint.md
- patterns/access-control/EP-027-confused-deputy-authority-mismatch.md
- patterns/access-control/EP-028-delegate-authority-misuse.md
- patterns/access-control/EP-029-missing-freeze-check.md
- patterns/access-control/EP-030-token-authority-confusion.md
- patterns/access-control/EP-031-multi-sig-duplicate-signer-bypass.md
- patterns/access-control/EP-032-pda-authority-without-derivation-check.md

### Key Management (EP-068–074)
- patterns/key-management/EP-068-single-admin-key.md
- patterns/key-management/EP-069-no-admin-key-rotation.md
- patterns/key-management/EP-070-sensitive-data-in-logs.md
- patterns/key-management/EP-071-unprotected-upgrade-authority.md
- patterns/key-management/EP-072-no-emergency-pause.md
- patterns/key-management/EP-073-excessive-admin-privileges.md
- patterns/key-management/EP-074-no-timelock-on-parameter-changes.md

### Initialization (EP-075–078)
- patterns/initialization/EP-075-double-initialization.md
- patterns/initialization/EP-076-front-runnable-init-pre-funding-dos.md
- patterns/initialization/EP-077-incomplete-field-init.md
- patterns/initialization/EP-078-pool-init-without-launch-delay.md

### Gap Analysis
- patterns/gap-analysis/EP-126-multisig-acl-role-escalation.md

## Core Reference (always load)
- core/secure-patterns.md
- core/common-false-positives.md

## Solana Reference (always load)
- solana/solana-runtime-quirks.md
- solana/anchor-version-gotchas.md

## Conditional (load if detected)
- solana/token-extensions.md (if Token-2022 detected)
- protocols/governance-attacks.md (if governance detected)
- protocols/staking-attacks.md (if staking detected)
