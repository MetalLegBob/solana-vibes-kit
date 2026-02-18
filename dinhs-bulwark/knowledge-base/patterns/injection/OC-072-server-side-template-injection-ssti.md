# OC-072: Server-Side Template Injection (SSTI)

**Category:** Injection
**Severity:** CRITICAL
**Auditors:** INJ-06
**CWE:** CWE-94
**OWASP:** A03:2021 Injection

## Description

Server-Side Template Injection (SSTI) occurs when user input is embedded directly into a template string that is then processed by the server-side template engine. Instead of being treated as data, the input is interpreted as template code, allowing attackers to execute arbitrary code on the server.

In the Node.js ecosystem, SSTI affects all major template engines: Pug (formerly Jade), Handlebars, EJS, Nunjucks, and Mustache. Pug versions before 3.0.1 were directly vulnerable to SSTI allowing RCE through template compilation. EJS has the `outputFunctionName` option that can be exploited via prototype pollution to inject code into rendered templates. Nunjucks allows code execution via `{{ range.constructor("return global.process.mainModule.require('child_process').execSync('id')")() }}`.

The PayloadsAllTheThings repository documents exploitation payloads for each JavaScript template engine. The key pattern is that template engines with code execution capabilities (Pug, EJS, Nunjucks) are dangerous when user input reaches template compilation rather than template data.

## Detection

```
# Template rendering with user input in template string
res\.render\(.*req\.
ejs\.render\(.*req\.
pug\.render\(.*req\.
nunjucks\.renderString\(.*req\.
Handlebars\.compile\(.*req\.
# Template string construction with user input
template.*\$\{.*req\.
`.*\$\{.*req\..*`.*render
# eval/compile in templates
compile\(.*req\.
renderString\(.*req\.
```

## Vulnerable Code

```typescript
import nunjucks from 'nunjucks';

app.get('/greet', (req, res) => {
  const { name } = req.query;
  // VULNERABLE: User input in template string, not template data
  const output = nunjucks.renderString(
    `Hello ${name}!`,  // name IS the template, not data
    {}
  );
  res.send(output);
  // Attacker: ?name={{range.constructor("return global.process.mainModule.require('child_process').execSync('id')")()}}
});

// VULNERABLE: EJS with user-controlled template
import ejs from 'ejs';
app.post('/preview', (req, res) => {
  const { template } = req.body;
  const html = ejs.render(template, { data: someData });
  res.send(html);
});

// VULNERABLE: Pug compilation with user input
import pug from 'pug';
app.get('/page', (req, res) => {
  const { content } = req.query;
  const html = pug.render(content);
  res.send(html);
});
```

## Secure Code

```typescript
import nunjucks from 'nunjucks';

// Configure nunjucks with autoescape and no code execution
const env = nunjucks.configure('views', { autoescape: true });

app.get('/greet', (req, res) => {
  const { name } = req.query;
  // SAFE: User input passed as DATA to a fixed template
  res.render('greet.html', { name: name });
  // Template file: "Hello {{ name }}!"
  // User input is escaped and treated as data, not code
});

// SAFE: Never compile user input as a template
app.post('/preview', (req, res) => {
  const { data } = req.body;
  // Use a predefined template, pass user input as variables
  const html = ejs.renderFile('./templates/preview.ejs', {
    content: data  // Escaped by EJS autoescape
  });
  res.send(html);
});
```

## Impact

Remote code execution on the server. Full system compromise. SSTI directly translates user input into server-side code execution, making it one of the most severe web vulnerabilities.

## References

- CWE-94: Improper Control of Generation of Code
- PayloadsAllTheThings: Server Side Template Injection — JavaScript
- Invicti: Code Execution via SSTI (Node.js Nunjucks)
- Pug SSTI: versions before 3.0.1 vulnerable to RCE
- PortSwigger Web Security Academy: Server-side template injection
- Intigriti: SSTI Advanced Exploitation Guide (2025)
