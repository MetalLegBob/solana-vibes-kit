# OC-190: Cross-Tab State Synchronization Leak

**Category:** Frontend & Client
**Severity:** MEDIUM
**Auditors:** FE-01
**CWE:** CWE-200
**OWASP:** A01:2021 - Broken Access Control

## Description

Modern web applications use cross-tab communication to synchronize state -- keeping the user logged in across tabs, syncing theme preferences, or broadcasting wallet connection status. Common mechanisms include the `storage` event (fired on localStorage changes), `BroadcastChannel`, and `SharedWorker`. If the data broadcast includes sensitive information, it creates a leak vector.

The `storage` event fires in every tab on the same origin when localStorage changes. This means sensitive data written to localStorage in one tab is immediately broadcast to all other tabs, including those that may be running less-trusted parts of the application. `BroadcastChannel` is even more powerful, allowing arbitrary message passing between same-origin contexts with no built-in access control.

In Solana dApp frontends, cross-tab sync is used to propagate wallet connection state, recent transaction results, or balance updates. If the sync mechanism transmits private keys, auth tokens, or full transaction details, any tab on the origin -- including those opened by XSS or subdomain takeover -- receives the data.

## Detection

```
# BroadcastChannel usage
grep -rn "BroadcastChannel\|new BroadcastChannel" --include="*.ts" --include="*.tsx" --include="*.js"

# Storage event listeners
grep -rn "addEventListener.*storage\|onstorage" --include="*.ts" --include="*.tsx"

# SharedWorker usage
grep -rn "SharedWorker" --include="*.ts" --include="*.tsx"

# Check what data is being broadcast
grep -rn "\.postMessage\|channel\.postMessage" --include="*.ts" --include="*.tsx"
```

## Vulnerable Code

```typescript
// Cross-tab wallet state synchronization
const authChannel = new BroadcastChannel('auth_sync');

function onSignIn(session: { token: string; wallet: string; role: string }) {
  // VULNERABLE: Broadcasting auth token to all tabs
  authChannel.postMessage({
    type: 'SESSION_UPDATE',
    payload: {
      token: session.token,       // Auth token leaked to all tabs
      wallet: session.wallet,
      role: session.role,
      signedAt: Date.now(),
    },
  });
}

// In another part of the app
authChannel.onmessage = (event) => {
  // Any tab on this origin receives the full session including token
  if (event.data.type === 'SESSION_UPDATE') {
    setAuthState(event.data.payload);
  }
};
```

## Secure Code

```typescript
// Only sync non-sensitive state; tabs fetch their own session via HttpOnly cookie
const syncChannel = new BroadcastChannel('ui_sync');

function onSignIn(session: { wallet: string }) {
  // SECURE: Only broadcast the fact that auth state changed, not the token
  syncChannel.postMessage({
    type: 'AUTH_STATE_CHANGED',
    payload: {
      authenticated: true,
      wallet: session.wallet,  // Public key is public
    },
  });
}

syncChannel.onmessage = (event) => {
  if (event.data.type === 'AUTH_STATE_CHANGED') {
    // Each tab re-validates its own session via HttpOnly cookie
    refreshSessionFromServer();
  }
};

async function refreshSessionFromServer() {
  const res = await fetch('/api/auth/session', { credentials: 'include' });
  if (res.ok) {
    const session = await res.json();
    setAuthState(session);
  }
}
```

## Impact

Sensitive data broadcast through cross-tab communication is accessible to any same-origin context. If an attacker achieves XSS in any tab, they can listen on BroadcastChannel or the storage event to passively intercept auth tokens, wallet data, and other sensitive state as it is synchronized. The attacker does not need to find the storage location -- the data is delivered to them.

## References

- CWE-200: Exposure of Sensitive Information to an Unauthorized Actor
- MDN: BroadcastChannel API -- security considerations
- MDN: Window storage event documentation
- OWASP: Client-Side Security Testing Guide (WSTG-CLNT)
