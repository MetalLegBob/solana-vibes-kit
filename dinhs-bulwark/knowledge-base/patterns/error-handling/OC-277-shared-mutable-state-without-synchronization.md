# OC-277: Shared Mutable State Without Synchronization

**Category:** Error Handling & Resilience
**Severity:** HIGH
**Auditors:** ERR-02
**CWE:** CWE-662 (Improper Synchronization)
**OWASP:** A10:2025 -- Mishandling of Exceptional Conditions

## Description

Shared mutable state without synchronization occurs when multiple asynchronous operations read and modify the same in-memory data structure without any locking or coordination mechanism. In Node.js, despite the single-threaded event loop, this is possible because async operations spanning multiple event loop ticks allow interleaving.

A common misconception is that Node.js cannot have race conditions because it is single-threaded. This is false. While synchronous code blocks execute atomically within a single event loop tick, any function with an `await` or callback yields execution. Two async functions accessing the same JavaScript object interleave across event loop iterations: Function A reads the object, yields at an `await`, Function B reads the same object, modifies it, yields, and then Function A modifies the object based on its now-stale read.

This pattern is especially dangerous with in-memory rate limiters, session stores, counters, and state machines. The zero-overhead-keyed-promise-lock library was created specifically to address this: it provides keyed mutual exclusion for async operations in Node.js, ensuring that operations on the same entity (e.g., the same user ID) execute sequentially even when multiple requests arrive concurrently.

## Detection

```
grep -rn "let\s\+\w\+\s*=\s*\(new Map\|new Set\|{}\|\[\]\)" --include="*.ts" --include="*.js"
grep -rn "global\.\|module\.exports\.\|singleton" --include="*.ts" --include="*.js" | grep -i "state\|counter\|map\|cache"
grep -rn "\.set\(.*\)\|\.push\(.*\)\|\[.*\]\s*=" --include="*.ts" --include="*.js" -B 5 | grep "await\|async"
grep -rn "Map<\|new Map\|Record<" --include="*.ts" --include="*.js" | grep -i "session\|rate\|counter\|balance"
```

Look for: module-level Map/Set/Object used by async functions, in-memory counters incremented across async boundaries, global state shared between request handlers without locks.

## Vulnerable Code

```typescript
// VULNERABLE: In-memory rate limiter with shared mutable state
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

async function rateLimitMiddleware(req: Request, res: Response, next: NextFunction) {
  const key = req.ip;
  const now = Date.now();
  const window = 60_000; // 1 minute
  const limit = 100;

  let entry = rateLimitMap.get(key);
  if (!entry || entry.resetAt < now) {
    entry = { count: 0, resetAt: now + window };
    rateLimitMap.set(key, entry);
  }

  entry.count++; // RACE: This read-modify-write is NOT atomic across await

  if (entry.count > limit) {
    return res.status(429).json({ error: "Rate limit exceeded" });
  }

  // Async operation: between the count++ above and response below,
  // other requests can also increment the counter
  await logRequest(req); // await yields to event loop

  next();
}

// VULNERABLE: In-memory session state machine
const sessions = new Map<string, { state: string; data: any }>();

async function processStep(sessionId: string, step: string) {
  const session = sessions.get(sessionId)!;

  if (session.state !== step) {
    throw new Error(`Expected state ${step}, got ${session.state}`);
  }

  // RACE: Between check and update, another request can modify state
  const result = await performStepAction(session, step);
  session.state = getNextState(step); // Stale update if concurrent
  session.data = { ...session.data, ...result };
}
```

## Secure Code

```typescript
import { Mutex } from "async-mutex";

// SECURE: Rate limiter with atomic operations
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const rateLimitMutex = new Mutex();

async function rateLimitMiddleware(req: Request, res: Response, next: NextFunction) {
  const key = req.ip;
  const now = Date.now();
  const window = 60_000;
  const limit = 100;

  // Use mutex to ensure atomic read-modify-write
  const allowed = await rateLimitMutex.runExclusive(() => {
    let entry = rateLimitMap.get(key);
    if (!entry || entry.resetAt < now) {
      entry = { count: 0, resetAt: now + window };
      rateLimitMap.set(key, entry);
    }
    entry.count++;
    return entry.count <= limit;
  });

  if (!allowed) {
    return res.status(429).json({ error: "Rate limit exceeded" });
  }
  next();
}

// SECURE: Session state machine with per-session locks
const sessions = new Map<string, { state: string; data: any }>();
const sessionLocks = new Map<string, Mutex>();

function getSessionLock(sessionId: string): Mutex {
  if (!sessionLocks.has(sessionId)) {
    sessionLocks.set(sessionId, new Mutex());
  }
  return sessionLocks.get(sessionId)!;
}

async function processStep(sessionId: string, step: string) {
  const lock = getSessionLock(sessionId);

  return lock.runExclusive(async () => {
    const session = sessions.get(sessionId)!;
    if (session.state !== step) {
      throw new Error(`Expected state ${step}, got ${session.state}`);
    }
    const result = await performStepAction(session, step);
    session.state = getNextState(step);
    session.data = { ...session.data, ...result };
    return session;
  });
}
```

## Impact

Unsynchronized shared mutable state can be exploited to bypass rate limiters (by having concurrent requests race past the count check), corrupt session state machines (enabling step-skipping in multi-step flows like checkout), or cause data inconsistencies in any in-memory store. In financial applications, this enables double-spend style attacks against in-memory balance tracking.

## References

- CWE-662: Improper Synchronization -- https://cwe.mitre.org/data/definitions/662.html
- async-mutex: Mutex/Semaphore for JavaScript -- https://www.npmjs.com/package/async-mutex
- zero-overhead-keyed-promise-lock: Keyed mutual exclusion for Node.js -- https://github.com/ori88c/zero-overhead-keyed-promise-lock
- PortSwigger: Race Conditions in Single-Threaded Runtimes
- OWASP A10:2025 -- Mishandling of Exceptional Conditions
