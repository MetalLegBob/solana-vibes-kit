# OC-075: LDAP Injection

**Category:** Injection
**Severity:** HIGH
**Auditors:** INJ-01
**CWE:** CWE-90
**OWASP:** A03:2021 Injection

## Description

LDAP injection occurs when user-supplied input is incorporated into LDAP queries without proper sanitization. LDAP (Lightweight Directory Access Protocol) is widely used for authentication and directory lookups in enterprise applications. When Node.js applications integrate with Active Directory or other LDAP directories, string-concatenated LDAP filter expressions are vulnerable to injection.

The attack uses LDAP metacharacters like `*`, `(`, `)`, `\`, and NUL bytes to modify query logic. For example, injecting `*)(uid=*))(|(uid=*` into a username field can bypass authentication by creating a filter that always matches. LDAP injection in authentication flows can lead to unauthorized access as any user.

Node.js libraries like `ldapjs`, `activedirectory2`, and `passport-ldapauth` are commonly used for LDAP integration. The `ldapjs` library provides `ldap.filters` for safe filter construction, but many developers build filters via string concatenation.

## Detection

```
# LDAP library usage
require\(['"]ldapjs['"]\)
require\(['"]activedirectory['"]\)
require\(['"]passport-ldapauth['"]\)
# String-built LDAP filters
\(uid=.*\$\{
\(cn=.*\$\{
\(sAMAccountName=.*\+
\(mail=.*\$\{
# LDAP filter construction
filter:.*`.*\$\{
searchFilter.*req\.(body|query|params)
```

## Vulnerable Code

```typescript
import ldap from 'ldapjs';

const client = ldap.createClient({ url: 'ldap://ad.company.com' });

app.post('/login', (req, res) => {
  const { username, password } = req.body;
  // VULNERABLE: User input in LDAP filter string
  const filter = `(&(uid=${username})(userPassword=${password}))`;

  client.search('dc=company,dc=com', { filter, scope: 'sub' },
    (err, searchRes) => {
      searchRes.on('searchEntry', (entry) => {
        res.json({ authenticated: true, user: entry.object });
      });
      searchRes.on('end', () => {
        res.status(401).json({ error: 'Invalid credentials' });
      });
    }
  );
  // Attacker: username = "admin)(|(uid=*"
  // Filter becomes: (&(uid=admin)(|(uid=*)(userPassword=anything))
});
```

## Secure Code

```typescript
import ldap from 'ldapjs';

// SAFE: Escape LDAP special characters
function escapeLdapFilter(input: string): string {
  return input.replace(/[\\*()\0/]/g, (char) => {
    return '\\' + char.charCodeAt(0).toString(16).padStart(2, '0');
  });
}

app.post('/login', (req, res) => {
  const { username, password } = req.body;

  // Validate input format
  if (!/^[a-zA-Z0-9._-]+$/.test(username)) {
    return res.status(400).json({ error: 'Invalid username format' });
  }

  // SAFE: Escaped filter + bind authentication
  const escapedUser = escapeLdapFilter(username);
  const filter = `(uid=${escapedUser})`;

  client.search('dc=company,dc=com', { filter, scope: 'sub' },
    (err, searchRes) => {
      searchRes.on('searchEntry', (entry) => {
        // SAFE: Use LDAP bind for password verification
        client.bind(entry.object.dn, password, (bindErr) => {
          if (bindErr) return res.status(401).json({ error: 'Failed' });
          res.json({ authenticated: true });
        });
      });
    }
  );
});
```

## Impact

Authentication bypass allowing login as any LDAP user including administrators. Information disclosure of directory entries. In some LDAP implementations, modification of directory entries.

## References

- CWE-90: Improper Neutralization of Special Elements used in an LDAP Query
- OWASP: LDAP Injection
- OWASP: LDAP Injection Prevention Cheat Sheet
- ldapjs documentation: filter construction best practices
