# OC-161: Migration with Destructive Operation (No Safeguard)

**Category:** Data Security
**Severity:** MEDIUM
**Auditors:** DATA-01
**CWE:** CWE-404 (Improper Resource Shutdown or Release), CWE-1188 (Initialization with an Insecure Default)
**OWASP:** A05:2021 – Security Misconfiguration

## Description

Database migrations that contain destructive operations (DROP TABLE, DROP COLUMN, TRUNCATE, DELETE without WHERE) without safeguards can cause irreversible data loss when applied in production. This includes accidental execution of down-migrations, applying migrations intended for development to production databases, or migration scripts that remove columns containing data that should have been preserved or archived first.

A common anti-pattern in Node.js applications using Prisma, Knex, TypeORM, or Sequelize is using `synchronize: true` or `migrate: latest` in production startup, which automatically applies all pending migrations including potentially destructive ones without human review. Another dangerous pattern is ORMs that generate migrations from schema diffs and automatically produce DROP statements when a field is renamed rather than renamed.

The risk is amplified when migration scripts run with elevated database privileges (see OC-160), as the migration user typically needs DDL permissions that the application user should not have. Without a separate review process for destructive migrations, a single faulty migration can destroy production data.

## Detection

```
grep -rn "DROP TABLE\|DROP COLUMN\|TRUNCATE\|DELETE FROM" --include="*.ts" --include="*.js" --include="*.sql"
grep -rn "synchronize.*true\|sync.*force.*true\|sync.*alter.*true" --include="*.ts" --include="*.js"
grep -rn "migrate.*latest\|runMigrations\|db:migrate" --include="*.ts" --include="*.js" --include="*.json"
grep -rn "dropTable\|dropColumn\|removeColumn\|dropSchema" --include="*.ts" --include="*.js"
```

Look for: migration files containing DROP/TRUNCATE without corresponding backup steps, ORM synchronize in production configuration, automated migration execution in application startup code, migrations that lack down/rollback functions.

## Vulnerable Code

```typescript
import { MigrationInterface, QueryRunner } from "typeorm";

// VULNERABLE: Destructive migration with no safeguard
export class RemoveOldUserData1234567890 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    // Drops column with no data backup
    await queryRunner.query("ALTER TABLE users DROP COLUMN legacy_data");
    // Drops entire table with no archive
    await queryRunner.query("DROP TABLE audit_logs");
    // Truncates without condition
    await queryRunner.query("TRUNCATE TABLE sessions");
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    // Data is gone — rollback cannot restore it
  }
}

// VULNERABLE: Auto-sync in production
const dataSource = new DataSource({
  type: "postgres",
  synchronize: true, // Automatically alters schema in production
});
```

## Secure Code

```typescript
import { MigrationInterface, QueryRunner } from "typeorm";

// SECURE: Destructive migration with safeguards
export class RemoveOldUserData1234567890 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    // Step 1: Archive data before removal
    await queryRunner.query(`
      CREATE TABLE archive.audit_logs_20260218 AS
      SELECT * FROM audit_logs
    `);

    // Step 2: Rename instead of drop (soft delete)
    await queryRunner.query(`
      ALTER TABLE users RENAME COLUMN legacy_data TO legacy_data_deprecated
    `);

    // Step 3: Only drop after verification period (separate migration)
    // await queryRunner.query("ALTER TABLE users DROP COLUMN legacy_data_deprecated");
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE users RENAME COLUMN legacy_data_deprecated TO legacy_data
    `);
  }
}

// SECURE: Never auto-sync in production
const dataSource = new DataSource({
  type: "postgres",
  synchronize: process.env.NODE_ENV === "development", // Only in dev
  migrationsRun: false, // Migrations run manually via CLI
});
```

## Impact

Destructive migrations can cause permanent data loss, including user data, audit trails, financial records, and compliance-relevant information. If applied automatically in production, there may be no opportunity to verify or roll back. Data loss can violate data retention regulations, break audit trails, and damage customer trust.

## References

- CWE-404: Improper Resource Shutdown or Release — https://cwe.mitre.org/data/definitions/404.html
- OWASP A05:2021 – Security Misconfiguration
- TypeORM documentation: Warning against synchronize in production
- Prisma migration best practices: https://www.prisma.io/docs/guides/deployment
