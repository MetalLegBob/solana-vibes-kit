# OC-235: Lockfile Integrity Mismatch

**Category:** Supply Chain & Dependencies
**Severity:** HIGH
**Auditors:** DEP-01
**CWE:** CWE-354 (Improper Validation of Integrity Check Value)
**OWASP:** A08:2021 -- Software and Data Integrity Failures

## Description

Lockfile integrity mismatch occurs when the SHA-512 integrity hashes recorded in a lockfile (package-lock.json, yarn.lock, pnpm-lock.yaml) do not match the actual content of installed packages. This indicates that either the lockfile has been tampered with, the registry served different content than expected, or a man-in-the-middle attack altered packages in transit.

Lockfile poisoning is a documented attack vector where a malicious contributor submits a pull request that modifies the lockfile to point to a different (malicious) package version or registry URL while keeping package.json unchanged. Because lockfiles are auto-generated and produce large, noisy diffs, code reviewers routinely skip lockfile changes. SafeDep's December 2023 research demonstrated how an attacker can introduce a backdoor through a PR that modifies only the lockfile -- with no visible malicious code in any source file. GitHub and GitLab both collapse lockfile diffs by default, making this attack nearly invisible in standard review workflows.

The Shai-Hulud 2.0 campaign (November 2025) exploited a related vector: after compromising maintainer tokens, the malware republished packages with modified content but under the same version numbers. Projects that re-ran `npm install` instead of `npm ci` received the tampered packages even when lockfiles existed, because `npm install` can update lockfile entries silently.

## Detection

```
# Verify lockfile integrity matches installed packages
npm ci  # Fails if lockfile does not match package.json or if integrity check fails

# Detect lockfile changes in PRs
git diff HEAD~1 -- package-lock.json yarn.lock pnpm-lock.yaml

# Check for registry URL changes in lockfile (potential poisoning)
grep -n "resolved" package-lock.json | grep -v "registry.npmjs.org"

# Verify integrity hashes are present
node -e "const l=require('./package-lock.json');Object.entries(l.packages).forEach(([k,v])=>{if(v.integrity===undefined&&k!=='')console.log('Missing integrity:',k)})"
```

Look for: `npm ci` failures, lockfile entries with missing or modified integrity hashes, `resolved` URLs pointing to unexpected registries, lockfile-only changes in pull requests.

## Vulnerable Code

```json
{
  "packages": {
    "node_modules/example-lib": {
      "version": "2.1.0",
      "resolved": "https://evil-registry.example.com/example-lib/-/example-lib-2.1.0.tgz",
      "integrity": "sha512-TAMPERED_HASH_THAT_MATCHES_MALICIOUS_CONTENT..."
    }
  }
}
```

```yaml
# CI pipeline -- VULNERABLE: uses npm install which may silently update lockfile
steps:
  - run: npm install
  - run: npm run build
```

## Secure Code

```json
{
  "packages": {
    "node_modules/example-lib": {
      "version": "2.1.0",
      "resolved": "https://registry.npmjs.org/example-lib/-/example-lib-2.1.0.tgz",
      "integrity": "sha512-VALID_HASH_FROM_KNOWN_GOOD_PACKAGE..."
    }
  }
}
```

```yaml
# CI pipeline -- SECURE: npm ci enforces lockfile integrity
steps:
  - run: npm ci --ignore-scripts  # Install without running lifecycle scripts
  - run: npm run build
  - name: Verify no lockfile drift
    run: git diff --exit-code package-lock.json
```

## Impact

A successful lockfile poisoning attack allows an attacker to redirect dependency resolution to malicious packages while bypassing code review. Since the lockfile is the sole source of truth for `npm ci`, a tampered lockfile results in deterministic installation of attacker-controlled code across all environments. In cryptocurrency applications, this can lead to private key exfiltration, transaction manipulation, or backdoor installation. The attack is particularly insidious because it exploits the trust that teams place in automated lockfile management.

## References

- Lockfile Poisoning: An Attack Vector to Introduce Malware (SafeDep, December 2023)
- Shai-Hulud 2.0: lockfile integrity bypass via re-published packages (November 2025)
- npm documentation: npm ci -- https://docs.npmjs.com/cli/v10/commands/npm-ci
- CWE-354: https://cwe.mitre.org/data/definitions/354.html
- OWASP A08:2021 -- Software and Data Integrity Failures
