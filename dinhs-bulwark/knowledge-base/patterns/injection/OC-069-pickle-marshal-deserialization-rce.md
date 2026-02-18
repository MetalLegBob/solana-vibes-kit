# OC-069: Pickle/Marshal Deserialization RCE

**Category:** Injection
**Severity:** CRITICAL
**Auditors:** INJ-05
**CWE:** CWE-502
**OWASP:** A08:2021 Software and Data Integrity Failures

## Description

Insecure deserialization via formats like Python's pickle, Ruby's Marshal, Java's ObjectInputStream, and JavaScript's `node-serialize` or `serialize-javascript` allows attackers to execute arbitrary code by crafting malicious serialized payloads. When an application deserializes untrusted data, the deserializer reconstructs objects including their methods, enabling code execution.

In the Node.js ecosystem, the `node-serialize` package directly uses `eval()` to deserialize function objects, making it trivially exploitable. The `serialize-javascript` package, when used for deserialization (parsing its output with `eval`), also enables code execution. The `cryo` library and `funcster` package have similar issues.

While pickle and Marshal are Python/Ruby-specific, they appear in Node.js applications through: polyglot microservices communicating via serialized formats, Redis/Memcached caches storing serialized Python objects consumed by Node.js services, and API endpoints that accept serialized data from other services.

## Detection

```
# JavaScript serialization libraries
node-serialize
serialize-javascript
funcster
cryo
# Eval-based deserialization
eval\(.*serialize
unserialize\(
# Buffer/binary deserialization
Buffer\.from\(.*base64.*JSON\.parse
# Cross-language serialization
pickle|marshal|ObjectInputStream
msgpack.*unpack
```

## Vulnerable Code

```typescript
import serialize from 'node-serialize';

app.post('/session', (req, res) => {
  const cookie = req.cookies.session;
  // VULNERABLE: node-serialize uses eval internally
  const session = serialize.unserialize(
    Buffer.from(cookie, 'base64').toString()
  );
  // Attacker crafts serialized object with:
  // {"rce":"_$$ND_FUNC$$_function(){require('child_process').execSync('id')}()"}
  res.json({ user: session.user });
});

// VULNERABLE: eval-based deserialization of serialize-javascript output
import serializeJs from 'serialize-javascript';
const data = eval('(' + untrustedInput + ')');
```

## Secure Code

```typescript
// SAFE: Use JSON for serialization — no code execution
app.post('/session', (req, res) => {
  const cookie = req.cookies.session;
  try {
    // JSON.parse is safe — it cannot execute code
    const session = JSON.parse(
      Buffer.from(cookie, 'base64').toString()
    );
    // Validate the parsed structure
    const validated = sessionSchema.parse(session);
    res.json({ user: validated.user });
  } catch {
    res.status(400).json({ error: 'Invalid session' });
  }
});

// SAFE: Use signed cookies to prevent tampering
import cookieParser from 'cookie-parser';
app.use(cookieParser(process.env.COOKIE_SECRET));

// For complex data, use Protocol Buffers or MessagePack
// with schema validation
import { decode } from '@msgpack/msgpack';
const data = decode(buffer);
const validated = schema.parse(data);
```

## Impact

Remote code execution with the privileges of the application process. Complete server compromise. Deserialization vulnerabilities are especially dangerous because they often require no authentication and can be triggered via cookies, request bodies, or cached data.

## References

- CWE-502: Deserialization of Untrusted Data
- OWASP: Insecure Deserialization
- Snyk: Preventing insecure deserialization in Node.js
- node-serialize npm advisory: Code execution via unserialize
- PortSwigger: Insecure deserialization
