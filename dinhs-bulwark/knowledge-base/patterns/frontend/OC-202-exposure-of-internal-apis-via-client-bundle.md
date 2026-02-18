# OC-202: Exposure of Internal APIs via Client Bundle

**Category:** Frontend & Client
**Severity:** MEDIUM
**Auditors:** FE-01
**CWE:** CWE-200
**OWASP:** A01:2021 - Broken Access Control

## Description

Modern frontend build tools (webpack, Vite, esbuild, Next.js) bundle JavaScript code that is shipped to the browser. Environment variables, API endpoint URLs, internal service routes, and configuration objects included in the bundle are fully visible to anyone who inspects the deployed JavaScript. While `NEXT_PUBLIC_` prefixed variables and `VITE_` prefixed variables are intentionally client-accessible, developers frequently include backend-only configuration, internal API routes, admin endpoints, and service architecture details in client bundles.

Source maps (`*.map` files) exacerbate this problem by providing a complete, readable version of the original source code, including comments, variable names, and file paths. OC-175 covers source maps specifically; this pattern focuses on the data exposed in the minified bundles themselves.

In Solana dApp frontends, client bundles commonly expose: RPC endpoint URLs with API keys embedded, internal admin API routes, feature flag configurations, backend service topology, and environment-specific configuration that reveals staging/production infrastructure details. An attacker inspecting the bundle can discover unprotected admin endpoints, private RPC URLs, or internal API routes that were never intended to be public.

## Detection

```
# Environment variable usage in frontend code
grep -rn "process\.env\.\|import\.meta\.env\." --include="*.ts" --include="*.tsx" --include="*.js"

# NEXT_PUBLIC_ or VITE_ variables (expected -- but check what they contain)
grep -rn "NEXT_PUBLIC_\|VITE_\|REACT_APP_" --include="*.ts" --include="*.tsx" --include="*.env*"

# Hardcoded API URLs
grep -rn "https\?://.*api\.\|https\?://.*internal\.\|https\?://.*admin\.\|https\?://.*staging\." --include="*.ts" --include="*.tsx"

# Admin/internal route definitions
grep -rn "/admin\|/internal\|/debug\|/metrics\|/_private" --include="*.ts" --include="*.tsx"

# Check built bundles for exposed data
grep -rn "apiKey\|apiSecret\|internalUrl\|adminRoute" --include="*.js" --include="*.mjs"

# Source maps in production
find . -name "*.map" -path "*/public/*" -o -name "*.map" -path "*/dist/*" -o -name "*.map" -path "*/.next/*"
```

## Vulnerable Code

```typescript
// next.config.js -- leaking internal URLs to client
/** @type {import('next').NextConfig} */
module.exports = {
  env: {
    // These become embedded in the client bundle!
    DATABASE_URL: process.env.DATABASE_URL, // VULNERABLE: DB connection string
    ADMIN_API_URL: process.env.ADMIN_API_URL, // VULNERABLE: Internal admin URL
    RPC_API_KEY: process.env.RPC_API_KEY, // VULNERABLE: Should be server-only
  },
};

// Component using internal config
function AdminPanel() {
  // VULNERABLE: Internal API routes visible in client bundle
  const INTERNAL_ENDPOINTS = {
    userAdmin: 'https://internal-api.mycompany.com/admin/users',
    metricsUrl: 'https://grafana.internal.mycompany.com/d/abc123',
    featureFlags: 'https://flagsmith.internal.mycompany.com/api/v1/flags',
  };

  return <div>{/* Admin UI */}</div>;
}
```

## Secure Code

```typescript
// next.config.js -- only expose public, non-sensitive values
/** @type {import('next').NextConfig} */
module.exports = {
  // Server-only env vars are NOT listed here
  // Only NEXT_PUBLIC_ prefixed vars reach the client
  productionBrowserSourceMaps: false, // No source maps in production
};

// .env.local
// NEXT_PUBLIC_RPC_URL=https://rpc.helius.xyz  (no key -- key added server-side)
// DATABASE_URL=postgres://...                  (server-only, never reaches client)
// ADMIN_API_URL=https://internal-api...        (server-only)

// API route proxies requests, adding server-only credentials
// pages/api/rpc.ts (server-side only)
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const rpcResponse = await fetch(process.env.RPC_URL!, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.RPC_API_KEY}`, // Server-only
    },
    body: JSON.stringify(req.body),
  });
  const data = await rpcResponse.json();
  res.status(200).json(data);
}
```

## Impact

Exposed internal API URLs allow attackers to directly target backend services that were assumed to be unreachable. Exposed API keys grant unauthorized access to paid services (RPC providers, analytics, etc.). Infrastructure topology leaks help attackers map the attack surface. Feature flag configurations can reveal unreleased features or debug modes. This information accelerates targeted attacks against the backend infrastructure.

## References

- CWE-200: Exposure of Sensitive Information to an Unauthorized Actor
- Next.js Documentation: Environment Variables (server vs client)
- Vite Documentation: Env Variables and Modes
- OWASP: Information Exposure Through Client-Side Code
- Vercel: "Security Headers and Environment Variables Best Practices"
