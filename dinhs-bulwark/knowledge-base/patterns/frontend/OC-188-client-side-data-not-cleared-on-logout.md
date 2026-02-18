# OC-188: Client-Side Data Not Cleared on Logout

**Category:** Frontend & Client
**Severity:** MEDIUM
**Auditors:** FE-01
**CWE:** CWE-613
**OWASP:** A07:2021 - Identification and Authentication Failures

## Description

When a user logs out of a web application, the frontend must clear all client-side storage -- localStorage, sessionStorage, IndexedDB, cookies, and in-memory state. Failure to do so leaves sensitive user data accessible to the next person who uses the same browser, or to any script that later executes on the same origin.

This is particularly problematic in Solana dApp frontends that cache wallet addresses, transaction history, token balances, or portfolio data in browser storage. If a user disconnects their wallet but the application only clears the wallet adapter connection state without purging stored data, a subsequent user or XSS attack can access the previous user's cached information.

Shared or public computer scenarios amplify the risk. Even on personal devices, browser extensions and subsequent XSS attacks can access residual data from previous sessions.

## Detection

```
# Check logout/disconnect handlers for storage cleanup
grep -rn "disconnect\|logout\|signOut\|handleLogout" --include="*.ts" --include="*.tsx" -l
# Then verify those files contain localStorage.clear() or removeItem calls

# Look for cleanup functions
grep -rn "localStorage\.clear\|localStorage\.removeItem\|sessionStorage\.clear" --include="*.ts" --include="*.tsx"

# IndexedDB cleanup
grep -rn "deleteDatabase\|\.delete()" --include="*.ts" --include="*.tsx"

# Check wallet disconnect handlers
grep -rn "onDisconnect\|wallet.*disconnect" --include="*.ts" --include="*.tsx"
```

## Vulnerable Code

```typescript
import { useWallet } from '@solana/wallet-adapter-react';
import { useQueryClient } from '@tanstack/react-query';

function LogoutButton() {
  const { disconnect } = useWallet();
  const queryClient = useQueryClient();

  const handleLogout = async () => {
    // Disconnects wallet but does NOT clear cached data
    await disconnect();
    queryClient.clear();
    // VULNERABLE: localStorage still contains user data
    // localStorage has: user_profile, tx_history, token_balances,
    // rpc_preferences, portfolio_cache, notification_settings
    window.location.href = '/';
  };

  return <button onClick={handleLogout}>Disconnect Wallet</button>;
}
```

## Secure Code

```typescript
import { useWallet } from '@solana/wallet-adapter-react';
import { useQueryClient } from '@tanstack/react-query';

const STORAGE_KEYS = [
  'user_profile', 'tx_history', 'token_balances',
  'rpc_preferences', 'portfolio_cache', 'notification_settings',
] as const;

function LogoutButton() {
  const { disconnect } = useWallet();
  const queryClient = useQueryClient();

  const handleLogout = async () => {
    // 1. Disconnect wallet
    await disconnect();

    // 2. Clear React Query cache
    queryClient.clear();

    // 3. Clear all application localStorage keys
    STORAGE_KEYS.forEach((key) => localStorage.removeItem(key));

    // 4. Clear sessionStorage
    sessionStorage.clear();

    // 5. Clear IndexedDB if used
    const dbs = await indexedDB.databases();
    dbs.forEach((db) => {
      if (db.name) indexedDB.deleteDatabase(db.name);
    });

    // 6. Invalidate server session
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });

    // 7. Hard redirect to clear in-memory state
    window.location.href = '/';
  };

  return <button onClick={handleLogout}>Disconnect Wallet</button>;
}
```

## Impact

Residual client-side data from a previous session can expose wallet addresses, transaction histories, portfolio values, PII, and cached API responses. On shared devices, the next user gains access to the prior user's data. Even on personal devices, the stale data expands the window of exposure for subsequent XSS attacks.

## References

- CWE-613: Insufficient Session Expiration
- OWASP Session Management Cheat Sheet: Session Destruction
- OWASP ASVS V3.3: Session Logout and Timeout
- OWASP WSTG-CLNT-12: Testing Browser Storage
