# OC-267: Swallowed Exception Hiding Security Failure

**Category:** Error Handling & Resilience
**Severity:** HIGH
**Auditors:** ERR-01
**CWE:** CWE-390 (Detection of Error Condition Without Action)
**OWASP:** A10:2025 -- Mishandling of Exceptional Conditions

## Description

A swallowed exception occurs when a catch block intercepts an error but takes no meaningful action -- no logging, no re-throwing, no alerting, and no returning an error to the caller. The exception vanishes silently. In a security context, this means authentication failures, authorization denials, signature verification errors, and data integrity violations can occur without anyone ever knowing.

This pattern is especially dangerous when it occurs in authentication pipelines, webhook signature verification, encryption/decryption routines, or transaction validation. A Spring Security bug (spring-projects/spring-security#3304) demonstrated this: `ChangeSessionIdAuthenticationStrategy` was silently swallowing exceptions, causing the security context to become null -- effectively breaking authentication without any error indication. Amazon CodeGuru explicitly flags "catch and swallow exception" as a security anti-pattern in its detector library.

Swallowed exceptions are difficult to discover during code review because empty catch blocks are syntactically valid and produce no observable behavior. The absence of a problem is itself the problem -- security failures happen but are never detected.

## Detection

```
grep -rn "catch\s*(" --include="*.ts" --include="*.js" -A 2 | grep -B 1 "^\s*}"
grep -rn "catch\s*(\s*\w*\s*)\s*{\s*}" --include="*.ts" --include="*.js"
grep -rn "catch\s*{" --include="*.ts" --include="*.js" -A 1 | grep "^\s*}"
grep -rn "catch\s*(\s*\w*\s*)\s*{\s*//\s*}" --include="*.ts" --include="*.js"
grep -rn "catch\s*(\s*_\s*)" --include="*.ts" --include="*.js"
```

Look for: empty catch blocks, catch blocks with only a comment, catch blocks using `_` as the error parameter (indicating intentional discard), catch blocks followed immediately by closing brace.

## Vulnerable Code

```typescript
import crypto from "crypto";

async function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): Promise<boolean> {
  try {
    const expected = crypto
      .createHmac("sha256", secret)
      .update(payload)
      .digest("hex");
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expected)
    );
  } catch (e) {
    // VULNERABLE: Signature verification error is silently swallowed
    // If buffers have different lengths, timingSafeEqual throws
    // but we return false instead of logging the anomaly
    return false;
  }
}

async function processPayment(userId: string, amount: number) {
  try {
    await auditLog.record("payment_initiated", { userId, amount });
  } catch (_) {
    // VULNERABLE: Audit logging failure is swallowed
    // Payments proceed with no audit trail
  }
  await paymentService.charge(userId, amount);
}
```

## Secure Code

```typescript
import crypto from "crypto";

async function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): Promise<boolean> {
  try {
    const expected = crypto
      .createHmac("sha256", secret)
      .update(payload)
      .digest("hex");
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expected)
    );
  } catch (error) {
    // SECURE: Log the anomaly and alert -- this could indicate an attack
    logger.error("Webhook signature verification error", {
      error: error.message,
      signatureLength: signature.length,
    });
    metrics.increment("webhook.signature.error");
    return false;
  }
}

async function processPayment(userId: string, amount: number) {
  try {
    await auditLog.record("payment_initiated", { userId, amount });
  } catch (error) {
    // SECURE: Audit failure is a critical issue -- fail the operation
    logger.error("Audit log failure, aborting payment", {
      userId,
      amount,
      error: error.message,
    });
    throw new Error("Payment cannot proceed without audit trail");
  }
  await paymentService.charge(userId, amount);
}
```

## Impact

Swallowed exceptions in security-critical paths allow attacks to succeed silently. Authentication bypass attempts go undetected, webhook forgery produces no alerts, and audit trail gaps make post-incident forensics impossible. An attacker who discovers that a system swallows errors in a security check can exploit the underlying vulnerability repeatedly without triggering any monitoring or alerting.

## References

- CWE-390: Detection of Error Condition Without Action -- https://cwe.mitre.org/data/definitions/390.html
- Spring Security #3304: ChangeSessionIdAuthenticationStrategy swallowing exceptions
- Amazon CodeGuru Detector: Catch and Swallow Exception -- https://docs.aws.amazon.com/codeguru/detector-library/python/swallow-exceptions/
- OWASP A10:2025 -- Mishandling of Exceptional Conditions
- CWE-754: Improper Check for Unusual or Exceptional Conditions
