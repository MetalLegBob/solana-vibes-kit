# OC-151: Notification Content Spoofing

**Category:** API & Network
**Severity:** MEDIUM
**Auditors:** API-05
**CWE:** CWE-451
**OWASP:** A03:2021 - Injection

## Description

Notification content spoofing occurs when user-controlled input is included in notification messages (emails, SMS, push notifications, in-app messages) without proper sanitization, allowing attackers to craft messages that appear to come from the application but contain phishing links, false instructions, or social engineering content.

The most common vector is the "share" or "invite" feature where users can customize a message. If the application sends `"${userName} says: ${customMessage}"` via email or SMS, the attacker controls both the display name and the message content. They can craft messages like "Your account has been compromised. Reset your password at https://evil.com/reset" which arrives from the application's legitimate domain, passes SPF/DKIM checks, and appears in the same email thread as real application notifications.

HTML email injection is particularly dangerous: if the notification template includes user input in an HTML context, attackers can inject links, images (for tracking), or entirely replace the visual content of the email. Push notification spoofing is also effective because users trust notifications from installed applications. In-app notification spoofing can be used for cross-site scripting if the notification content is rendered without sanitization.

## Detection

```
# User input in notification content
grep -rn "sendMail\|sendSms\|sendPush\|notify" --include="*.ts" --include="*.js"
# Template interpolation with user data
grep -rn "message.*req\.body\|content.*req\.body\|text.*req\.body" --include="*.ts" --include="*.js" | grep -i "email\|sms\|notif\|push"
# HTML templates with user input
grep -rn "\${.*user\|{{.*user\|<%= user" --include="*.html" --include="*.ejs" --include="*.hbs"
# Custom message in share/invite features
grep -rn "customMessage\|personalMessage\|shareMessage\|inviteMessage" --include="*.ts" --include="*.js"
```

## Vulnerable Code

```typescript
import nodemailer from 'nodemailer';

// VULNERABLE: User controls the email content
app.post('/api/share', authenticate, async (req, res) => {
  const { recipientEmail, customMessage } = req.body;

  // Attacker sets customMessage to:
  // "<h2>URGENT: Account Compromised</h2><p>Click <a href='https://evil.com'>here</a> to secure your account.</p>"
  await transporter.sendMail({
    from: '"MyApp" <noreply@myapp.com>',   // Legitimate sender
    to: recipientEmail,
    subject: `${req.user.name} shared something with you`,
    html: `
      <h1>MyApp</h1>
      <p>${req.user.name} says:</p>
      <div>${customMessage}</div>          <!-- HTML injection -->
      <p>Visit <a href="https://myapp.com">MyApp</a> to see more.</p>
    `,
  });

  res.json({ shared: true });
});

// VULNERABLE: Push notification with unsanitized user input
app.post('/api/send-notification', authenticate, async (req, res) => {
  const { targetUserId, message } = req.body;
  await pushService.send(targetUserId, {
    title: 'New message from MyApp',
    body: message, // Attacker-controlled content
    url: req.body.actionUrl, // Attacker-controlled URL
  });
  res.json({ sent: true });
});
```

## Secure Code

```typescript
import nodemailer from 'nodemailer';
import { escape } from 'html-escaper';
import { z } from 'zod';

const ShareSchema = z.object({
  recipientEmail: z.string().email(),
  customMessage: z.string().max(500), // Limit length
});

app.post('/api/share', authenticate, async (req, res) => {
  const data = ShareSchema.parse(req.body);

  // SECURE: Escape HTML, use predefined templates
  const safeMessage = escape(data.customMessage);
  const safeName = escape(req.user.name);

  await transporter.sendMail({
    from: '"MyApp" <noreply@myapp.com>',
    to: data.recipientEmail,
    subject: `${safeName} shared something with you on MyApp`,
    html: `
      <h1>MyApp</h1>
      <p>${safeName} sent you a note:</p>
      <blockquote style="border-left:3px solid #ccc;padding:10px;color:#666;">
        ${safeMessage}
      </blockquote>
      <p>Visit <a href="https://myapp.com">MyApp</a> to see more.</p>
    `,
    // Also provide plaintext fallback
    text: `${req.user.name} sent you a note on MyApp:\n\n"${data.customMessage}"\n\nVisit https://myapp.com`,
  });

  res.json({ shared: true });
});

// SECURE: Predefined notification templates, no user-controlled URLs
const NOTIFICATION_TEMPLATES = {
  'friend-request': { title: 'New friend request', body: (name: string) => `${name} wants to connect` },
  'message': { title: 'New message', body: (name: string) => `${name} sent you a message` },
};

app.post('/api/send-notification', authenticate, async (req, res) => {
  const { targetUserId, type } = req.body;
  const template = NOTIFICATION_TEMPLATES[type];
  if (!template) return res.status(400).json({ error: 'Invalid notification type' });

  await pushService.send(targetUserId, {
    title: template.title,
    body: template.body(req.user.name),
    url: `https://myapp.com/inbox`, // Always use application URLs, never user input
  });
  res.json({ sent: true });
});
```

## Impact

Notification content spoofing allows attackers to conduct phishing attacks from the legitimate application domain (bypassing email filters), steal credentials through fake password reset messages, deliver malware links through trusted notification channels, perform social engineering at scale using the application's infrastructure, and cause reputational damage when the application is used as a phishing vector. Victims are more likely to trust these messages because they come from a service they already use.

## References

- CWE-451: User Interface (UI) Misrepresentation of Critical Information
- CWE-79: XSS via notification content in web interfaces
- OWASP: Content Spoofing: https://owasp.org/www-community/attacks/Content_Spoofing
