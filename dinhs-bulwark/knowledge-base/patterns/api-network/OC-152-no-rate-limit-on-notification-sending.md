# OC-152: No Rate Limit on Notification Sending

**Category:** API & Network
**Severity:** MEDIUM
**Auditors:** API-05
**CWE:** CWE-770
**OWASP:** API4:2023 - Unrestricted Resource Consumption

## Description

Missing rate limits on notification-sending endpoints allow attackers to trigger mass email, SMS, or push notification delivery. This can be used to spam victims (notification bombing), exhaust the application's email/SMS credits, get the application's email domain blacklisted, or cause denial-of-service against the notification infrastructure.

Any endpoint that triggers a notification is a potential target: "forgot password," "verify email," "resend verification," "invite friend," "share via email," "send receipt," or "contact support." If these endpoints lack rate limiting, an attacker can trigger hundreds or thousands of notifications per minute. For email, this can quickly exhaust SendGrid/Mailgun quotas or trigger spam blacklisting. For SMS, this directly costs money per message (see OC-150).

Notification bombing is also used as a harassment tool: an attacker enters a victim's email or phone number in the "forgot password" form and triggers it in a loop, flooding the victim with hundreds of password reset messages. This is especially effective because each message comes from a legitimate service.

## Detection

```
# Notification-sending endpoints
grep -rn "sendMail\|sendSms\|sendPush\|sendNotif\|transporter\.send" --include="*.ts" --include="*.js"
# Password reset and verification endpoints
grep -rn "forgot.password\|reset.password\|resend.*verif\|send.*code\|send.*link" --include="*.ts" --include="*.js"
# Missing rate limiting on these endpoints
grep -rn "\/forgot\|\/reset\|\/resend\|\/verify\|\/invite\|\/share\|\/contact" --include="*.ts" --include="*.js" | grep -v "rateLimit\|throttle\|limit"
# Check for per-recipient tracking
grep -rn "notif.*count\|email.*count\|sms.*count\|sent.*log" --include="*.ts" --include="*.js"
```

## Vulnerable Code

```typescript
import express from 'express';

// VULNERABLE: No rate limiting on password reset
app.post('/api/forgot-password', async (req, res) => {
  const { email } = req.body;
  const user = await User.findByEmail(email);
  if (user) {
    const token = crypto.randomBytes(32).toString('hex');
    await saveResetToken(user.id, token);
    // Attacker triggers this 1000 times with victim's email
    await sendEmail(email, 'Password Reset', `Reset: https://myapp.com/reset/${token}`);
  }
  res.json({ message: 'If an account exists, a reset email has been sent' });
});

// VULNERABLE: No rate limiting on email verification resend
app.post('/api/resend-verification', authenticate, async (req, res) => {
  const code = generateVerificationCode();
  // No limit on how many times verification can be resent
  await sendEmail(req.user.email, 'Verify Your Email', `Code: ${code}`);
  res.json({ sent: true });
});

// VULNERABLE: Share feature with no limits
app.post('/api/share', authenticate, async (req, res) => {
  const { emails, message } = req.body;
  // emails could be an array of 10,000 addresses
  for (const email of emails) {
    await sendEmail(email, 'Check this out!', message);
  }
  res.json({ shared: emails.length });
});
```

## Secure Code

```typescript
import express from 'express';
import rateLimit from 'express-rate-limit';

// Per-IP rate limit for password reset
const resetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3,
  keyGenerator: (req) => `reset:${req.ip}`,
});

// Per-email rate limit using database tracking
async function checkEmailRateLimit(email: string, action: string, maxPerHour: number): Promise<boolean> {
  const count = await db.query(
    'SELECT COUNT(*) FROM notification_log WHERE recipient = $1 AND action = $2 AND sent_at > NOW() - INTERVAL \'1 hour\'',
    [email, action],
  );
  return parseInt(count.rows[0].count) < maxPerHour;
}

app.post('/api/forgot-password', resetLimiter, async (req, res) => {
  const { email } = req.body;
  const user = await User.findByEmail(email);

  if (user) {
    // SECURE: Per-recipient rate limit
    if (!await checkEmailRateLimit(email, 'password-reset', 3)) {
      // Still return generic message to prevent enumeration
      return res.json({ message: 'If an account exists, a reset email has been sent' });
    }

    const token = crypto.randomBytes(32).toString('hex');
    await saveResetToken(user.id, token);
    await sendEmail(email, 'Password Reset', `Reset: https://myapp.com/reset/${token}`);

    await db.query(
      'INSERT INTO notification_log (recipient, action, sent_at) VALUES ($1, $2, NOW())',
      [email, 'password-reset'],
    );
  }

  res.json({ message: 'If an account exists, a reset email has been sent' });
});

// SECURE: Share feature with array size limit
const ShareSchema = z.object({
  emails: z.array(z.string().email()).max(5), // Maximum 5 recipients
  message: z.string().max(500),
});

app.post('/api/share', authenticate, shareRateLimiter, async (req, res) => {
  const data = ShareSchema.parse(req.body);
  for (const email of data.emails) {
    await sendEmail(email, 'Check this out!', escape(data.message));
  }
  res.json({ shared: data.emails.length });
});
```

## Impact

Unrestricted notification sending allows attackers to flood victims with hundreds of unwanted emails or SMS messages (harassment), exhaust the application's email/SMS sending quotas, get the application's email domain blacklisted by ISPs and spam filters, incur significant financial costs through SMS sending (see OC-150), and degrade the application's sender reputation, causing legitimate emails to land in spam. Email domain blacklisting can take weeks to resolve and affects all users.

## References

- CWE-770: Allocation of Resources Without Limits or Throttling
- OWASP API4:2023 - Unrestricted Resource Consumption
- OWASP Testing Guide: Testing for Notification Bombing
- SendGrid reputation management: https://docs.sendgrid.com/ui/sending-email/sender-reputation
