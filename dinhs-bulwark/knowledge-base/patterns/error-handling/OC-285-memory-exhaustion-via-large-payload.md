# OC-285: Memory Exhaustion via Large Payload

**Category:** Error Handling & Resilience
**Severity:** MEDIUM
**Auditors:** ERR-03
**CWE:** CWE-789 (Memory Allocation with Excessive Size Value)
**OWASP:** A10:2025 -- Mishandling of Exceptional Conditions

## Description

Memory exhaustion via large payload occurs when an attacker sends requests that cause the application to allocate excessive amounts of memory, eventually triggering an out-of-memory (OOM) kill by the operating system or causing garbage collection pauses that freeze the event loop. While OC-280 covers the absence of request body size limits, this pattern addresses the broader category of memory exhaustion: response buffering, streaming responses loaded entirely into memory, WebSocket message accumulation, and array/object growth from repeated operations.

Common vectors include: APIs that load entire query results into memory before sending them, WebSocket connections that accumulate messages faster than they can be processed, file processing that reads entire files into Buffer objects, and string concatenation in loops that creates progressively larger strings. Node.js's default V8 heap limit is approximately 1.5GB (configurable with `--max-old-space-size`), and a single request that allocates even a fraction of this can degrade performance for all other requests due to increased garbage collection pressure.

The attack is amplified in containerized environments where memory limits are enforced: an OOM kill terminates the entire container, causing a hard restart and losing all in-flight requests. Kubernetes will restart the pod, but repeated OOM kills trigger CrashLoopBackOff, extending the outage.

## Detection

```
grep -rn "Buffer\.alloc\|Buffer\.from\|Buffer\.concat" --include="*.ts" --include="*.js" -B 3 | grep "req\.\|size\|length"
grep -rn "\.push\(.*\)\|\.concat\(.*\)" --include="*.ts" --include="*.js" -B 5 | grep "while\|for\|\.on("
grep -rn "readFileSync\|readFile" --include="*.ts" --include="*.js" | grep -v "limit\|size\|max"
grep -rn "SELECT \*\|findAll\|find({})" --include="*.ts" --include="*.js" | grep -v "limit\|take\|LIMIT"
grep -rn "ws\.on.*message\|socket\.on.*data" --include="*.ts" --include="*.js" -A 5 | grep "push\|concat\|\+="
```

Look for: unbounded array growth in loops, `SELECT *` without `LIMIT`, reading entire files into memory, WebSocket data accumulation, string concatenation in loops, `Buffer.concat()` with user-controlled input.

## Vulnerable Code

```typescript
import { Request, Response } from "express";
import WebSocket from "ws";

// VULNERABLE: Loading entire result set into memory
app.get("/api/export", async (req, res) => {
  // If the table has millions of rows, this allocates GBs of memory
  const allUsers = await db.query("SELECT * FROM users");
  const csv = allUsers.map((u) =>
    `${u.id},${u.name},${u.email}`
  ).join("\n");
  res.setHeader("Content-Type", "text/csv");
  res.send(csv); // Entire CSV string in memory
});

// VULNERABLE: Accumulating WebSocket messages without limit
const wss = new WebSocket.Server({ port: 8080 });
wss.on("connection", (ws) => {
  const messageBuffer: string[] = [];

  ws.on("message", (data) => {
    // Attacker sends millions of messages, growing the array unbounded
    messageBuffer.push(data.toString());
    if (messageBuffer.length % 100 === 0) {
      processBatch(messageBuffer.splice(0, 100));
    }
  });
});

// VULNERABLE: String concatenation growing unbounded
app.post("/api/process-log", async (req, res) => {
  let output = "";
  const lines = req.body.logLines; // Array of potentially millions of strings
  for (const line of lines) {
    output += transformLine(line) + "\n"; // Each += creates a new string
  }
  res.send(output);
});
```

## Secure Code

```typescript
import { Request, Response } from "express";
import WebSocket from "ws";
import { Transform } from "stream";

// SECURE: Stream large result sets instead of buffering in memory
app.get("/api/export", async (req, res) => {
  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Transfer-Encoding", "chunked");

  // Use a database cursor to stream results
  const cursor = db.query(new Cursor("SELECT id, name, email FROM users"));
  let batch;

  while ((batch = await cursor.read(500)).length > 0) {
    const csv = batch.map((u) => `${u.id},${u.name},${u.email}`).join("\n");
    res.write(csv + "\n");
  }

  await cursor.close();
  res.end();
});

// SECURE: WebSocket with message size and rate limits
const wss = new WebSocket.Server({
  port: 8080,
  maxPayload: 64 * 1024,      // 64KB max per message
  perMessageDeflate: false,     // Disable to prevent zip bomb
});

wss.on("connection", (ws) => {
  let messageCount = 0;
  const MAX_MESSAGES_PER_SECOND = 50;
  const MAX_BUFFER_SIZE = 1000;
  const messageBuffer: string[] = [];

  const rateLimitInterval = setInterval(() => { messageCount = 0; }, 1000);

  ws.on("message", (data) => {
    messageCount++;
    if (messageCount > MAX_MESSAGES_PER_SECOND) {
      ws.close(1008, "Rate limit exceeded");
      return;
    }
    if (messageBuffer.length >= MAX_BUFFER_SIZE) {
      ws.close(1008, "Buffer full -- slow consumer");
      return;
    }
    messageBuffer.push(data.toString());
    if (messageBuffer.length >= 100) {
      processBatch(messageBuffer.splice(0, 100));
    }
  });

  ws.on("close", () => clearInterval(rateLimitInterval));
});

// SECURE: Use streaming for large text processing
app.post("/api/process-log", async (req, res) => {
  const lines = req.body.logLines;

  if (!Array.isArray(lines) || lines.length > 10_000) {
    return res.status(400).json({ error: "Max 10000 log lines" });
  }

  // Use array join instead of string concatenation (avoids O(n^2) string copies)
  const output = lines.map(transformLine).join("\n");
  res.send(output);
});
```

## Impact

An attacker can crash the Node.js process by triggering out-of-memory conditions, causing denial of service. In containerized environments, OOM kills trigger pod restarts and potential CrashLoopBackOff cascades. Even without a full OOM, excessive memory allocation causes GC pressure that degrades response times for all users. WebSocket-based attacks are particularly effective because they maintain persistent connections and can accumulate memory over time.

## References

- CWE-789: Memory Allocation with Excessive Size Value -- https://cwe.mitre.org/data/definitions/789.html
- CWE-770: Allocation of Resources Without Limits or Throttling -- https://cwe.mitre.org/data/definitions/770.html
- OWASP A10:2025 -- Mishandling of Exceptional Conditions
- Node.js V8 memory limits: --max-old-space-size documentation
- Node.js Streams documentation -- https://nodejs.org/api/stream.html
