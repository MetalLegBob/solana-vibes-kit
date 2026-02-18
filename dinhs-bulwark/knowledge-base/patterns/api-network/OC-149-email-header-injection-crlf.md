# OC-149: Email Header Injection (CRLF)

**Category:** API & Network
**Severity:** HIGH
**Auditors:** API-05
**CWE:** CWE-93
**OWASP:** A03:2021 - Injection

## Description

Email header injection occurs when user-controlled input is included in email headers (To, From, CC, BCC, Subject, Reply-To) without sanitizing CRLF (Carriage Return Line Feed: `\r\n`) characters. By injecting `\r\n` sequences, an attacker can add arbitrary email headers, including additional recipients (BCC), change the sender address, or inject an entirely different email body. This turns the application's legitimate email-sending functionality into an open mail relay for spam, phishing, and social engineering.

CVE-2026-23829 in Mailpit (an email testing tool, versions prior to 1.28.3) demonstrated this vulnerability: the SMTP server's regex for validating `RCPT TO` and `MAIL FROM` addresses failed to exclude carriage return characters (`\r`) within its character class, allowing attackers to inject arbitrary SMTP headers. CVE-2015-3154 in Zend Framework's `Zend\Mail` component showed the same vulnerability class in a major PHP framework. CVE-2025-41250 in VMware vCenter showed SMTP header injection in enterprise infrastructure software.

In Node.js, the `nodemailer` library does sanitize headers by default, but raw SMTP implementations, `sendmail` command usage, and custom email builders often pass user input directly into header fields. The attack also applies to the `Subject` field, where injected headers can add BCC recipients or override the body.

## Detection

```
# Email sending with user input in headers
grep -rn "sendMail\|transporter\.\|nodemailer\|sgMail\|mailgun" --include="*.ts" --include="*.js"
# User input in email fields
grep -rn "req\.body.*from\|req\.body.*to\|req\.body.*subject\|req\.body.*replyTo" --include="*.ts" --include="*.js"
# String interpolation in email headers
grep -rn "from:.*\$\|to:.*\$\|subject:.*\$\|reply.to:.*\$" --include="*.ts" --include="*.js"
# Missing CRLF sanitization
grep -rn "\\\\r\\\\n\|\\\\n\|\\\\r" --include="*.ts" --include="*.js" | grep -i "mail\|email\|header"
# Raw SMTP/sendmail usage
grep -rn "sendmail\|smtp.*write\|\.write.*RCPT\|\.write.*MAIL FROM" --include="*.ts" --include="*.js"
```

## Vulnerable Code

```typescript
import nodemailer from 'nodemailer';

// VULNERABLE: User input directly in email headers
app.post('/api/contact', async (req, res) => {
  const { name, email, subject, message } = req.body;

  // Attacker sets email to: "attacker@evil.com\r\nBCC: victim1@example.com,victim2@example.com"
  // Or subject to: "Hello\r\nBCC: everyone@company.com\r\n\r\nPhishing body here"
  await transporter.sendMail({
    from: `"${name}" <${email}>`, // Injected CRLF in name or email
    to: 'support@myapp.com',
    subject: subject,              // Injected CRLF adds headers
    text: message,
  });

  res.json({ sent: true });
});

// VULNERABLE: Using exec with sendmail
import { exec } from 'child_process';

app.post('/api/notify', (req, res) => {
  const { to, subject } = req.body;
  // Command injection AND header injection
  exec(`echo "Subject: ${subject}\nTo: ${to}\n\nNotification" | sendmail -t`);
  res.json({ sent: true });
});
```

## Secure Code

```typescript
import nodemailer from 'nodemailer';
import { z } from 'zod';

// Sanitize CRLF from any string used in headers
function sanitizeHeader(value: string): string {
  return value.replace(/[\r\n]/g, '').trim();
}

// Validate email format strictly
const ContactSchema = z.object({
  name: z.string().max(100).regex(/^[^\r\n]+$/),
  email: z.string().email().max(254),
  subject: z.string().max(200).regex(/^[^\r\n]+$/),
  message: z.string().max(5000),
});

app.post('/api/contact', async (req, res) => {
  const data = ContactSchema.parse(req.body);

  // SECURE: Sanitize all header values, use validated email
  await transporter.sendMail({
    from: `"Contact Form" <noreply@myapp.com>`,  // Never use user-supplied From
    to: 'support@myapp.com',
    replyTo: data.email,                          // Validated email format
    subject: sanitizeHeader(data.subject),
    text: `From: ${sanitizeHeader(data.name)} <${data.email}>\n\n${data.message}`,
  });

  res.json({ sent: true });
});
```

## Impact

Email header injection allows attackers to use the application as an open mail relay for spam, send phishing emails that appear to originate from the legitimate application domain, add arbitrary BCC recipients to exfiltrate internal communications, override the email body with social engineering content, damage the application's email reputation and get its domain blacklisted, and bypass SPF/DKIM checks since the email genuinely originates from the application's mail server.

## References

- CVE-2026-23829: Mailpit SMTP Header Injection via Regex Bypass (CVSS 5.3)
- CVE-2015-3154: Zend Framework Zend\Mail CRLF Injection
- CVE-2025-41250: VMware vCenter SMTP Header Injection
- CWE-93: Improper Neutralization of CRLF Sequences
- OWASP: Email Header Injection: https://owasp.org/www-community/attacks/Email_Header_Injection
