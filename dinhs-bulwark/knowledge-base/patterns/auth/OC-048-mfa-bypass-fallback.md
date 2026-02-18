# OC-048: MFA Bypass via Fallback Mechanism

**Category:** Authentication & Authorization
**Severity:** HIGH
**Auditors:** AUTH-01
**CWE:** CWE-304, CWE-287
**OWASP:** A07:2021 - Identification and Authentication Failures

## Description

Multi-factor authentication (MFA) is only as strong as its weakest fallback. Many implementations provide alternative authentication paths -- backup codes, SMS fallback, email verification, "remember this device" tokens, or help desk overrides -- that bypass the primary MFA mechanism. If these fallbacks are weaker than the primary factor, they become the de facto authentication strength.

The 2022 Uber breach demonstrated MFA fatigue as an attack vector: the attacker repeatedly triggered MFA push notifications until the contractor approved one out of frustration. Cisco Talos reported that in Q1 2024, MFA-related issues were involved in nearly half of all security incidents, with 25% caused by users accepting fraudulent push notifications and 21% caused by improper MFA implementation.

AI-driven phishing kits like BlackForce, GhostFrame, and InboxPrime AI (identified in late 2025) use real-time session proxying to capture both passwords and MFA tokens simultaneously, effectively performing man-in-the-middle attacks against the entire authentication flow. This makes phishable MFA factors (SMS, email, TOTP entered on attacker-controlled pages) increasingly vulnerable.

## Detection

```
# MFA fallback/bypass paths
grep -rn "mfa.*bypass\|mfa.*skip\|mfa.*disable\|skipMfa\|bypassMfa" --include="*.ts" --include="*.js"
# Backup code handling
grep -rn "backup.*code\|recovery.*code\|emergencyCode" --include="*.ts" --include="*.js"
# Remember device / trusted device
grep -rn "remember.*device\|trusted.*device\|skip.*mfa\|mfaRemember" --include="*.ts" --include="*.js"
# SMS fallback
grep -rn "sms.*verification\|send.*sms.*code\|smsFallback" --include="*.ts" --include="*.js"
# MFA not enforced conditionally
grep -rn "if.*mfa\|mfaEnabled\|user\.mfa" --include="*.ts" --include="*.js"
```

## Vulnerable Code

```typescript
// VULNERABLE: Multiple weak fallbacks bypass MFA
app.post('/api/login', async (req, res) => {
  const user = await authenticate(req.body.email, req.body.password);
  if (!user) return res.status(401).end();

  if (user.mfaEnabled) {
    // Fallback 1: "Remember this device" cookie never expires
    if (req.cookies.mfa_trusted) {
      return issueToken(user, res); // Stolen cookie bypasses MFA forever
    }
    // Fallback 2: Unlimited backup codes with no rate limit
    if (req.body.backupCode) {
      if (user.backupCodes.includes(req.body.backupCode)) {
        return issueToken(user, res); // No code invalidation
      }
    }
    // Fallback 3: SMS to phone number in user profile (SIM swap vulnerable)
    if (req.body.useSms) {
      await sendSmsCode(user.phone);
      return res.json({ requireSmsCode: true });
    }
    return res.json({ requireMfa: true });
  }
  issueToken(user, res);
});
```

## Secure Code

```typescript
// SECURE: Controlled fallbacks with proper security
app.post('/api/login', async (req, res) => {
  const user = await authenticate(req.body.email, req.body.password);
  if (!user) return res.status(401).end();

  if (user.mfaEnabled) {
    // Trusted device: time-limited, bound to device fingerprint
    if (req.cookies.mfa_trusted) {
      const trusted = await verifyTrustedDevice(
        req.cookies.mfa_trusted, user.id, req.headers['user-agent']
      );
      if (trusted && trusted.expiresAt > new Date()) {
        return issueToken(user, res);
      }
      res.clearCookie('mfa_trusted');
    }
    // Require primary MFA verification
    return res.json({
      requireMfa: true,
      mfaSessionToken: await createMfaSession(user.id),
    });
  }
  issueToken(user, res);
});

// Separate MFA verification endpoint with rate limiting
app.post('/api/mfa/verify', mfaRateLimiter, async (req, res) => {
  const { mfaSessionToken, totpCode, backupCode } = req.body;
  const session = await getMfaSession(mfaSessionToken);
  if (!session) return res.status(401).end();

  if (backupCode) {
    // One-time use: invalidate immediately
    const valid = await consumeBackupCode(session.userId, backupCode);
    if (!valid) return res.status(401).json({ error: 'Invalid backup code' });
    // Warn user about remaining codes
    const remaining = await countBackupCodes(session.userId);
    return issueToken(await getUser(session.userId), res, { backupCodesRemaining: remaining });
  }

  // TOTP verification
  const valid = verifyTOTP(session.userId, totpCode);
  if (!valid) return res.status(401).json({ error: 'Invalid code' });
  issueToken(await getUser(session.userId), res);
});
```

## Impact

An attacker who bypasses MFA through a weak fallback mechanism gains full account access despite the user having configured strong authentication. MFA fatigue attacks, SIM swapping, and phishing kits that proxy MFA tokens all exploit weak fallback paths.

## References

- Uber 2022 breach: MFA fatigue push notification attack
- Cisco Talos Q1 2024: MFA involved in ~50% of security incidents
- AI phishing kits (BlackForce, GhostFrame, InboxPrime AI): real-time MFA bypass
- CWE-304: Missing Critical Step in Authentication
- https://owasp.org/Top10/A07_2021-Identification_and_Authentication_Failures/
