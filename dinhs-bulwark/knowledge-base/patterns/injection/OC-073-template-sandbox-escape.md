# OC-073: Template Sandbox Escape

**Category:** Injection
**Severity:** CRITICAL
**Auditors:** INJ-06
**CWE:** CWE-94
**OWASP:** A03:2021 Injection

## Description

Template sandbox escape occurs when an attacker breaks out of a template engine's restricted execution environment to access the underlying runtime. Template engines like Nunjucks, Handlebars, and Pug implement sandboxes to limit what template code can do, but these sandboxes are frequently bypassed through prototype chain traversal, constructor access, or undocumented features.

The classic escape pattern in JavaScript template engines uses constructor chains: `{{ "".constructor.constructor("return process")() }}` accesses `String.constructor` (which is `Function`), then calls the `Function` constructor with arbitrary code. Variations include accessing `global`, `process`, or `require` through `range.constructor`, `__lookupGetter__`, or `__proto__` chains.

Handlebars had multiple sandbox escapes, including CVE-2021-23369 and CVE-2021-23383, where specially crafted templates could execute arbitrary code despite the sandbox. EJS's `outputFunctionName` option was exploitable via prototype pollution to inject code into the compiled template function. The vm/vm2 modules, often used as sandboxes, have been repeatedly broken — vm2 was archived after CVE-2023-37466 demonstrated yet another escape.

## Detection

```
# Sandbox escape patterns in templates
constructor\.constructor
\.__proto__
__lookupGetter__
__defineGetter__
# vm/vm2 sandbox usage
require\(['"]vm2?['"]\)
vm\.createContext
vm\.runInNewContext
vm2\.VM\(
# Template engines with user-defined templates
Handlebars\.compile\(
nunjucks\.renderString\(
# EJS options pollution
outputFunctionName
```

## Vulnerable Code

```typescript
import Handlebars from 'handlebars';

// VULNERABLE: User-supplied template with "safe" sandbox
app.post('/render', (req, res) => {
  const { template, data } = req.body;
  const compiled = Handlebars.compile(template);
  const html = compiled(data);
  res.send(html);
  // Attacker template escapes sandbox:
  // {{#with "s" as |string|}}
  //   {{#with "e"}}
  //     {{#with split as |conslist|}}
  //       {{this.pop}}
  //       {{#with string.split as |codelist|}}
  //         {{this.pop}}
  //         {{#with (string.sub.apply 0 codelist)}}
  //           {{#with (string.sub.apply 0 conslist)}}
  //             {{this.toString}}
  //           {{/with}}
  //         {{/with}}
  //       {{/with}}
  //     {{/with}}
  //   {{/with}}
  // {{/with}}
});

// VULNERABLE: vm2 sandbox (archived, known bypasses)
import { VM } from 'vm2';
const vm = new VM({ sandbox: {} });
const result = vm.run(userCode);
```

## Secure Code

```typescript
import Handlebars from 'handlebars';

// SAFE: Pre-defined templates only, user provides data not templates
const TEMPLATES = new Map<string, HandlebarsTemplateDelegate>();

// Compile templates at startup, not at runtime
function loadTemplates() {
  const files = fs.readdirSync('./templates');
  for (const file of files) {
    const content = fs.readFileSync(`./templates/${file}`, 'utf8');
    TEMPLATES.set(file, Handlebars.compile(content));
  }
}

app.post('/render', (req, res) => {
  const { templateName, data } = req.body;
  const template = TEMPLATES.get(templateName);
  if (!template) {
    return res.status(404).json({ error: 'Template not found' });
  }
  // SAFE: User provides data only, not the template itself
  const html = template(sanitizeData(data));
  res.send(html);
});

// If user templates are truly needed, use logic-less Mustache
import Mustache from 'mustache';
// Mustache has no code execution — only variable substitution
const output = Mustache.render('Hello {{name}}', { name: userInput });
```

## Impact

Full remote code execution. Sandbox escapes give attackers access to `process`, `require`, and `child_process`, enabling complete server compromise. Sandbox bypass techniques are actively researched and new escapes are regularly discovered.

## References

- CVE-2021-23369: Handlebars template sandbox escape to RCE
- CVE-2021-23383: Handlebars prototype access sandbox bypass
- CVE-2023-37466: vm2 sandbox escape (project archived)
- CWE-94: Improper Control of Generation of Code
- PayloadsAllTheThings: SSTI JavaScript sandbox escapes
