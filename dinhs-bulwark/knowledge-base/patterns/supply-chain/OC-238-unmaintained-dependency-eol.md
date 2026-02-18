# OC-238: Unmaintained Dependency (EOL)

**Category:** Supply Chain & Dependencies
**Severity:** MEDIUM
**Auditors:** DEP-01
**CWE:** CWE-1104 (Use of Unmaintained Third-Party Components)
**OWASP:** A06:2021 -- Vulnerable and Outdated Components

## Description

An unmaintained or end-of-life (EOL) dependency is a package that is no longer receiving security patches, bug fixes, or updates from its maintainer. When vulnerabilities are discovered in these packages -- and they inevitably are -- there is no upstream fix available, leaving downstream applications permanently exposed. The npm ecosystem has a massive abandoned package problem: Socket.dev reports that packages published by deleted npm accounts (the "Non-Existent Author" pattern) are among the fastest indicators that a package has been abandoned.

The event-stream incident (2018) was rooted in this exact problem. The original maintainer, Dominic Tarr, had not actively maintained event-stream since 2012 despite the package receiving 2 million weekly downloads. When a new contributor (right9ctrl) offered to take over maintenance, Tarr transferred ownership -- and the new maintainer promptly injected the flatmap-stream backdoor. This pattern of social engineering against burnt-out maintainers of popular-but-unmaintained packages has become a recognized attack vector.

The colors.js/faker.js incident (January 2022) demonstrated a different risk: maintainer protest. Marak Squires, frustrated that corporations profited from his free work without contributing back, deliberately sabotaged both packages by pushing infinite-loop code. Colors.js had over 20 million weekly downloads and 19,000 dependent projects. The sabotage broke thousands of builds overnight. HeroDevs (March 2025) documented how EOL packages create cascading risk through transitive dependencies -- an EOL package's own dependencies become unupdatable, creating a tree of frozen, increasingly vulnerable code.

## Detection

```
# Check for deprecated packages
npm outdated --long
npm ls --all --json | jq '.dependencies | to_entries[] | select(.value.deprecated)'

# Check last publish date of dependencies
npm ls --all --json | jq -r '.dependencies | keys[]' | while read pkg; do
  echo "$pkg: $(npm view $pkg time.modified 2>/dev/null)"
done

# Check for packages with deleted authors
npx socket check
```

Look for: packages not updated in 2+ years, deprecated flags in npm metadata, packages whose GitHub repositories are archived, dependencies on packages by maintainers who have deleted their npm accounts, packages with open CVEs and no fix timeline.

## Vulnerable Code

```json
{
  "dependencies": {
    "event-stream": "^3.3.4",
    "request": "^2.88.2",
    "querystring": "^0.2.1",
    "uuid": "^3.4.0",
    "moment": "^2.29.4",
    "tslint": "^6.1.3"
  }
}
```

## Secure Code

```json
{
  "dependencies": {
    "event-stream": "replaced with highland or rxjs",
    "node-fetch": "^3.3.2",
    "qs": "^6.12.0",
    "uuid": "^9.0.1",
    "date-fns": "^3.6.0"
  },
  "devDependencies": {
    "eslint": "^8.57.0"
  }
}
```

```javascript
// Document replacement decisions
// MIGRATION: request -> node-fetch (request deprecated since 2020)
// MIGRATION: moment -> date-fns (moment in maintenance mode, no new features)
// MIGRATION: tslint -> eslint (tslint deprecated since 2019)
// MIGRATION: querystring -> qs (querystring is a legacy Node.js module)
```

## Impact

Unmaintained dependencies create two distinct risk categories. First, any vulnerability discovered in the package will never be patched upstream, leaving the application permanently exposed. This is especially dangerous for transitive dependencies where the consuming project has no direct control over the code. Second, abandoned packages are prime targets for account takeover attacks: if the original maintainer's npm account is compromised (or willingly transferred), the attacker gains the ability to publish malicious updates to all downstream consumers. For Solana projects, an unmaintained transaction-building or cryptographic library represents a critical risk because vulnerabilities may directly enable fund theft.

## References

- event-stream incident (November 2018): maintainer handoff led to cryptocurrency-stealing backdoor
- colors.js / faker.js sabotage (January 2022): maintainer protest broke 19,000+ dependent projects
- Socket.dev: "Non-Existent Author" alert for abandoned package detection
- HeroDevs: Securing Transitive Dependencies in End-of-Life Software (March 2025)
- npm deprecation of `request` package (February 2020): 48,000+ dependent projects affected
- CWE-1104: https://cwe.mitre.org/data/definitions/1104.html
