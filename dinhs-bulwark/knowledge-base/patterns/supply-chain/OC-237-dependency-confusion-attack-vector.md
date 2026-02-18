# OC-237: Dependency Confusion Attack Vector

**Category:** Supply Chain & Dependencies
**Severity:** HIGH
**Auditors:** DEP-01
**CWE:** CWE-427 (Uncontrolled Search Path Element)
**OWASP:** A08:2021 -- Software and Data Integrity Failures

## Description

Dependency confusion (also called namespace confusion or substitution attack) exploits the way package managers resolve dependencies when both a private registry and a public registry are configured. If an organization uses an internal package named `@company/utils` but has not registered that name on the public npm registry, an attacker can publish a package with the same name (or an unscoped variant) to npmjs.org. When the package manager resolves the dependency, it may prefer the public registry version -- especially if the public version has a higher version number.

This attack was disclosed by Alex Birsan in February 2021 and earned over $130,000 in bug bounties from Apple, PayPal, Microsoft, Shopify, Netflix, Tesla, and Yelp. Birsan demonstrated that simply publishing higher-version packages to the public npm registry was sufficient to execute code on internal build systems of major corporations. The attack exploited the default behavior of npm, pip, and other package managers that check public registries before (or instead of) private ones.

The npm ecosystem is particularly vulnerable because of its package aliasing feature. Snyk demonstrated that npm aliases (e.g., `npm install my-react@npm:react`) create entries in package.json that can be manipulated: `"my-react": "npm:react"`. This aliasing mechanism, combined with how npm resolves scoped vs unscoped packages, extends the dependency confusion attack surface beyond simple name collisions. OX Security's analysis of 54,000 repositories found dependency confusion vectors present in a significant percentage of enterprise codebases.

## Detection

```
# Check for packages not found on public registry (potential private packages)
npm ls --all --json | jq -r '.dependencies | keys[]' | while read pkg; do
  npm view "$pkg" version 2>/dev/null || echo "PRIVATE: $pkg"
done

# Check .npmrc for registry configuration
cat .npmrc
grep -rn "registry" .npmrc .yarnrc .yarnrc.yml

# Check for unscoped packages that might be private
grep -v "^@" package.json | grep -E '"[a-z]'
```

Look for: private package names not registered on public npm, missing `.npmrc` registry scoping configuration, unscoped package names used for internal libraries, `npm install` resolving to unexpected registry URLs.

## Vulnerable Code

```ini
# .npmrc -- VULNERABLE: no scope-to-registry mapping
registry=https://registry.npmjs.org/
//npm.company.com/:_authToken=${NPM_TOKEN}
```

```json
{
  "dependencies": {
    "company-auth-utils": "^2.0.0",
    "company-solana-helpers": "^1.5.0",
    "@internal/token-service": "^3.0.0"
  }
}
```

## Secure Code

```ini
# .npmrc -- SECURE: scoped packages resolve to private registry
@company:registry=https://npm.company.com/
//npm.company.com/:_authToken=${NPM_TOKEN}
registry=https://registry.npmjs.org/
```

```json
{
  "dependencies": {
    "@company/auth-utils": "^2.0.0",
    "@company/solana-helpers": "^1.5.0",
    "@company/token-service": "^3.0.0"
  }
}
```

```bash
# Register placeholder packages on public registry to prevent confusion
npm init --scope=@company -y
npm publish --access restricted  # Claim the scope on npmjs.org
```

## Impact

A successful dependency confusion attack executes attacker-controlled code in the target organization's build pipeline, developer machines, or production servers. Because the attack targets internal package names, it specifically compromises organizations with private registries -- typically enterprises with valuable assets. The preinstall/postinstall scripts of the malicious public package run with the same privileges as the build process, giving access to environment variables, deployment credentials, cloud API keys, and code signing materials. In cryptocurrency organizations, this can mean access to hot wallet keys, treasury management systems, or program upgrade authorities.

## References

- Alex Birsan: Dependency Confusion -- How I Hacked Into Apple, Microsoft, and Dozens of Other Companies (February 2021)
- Snyk: Dependency confusion extensions via npm package aliasing (November 2021)
- OX Security: Analysis of 54,000 repositories for dependency confusion vectors
- GitGuardian: Dependency Confusion Prevention Guide (August 2024)
- FOSSA: Understanding and Preventing Dependency Confusion Attacks
- CWE-427: https://cwe.mitre.org/data/definitions/427.html
