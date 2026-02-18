# OC-175: Source Maps Served in Production

**Category:** Data Security
**Severity:** MEDIUM
**Auditors:** DATA-04
**CWE:** CWE-540 (Inclusion of Sensitive Information in Source Code)
**OWASP:** A05:2021 – Security Misconfiguration

## Description

Source maps (`.map` files) are generated during the build process to map minified/transpiled production code back to the original source. When these files are served alongside production bundles, they expose the complete original source code to anyone who requests them, including proprietary business logic, comments containing security notes, internal API endpoints, and authentication flows.

Modern build tools (webpack, Vite, esbuild, Next.js) generate source maps by default. The `//# sourceMappingURL=` comment at the end of minified bundles points browsers to the map file. If the `.map` files are deployed to production alongside the bundles, any developer who opens DevTools can reconstruct the full original source, and automated tools can bulk-download all source maps from a site.

This is particularly dangerous for applications with client-side security logic, blockchain interaction code (revealing signing flows and wallet handling), or applications that embed configuration data. Internal API URLs, WebSocket endpoints, and administrative routes discovered through source maps become targets for further attacks. TypeScript source maps are especially verbose, often including type information and interfaces that describe the full API contract.

## Detection

```
grep -rn "sourceMappingURL\|sourceMap\|source-map" --include="*.ts" --include="*.js" --include="*.json"
grep -rn "devtool.*source-map\|productionSourceMap\|sourceMap.*true" --include="*.ts" --include="*.js" --include="*.json"
grep -rn "\.map$\|\.js\.map\|\.css\.map" --include="*.ts" --include="*.js" --include="*.json"
```

Look for: `devtool: 'source-map'` in webpack production config, `productionSourceMap: true` in Vue CLI config, `.map` files in build output directories, `sourceMappingURL` comments in deployed JS files, nginx/CDN configuration serving `.map` files.

## Vulnerable Code

```typescript
// webpack.config.js — VULNERABLE: Source maps in production
module.exports = {
  mode: "production",
  devtool: "source-map", // Generates full .map files in production build
  // ...
};

// next.config.js — VULNERABLE: Source maps enabled
module.exports = {
  productionBrowserSourceMaps: true, // Exposes full source
};

// vite.config.ts — VULNERABLE: Source maps in production
export default defineConfig({
  build: {
    sourcemap: true, // .map files in dist/
  },
});

// The deployed bundle contains:
// //# sourceMappingURL=main.abc123.js.map
// Attacker downloads the .map file and reconstructs all source code
```

## Secure Code

```typescript
// webpack.config.js — SECURE: No source maps in production
module.exports = {
  mode: "production",
  devtool: false, // No source maps generated
  // Or use 'hidden-source-map' and upload maps to error tracking only
};

// next.config.js — SECURE: Source maps disabled
module.exports = {
  productionBrowserSourceMaps: false, // Default — keep it
};

// vite.config.ts — SECURE: Hidden source maps for error tracking
export default defineConfig({
  build: {
    sourcemap: "hidden", // Generates maps but no URL reference in bundle
  },
});

// Upload hidden source maps to Sentry/Datadog for error debugging:
// sentry-cli sourcemaps upload --release=1.0.0 dist/
// Then delete .map files from deployment artifact

// nginx.conf — SECURE: Block .map file access
// location ~* \.map$ {
//   deny all;
//   return 404;
// }
```

## Impact

Exposed source maps reveal the complete original source code including business logic, authentication flows, internal API endpoints, and developer comments. This enables targeted attacks against known code patterns, discovery of hidden admin routes and API endpoints, intellectual property theft, and identification of specific library versions with known vulnerabilities.

## References

- CWE-540: Inclusion of Sensitive Information in Source Code — https://cwe.mitre.org/data/definitions/540.html
- OWASP A05:2021 – Security Misconfiguration
- webpack devtool configuration: https://webpack.js.org/configuration/devtool/
- Sentry source map upload guide: https://docs.sentry.io/platforms/javascript/sourcemaps/
