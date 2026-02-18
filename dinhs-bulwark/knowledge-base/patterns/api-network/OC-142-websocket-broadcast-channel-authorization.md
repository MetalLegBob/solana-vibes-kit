# OC-142: WebSocket Broadcast Channel Authorization

**Category:** API & Network
**Severity:** HIGH
**Auditors:** API-03
**CWE:** CWE-862
**OWASP:** API1:2023 - Broken Object Level Authorization

## Description

WebSocket broadcast channel authorization failures occur when users can subscribe to or receive messages from channels they should not have access to. In real-time applications, WebSocket servers typically organize connections into "rooms" or "channels" -- user A's notifications, order #12345 updates, admin alerts, etc. If the server does not verify that a user is authorized to join a specific channel, any authenticated user can subscribe to any channel and receive other users' data in real-time.

This is the WebSocket equivalent of an IDOR (Insecure Direct Object Reference) vulnerability. The user connects, then sends a "subscribe" or "join" message with an arbitrary channel name or ID. If the server does not verify ownership or permission, the user receives all messages broadcast to that channel. In financial applications, this could expose real-time trade data, portfolio updates, or transaction notifications for other users.

The problem is exacerbated by Socket.IO's room abstraction, which makes it trivially easy to join rooms by name: `socket.join('room-name')`. If the room name is user-controlled and the server does not validate it, any client can join any room. Redis Pub/Sub channel subscriptions used for scaling WebSocket servers can also be exploited if the channel naming convention is predictable (e.g., `user:{userId}:notifications`).

## Detection

```
# Socket.IO room joins without authorization
grep -rn "socket\.join\|\.join(" --include="*.ts" --include="*.js"
# Channel subscription handlers
grep -rn "subscribe\|channel\|room\|topic" --include="*.ts" --include="*.js" | grep -i "ws\|socket\|io"
# Room names derived from client input
grep -rn "socket\.join.*data\.\|socket\.join.*msg\.\|socket\.join.*req\." --include="*.ts" --include="*.js"
# Broadcasting without recipient validation
grep -rn "\.to(\|\.broadcast\.\|\.emit(" --include="*.ts" --include="*.js"
```

## Vulnerable Code

```typescript
import { Server } from 'socket.io';

const io = new Server(httpServer);

io.on('connection', (socket) => {
  // VULNERABLE: User can join any room by sending a room name
  socket.on('subscribe', (data) => {
    socket.join(data.channel); // No authorization check
    // User can subscribe to "admin-alerts", "user-123-transactions", etc.
  });

  // VULNERABLE: User can listen to any other user's order updates
  socket.on('track-order', (data) => {
    socket.join(`order-${data.orderId}`); // Any user, any order
  });
});

// Broadcasting order updates -- goes to anyone who joined the room
function notifyOrderUpdate(orderId: string, update: object) {
  io.to(`order-${orderId}`).emit('order:updated', update);
}
```

## Secure Code

```typescript
import { Server } from 'socket.io';

const io = new Server(httpServer);

// Auth middleware (see OC-140)
io.use(authMiddleware);

io.on('connection', (socket) => {
  const user = socket.data.user;

  // SECURE: Auto-join user to their own channels only
  socket.join(`user:${user.id}`);
  socket.join(`role:${user.role}`);

  // SECURE: Validate channel subscription authorization
  socket.on('subscribe', async (data, callback) => {
    const { channel } = data;

    // Check authorization for the requested channel
    const authorized = await canAccessChannel(user, channel);
    if (!authorized) {
      callback({ error: 'Access denied' });
      return;
    }

    socket.join(channel);
    callback({ success: true });
  });

  // SECURE: Verify order ownership before subscribing
  socket.on('track-order', async (data, callback) => {
    const order = await Order.findById(data.orderId);
    if (!order || order.userId !== user.id) {
      callback({ error: 'Order not found' });
      return;
    }

    socket.join(`order:${data.orderId}`);
    callback({ success: true });
  });
});

async function canAccessChannel(user: User, channel: string): Promise<boolean> {
  if (channel.startsWith('user:')) {
    return channel === `user:${user.id}`;
  }
  if (channel.startsWith('admin:')) {
    return user.role === 'admin';
  }
  return false;
}
```

## Impact

Unauthorized channel subscriptions allow attackers to receive real-time data intended for other users (financial transactions, messages, notifications), monitor admin channels for internal alerts and system events, track other users' activity in real-time, intercept sensitive business data (trade execution, order status, portfolio changes), and perform targeted attacks based on observed real-time system behavior. This is a real-time data breach that continues as long as the WebSocket connection is open.

## References

- CWE-862: Missing Authorization
- OWASP API1:2023 - Broken Object Level Authorization: https://owasp.org/API-Security/editions/2023/en/0xa1-broken-object-level-authorization/
- OWASP WebSocket Security Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/WebSocket_Security_Cheat_Sheet.html
- Socket.IO Rooms documentation: https://socket.io/docs/v4/rooms/
