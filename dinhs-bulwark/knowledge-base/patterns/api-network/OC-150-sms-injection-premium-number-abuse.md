# OC-150: SMS Injection / Premium Number Abuse

**Category:** API & Network
**Severity:** HIGH
**Auditors:** API-05
**CWE:** CWE-20
**OWASP:** API4:2023 - Unrestricted Resource Consumption

## Description

SMS injection and premium number abuse occur when an application allows users to trigger SMS messages to arbitrary phone numbers without proper validation, rate limiting, or cost controls. Attackers exploit this to send SMS messages to premium-rate numbers they control (earning revenue per message), flood victims with unwanted messages, or exhaust the application's SMS credits and budget.

The attack targets any feature that sends SMS: phone verification, two-factor authentication, password reset via SMS, notification preferences, or "invite a friend" functionality. An attacker specifies a premium-rate number (International Premium Rate Numbers typically start with specific prefixes) as their phone number, then repeatedly triggers SMS sends. Each message costs the application $0.05-$2.00 depending on the destination, while the attacker earns $0.50-$5.00 per received message from the premium number provider.

SMS-pumping fraud (also called Toll Fraud or International Revenue Share Fraud) costs businesses billions annually. Twilio, Vonage, and other SMS providers have documented this attack pattern and offer fraud detection features, but the application must also implement its own controls. In 2023, Elon Musk reported that Twitter was spending $60 million annually on SMS for 2FA, with a significant portion attributed to SMS pumping from bots.

## Detection

```
# SMS sending functionality
grep -rn "twilio\|vonage\|nexmo\|sms\|sendSms\|messages\.create" --include="*.ts" --include="*.js"
# Phone number input without validation
grep -rn "phoneNumber\|phone_number\|to:.*req\.body" --include="*.ts" --include="*.js" | grep -i "sms\|twilio\|message"
# Missing rate limiting on SMS endpoints
grep -rn "\/verify\|\/send-sms\|\/send-code\|\/invite" --include="*.ts" --include="*.js" | grep -v "rateLimit\|throttle"
# Missing phone number validation
grep -rn "phoneNumber\|phone" --include="*.ts" --include="*.js" | grep -v "validate\|libphonenumber\|allowedCountr"
```

## Vulnerable Code

```typescript
import twilio from 'twilio';

const client = twilio(process.env.TWILIO_SID, process.env.TWILIO_TOKEN);

// VULNERABLE: No rate limiting, no phone validation, no cost controls
app.post('/api/send-verification', async (req, res) => {
  const { phoneNumber } = req.body;
  const code = Math.floor(100000 + Math.random() * 900000).toString();

  // Attacker sets phoneNumber to premium-rate number in expensive country
  // Sends thousands of requests, each costing $1-5
  await client.messages.create({
    body: `Your verification code is ${code}`,
    from: process.env.TWILIO_NUMBER,
    to: phoneNumber, // No validation -- any number worldwide
  });

  await saveVerificationCode(phoneNumber, code);
  res.json({ sent: true });
});

// VULNERABLE: "Invite a friend" with no limits
app.post('/api/invite', authenticate, async (req, res) => {
  const { phoneNumbers } = req.body; // Array of phone numbers
  // No limit on how many invites, no validation on numbers
  for (const number of phoneNumbers) {
    await client.messages.create({
      body: `You've been invited to join MyApp!`,
      from: process.env.TWILIO_NUMBER,
      to: number,
    });
  }
  res.json({ sent: phoneNumbers.length });
});
```

## Secure Code

```typescript
import twilio from 'twilio';
import { parsePhoneNumberFromString } from 'libphonenumber-js';
import rateLimit from 'express-rate-limit';

const client = twilio(process.env.TWILIO_SID, process.env.TWILIO_TOKEN);

const ALLOWED_COUNTRIES = ['US', 'CA', 'GB', 'DE', 'FR']; // Allowlist countries
const MAX_SMS_PER_NUMBER_PER_HOUR = 3;

const smsLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
  keyGenerator: (req) => `sms:${req.body?.phoneNumber || req.ip}`,
});

function validatePhoneNumber(raw: string): string | null {
  const parsed = parsePhoneNumberFromString(raw);
  if (!parsed || !parsed.isValid()) return null;
  if (!ALLOWED_COUNTRIES.includes(parsed.country || '')) return null;
  return parsed.format('E.164');
}

app.post('/api/send-verification', smsLimiter, async (req, res) => {
  const phone = validatePhoneNumber(req.body.phoneNumber);
  if (!phone) {
    return res.status(400).json({ error: 'Invalid or unsupported phone number' });
  }

  // Check per-number rate limit in database
  const recentCount = await db.query(
    'SELECT COUNT(*) FROM sms_log WHERE phone = $1 AND sent_at > NOW() - INTERVAL \'1 hour\'',
    [phone],
  );
  if (parseInt(recentCount.rows[0].count) >= MAX_SMS_PER_NUMBER_PER_HOUR) {
    return res.status(429).json({ error: 'Too many verification attempts' });
  }

  const code = Math.floor(100000 + Math.random() * 900000).toString();

  await client.messages.create({
    body: `Your verification code is ${code}`,
    from: process.env.TWILIO_NUMBER,
    to: phone,
  });

  await db.query(
    'INSERT INTO sms_log (phone, sent_at) VALUES ($1, NOW())',
    [phone],
  );
  await saveVerificationCode(phone, code);
  res.json({ sent: true });
});
```

## Impact

SMS injection and premium number abuse allow attackers to generate direct revenue by directing SMS to premium-rate numbers they control, exhaust the application's SMS budget (potentially thousands of dollars per hour), flood victim phone numbers with unwanted messages (SMS bombing), use the application as an SMS relay for spam or phishing, and trigger unexpected costs that may go unnoticed until the monthly bill arrives.

## References

- CWE-20: Improper Input Validation
- OWASP API4:2023 - Unrestricted Resource Consumption
- Twilio: Protect against SMS pumping fraud: https://www.twilio.com/docs/verify/preventing-toll-fraud
- Twitter/X SMS pumping fraud ($60M/year): https://arstechnica.com/tech-policy/2023/02/twitter-spent-60m-per-year-on-sms-2fa-verification-musk-says/
