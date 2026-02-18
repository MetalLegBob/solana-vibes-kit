# OC-143: WebSocket Connection Flooding

**Category:** API & Network
**Severity:** MEDIUM
**Auditors:** API-03
**CWE:** CWE-400
**OWASP:** API4:2023 - Unrestricted Resource Consumption

## Description

WebSocket connection flooding occurs when an attacker opens a large number of concurrent WebSocket connections to exhaust server resources. Unlike HTTP requests that are stateless and short-lived, WebSocket connections are persistent and consume server memory, file descriptors, and event loop capacity for their entire lifetime. An attacker with a simple script can open thousands of connections that collectively consume all available resources.

Each WebSocket connection consumes a file descriptor, an in-memory socket buffer (typically 8-16KB), application-level state (user objects, subscriptions), and event loop processing time for heartbeat/ping-pong frames. A server with a 1024 file descriptor limit (common Linux default) can be fully saturated by 1024 malicious connections, locking out all legitimate users.

CVE-2025-5399 in libcurl demonstrated a related WebSocket DoS vulnerability where a malicious server could trap clients in an endless busy-loop through crafted WebSocket frames. While this is a client-side vulnerability, it illustrates how WebSocket's persistent nature creates unique DoS vectors that do not exist in HTTP. The OWASP WebSocket Security Cheat Sheet specifically lists "connection exhaustion" as a primary DoS attack vector for WebSocket servers.

## Detection

```
# WebSocket server without connection limits
grep -rn "new WebSocket\.Server\|new WebSocketServer" --include="*.ts" --include="*.js"
# Missing maxPayload or connection tracking
grep -rn "WebSocket\.Server" --include="*.ts" --include="*.js" | grep -v "maxPayload\|maxConnections\|perMessageDeflate"
# No per-IP connection limiting
grep -rn "ws\.on.*connection\|io\.on.*connection" --include="*.ts" --include="*.js" | grep -v "connectionCount\|ipLimit\|rateLimit"
# Missing idle timeout / heartbeat
grep -rn "ping\|pong\|heartbeat\|isAlive\|keepAlive" --include="*.ts" --include="*.js"
```

## Vulnerable Code

```typescript
import { WebSocketServer } from 'ws';

// VULNERABLE: No connection limits, no rate limiting, no heartbeat
const wss = new WebSocketServer({ port: 8080 });

wss.on('connection', (ws) => {
  // No per-IP tracking
  // No max connections limit
  // No idle timeout
  // No message rate limiting
  ws.on('message', (data) => {
    handleMessage(ws, data);
  });
});

// Attacker script:
// for (let i = 0; i < 10000; i++) { new WebSocket('ws://target:8080'); }
```

## Secure Code

```typescript
import { WebSocketServer, WebSocket } from 'ws';

const MAX_CONNECTIONS_PER_IP = 5;
const MAX_TOTAL_CONNECTIONS = 1000;
const HEARTBEAT_INTERVAL = 30000;
const IDLE_TIMEOUT = 120000;

const connectionsByIp = new Map<string, number>();

const wss = new WebSocketServer({
  port: 8080,
  maxPayload: 64 * 1024,  // 64KB max message size
  perMessageDeflate: false, // Disable to reduce memory per connection
  verifyClient: (info, cb) => {
    const ip = info.req.socket.remoteAddress || '';

    // Enforce total connection limit
    if (wss.clients.size >= MAX_TOTAL_CONNECTIONS) {
      cb(false, 503, 'Server at capacity');
      return;
    }

    // Enforce per-IP connection limit
    const ipCount = connectionsByIp.get(ip) || 0;
    if (ipCount >= MAX_CONNECTIONS_PER_IP) {
      cb(false, 429, 'Too many connections from this IP');
      return;
    }

    connectionsByIp.set(ip, ipCount + 1);
    cb(true);
  },
});

// Heartbeat to detect and clean up stale connections
const heartbeat = setInterval(() => {
  wss.clients.forEach((ws: any) => {
    if (ws.isAlive === false) {
      ws.terminate();
      return;
    }
    ws.isAlive = false;
    ws.ping();
  });
}, HEARTBEAT_INTERVAL);

wss.on('connection', (ws, req) => {
  const ip = req.socket.remoteAddress || '';
  (ws as any).isAlive = true;
  (ws as any).ip = ip;

  ws.on('pong', () => { (ws as any).isAlive = true; });

  // Idle timeout
  const idleTimer = setTimeout(() => ws.close(1000, 'Idle timeout'), IDLE_TIMEOUT);

  ws.on('message', () => {
    idleTimer.refresh(); // Reset idle timer on activity
  });

  ws.on('close', () => {
    const count = connectionsByIp.get(ip) || 1;
    connectionsByIp.set(ip, count - 1);
    if (count <= 1) connectionsByIp.delete(ip);
    clearTimeout(idleTimer);
  });
});

wss.on('close', () => clearInterval(heartbeat));
```

## Impact

WebSocket connection flooding can exhaust all server file descriptors, preventing any new connections (HTTP or WebSocket), consume all available RAM through accumulated per-connection state, degrade performance for all connected users through event loop saturation, cause cascading failures in load balancers and reverse proxies, and create persistent denial-of-service that lasts as long as the malicious connections are held open. Unlike HTTP DoS, the attacker only needs to open connections once and hold them.

## References

- CVE-2025-5399: libcurl WebSocket DoS via infinite busy-loop
- CWE-400: Uncontrolled Resource Consumption
- OWASP WebSocket Security Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/WebSocket_Security_Cheat_Sheet.html
- OWASP API4:2023 - Unrestricted Resource Consumption
- ws library documentation: https://github.com/websockets/ws
