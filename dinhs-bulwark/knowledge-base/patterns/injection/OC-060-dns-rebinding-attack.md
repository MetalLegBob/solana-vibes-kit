# OC-060: DNS Rebinding Attack

**Category:** Injection
**Severity:** HIGH
**Auditors:** INJ-03
**CWE:** CWE-350
**OWASP:** A10:2021 Server-Side Request Forgery

## Description

DNS rebinding is an advanced SSRF bypass technique where an attacker controls a DNS server that initially resolves their domain to an external IP (passing validation) but then changes the resolution to an internal IP address (like `127.0.0.1` or `169.254.169.254`) for the actual request. This exploits the time gap between DNS resolution during validation and DNS resolution during the actual HTTP request.

The attack works because: (1) the application resolves the domain to check it is not internal, (2) the attacker's DNS returns a public IP with a very short TTL, (3) when the application makes the actual request, DNS is resolved again, (4) this time the attacker's DNS returns an internal IP. Services like `rebind.it` and `1u.ms` make this trivial to exploit.

DNS rebinding is particularly dangerous for applications that validate URLs by resolving them before fetching, as the validation can be bypassed with a dual-answer DNS response or TTL-based rebinding.

## Detection

```
# URL fetching patterns susceptible to rebinding
# Any user-controlled URL fetch where validation happens
# before the actual request (separate steps)
dns\.resolve.*then.*fetch
dns\.lookup.*then.*axios
isUrlSafe.*then.*get
validateUrl.*then.*request
```

## Vulnerable Code

```typescript
import dns from 'dns/promises';
import axios from 'axios';
import ipaddr from 'ipaddr.js';

// VULNERABLE: DNS resolution at check time differs from fetch time
async function isUrlSafe(url: string): Promise<boolean> {
  const hostname = new URL(url).hostname;
  const { address } = await dns.lookup(hostname);
  const range = ipaddr.parse(address).range();
  return range === 'unicast';
}

app.post('/fetch', async (req, res) => {
  const { url } = req.body;
  if (!await isUrlSafe(url)) {
    return res.status(403).json({ error: 'Blocked' });
  }
  // By the time this runs, DNS may resolve to 127.0.0.1
  const response = await axios.get(url);
  res.json(response.data);
});
```

## Secure Code

```typescript
import dns from 'dns/promises';
import http from 'http';
import https from 'https';
import ipaddr from 'ipaddr.js';

// SAFE: Pin the resolved IP and use it for the actual request
async function safeFetch(urlString: string): Promise<any> {
  const url = new URL(urlString);
  const { address } = await dns.lookup(url.hostname);
  const range = ipaddr.parse(address).range();

  if (range !== 'unicast') {
    throw new Error('Internal address blocked');
  }

  // Use custom agent to force the resolved IP
  const agent = new (url.protocol === 'https:' ? https : http).Agent({
    lookup: (_hostname, _options, callback) => {
      // Pin to the validated IP address
      callback(null, address, 4);
    }
  });

  const response = await fetch(urlString, {
    // @ts-ignore — custom agent support
    agent,
    redirect: 'error',
    signal: AbortSignal.timeout(5000)
  });
  return response.json();
}
```

## Impact

Bypass of SSRF protections, leading to access to internal services, cloud metadata endpoints, and localhost-bound admin interfaces. DNS rebinding defeats IP-based validation when resolution is not pinned.

## References

- CWE-350: Reliance on Reverse DNS Resolution for a Security-Critical Action
- OWASP: SSRF Prevention Cheat Sheet
- DNS Rebinding tools: rebind.it, 1u.ms
- PortSwigger: DNS rebinding SSRF bypass
