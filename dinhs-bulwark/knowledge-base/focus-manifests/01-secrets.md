# Focus Manifest: Secrets & Credentials
<!-- Lists KB files for this category's auditor agents to load. -->
<!-- Agent reads this manifest to know which pattern files + core reference to include in context. -->

## Core Patterns (always load)

### Secrets & Credentials (OC-001–020)
- patterns/secrets/OC-001-hardcoded-private-key-in-source.md
- patterns/secrets/OC-002-private-key-in-env-var-without-encryption.md
- patterns/secrets/OC-003-mnemonic-seed-phrase-in-config-file.md
- patterns/secrets/OC-004-secret-key-in-client-side-bundle.md
- patterns/secrets/OC-005-api-key-with-excessive-permissions.md
- patterns/secrets/OC-006-committed-env-file-with-real-secrets.md
- patterns/secrets/OC-007-secrets-in-docker-build-args-or-layers.md
- patterns/secrets/OC-008-secrets-in-cicd-logs.md
- patterns/secrets/OC-009-no-secret-rotation-mechanism.md
- patterns/secrets/OC-010-shared-secrets-across-environments.md
- patterns/secrets/OC-011-secret-in-url-query-parameter.md
- patterns/secrets/OC-012-plaintext-password-in-database.md
- patterns/secrets/OC-013-key-material-not-zeroized-after-use.md
- patterns/secrets/OC-014-backup-export-containing-unencrypted-keys.md
- patterns/secrets/OC-015-default-credentials-in-production.md
- patterns/secrets/OC-016-secrets-in-git-history.md
- patterns/secrets/OC-017-hot-wallet-with-excessive-balance.md
- patterns/secrets/OC-018-key-derivation-from-predictable-seed.md
- patterns/secrets/OC-019-shared-signing-key-across-services.md
- patterns/secrets/OC-020-no-key-access-audit-trail.md

## Cross-Cutting Patterns (load if relevant)

### Data Security (OC-157)
- patterns/data/OC-157-database-credentials-hardcoded.md

### Data Security (OC-178)
- patterns/data/OC-178-hardcoded-encryption-key-or-iv.md

### Infrastructure (OC-207)
- patterns/infrastructure/OC-207-secrets-in-docker-build-args.md

### Infrastructure (OC-220)
- patterns/infrastructure/OC-220-hardcoded-cloud-credentials.md

## Core Reference (always load)
- core/common-false-positives.md
- core/secure-patterns.md
- core/severity-calibration.md

## AI Pitfalls (always load)
- ai-pitfalls/secrets.md
