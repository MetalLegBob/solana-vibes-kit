# OC-047: Token Not Scoped to Minimum Permissions

**Category:** Authentication & Authorization
**Severity:** MEDIUM
**Auditors:** AUTH-04
**CWE:** CWE-250, CWE-269
**OWASP:** A01:2021 - Broken Access Control

## Description

Tokens (API keys, JWTs, OAuth access tokens) should be scoped to the minimum permissions required for their intended use. When tokens carry excessive permissions -- such as full admin access for a service that only needs read access, or `*` scopes on an OAuth token -- a single token compromise exposes the maximum possible attack surface.

The principle of least privilege applies directly to token scoping. Cyble's research found that many exposed ChatGPT API keys had broad permissions that enabled large-scale abuse beyond the intended application. Similarly, API keys issued with both read and write permissions when only read is needed, or service tokens with admin scopes, violate this principle.

This is especially dangerous for tokens that are stored client-side, passed through third-party services, or used in webhook configurations. Each of these exposure points is a potential theft vector, and the blast radius of a stolen token is directly proportional to its scope.

## Detection

```
# Wildcard or overly broad scopes
grep -rn "scope.*\*\|scope.*admin\|scope.*all\|permissions.*\*" --include="*.ts" --include="*.js"
# Token creation without scope restriction
grep -rn "jwt\.sign\|generateToken\|createToken" --include="*.ts" --include="*.js" | grep -v "scope\|permission\|role"
# API key with full permissions
grep -rn "apiKey\|api_key\|serviceToken" --include="*.ts" --include="*.js" | grep -i "admin\|full\|write"
# OAuth scopes requested
grep -rn "scope=\|scopes:" --include="*.ts" --include="*.js"
```

## Vulnerable Code

```typescript
// VULNERABLE: Token with all permissions regardless of use case
app.post('/api/service-tokens', authenticate, requireRole('admin'), async (req, res) => {
  const token = jwt.sign({
    serviceId: req.body.serviceName,
    permissions: ['read', 'write', 'delete', 'admin'], // Full access always
  }, secret, { expiresIn: '365d' }); // Also too long-lived
  res.json({ token });
});

// VULNERABLE: OAuth requesting maximum scopes
const authUrl = `https://provider.com/authorize?` +
  `client_id=${CLIENT_ID}&scope=user:email+repo+admin:org+delete_repo`;
  // Requests far more than needed
```

## Secure Code

```typescript
// SECURE: Scoped tokens with minimum required permissions
app.post('/api/service-tokens', authenticate, requireRole('admin'), async (req, res) => {
  const { serviceName, requiredPermissions } = req.body;

  // Validate requested permissions against allowed set for this service
  const allowedPermissions = getServicePermissions(serviceName);
  const validPermissions = requiredPermissions.filter(
    p => allowedPermissions.includes(p)
  );

  if (validPermissions.length === 0) {
    return res.status(400).json({ error: 'No valid permissions requested' });
  }

  const token = jwt.sign({
    serviceId: serviceName,
    permissions: validPermissions, // Only what is needed
  }, secret, { expiresIn: '24h' }); // Short-lived

  // Log token creation for audit
  await auditLog.record('token_created', {
    serviceId: serviceName, permissions: validPermissions,
    createdBy: req.user.id,
  });
  res.json({ token });
});

// SECURE: OAuth with minimal scopes
const authUrl = `https://provider.com/authorize?` +
  `client_id=${CLIENT_ID}&scope=user:email`; // Only what is needed
```

## Impact

When an over-permissioned token is compromised, the attacker gains access to all functionality the token allows, which may include admin operations, data deletion, and user management. Properly scoped tokens limit the blast radius of a compromise.

## References

- CWE-250: Execution with Unnecessary Privileges
- CWE-269: Improper Privilege Management
- Cyble: exposed API keys enabling large-scale abuse due to broad permissions
- https://owasp.org/Top10/A01_2021-Broken_Access_Control/
- NIST SP 800-162: Guide to Attribute Based Access Control
