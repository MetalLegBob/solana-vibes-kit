# OC-050: SQL Injection via ORM Raw Query

**Category:** Injection
**Severity:** HIGH
**Auditors:** INJ-01
**CWE:** CWE-89
**OWASP:** A03:2021 Injection

## Description

ORM libraries like Sequelize, TypeORM, Prisma, and Knex provide safe query-building abstractions, but all offer escape hatches for raw SQL. When developers use these raw query methods with string interpolation, they bypass the ORM's built-in parameterization and introduce SQL injection vulnerabilities.

This is particularly insidious because ORMs create a false sense of security. Developers assume the ORM handles escaping everywhere, but raw query methods are often just thin wrappers around the database driver. CVE-2023-25813 demonstrated this in Sequelize where the `replacements` feature did not properly escape parameters when combined with the `where` option, leading to a CVSS 9.8 critical vulnerability.

Prisma's `$queryRaw` and `$executeRaw` with tagged template literals are safe, but `$queryRawUnsafe` and `$executeRawUnsafe` are explicitly unsafe and require manual parameterization.

## Detection

```
# Sequelize raw queries
sequelize.query(
Sequelize.literal(
# TypeORM raw queries
.query(`
createQueryBuilder.*where\(.*\$\{
getRepository.*query\(
# Prisma unsafe raw
$queryRawUnsafe
$executeRawUnsafe
# Knex raw
knex.raw(`.*\$\{
.whereRaw(`.*\$\{
```

## Vulnerable Code

```typescript
// Sequelize - vulnerable raw query
const results = await sequelize.query(
  `SELECT * FROM users WHERE email = '${req.body.email}'`
);

// TypeORM - vulnerable query builder
const users = await userRepository.query(
  `SELECT * FROM users WHERE role = '${req.params.role}'`
);

// Prisma - using the explicitly unsafe method
const data = await prisma.$queryRawUnsafe(
  `SELECT * FROM orders WHERE status = '${status}'`
);

// Knex - vulnerable raw
const rows = await knex.raw(
  `SELECT * FROM products WHERE name LIKE '%${search}%'`
);
```

## Secure Code

```typescript
// Sequelize - bind parameters
const results = await sequelize.query(
  'SELECT * FROM users WHERE email = $email',
  { bind: { email: req.body.email } }
);

// TypeORM - parameterized query
const users = await userRepository.query(
  'SELECT * FROM users WHERE role = $1', [req.params.role]
);

// Prisma - safe tagged template (auto-parameterized)
const data = await prisma.$queryRaw`
  SELECT * FROM orders WHERE status = ${status}
`;

// Knex - bindings
const rows = await knex.raw(
  'SELECT * FROM products WHERE name LIKE ?', [`%${search}%`]
);
```

## Impact

Same as standard SQL injection: full database compromise, authentication bypass, data exfiltration. The ORM context makes this harder to detect in code review because reviewers may trust that the ORM handles escaping.

## References

- CVE-2023-25813: Sequelize replacements SQL injection (CVSS 9.8)
- CVE-2023-22578: Sequelize SQL injection via string replacement
- Prisma docs: Raw database access — $queryRawUnsafe warning
- OWASP: ORM Injection
- Snyk Blog: Sequelize ORM npm library found vulnerable to SQL injection attacks
