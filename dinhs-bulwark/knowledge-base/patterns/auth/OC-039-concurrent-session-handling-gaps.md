# OC-039: Concurrent Session Handling Gaps

**Category:** Authentication & Authorization
**Severity:** MEDIUM
**Auditors:** AUTH-02
**CWE:** CWE-613
**OWASP:** A07:2021 - Identification and Authentication Failures

## Description

Many applications do not limit or track concurrent sessions per user. Without session limits, an attacker who compromises credentials can maintain a persistent session alongside the legitimate user without detection. The user may not be aware that another party is simultaneously using their account, and there is no mechanism to view or revoke active sessions.

OpenClaw's multi-user deployment demonstrated a related issue where session isolation failures allowed authorization bypass -- requests from one user could be evaluated using another user's session context due to shared mutable state under concurrent access. This represents a vertical escalation where RBAC "works" on paper but collapses at runtime because the system authorizes the session rather than the caller.

Proper concurrent session handling includes: limiting the number of active sessions, providing users visibility into their active sessions, allowing remote session revocation, and alerting on suspicious new session creation (new device, new location).

## Detection

```
# Session creation without concurrent session check
grep -rn "req\.session\.\(userId\|user\)" --include="*.ts" --include="*.js" | grep -v "concurrent\|limit\|count\|active"
# Session store operations
grep -rn "sessionStore\|session.*store\|SessionStore" --include="*.ts" --include="*.js"
# Active session listing endpoint
grep -rn "\/sessions\|activeSessions\|listSessions" --include="*.ts" --include="*.js"
```

## Vulnerable Code

```typescript
// VULNERABLE: No concurrent session tracking or limits
app.post('/login', async (req, res) => {
  const user = await authenticate(req.body);
  if (!user) return res.status(401).end();

  // Creates unlimited sessions per user without tracking
  req.session.regenerate((err) => {
    req.session.userId = user.id;
    res.redirect('/dashboard');
  });
  // No way to list, limit, or revoke other sessions
});
```

## Secure Code

```typescript
const MAX_CONCURRENT_SESSIONS = 5;

// SECURE: Track and limit concurrent sessions
app.post('/login', async (req, res) => {
  const user = await authenticate(req.body);
  if (!user) return res.status(401).end();

  // Check active session count
  const activeSessions = await sessionStore.getSessionsForUser(user.id);
  if (activeSessions.length >= MAX_CONCURRENT_SESSIONS) {
    // Revoke oldest session
    const oldest = activeSessions.sort((a, b) => a.createdAt - b.createdAt)[0];
    await sessionStore.destroy(oldest.id);
  }

  req.session.regenerate((err) => {
    req.session.userId = user.id;
    req.session.createdAt = Date.now();
    req.session.userAgent = req.headers['user-agent'];
    req.session.ip = req.ip;
    res.redirect('/dashboard');
  });
});

// Provide session management endpoint
app.get('/api/sessions', authenticate, async (req, res) => {
  const sessions = await sessionStore.getSessionsForUser(req.userId);
  res.json(sessions.map(s => ({
    id: s.id, createdAt: s.createdAt,
    userAgent: s.userAgent, ip: s.ip,
    current: s.id === req.session.id,
  })));
});

app.delete('/api/sessions/:id', authenticate, async (req, res) => {
  await sessionStore.destroyForUser(req.userId, req.params.id);
  res.json({ message: 'Session revoked' });
});
```

## Impact

Without concurrent session limits, attackers can maintain persistent undetected access to a compromised account. Users have no visibility into whether their account is being used elsewhere and no mechanism to revoke unauthorized sessions.

## References

- CWE-613: Insufficient Session Expiration
- OpenClaw session isolation failure (CWE-284, CWE-863)
- OWASP Session Management Cheat Sheet
- https://owasp.org/Top10/A07_2021-Identification_and_Authentication_Failures/
