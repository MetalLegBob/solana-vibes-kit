# OC-141: WebSocket Message Validation Missing

**Category:** API & Network
**Severity:** HIGH
**Auditors:** API-03
**CWE:** CWE-20
**OWASP:** API8:2023 - Security Misconfiguration

## Description

WebSocket message validation failures occur when server-side WebSocket handlers accept and process messages without validating their structure, type, or content. Unlike REST APIs where frameworks provide built-in request validation, WebSocket message handling is typically custom code that receives raw strings or buffers and parses them manually. Without validation, attackers can send malformed messages that trigger injection attacks, crash the server, or abuse business logic.

WebSocket messages bypass all HTTP middleware -- body parsers, validation middleware, WAF rules, and request logging. Traditional HTTP security tooling is blind to WebSocket traffic because monitoring tools typically only capture the initial upgrade request, not the subsequent message stream. This creates a significant detection gap where injected payloads (SQL injection, XSS, command injection) travel through an unmonitored channel.

The OWASP WebSocket Security Cheat Sheet explicitly warns that "WebSocket messages can carry XSS, SQL injection, and other malicious payloads" and recommends applying the same input validation to WebSocket messages as to HTTP requests. In practice, many applications validate their REST API inputs rigorously but treat WebSocket messages as trusted because they come from "already authenticated" users.

## Detection

```
# WebSocket message handlers
grep -rn "\.on.*message\|\.on.*data" --include="*.ts" --include="*.js"
# JSON.parse without try-catch
grep -rn "JSON\.parse" --include="*.ts" --include="*.js" | grep -v "try\|catch"
# Direct message data usage without validation
grep -rn "ws\.on.*message.*=>" --include="*.ts" --include="*.js"
# Missing schema validation on WebSocket messages
grep -rn "socket\.on\|ws\.on" --include="*.ts" --include="*.js" | grep -v "zod\|joi\|validate\|schema"
```

## Vulnerable Code

```typescript
import { WebSocketServer } from 'ws';

const wss = new WebSocketServer({ port: 8080 });

wss.on('connection', (ws) => {
  ws.on('message', (data) => {
    // VULNERABLE: No validation of message structure or content
    const msg = JSON.parse(data.toString()); // Crashes on invalid JSON

    switch (msg.type) {
      case 'chat':
        // No sanitization -- XSS payload stored and broadcast
        broadcastToRoom(msg.room, msg.content);
        break;
      case 'query':
        // SQL injection via WebSocket message
        db.query(`SELECT * FROM products WHERE name LIKE '%${msg.search}%'`);
        break;
      case 'exec':
        // Command injection via WebSocket message
        exec(`process-file ${msg.filename}`);
        break;
    }
  });
});
```

## Secure Code

```typescript
import { WebSocketServer } from 'ws';
import { z } from 'zod';
import { escape } from 'html-escaper';

const MessageSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('chat'),
    room: z.string().regex(/^[a-zA-Z0-9_-]+$/).max(50),
    content: z.string().max(2000),
  }),
  z.object({
    type: z.literal('query'),
    search: z.string().max(100),
  }),
]);

const wss = new WebSocketServer({ port: 8080 });

wss.on('connection', (ws) => {
  ws.on('message', (data) => {
    // SECURE: Parse safely with error handling
    let raw: unknown;
    try {
      raw = JSON.parse(data.toString());
    } catch {
      ws.send(JSON.stringify({ error: 'Invalid JSON' }));
      return;
    }

    // SECURE: Validate against schema
    const result = MessageSchema.safeParse(raw);
    if (!result.success) {
      ws.send(JSON.stringify({ error: 'Invalid message format' }));
      return;
    }

    const msg = result.data;
    switch (msg.type) {
      case 'chat':
        broadcastToRoom(msg.room, escape(msg.content)); // Sanitize output
        break;
      case 'query':
        // Parameterized query
        db.query('SELECT * FROM products WHERE name LIKE $1', [`%${msg.search}%`]);
        break;
    }
  });
});
```

## Impact

Missing WebSocket message validation allows attackers to inject SQL, XSS, or OS command payloads through the WebSocket channel, crash the server with malformed messages (invalid JSON, oversized payloads), bypass business logic by sending unexpected message types or field values, exploit race conditions by sending rapid sequences of state-changing messages, and evade security monitoring since WebSocket traffic is typically unlogged.

## References

- CWE-20: Improper Input Validation
- OWASP WebSocket Security Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/WebSocket_Security_Cheat_Sheet.html
- OWASP Testing Guide: Testing WebSockets: https://owasp.org/www-project-web-security-testing-guide/
- websocket.org Security Guide: https://websocket.org/guides/security/
