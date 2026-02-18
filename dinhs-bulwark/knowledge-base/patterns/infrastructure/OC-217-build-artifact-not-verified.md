# OC-217: Build Artifact Not Verified

**Category:** Infrastructure
**Severity:** MEDIUM
**Auditors:** INFRA-02
**CWE:** CWE-345 (Insufficient Verification of Data Authenticity)
**OWASP:** A08:2021 - Software and Data Integrity Failures

## Description

Build artifacts (Docker images, binaries, packages) that are not cryptographically signed or verified before deployment can be tampered with at any point in the build-to-deploy pipeline. Without verification, an attacker who compromises a build cache, artifact store, or network path can substitute a malicious artifact for the legitimate one.

The Ultralytics attack (December 2024) demonstrated the importance of artifact verification: because PyPI had implemented attestations and Trusted Publishing, security teams could audit exactly which artifacts were legitimate and which were malicious. Without such verification, distinguishing compromised artifacts from legitimate ones would have been nearly impossible.

Modern supply chain integrity frameworks like SLSA (Supply chain Levels for Software Artifacts) define increasingly strict levels of artifact provenance and verification. At minimum, build artifacts should have checksums verified at deployment time. Ideally, artifacts should carry cryptographic signatures from the build system (e.g., cosign for container images, npm provenance for packages) that are verified before deployment.

## Detection

```
# Search for image pull without digest verification
grep -rn "image:.*:latest\|image:.*:[^@]*$" **/*.yml **/*.yaml | grep -v "sha256:"

# Search for deployment scripts without checksum verification
grep -rn "docker pull\|docker run" **/*.sh **/*.yml | grep -v "sha256:\|--verify"

# Search for curl/wget downloads without verification
grep -rn "curl.*-o\|wget.*-O" **/*.sh **/*.yml | grep -v "sha256sum\|checksum\|gpg\|verify"

# Search for missing image signing in CI/CD
grep -rL "cosign\|notation\|sigstore" **/.github/workflows/*.yml

# Search for npm publish without provenance
grep -rn "npm publish" **/*.yml | grep -v "provenance"
```

## Vulnerable Code

```yaml
# .github/workflows/deploy.yml
name: Deploy
on: push
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Build and push
        run: |
          docker build -t myregistry/app:${{ github.sha }} .
          docker push myregistry/app:${{ github.sha }}
          # No signing, no attestation

      - name: Deploy
        run: |
          # Pulls image without digest verification
          # A compromised registry can serve a different image
          kubectl set image deployment/app \
            app=myregistry/app:${{ github.sha }}
```

## Secure Code

```yaml
# .github/workflows/deploy.yml
name: Deploy
on: push
jobs:
  build:
    runs-on: ubuntu-latest
    outputs:
      digest: ${{ steps.build.outputs.digest }}
    steps:
      - name: Build and push with attestation
        id: build
        run: |
          # Build and capture digest
          DIGEST=$(docker build -t myregistry/app:${{ github.sha }} . \
            --output type=image,push=true \
            --metadata-file metadata.json | jq -r '.containerimage.digest')
          echo "digest=${DIGEST}" >> "$GITHUB_OUTPUT"

      - name: Sign with cosign
        run: |
          cosign sign --yes myregistry/app@${DIGEST}
        env:
          DIGEST: ${{ steps.build.outputs.digest }}

  deploy:
    needs: build
    runs-on: ubuntu-latest
    steps:
      - name: Verify and deploy
        run: |
          # Verify signature before deployment
          cosign verify myregistry/app@${DIGEST} \
            --certificate-identity-regexp=".*" \
            --certificate-oidc-issuer="https://token.actions.githubusercontent.com"

          # Deploy using digest, not tag
          kubectl set image deployment/app \
            app=myregistry/app@${DIGEST}
        env:
          DIGEST: ${{ needs.build.outputs.digest }}
```

## Impact

An attacker who tampers with unverified build artifacts can:
- Deploy malicious code to production by substituting build artifacts
- Inject backdoors that persist across deployments
- Compromise all users of the deployed application
- Exfiltrate data through modified application code
- Persist access through seemingly legitimate deployments
- Undermine the entire CI/CD trust chain

## References

- Ultralytics supply chain attack (December 2024) - PyPI attestations aided forensics
- SLSA framework: https://slsa.dev/
- Sigstore / cosign: https://www.sigstore.dev/
- npm provenance: https://docs.npmjs.com/generating-provenance-statements
- CWE-345: https://cwe.mitre.org/data/definitions/345.html
- OWASP Software Supply Chain Security: https://owasp.org/www-project-software-supply-chain-security/
