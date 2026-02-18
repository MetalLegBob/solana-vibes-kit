# OC-181: PII Stored Without Encryption

**Category:** Data Security
**Severity:** HIGH
**Auditors:** DATA-06
**CWE:** CWE-312 (Cleartext Storage of Sensitive Information)
**OWASP:** A02:2021 – Cryptographic Failures

## Description

Personally Identifiable Information (PII) — names, email addresses, Social Security numbers, dates of birth, physical addresses, phone numbers, financial account numbers — stored in databases without field-level encryption is exposed in its entirety when the database is compromised, backed up, or accessed by overly permissive accounts.

While storage-level encryption (OC-180) protects against physical media theft, it does not protect against logical access: a SQL injection, credential theft, or insider threat grants access to plaintext PII directly. Field-level encryption ensures that even authorized database access shows only ciphertext for sensitive fields, requiring the application's encryption key to reveal the actual values.

The scale of PII exposure in data breaches is staggering: 86,000 healthcare worker records were exposed in a March 2025 S3 misconfiguration including names, addresses, and SSNs. GDPR enforcement reached EUR 2.1 billion in fines in 2024 (GDPR Enforcement Tracker), with Meta fined EUR 1.2 billion for data transfer violations. The Hamburg Commissioner for Data Protection imposed a EUR 900,000 fine on a debt collection company for retaining personal data beyond statutory deletion periods (2024), demonstrating that mere storage of unprotected PII creates regulatory liability.

Applications must classify data fields by sensitivity, encrypt PII at the application layer, and maintain separate encryption keys that can be rotated independently.

## Detection

```
grep -rn "ssn\|socialSecurity\|social_security\|taxId\|tax_id" --include="*.ts" --include="*.js"
grep -rn "dateOfBirth\|date_of_birth\|dob\|birthDate" --include="*.ts" --include="*.js"
grep -rn "creditCard\|credit_card\|cardNumber\|card_number" --include="*.ts" --include="*.js"
grep -rn "phoneNumber\|phone_number\|address\|email" --include="*.ts" --include="*.js"
grep -rn "Schema\|Column\|model\|define\|createTable" --include="*.ts" --include="*.js"
```

Look for: database schema definitions with PII fields typed as plain String/VARCHAR/TEXT without encryption wrappers, model definitions that store PII without pre-save encryption hooks, migration files that create PII columns without encryption.

## Vulnerable Code

```typescript
import { Entity, Column, PrimaryGeneratedColumn } from "typeorm";

// VULNERABLE: All PII stored as plaintext in database
@Entity()
export class Customer {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column()
  fullName: string;        // PII: plaintext

  @Column()
  email: string;           // PII: plaintext

  @Column()
  ssn: string;             // Highly sensitive PII: plaintext

  @Column()
  dateOfBirth: Date;       // PII: plaintext

  @Column()
  phoneNumber: string;     // PII: plaintext

  @Column({ type: "text" })
  homeAddress: string;     // PII: plaintext

  @Column()
  creditCardLast4: string; // Financial data: plaintext
}

// SELECT * FROM customer; → all PII visible to anyone with DB access
```

## Secure Code

```typescript
import { Entity, Column, PrimaryGeneratedColumn, BeforeInsert, BeforeUpdate } from "typeorm";
import { encryptField, decryptField, hashField } from "../utils/encryption";

// SECURE: Sensitive fields encrypted at application layer
@Entity()
export class Customer {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column()
  fullName: string; // Keep searchable (consider tokenization for search)

  @Column({ unique: true })
  emailHash: string; // Blind index for lookups

  @Column()
  emailEncrypted: string; // AES-256-GCM encrypted email

  @Column()
  ssnEncrypted: string; // AES-256-GCM encrypted SSN

  @Column()
  ssnHash: string; // HMAC blind index for lookups

  @Column()
  dateOfBirthEncrypted: string; // Encrypted

  @Column()
  phoneEncrypted: string; // Encrypted

  @Column({ type: "text" })
  addressEncrypted: string; // Encrypted

  @BeforeInsert()
  @BeforeUpdate()
  encryptFields() {
    if (this.emailEncrypted && !this.emailEncrypted.includes(":")) {
      this.emailHash = hashField(this.emailEncrypted);
      this.emailEncrypted = encryptField(this.emailEncrypted);
    }
    if (this.ssnEncrypted && !this.ssnEncrypted.includes(":")) {
      this.ssnHash = hashField(this.ssnEncrypted);
      this.ssnEncrypted = encryptField(this.ssnEncrypted);
    }
  }

  // Decrypt only when explicitly needed
  getDecryptedEmail(): string {
    return decryptField(this.emailEncrypted);
  }
}

// SELECT * FROM customer; → SSN, email, phone, address all show encrypted values
```

## Impact

A database breach exposes all stored PII in readable form, triggering mandatory breach notification requirements under GDPR (72-hour notification), CCPA, HIPAA, and state breach notification laws. Regulatory fines can reach 4% of annual global turnover under GDPR. Individual identity theft impacts customers directly. Encrypted PII limits breach impact to encrypted data, potentially avoiding notification requirements if the encryption key was not compromised.

## References

- AWS S3 Healthcare Records Exposure (March 2025): 86,000 records with SSN exposed
- Hamburg Data Protection Fine (2024): EUR 900,000 for retaining PII beyond deletion periods
- GDPR Enforcement Tracker: EUR 2.1 billion in fines in 2024
- CWE-312: Cleartext Storage of Sensitive Information — https://cwe.mitre.org/data/definitions/312.html
- OWASP A02:2021 – Cryptographic Failures
