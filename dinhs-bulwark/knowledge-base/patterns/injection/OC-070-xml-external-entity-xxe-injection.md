# OC-070: XML External Entity (XXE) Injection

**Category:** Injection
**Severity:** HIGH
**Auditors:** INJ-05
**CWE:** CWE-611
**OWASP:** A05:2021 Security Misconfiguration

## Description

XML External Entity (XXE) injection exploits XML parsers that process external entity definitions in DTDs. When an application parses user-supplied XML with external entity processing enabled, attackers can read local files, perform SSRF, cause denial of service (via "billion laughs" entity expansion), and in some cases achieve remote code execution.

Node.js does not include a native XML parser, so XXE risk depends on third-party libraries. `libxmljs` (C bindings to libxml2) is vulnerable when the `noent: true` option is set, enabling external entity expansion. The `xml2js` and `fast-xml-parser` libraries are generally safe by default as they do not resolve external entities, but misconfigurations can introduce risk.

CVE-2023-43187 in NodeBB demonstrated XML injection leading to RCE via the `xmlrpc.php` endpoint. SOAP service endpoints, XML-based API imports, SVG processing, and document conversion pipelines are common XXE attack surfaces.

## Detection

```
# XML parsing libraries
libxmljs
xml2js
fast-xml-parser
xmldom
sax\.parser
# Dangerous parser configurations
noent:\s*true
resolveEntities
processEntities
external_general_entities
# SOAP/XML endpoints
Content-Type.*text/xml
Content-Type.*application/xml
application/soap\+xml
```

## Vulnerable Code

```typescript
import libxmljs from 'libxmljs';

app.post('/parse-xml', (req, res) => {
  const xmlData = req.body;
  // VULNERABLE: noent: true enables external entity expansion
  const doc = libxmljs.parseXml(xmlData, { noent: true });
  res.json({ root: doc.root().name() });
  // Attacker sends:
  // <!DOCTYPE d [<!ENTITY xxe SYSTEM "file:///etc/passwd">]>
  // <data>&xxe;</data>
});

// VULNERABLE: SVG upload with XML parsing
app.post('/upload-svg', upload.single('svg'), (req, res) => {
  const svgContent = fs.readFileSync(req.file.path, 'utf8');
  // SVG is XML — parsing with entity resolution enables XXE
  const doc = libxmljs.parseXml(svgContent, { noent: true });
  processSvg(doc);
});
```

## Secure Code

```typescript
import libxmljs from 'libxmljs';

app.post('/parse-xml', (req, res) => {
  const xmlData = req.body;
  // SAFE: External entities disabled (default in libxmljs)
  const doc = libxmljs.parseXml(xmlData, {
    noent: false,  // Do NOT expand entities
    nonet: true,   // Disable network access
    dtdload: false // Do not load external DTDs
  });
  res.json({ root: doc.root().name() });
});

// SAFER: Use a library that doesn't support external entities
import { parseStringPromise } from 'xml2js';
app.post('/parse-xml', async (req, res) => {
  const result = await parseStringPromise(req.body, {
    explicitRoot: false
  });
  res.json(result);
});

// SAFEST: Reject XML with DTD declarations entirely
function rejectDTD(xml: string): boolean {
  return /<!DOCTYPE/i.test(xml) || /<!ENTITY/i.test(xml);
}
```

## Impact

Reading arbitrary files from the server (`/etc/passwd`, configuration files, private keys). SSRF to internal services and cloud metadata. Denial of service via entity expansion (billion laughs attack). In rare cases, RCE via external entities pointing to special protocol handlers.

## References

- CVE-2023-43187: NodeBB XML injection via xmlrpc.php leading to RCE
- CWE-611: Improper Restriction of XML External Entity Reference
- OWASP: XML External Entity (XXE) Prevention Cheat Sheet
- SecureFlag Knowledge Base: XML Entity Expansion in Node.js
- CWE-91: XML Injection (aka Blind XPath Injection)
