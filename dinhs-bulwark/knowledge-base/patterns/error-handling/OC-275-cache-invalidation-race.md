# OC-275: Cache Invalidation Race

**Category:** Error Handling & Resilience
**Severity:** MEDIUM
**Auditors:** ERR-02
**CWE:** CWE-362 (Concurrent Execution Using Shared Resource with Improper Synchronization)
**OWASP:** A10:2025 -- Mishandling of Exceptional Conditions

## Description

A cache invalidation race occurs when the cache and the database can become inconsistent due to concurrent operations that interleave in an unexpected order. The classic pattern: Request A reads stale data from cache, Request B updates the database and invalidates the cache, Request A writes its stale read back into the cache. Now the cache contains outdated data that will be served to all subsequent requests until the next invalidation.

In security-sensitive contexts, this can have serious consequences. If the cached data includes permissions, roles, feature flags, or rate limit counters, a stale cache can grant access that has been revoked, serve outdated rate limit state (allowing bypass), or present a user with someone else's data after an account update. CVE-2025-66803 in Hotwired Turbo demonstrated a related race: a delayed background request could restore a destroyed session cookie, effectively re-authenticating a logged-out user.

The fundamental problem is that cache invalidation is not atomic with the database update. Even "write-through" caching strategies have race windows when multiple concurrent writers exist. This is Phil Karlton's famous observation made dangerous: "There are only two hard things in Computer Science: cache invalidation and naming things."

## Detection

```
grep -rn "cache\.set\|cache\.del\|cache\.invalidate\|redis\.del\|redis\.set" --include="*.ts" --include="*.js"
grep -rn "\.del\(.*\)\|\.expire\(.*\)" --include="*.ts" --include="*.js" -B 5 | grep "update\|save\|insert"
grep -rn "cache\.\(get\|set\)" --include="*.ts" --include="*.js" -A 5 -B 5
```

Look for: cache delete followed by database update (delete-then-update pattern), database update followed by cache set with application-computed value (update-then-set), any cache write that uses data read before a database write.

## Vulnerable Code

```typescript
// VULNERABLE: Classic cache-aside with race condition
async function updateUserRole(userId: string, newRole: string) {
  // Update database
  await db.query("UPDATE users SET role = ? WHERE id = ?", [newRole, userId]);

  // Invalidate cache
  await redis.del(`user:${userId}`);

  // RACE: Between the DB update and cache delete, another request
  // can read the OLD role from DB (if using read replicas) or cache,
  // and re-populate the cache with the old value
}

async function getUserRole(userId: string): Promise<string> {
  // Check cache first
  const cached = await redis.get(`user:${userId}`);
  if (cached) return JSON.parse(cached).role;

  // Cache miss: read from database
  const user = await db.query("SELECT role FROM users WHERE id = ?", [userId]);

  // RACE: If this runs between updateUserRole's DB write and cache delete,
  // we might read the old role and cache it
  await redis.set(`user:${userId}`, JSON.stringify(user[0]), "EX", 3600);
  return user[0].role;
}
```

## Secure Code

```typescript
// SECURE: Use cache-aside with version stamps to prevent stale writes
async function updateUserRole(userId: string, newRole: string) {
  const trx = await db.beginTransaction();
  try {
    // Increment version in the same transaction as the update
    await trx.query(
      "UPDATE users SET role = ?, version = version + 1 WHERE id = ?",
      [newRole, userId]
    );
    const [updated] = await trx.query(
      "SELECT role, version FROM users WHERE id = ?",
      [userId]
    );
    await trx.commit();

    // Write-through: set cache with the exact data we just committed
    // Include version so stale writes can be detected
    await redis.set(
      `user:${userId}`,
      JSON.stringify({ role: updated.role, version: updated.version }),
      "EX", 3600
    );
  } catch (error) {
    await trx.rollback();
    // On error, aggressively delete cache to avoid serving stale data
    await redis.del(`user:${userId}`);
    throw error;
  }
}

async function getUserRole(userId: string): Promise<string> {
  const cached = await redis.get(`user:${userId}`);
  if (cached) return JSON.parse(cached).role;

  const [user] = await db.query(
    "SELECT role, version FROM users WHERE id = ?",
    [userId]
  );

  // Only cache if no concurrent write happened
  // Use SET NX (set-if-not-exists) + short TTL to reduce race window
  await redis.set(
    `user:${userId}`,
    JSON.stringify({ role: user.role, version: user.version }),
    "EX", 300,
    "NX" // Only set if key doesn't exist (recent write takes precedence)
  );
  return user.role;
}
```

## Impact

Stale cached permissions can allow users to access resources after their access has been revoked. Stale rate limit counters in cache can be exploited to bypass rate limiting. In multi-tenant systems, cache invalidation races can serve one tenant's data to another. In session management, stale session data can re-authenticate logged-out users.

## References

- CWE-362: Concurrent Execution Using Shared Resource -- https://cwe.mitre.org/data/definitions/362.html
- CVE-2025-66803: Hotwired Turbo race condition restoring destroyed session cookies
- Facebook engineering: "Scaling Memcache at Facebook" -- cache invalidation race analysis
- OWASP A10:2025 -- Mishandling of Exceptional Conditions
- Redis documentation: SET NX/XX conditional operations
