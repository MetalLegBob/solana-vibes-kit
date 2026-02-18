# AI-Generated Code Pitfalls: Supply Chain & Dependencies
<!-- Domain: supply-chain -->
<!-- Relevant auditors: DEP-01 -->

AI code generators are particularly problematic for dependency management because they recommend packages based on training data popularity rather than current security status. LLMs have no awareness of whether a package has been compromised, deprecated, or abandoned since their training cutoff. They optimize for "code that works" by suggesting the most commonly referenced packages and versions from their training corpus -- which may include outdated tutorials, blog posts with vulnerable examples, and repositories that have since been compromised.

The core problem: AI generators treat `npm install <package>` as a solved problem. They do not consider the security implications of adding a dependency, they do not check whether the package is maintained, they do not suggest lockfile management, and they do not warn about install hooks. A developer following AI-generated setup instructions will often end up with an insecure dependency configuration that passes all functional tests.

---

## AIP-119: Recommending Deprecated or Unmaintained Packages

**Auditors:** DEP-01
**Related patterns:** OC-238

AI generators frequently recommend packages that were popular when the training data was collected but have since been deprecated or abandoned. The canonical example is `request` (deprecated since February 2020 with 48,000+ dependents) which AI models still suggest as the go-to HTTP client. Similarly, `moment` (maintenance mode), `tslint` (deprecated in favor of eslint), and `querystring` (legacy Node.js module) appear regularly in AI output.

```json
// AI-GENERATED (DANGEROUS):
{
  "dependencies": {
    "request": "^2.88.2",
    "moment": "^2.29.4",
    "tslint": "^6.1.3",
    "querystring": "^0.2.1"
  }
}
```

```json
// SECURE (corrected):
{
  "dependencies": {
    "axios": "^1.7.4",
    "date-fns": "^3.6.0",
    "qs": "^6.12.0"
  },
  "devDependencies": {
    "eslint": "^8.57.0"
  }
}
```

---

## AIP-120: Suggesting Unpinned or Wildcard Dependency Versions

**Auditors:** DEP-01
**Related patterns:** OC-242

When asked to create a package.json, AI models frequently use `"*"`, `"latest"`, or bare version numbers without range prefixes. This is because training data includes many tutorial-style package.json files that use broad ranges for simplicity. The AI does not understand that `"*"` accepts any version -- including malicious ones published by attackers.

```json
// AI-GENERATED (DANGEROUS):
{
  "dependencies": {
    "@solana/web3.js": "latest",
    "express": "*",
    "lodash": "4.17.21",
    "axios": ">=1.0.0"
  }
}
```

```json
// SECURE (corrected):
{
  "dependencies": {
    "@solana/web3.js": "^1.95.8",
    "express": "^4.21.0",
    "lodash": "^4.17.21",
    "axios": "^1.7.4"
  }
}
```

---

## AIP-121: Omitting Lockfile from Generated Project Scaffolding

**Auditors:** DEP-01
**Related patterns:** OC-234

AI-generated project templates and `.gitignore` files frequently include `package-lock.json` or `yarn.lock` in the ignore list. This pattern comes from training data where many open-source libraries (correctly) ignore lockfiles because they are published packages, not applications. The AI applies the library convention to application code, removing the critical integrity artifact that prevents time-of-install attacks.

```gitignore
# AI-GENERATED (DANGEROUS):
node_modules/
package-lock.json
yarn.lock
.env
dist/
```

```gitignore
# SECURE (corrected):
node_modules/
.env
dist/
# NOTE: lockfiles MUST be committed for applications
# Only libraries should exclude lockfiles
```

---

## AIP-122: Using `npm install` Instead of `npm ci` in CI/CD Scripts

**Auditors:** DEP-01
**Related patterns:** OC-234, OC-235

AI-generated CI/CD configurations, Dockerfiles, and deployment scripts consistently use `npm install` instead of `npm ci`. The model generates `npm install` because it is the more common command in training data (tutorials, Stack Overflow answers, blog posts). However, `npm install` can silently modify the lockfile, ignores integrity mismatches, and resolves versions dynamically -- all of which defeat the purpose of lockfile-based reproducibility.

```yaml
# AI-GENERATED (DANGEROUS):
steps:
  - run: npm install
  - run: npm run build
  - run: npm test
```

```yaml
# SECURE (corrected):
steps:
  - run: npm ci --ignore-scripts
  - run: npm rebuild  # Only rebuild native modules
  - run: npm run build
  - run: npm test
```

---

## AIP-123: Generating CDN Script Tags without SRI

**Auditors:** DEP-01, FE-02
**Related patterns:** OC-244

When asked to include a library via CDN in an HTML file, AI generators produce `<script>` tags with only the `src` attribute. They almost never include `integrity` or `crossorigin` attributes. This is because the majority of HTML examples in training data predate widespread SRI adoption, and generating a valid SHA-384 hash requires actually downloading and hashing the file -- something a language model cannot do.

```html
<!-- AI-GENERATED (DANGEROUS): -->
<script src="https://cdn.jsdelivr.net/npm/[email protected]/lodash.min.js"></script>
<script src="https://unpkg.com/@solana/web3.js@latest/lib/index.iife.min.js"></script>
```

```html
<!-- SECURE (corrected): -->
<script
  src="https://cdn.jsdelivr.net/npm/[email protected]/lodash.min.js"
  integrity="sha384-OYoay0VFnzSJZo8QmLwnYfPXEBhSjGaxRoaR3WKdnAEibXOHOFXgjBhJfZT76FI"
  crossorigin="anonymous"></script>
<!-- Better: self-host critical dependencies -->
<script src="/vendor/solana-web3.min.js"></script>
```

---

## AIP-124: Suggesting Packages with Known Malicious History

**Auditors:** DEP-01
**Related patterns:** OC-231, OC-233

AI models have no real-time awareness of npm advisories. They will recommend packages that have been compromised, had malicious versions published, or been flagged by security researchers. The model may suggest `event-stream` (compromised in 2018), `ua-parser-js` (hijacked in 2021), or package names that are known typosquats. Since the model's knowledge is frozen at training time, any compromise that occurred after training is invisible.

```javascript
// AI-GENERATED (DANGEROUS):
const EventStream = require("event-stream"); // Compromised package
const UAParser = require("ua-parser-js");     // Previously hijacked

// The AI may also suggest typosquats by slightly misspelling popular packages
const axios = require("axois"); // Typosquat
```

```javascript
// SECURE (corrected):
// Always verify package names against the canonical npm page
const { Transform } = require("stream");     // Use Node.js built-in streams
const UAParser = require("ua-parser-js");     // v0.7.39+ (post-fix)

// Verify before installing:
// npm info <package-name> -- check author, downloads, repository
```

---

## AIP-125: No Audit Step in Generated CI/CD Pipelines

**Auditors:** DEP-01
**Related patterns:** OC-243

AI-generated CI/CD workflows (GitHub Actions, GitLab CI, CircleCI) consistently omit dependency auditing. The generated pipeline includes checkout, install, build, and test steps -- but never `npm audit` or an equivalent security check. This is because most CI/CD examples in training data focus on build correctness rather than supply chain security.

```yaml
# AI-GENERATED (DANGEROUS):
name: CI
on: [push, pull_request]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm install
      - run: npm run build
      - run: npm test
```

```yaml
# SECURE (corrected):
name: CI
on: [push, pull_request]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci --ignore-scripts
      - run: npx audit-ci --critical
      - run: npm rebuild
      - run: npm run build
      - run: npm test
```

---

## AIP-126: No .npmrc Scoping for Private Registries

**Auditors:** DEP-01
**Related patterns:** OC-237, OC-241

When AI generates project setup for organizations with private npm registries, it creates a flat `.npmrc` with the private registry URL but without scope-to-registry mapping. This leaves the project vulnerable to dependency confusion attacks because npm will still check the public registry for unscoped packages. The AI has no concept of the dual-registry resolution order that enables this attack.

```ini
# AI-GENERATED (DANGEROUS):
registry=https://npm.company.com/
//npm.company.com/:_authToken=${NPM_TOKEN}
```

```ini
# SECURE (corrected):
# Scope-specific mapping prevents dependency confusion
@company:registry=https://npm.company.com/
//npm.company.com/:_authToken=${NPM_TOKEN}
# Public packages still resolve from the default public registry
registry=https://registry.npmjs.org/
```

---

## AIP-127: Running Postinstall Scripts without Caution

**Auditors:** DEP-01
**Related patterns:** OC-240

AI-generated setup instructions and Dockerfiles never include `--ignore-scripts`. When asked how to install a package, the AI outputs `npm install <package>` -- which runs all lifecycle scripts (preinstall, install, postinstall) with the developer's full system privileges. The model does not warn about the security implications of running arbitrary code during installation because training data treats `npm install` as a safe, routine operation.

```bash
# AI-GENERATED (DANGEROUS):
npm install some-new-package
# This runs any postinstall script in the package with YOUR privileges

# AI also generates Dockerfiles that run install with hooks
FROM node:20
COPY package*.json ./
RUN npm install  # Runs all lifecycle scripts as root in the container
```

```bash
# SECURE (corrected):
# First, inspect the package for install hooks
npm view some-new-package scripts
# Install without running scripts
npm install some-new-package --ignore-scripts
# If native modules need building, rebuild only those
npm rebuild some-native-module

# Dockerfile with --ignore-scripts
FROM node:20
COPY package*.json ./
RUN npm ci --ignore-scripts
RUN npm rebuild  # Rebuild only native modules
```

---

## AIP-128: Suggesting `node_modules` Vendoring without Security Justification

**Auditors:** DEP-01
**Related patterns:** OC-245

When asked about offline builds or airgapped environments, AI models may suggest committing `node_modules/` to version control or manually copying dependency directories. This creates a frozen snapshot of dependencies that will never receive security updates and is invisible to all dependency scanning tools. The model treats it as a practical solution without considering the permanent security blind spot it creates.

```bash
# AI-GENERATED (DANGEROUS):
# "For offline builds, just commit node_modules:"
git add node_modules/
git commit -m "Vendor dependencies for offline build"
```

```bash
# SECURE (corrected):
# Use npm pack or a private registry mirror for offline builds
npm ci --ignore-scripts
npm pack --pack-destination ./vendor/  # Create tarballs

# Or use verdaccio as a local registry mirror
# npm config set registry http://localhost:4873/
# Then: npm ci will use the local mirror

# For truly airgapped: use npm-offline-mirror with integrity checks
```
