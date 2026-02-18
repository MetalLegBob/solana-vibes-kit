# Focus Manifest: Injection
<!-- Lists KB files for this category's auditor agents to load. -->
<!-- Agent reads this manifest to know which pattern files + core reference to include in context. -->

## Core Patterns (always load)

### Injection (OC-049–080)
- patterns/injection/OC-049-sql-injection-via-string-interpolation.md
- patterns/injection/OC-050-sql-injection-via-orm-raw-query.md
- patterns/injection/OC-051-nosql-injection-via-operator.md
- patterns/injection/OC-052-nosql-injection-via-where-clause.md
- patterns/injection/OC-053-second-order-sql-injection.md
- patterns/injection/OC-054-blind-sql-injection-in-search-filter.md
- patterns/injection/OC-055-os-command-injection-via-exec-spawn.md
- patterns/injection/OC-056-code-injection-via-eval.md
- patterns/injection/OC-057-ssrf-to-cloud-metadata.md
- patterns/injection/OC-058-ssrf-to-internal-services.md
- patterns/injection/OC-059-ssrf-via-redirect-following.md
- patterns/injection/OC-060-dns-rebinding-attack.md
- patterns/injection/OC-061-ssrf-via-url-parser-differential.md
- patterns/injection/OC-062-path-traversal-in-file-read.md
- patterns/injection/OC-063-path-traversal-in-file-write.md
- patterns/injection/OC-064-filename-injection-in-upload.md
- patterns/injection/OC-065-symlink-following-in-file-operations.md
- patterns/injection/OC-066-prototype-pollution-via-deep-merge.md
- patterns/injection/OC-067-prototype-pollution-to-rce-via-gadget-chain.md
- patterns/injection/OC-068-yaml-deserialization-rce.md
- patterns/injection/OC-069-pickle-marshal-deserialization-rce.md
- patterns/injection/OC-070-xml-external-entity-injection.md
- patterns/injection/OC-071-json-prototype-pollution.md
- patterns/injection/OC-072-server-side-template-injection.md
- patterns/injection/OC-073-template-sandbox-escape.md
- patterns/injection/OC-074-client-side-template-injection.md
- patterns/injection/OC-075-ldap-injection.md
- patterns/injection/OC-076-header-injection-crlf.md
- patterns/injection/OC-077-log-injection.md
- patterns/injection/OC-078-dynamic-require-import-with-user-input.md
- patterns/injection/OC-079-regex-injection-redos.md
- patterns/injection/OC-080-graphql-injection-via-batching.md

## Cross-Cutting Patterns (load if relevant)

### Infrastructure — SSRF overlap (OC-057)
- patterns/infrastructure/OC-218-overly-permissive-iam-policy.md
- patterns/infrastructure/OC-219-public-s3-bucket-storage.md

### API & Network — GraphQL injection overlap (OC-080)
- patterns/api-network/OC-136-graphql-introspection-in-production.md
- patterns/api-network/OC-137-graphql-query-depth-unlimited.md
- patterns/api-network/OC-138-graphql-batching-attack.md

### Data Security — log injection overlap (OC-077)
- patterns/data/OC-172-sensitive-data-in-application-logs.md
- patterns/data/OC-176-log-injection-enabling-log-forging.md

## Core Reference (always load)
- core/common-false-positives.md
- core/secure-patterns.md
- core/severity-calibration.md

## AI Pitfalls (always load)
- ai-pitfalls/injection.md
