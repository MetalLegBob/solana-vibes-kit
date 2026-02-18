# OC-205: Client-Side Route Guard Bypass

**Category:** Frontend & Client
**Severity:** HIGH
**Auditors:** FE-01, AUTH-03
**CWE:** CWE-602
**OWASP:** A01:2021 - Broken Access Control

## Description

Single-page applications (SPAs) built with React, Next.js, Vue, or Angular implement client-side route guards to control access to protected pages. These guards check authentication state in the browser (e.g., presence of a JWT in localStorage, a context value, or a cookie flag) and redirect unauthenticated users to the login page. However, client-side route guards are UI conveniences, not security controls. They execute in the user's browser, where all JavaScript can be inspected, modified, and bypassed.

An attacker can bypass client-side route guards by: directly navigating to the protected URL, modifying localStorage/cookie values to fake authentication, using browser devtools to modify React state or context, or disabling JavaScript route guard logic entirely. If the backend does not independently verify authorization on every API request serving the protected page's data, the attacker accesses the protected content.

In Solana dApp frontends, client-side route guards commonly protect admin panels, portfolio dashboards, staking management pages, and governance voting interfaces. If these guards are the only access control mechanism and the underlying API endpoints do not verify authorization, the attacker can access privileged functionality.

## Detection

```
# React Router protected route patterns
grep -rn "PrivateRoute\|ProtectedRoute\|AuthRoute\|RequireAuth\|RouteGuard" --include="*.ts" --include="*.tsx"

# Redirect on auth check failure
grep -rn "isAuthenticated\|isLoggedIn\|authState" --include="*.ts" --include="*.tsx" | grep -i "redirect\|navigate\|push"

# Next.js middleware auth checks (better pattern -- but verify backend too)
grep -rn "middleware\.ts\|middleware\.js" --include="*.ts" --include="*.js"

# Client-side role checks
grep -rn "role.*admin\|isAdmin\|hasPermission\|userRole" --include="*.ts" --include="*.tsx"

# API routes without server-side auth (the real vulnerability)
grep -rn "export.*async.*function\|export.*default" --include="*.ts" --include="*.tsx" -l | head -20
```

## Vulnerable Code

```typescript
// Client-side route guard as the ONLY access control
import { useRouter } from 'next/router';
import { useWallet } from '@solana/wallet-adapter-react';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { connected, publicKey } = useWallet();
  const router = useRouter();
  const isAdmin = localStorage.getItem('isAdmin') === 'true';

  // VULNERABLE: Client-side only check -- attacker sets localStorage
  if (!connected || !isAdmin) {
    router.push('/connect-wallet');
    return null;
  }

  return <>{children}</>;
}

// Admin page "protected" by client-side guard only
function AdminDashboard() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    // VULNERABLE: API endpoint has no server-side auth check
    fetch('/api/admin/stats')
      .then((r) => r.json())
      .then(setStats);
  }, []);

  return (
    <ProtectedRoute>
      <div>Admin Dashboard: {JSON.stringify(stats)}</div>
    </ProtectedRoute>
  );
}
```

## Secure Code

```typescript
// Client-side guard for UX + server-side enforcement for security
import { useRouter } from 'next/router';
import { useSession } from './hooks/useSession';

// Client-side guard (UX convenience only)
function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const { session, isLoading } = useSession(); // Validated server-side
  const router = useRouter();

  if (isLoading) return <LoadingSpinner />;
  if (!session) {
    router.push('/connect-wallet');
    return null;
  }
  if (requiredRole && session.role !== requiredRole) {
    router.push('/unauthorized');
    return null;
  }

  return <>{children}</>;
}

// Server-side API route with independent auth verification
// pages/api/admin/stats.ts
import { verifySession, requireRole } from '@/lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // SECURE: Server-side session verification on every request
  const session = await verifySession(req);
  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // SECURE: Server-side role check
  if (!requireRole(session, 'admin')) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  // Only now fetch and return protected data
  const stats = await getAdminStats();
  return res.status(200).json(stats);
}
```

## Impact

An attacker who bypasses client-side route guards can access admin panels, privileged dashboards, and management interfaces. If the backend API endpoints do not independently verify authorization, the attacker gains access to the full functionality behind those routes: viewing all users' portfolio data, executing admin operations, modifying protocol parameters, or accessing governance functions. This is effectively a complete authorization bypass.

## References

- CWE-602: Client-Side Enforcement of Server-Side Security
- OWASP: Broken Access Control (A01:2021)
- OWASP ASVS V4.1: Access Control Design -- server-side enforcement
- Next.js Documentation: Authentication Patterns (middleware + server-side)
- React Router Documentation: Protected Routes (as UX pattern, not security)
