# OC-303: Feature Flag Enabling Admin Functionality

**Category:** Business Logic
**Severity:** HIGH
**Auditors:** LOGIC-01
**CWE:** CWE-269 (Improper Privilege Management)
**OWASP:** A01:2021 – Broken Access Control

## Description

This vulnerability occurs when feature flags, debug toggles, or configuration parameters can be manipulated by end users to enable administrative or privileged functionality. Feature flags are commonly used in development to gate unreleased features, but when these flags are checked client-side, stored in user-accessible locations (cookies, localStorage, query parameters), or accept user-provided overrides, attackers can enable restricted features.

Common manifestations include: query parameters like `?admin=true` or `?debug=1` that enable admin panels, feature flag systems that evaluate client-supplied user properties without server-side verification, and A/B testing frameworks where the variant assignment can be manipulated via cookies. This is distinct from a simple authorization bypass because it relies on the application's own feature management system as the escalation vector.

In DeFi and crypto applications, feature flags often gate experimental trading features, elevated withdrawal limits, reduced fee tiers, or access to new liquidity pools. If these flags can be toggled by users, attackers gain access to functionality that may not have completed security review or that provides financial advantages.

## Detection

```
grep -rn "featureFlag\|feature_flag\|isEnabled\|isFeatureEnabled" --include="*.ts" --include="*.js"
grep -rn "req\.query\.admin\|req\.query\.debug" --include="*.ts" --include="*.js"
grep -rn "getFeatureFlag\|unleash\|launchDarkly\|flagsmith" --include="*.ts" --include="*.js"
grep -rn "process\.env\.ENABLE_\|process\.env\.FEATURE_" --include="*.ts" --include="*.js"
grep -rn "localStorage.*feature\|cookie.*feature\|searchParams.*feature" --include="*.ts" --include="*.js"
```

Look for: feature flag checks that read from request parameters, cookies, or client-accessible storage; admin functionality gated by a simple boolean check; absence of server-side role verification alongside feature flag evaluation; feature flags that enable security-sensitive operations.

## Vulnerable Code

```typescript
// VULNERABLE: Admin panel gated by query parameter and cookie
app.get("/api/admin/users", async (req, res) => {
  const isAdmin = req.query.admin === "true"
    || req.cookies.feature_admin === "enabled";

  if (!isAdmin) {
    return res.status(403).json({ error: "Access denied" });
  }

  // Attacker just adds ?admin=true to the URL
  const users = await db.users.findAll({
    select: ["id", "email", "role", "balance", "walletAddress"],
  });
  return res.json({ users });
});

// Also vulnerable: feature flag from client-controlled source
app.post("/api/withdraw", async (req, res) => {
  const highLimitEnabled = req.headers["x-feature-high-limit"] === "true";
  const maxWithdrawal = highLimitEnabled ? 1_000_000 : 10_000;

  // Attacker sets custom header to bypass withdrawal limit
  const { amount } = req.body;
  if (amount > maxWithdrawal) {
    return res.status(400).json({ error: "Exceeds limit" });
  }
  // ... process withdrawal
});
```

## Secure Code

```typescript
// SECURE: Feature flags evaluated server-side with proper authorization
import { featureFlagService } from "./services/feature-flags";

app.get("/api/admin/users", async (req, res) => {
  // Authorization check based on authenticated user role — not a flag
  if (req.user.role !== "admin") {
    return res.status(403).json({ error: "Access denied" });
  }

  const users = await db.users.findAll({
    select: ["id", "email", "role"],
  });
  return res.json({ users });
});

app.post("/api/withdraw", async (req, res) => {
  // Feature flag evaluated server-side using user ID, not client input
  const highLimitEnabled = await featureFlagService.isEnabled(
    "high-withdrawal-limit",
    { userId: req.user.id, tier: req.user.accountTier }
  );
  const maxWithdrawal = highLimitEnabled ? 1_000_000 : 10_000;

  const { amount } = req.body;
  if (amount <= 0 || amount > maxWithdrawal) {
    return res.status(400).json({ error: "Invalid amount" });
  }

  // Feature flags should NEVER be the sole authorization mechanism
  // Always combine with proper RBAC
  await withdrawalService.process(req.user.id, amount);
  return res.json({ success: true });
});
```

## Impact

Attackers who manipulate feature flags can gain access to admin panels exposing sensitive user data, enable elevated privileges like higher withdrawal limits or reduced fees, access beta features that lack full security hardening, or bypass rate limits and restrictions intended for specific user tiers. In the worst case, feature flag manipulation provides a complete authorization bypass for administrative functionality.

## References

- CWE-269: Improper Privilege Management — https://cwe.mitre.org/data/definitions/269.html
- OWASP A01:2021 – Broken Access Control — https://owasp.org/Top10/A01_2021-Broken_Access_Control/
- PortSwigger: Business logic vulnerabilities — Making flawed assumptions about user behavior — https://portswigger.net/web-security/logic-flaws/examples
- OWASP Testing Guide: WSTG-BUSL-02 – Test Ability to Forge Requests
