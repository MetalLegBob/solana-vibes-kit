# Focus Manifest: Supply Chain & Dependencies
<!-- Lists KB files for this category's auditor agents to load. -->
<!-- Agent reads this manifest to know which pattern files + core reference to include in context. -->

## Core Patterns (always load)

### Supply Chain & Dependencies (OC-231–245)
- patterns/supply-chain/OC-231-critical-cve-in-dependency.md
- patterns/supply-chain/OC-232-high-cve-in-dependency.md
- patterns/supply-chain/OC-233-dependency-with-known-rce.md
- patterns/supply-chain/OC-234-lockfile-not-committed.md
- patterns/supply-chain/OC-235-lockfile-integrity-mismatch.md
- patterns/supply-chain/OC-236-typosquatting-package.md
- patterns/supply-chain/OC-237-dependency-confusion-attack-vector.md
- patterns/supply-chain/OC-238-unmaintained-dependency-eol.md
- patterns/supply-chain/OC-239-excessive-transitive-dependencies.md
- patterns/supply-chain/OC-240-package-with-install-hooks.md
- patterns/supply-chain/OC-241-private-registry-misconfiguration.md
- patterns/supply-chain/OC-242-pinned-to-vulnerable-version-range.md
- patterns/supply-chain/OC-243-missing-npm-yarn-audit-in-ci.md
- patterns/supply-chain/OC-244-import-from-cdn-without-integrity-hash.md
- patterns/supply-chain/OC-245-bundled-dependency-with-modifications.md

## Cross-Cutting Patterns (load if relevant)

### Infrastructure — malicious postinstall / build pipeline overlap (OC-216)
- patterns/infrastructure/OC-216-malicious-postinstall-script-in-dependency.md
- patterns/infrastructure/OC-214-pr-based-pipeline-command-injection.md
- patterns/infrastructure/OC-217-build-artifact-not-verified.md

### Frontend — CDN / script integrity overlap (OC-244)
- patterns/frontend/OC-191-third-party-script-without-sri.md
- patterns/frontend/OC-193-cdn-compromise-supply-chain-via-scripts.md

### Injection — RCE via dependency overlap (OC-233)
- patterns/injection/OC-078-dynamic-require-import-with-user-input.md

## Core Reference (always load)
- core/common-false-positives.md
- core/secure-patterns.md
- core/severity-calibration.md

## AI Pitfalls (always load)
- ai-pitfalls/supply-chain.md
