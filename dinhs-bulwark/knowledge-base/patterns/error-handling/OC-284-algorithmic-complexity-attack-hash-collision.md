# OC-284: Algorithmic Complexity Attack (Hash Collision)

**Category:** Error Handling & Resilience
**Severity:** MEDIUM
**Auditors:** ERR-03
**CWE:** CWE-407 (Inefficient Algorithmic Complexity)
**OWASP:** A10:2025 -- Mishandling of Exceptional Conditions

## Description

Algorithmic complexity attacks exploit the worst-case performance of data structures. The most well-known variant is hash collision denial of service (HashDoS), where an attacker crafts input keys that all hash to the same bucket in a hash table, degrading O(1) lookups to O(n) and making operations O(n^2) overall. While V8 (Node.js's JavaScript engine) uses randomized hash seeds that mitigate classic HashDoS against plain JavaScript objects, the attack surface extends to any data structure or algorithm where user-controlled input determines the complexity.

Concrete attack vectors in Node.js applications include: JSON request bodies with thousands of keys that cause expensive object creation and property lookup, deeply nested objects that trigger O(n^2) serialization, user-controlled sort comparators, and regular expression complexity (covered separately in OC-279). Query parameters that control database `ORDER BY` or `GROUP BY` fields can trigger expensive query plans. GraphQL queries with deeply nested selections can cause exponential resolver execution.

The historical HashDoS attacks (presented at 28C3 in 2011) affected PHP, Java, Python, Ruby, and ASP.NET. While modern V8 mitigates the original hash table attack, applications that build custom hash structures, use non-randomized hashing, or allow user-controlled keys in Maps/Objects are still vulnerable.

## Detection

```
grep -rn "Object\.keys\|Object\.entries\|for.*in\b" --include="*.ts" --include="*.js" -B 3 | grep "req\.body\|req\.query\|JSON\.parse"
grep -rn "new Map.*req\.\|new Set.*req\." --include="*.ts" --include="*.js"
grep -rn "JSON\.parse" --include="*.ts" --include="*.js" -A 3 | grep "for\|Object\.\|\.keys\|\.entries"
grep -rn "sort\|reduce\|filter" --include="*.ts" --include="*.js" -B 3 | grep "req\.\|params\.\|body\."
```

Look for: iteration over all keys of user-supplied objects, building Maps/Sets from user input without key count limits, nested iteration over user-controlled data structures, custom hash implementations.

## Vulnerable Code

```typescript
import { Request, Response } from "express";

// VULNERABLE: Processing all keys of a user-supplied object
app.post("/api/batch-update", async (req, res) => {
  const updates = req.body; // Could have 100,000+ keys

  // O(n) iteration * O(n) database operations = O(n^2) total
  for (const [key, value] of Object.entries(updates)) {
    await db.query("UPDATE settings SET value = $1 WHERE key = $2", [value, key]);
  }

  res.json({ updated: Object.keys(updates).length });
});

// VULNERABLE: Building index from user-controlled data
app.post("/api/import", async (req, res) => {
  const records = req.body.records; // Array of potentially millions of items

  // Build an in-memory index -- no limit on size
  const index = new Map<string, any>();
  for (const record of records) {
    // If records have crafted keys, Map operations degrade
    index.set(record.id, record);
  }

  // Process using the index
  const results = processRecords(index);
  res.json(results);
});

// VULNERABLE: Nested iteration on user data
app.post("/api/deduplicate", (req, res) => {
  const items = req.body.items;
  // O(n^2) comparison -- 10,000 items = 100,000,000 comparisons
  const unique = items.filter((item: any, index: number) =>
    items.findIndex((other: any) => other.id === item.id) === index
  );
  res.json(unique);
});
```

## Secure Code

```typescript
import { Request, Response } from "express";

// SECURE: Limit the number of keys processed
app.post("/api/batch-update", async (req, res) => {
  const updates = req.body;
  const keys = Object.keys(updates);

  // Enforce a hard limit on batch size
  if (keys.length > 100) {
    return res.status(400).json({
      error: `Batch size ${keys.length} exceeds maximum of 100`,
    });
  }

  // Use a single batch query instead of N individual queries
  const values = keys.map((key) => [key, updates[key]]);
  await db.query(
    "INSERT INTO settings (key, value) VALUES " +
    values.map((_, i) => `($${i * 2 + 1}, $${i * 2 + 2})`).join(", ") +
    " ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value",
    values.flat()
  );

  res.json({ updated: keys.length });
});

// SECURE: Limit input size and use efficient algorithms
app.post("/api/import", async (req, res) => {
  const records = req.body.records;

  if (!Array.isArray(records) || records.length > 10_000) {
    return res.status(400).json({ error: "Records must be an array with max 10000 items" });
  }

  // Use Set for O(1) deduplication instead of O(n^2)
  const seen = new Set<string>();
  const unique = records.filter((record: any) => {
    if (seen.has(record.id)) return false;
    seen.add(record.id);
    return true;
  });

  const results = processRecords(unique);
  res.json(results);
});

// SECURE: O(n) deduplication using Map
app.post("/api/deduplicate", (req, res) => {
  const items = req.body.items;

  if (!Array.isArray(items) || items.length > 50_000) {
    return res.status(400).json({ error: "Too many items" });
  }

  // O(n) using Map instead of O(n^2) using findIndex
  const uniqueMap = new Map<string, any>();
  for (const item of items) {
    if (!uniqueMap.has(item.id)) {
      uniqueMap.set(item.id, item);
    }
  }
  res.json([...uniqueMap.values()]);
});
```

## Impact

An attacker can cause denial of service by sending crafted input that triggers worst-case algorithmic complexity, consuming excessive CPU time on the single-threaded Node.js event loop. Processing 100,000 keys with nested iterations can freeze the server for minutes. This attack requires only a single HTTP request with a crafted payload and no authentication.

## References

- CWE-407: Inefficient Algorithmic Complexity -- https://cwe.mitre.org/data/definitions/407.html
- HashDoS: Effective Denial of Service attacks against web platforms (28C3, 2011)
- OWASP A10:2025 -- Mishandling of Exceptional Conditions
- CWE-405: Asymmetric Resource Consumption (Amplification)
- Node.js "Don't Block the Event Loop" guide
