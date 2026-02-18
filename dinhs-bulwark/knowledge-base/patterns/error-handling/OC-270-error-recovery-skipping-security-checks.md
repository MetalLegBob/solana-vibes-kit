# OC-270: Error Recovery Skipping Security Checks

**Category:** Error Handling & Resilience
**Severity:** HIGH
**Auditors:** ERR-01
**CWE:** CWE-636 (Not Failing Securely), CWE-280 (Improper Handling of Insufficient Permissions or Privileges)
**OWASP:** A10:2025 -- Mishandling of Exceptional Conditions

## Description

Error recovery skipping security checks occurs when an application's retry, fallback, or recovery logic bypasses security validations that were enforced in the original code path. This is a subtle variant of fail-open: the primary path correctly implements authentication, authorization, input validation, or rate limiting, but the recovery path after an error omits one or more of these checks.

This pattern emerges when error recovery is added as an afterthought. A developer builds a secure primary flow, then adds a fallback path under time pressure to handle edge cases -- and the fallback skips the security checks because "we already validated once" or because the recovery code was copied from a simpler prototype. CVE-2022-31692 in Spring Security demonstrated this class of issue: an authorization bypass occurred through the `forward` and `include` dispatch types, where the authorization filter was skipped during error recovery dispatches.

The core danger is that error recovery paths are tested less thoroughly than the primary path. Security testing typically focuses on the happy path and the obvious failure path, not the retry-after-partial-failure path.

## Detection

```
grep -rn "retry\|fallback\|recover" --include="*.ts" --include="*.js" -A 10 | grep -v "auth\|verify\|validate\|check"
grep -rn "catch.*{" --include="*.ts" --include="*.js" -A 10 | grep "retry\|fallback\|alternate"
grep -rn "if.*error\|if.*failed" --include="*.ts" --include="*.js" -A 5 | grep -v "auth\|token\|permission"
```

Look for: catch blocks that retry operations without re-validating inputs, fallback endpoints that skip middleware, error recovery functions that call business logic directly instead of going through the middleware chain.

## Vulnerable Code

```typescript
import { Request, Response } from "express";

async function transferFunds(req: Request, res: Response) {
  const { from, to, amount } = req.body;

  // Primary path: properly validates ownership and limits
  try {
    await validateAccountOwnership(req.user.id, from);
    await validateTransferLimits(req.user.id, amount);
    await ledger.transfer(from, to, amount);
    return res.json({ success: true });
  } catch (error) {
    if (error.code === "LEDGER_TIMEOUT") {
      // VULNERABLE: Recovery path skips ownership and limit checks
      logger.warn("Ledger timeout, retrying via backup ledger");
      try {
        await backupLedger.transfer(from, to, amount);
        return res.json({ success: true });
      } catch (retryError) {
        return res.status(500).json({ error: "Transfer failed" });
      }
    }
    return res.status(400).json({ error: error.message });
  }
}
```

## Secure Code

```typescript
import { Request, Response } from "express";

async function transferFunds(req: Request, res: Response) {
  const { from, to, amount } = req.body;

  // Validate ONCE, before any attempt
  await validateAccountOwnership(req.user.id, from);
  await validateTransferLimits(req.user.id, amount);

  // Execute with retry -- security checks already passed
  const executors = [ledger, backupLedger];
  for (const executor of executors) {
    try {
      await executor.transfer(from, to, amount);
      return res.json({ success: true });
    } catch (error) {
      if (error.code === "LEDGER_TIMEOUT" && executor !== backupLedger) {
        logger.warn("Ledger timeout, falling back to backup", {
          userId: req.user.id,
          from,
          to,
          amount,
        });
        continue; // Retry with next executor; security checks already done
      }
      throw error; // Re-throw unexpected errors to global handler
    }
  }
  return res.status(503).json({ error: "All ledger services unavailable" });
}
```

## Impact

An attacker who can trigger the error condition (for example, by timing requests to coincide with ledger timeouts, or by overwhelming a service to cause timeouts) can route their requests through the recovery path, bypassing authorization checks, ownership validation, or transfer limits. This can enable unauthorized fund transfers, privilege escalation, or abuse of rate-limited operations.

## References

- CVE-2022-31692: Spring Security authorization bypass via forward/include dispatch
- CWE-636: Not Failing Securely -- https://cwe.mitre.org/data/definitions/636.html
- CWE-280: Improper Handling of Insufficient Permissions -- https://cwe.mitre.org/data/definitions/280.html
- OWASP A10:2025 -- Mishandling of Exceptional Conditions
- OWASP A01:2021 -- Broken Access Control (recovery path bypass)
