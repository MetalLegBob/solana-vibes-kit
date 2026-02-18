# OC-140: WebSocket Without Authentication

**Category:** API & Network
**Severity:** HIGH
**Auditors:** API-03
**CWE:** CWE-306
**OWASP:** API2:2023 - Broken Authentication

## Description

WebSocket connections lack a built-in authentication mechanism. Unlike HTTP requests where middleware can check an `Authorization` header on every request, WebSocket connections are long-lived and persistent -- once established, they remain open for the duration of the session. If authentication is not enforced during the initial upgrade handshake, anyone who knows the WebSocket endpoint URL can connect and exchange messages.

The WebSocket browser API makes this problem worse: it does not support setting custom HTTP headers (like `Authorization`) on the initial connection request. Developers must use alternative approaches such as query parameters, cookies, subprotocol headers, or post-connection authentication messages. Many developers, faced with this API limitation, skip authentication entirely or implement it incorrectly.

CVE-2025-68663 in Outline (a collaborative documentation tool, versions prior to 1.1.0) demonstrated this vulnerability class: a flaw in WebSocket authentication allowed suspended users to maintain or establish real-time WebSocket connections and continue receiving sensitive operational updates after their accounts were suspended. CVE-2025-68620 in Signal K Server (versions prior to 2.19.0) showed how unauthenticated WebSocket endpoints could be chained with other features to steal JWT authentication tokens. CVE-2018-1270 in Spring Framework (CVSS 9.8) allowed remote code execution through STOMP over WebSocket endpoints that accepted unauthenticated messages.

## Detection

```
# WebSocket server creation without auth
grep -rn "new WebSocket\.Server\|new WebSocketServer\|WebSocket.Server" --include="*.ts" --include="*.js"
# Missing verifyClient callback
grep -rn "WebSocket\.Server" --include="*.ts" --include="*.js" | grep -v "verifyClient"
# Socket.IO without auth middleware
grep -rn "io\.on.*connection" --include="*.ts" --include="*.js" | grep -v "use\|middleware\|auth"
# Upgrade handler without auth
grep -rn "\.on.*upgrade" --include="*.ts" --include="*.js" | grep -v "auth\|verify\|token\|jwt"
```

## Vulnerable Code

```typescript
import { WebSocketServer } from 'ws';

// VULNERABLE: No authentication on WebSocket connection
const wss = new WebSocketServer({ port: 8080 });

wss.on('connection', (ws) => {
  // Anyone can connect and receive messages
  ws.on('message', (data) => {
    const msg = JSON.parse(data.toString());
    handleMessage(ws, msg); // Processing messages from unauthenticated users
  });
});

// VULNERABLE: Socket.IO without auth middleware
import { Server } from 'socket.io';
const io = new Server(httpServer);

io.on('connection', (socket) => {
  // No authentication check -- any client can connect
  socket.on('trade:execute', (data) => {
    executeTrade(data); // Unauthenticated trade execution
  });
});
```

## Secure Code

```typescript
import { WebSocketServer } from 'ws';
import jwt from 'jsonwebtoken';
import { URL } from 'url';

const wss = new WebSocketServer({ noServer: true });

// SECURE: Authenticate during HTTP upgrade handshake
httpServer.on('upgrade', (request, socket, head) => {
  try {
    const url = new URL(request.url, `http://${request.headers.host}`);
    const token = url.searchParams.get('token');

    if (!token) {
      socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
      socket.destroy();
      return;
    }

    const user = jwt.verify(token, process.env.JWT_SECRET, {
      algorithms: ['HS256'],
    });

    wss.handleUpgrade(request, socket, head, (ws) => {
      (ws as any).user = user; // Attach user to connection
      wss.emit('connection', ws, request);
    });
  } catch (err) {
    socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
    socket.destroy();
  }
});

wss.on('connection', (ws) => {
  const user = (ws as any).user;
  ws.on('message', (data) => {
    // All messages come from an authenticated user
    handleMessage(ws, user, JSON.parse(data.toString()));
  });
});

// SECURE: Socket.IO with auth middleware
io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) return next(new Error('Authentication required'));
  try {
    socket.data.user = jwt.verify(token, process.env.JWT_SECRET, {
      algorithms: ['HS256'],
    });
    next();
  } catch (err) {
    next(new Error('Invalid token'));
  }
});
```

## Impact

Without WebSocket authentication, attackers can connect anonymously and receive sensitive real-time data (financial feeds, user activity, internal events), send unauthorized commands through WebSocket messages, impersonate legitimate users, maintain persistent access even after account suspension or revocation, and perform actions that bypass all REST API authorization controls. In financial applications, this can enable unauthorized trading or fund transfers.

## References

- CVE-2025-68663: Outline WebSocket auth bypass allowing suspended user access
- CVE-2025-68620: Signal K Server JWT token theft via unauthenticated WebSocket + polling chain
- CVE-2018-1270: Spring Framework STOMP over WebSocket RCE (CVSS 9.8)
- CVE-2024-26135: MeshCentral Cross-Site WebSocket Hijacking (CVSS 8.8)
- CWE-306: Missing Authentication for Critical Function
- OWASP WebSocket Security Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/WebSocket_Security_Cheat_Sheet.html
