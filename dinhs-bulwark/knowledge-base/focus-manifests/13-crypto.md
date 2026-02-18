# Focus Manifest: Cryptographic Operations
<!-- Lists KB files for this category's auditor agents to load. -->
<!-- Agent reads this manifest to know which pattern files + core reference to include in context. -->

## Core Patterns (always load)

### Cryptographic Operations (OC-286–298)
- patterns/crypto/OC-286-math-random-for-security-purposes.md
- patterns/crypto/OC-287-predictable-nonce-salt.md
- patterns/crypto/OC-288-uuid-v1-for-security-identifiers.md
- patterns/crypto/OC-289-nonce-reuse-in-encryption.md
- patterns/crypto/OC-290-weak-random-seed.md
- patterns/crypto/OC-291-non-constant-time-comparison.md
- patterns/crypto/OC-292-aes-in-ecb-mode.md
- patterns/crypto/OC-293-short-encryption-key.md
- patterns/crypto/OC-294-pbkdf2-with-insufficient-iterations.md
- patterns/crypto/OC-295-md5-sha1-for-password-hashing.md
- patterns/crypto/OC-296-custom-crypto-implementation.md
- patterns/crypto/OC-297-encryption-without-authentication-no-aead.md
- patterns/crypto/OC-298-key-derivation-from-low-entropy-input.md

## Cross-Cutting Patterns (load if relevant)

### Secrets — key derivation from predictable seed overlap (OC-018)
- patterns/secrets/OC-018-key-derivation-from-predictable-seed.md
- patterns/secrets/OC-013-key-material-not-zeroized-after-use.md

### Authentication — weak hashing / constant-time comparison overlap (OC-025, OC-291)
- patterns/auth/OC-025-weak-password-hashing.md
- patterns/auth/OC-026-bcrypt-with-insufficient-rounds.md

### Data Security — weak encryption / IV reuse overlap
- patterns/data/OC-177-weak-encryption-algorithm.md
- patterns/data/OC-178-hardcoded-encryption-key-or-iv.md
- patterns/data/OC-179-iv-nonce-reuse-in-encryption.md

### Frontend — client-side crypto overlap (OC-201)
- patterns/frontend/OC-201-client-side-crypto-with-math-random.md

## Core Reference (always load)
- core/common-false-positives.md
- core/secure-patterns.md
- core/severity-calibration.md

## AI Pitfalls (always load)
- ai-pitfalls/crypto.md
