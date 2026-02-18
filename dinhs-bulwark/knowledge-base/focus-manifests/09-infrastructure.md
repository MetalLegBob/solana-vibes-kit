# Focus Manifest: Infrastructure
<!-- Lists KB files for this category's auditor agents to load. -->
<!-- Agent reads this manifest to know which pattern files + core reference to include in context. -->

## Core Patterns (always load)

### Infrastructure (OC-206–230)
- patterns/infrastructure/OC-206-container-running-as-root.md
- patterns/infrastructure/OC-207-secrets-in-docker-build-args.md
- patterns/infrastructure/OC-208-unpinned-base-image-tag.md
- patterns/infrastructure/OC-209-exposed-debug-port-in-container.md
- patterns/infrastructure/OC-210-privileged-container-mode.md
- patterns/infrastructure/OC-211-no-resource-limits-on-container.md
- patterns/infrastructure/OC-212-sensitive-volume-mount.md
- patterns/infrastructure/OC-213-cicd-secrets-in-pipeline-logs.md
- patterns/infrastructure/OC-214-pr-based-pipeline-command-injection.md
- patterns/infrastructure/OC-215-deployment-credential-over-scoping.md
- patterns/infrastructure/OC-216-malicious-postinstall-script-in-dependency.md
- patterns/infrastructure/OC-217-build-artifact-not-verified.md
- patterns/infrastructure/OC-218-overly-permissive-iam-policy.md
- patterns/infrastructure/OC-219-public-s3-bucket-storage.md
- patterns/infrastructure/OC-220-hardcoded-cloud-credentials.md
- patterns/infrastructure/OC-221-missing-environment-variable-validation.md
- patterns/infrastructure/OC-222-debug-mode-via-feature-flag-in-production.md
- patterns/infrastructure/OC-223-tls-certificate-validation-disabled.md
- patterns/infrastructure/OC-224-node-tls-reject-unauthorized-in-production.md
- patterns/infrastructure/OC-225-insecure-tls-version.md
- patterns/infrastructure/OC-226-missing-hsts-configuration.md
- patterns/infrastructure/OC-227-internal-service-communication-without-tls.md
- patterns/infrastructure/OC-228-unauthenticated-metrics-endpoint.md
- patterns/infrastructure/OC-229-sensitive-data-in-metric-labels.md
- patterns/infrastructure/OC-230-pprof-debug-endpoint-exposed-in-production.md

## Cross-Cutting Patterns (load if relevant)

### Secrets — Docker / CI secrets overlap (OC-007, OC-008)
- patterns/secrets/OC-007-secrets-in-docker-build-args-or-layers.md
- patterns/secrets/OC-008-secrets-in-cicd-logs.md
- patterns/secrets/OC-015-default-credentials-in-production.md
- patterns/secrets/OC-016-secrets-in-git-history.md

### Supply Chain — postinstall / build overlap (OC-216)
- patterns/supply-chain/OC-240-package-with-install-hooks.md
- patterns/supply-chain/OC-241-private-registry-misconfiguration.md

## Core Reference (always load)
- core/common-false-positives.md
- core/secure-patterns.md
- core/severity-calibration.md

## AI Pitfalls (always load)
- ai-pitfalls/infrastructure.md
