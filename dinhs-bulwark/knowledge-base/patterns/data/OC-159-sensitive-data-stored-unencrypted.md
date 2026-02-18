# OC-159: Sensitive Data Stored Unencrypted

**Category:** Data Security
**Severity:** HIGH
**Auditors:** DATA-01, DATA-05
**CWE:** CWE-311 (Missing Encryption of Sensitive Data)
**OWASP:** A02:2021 – Cryptographic Failures

## Description

Sensitive data stored without encryption in databases, file systems, or cloud storage is directly accessible to anyone who gains access to the storage medium. This includes database breaches, stolen backups, compromised storage volumes, or misconfigured cloud buckets. Encryption at rest ensures that even if physical or logical access to the storage is obtained, the data remains unintelligible without the decryption keys.

The EY Azure incident (October 2025) is a textbook example: a 4TB SQL Server backup file (.BAK) was found publicly accessible on Azure Blob Storage, containing unencrypted credentials, API keys, session tokens, and potentially millions of financial records. Had the backup been encrypted at rest, the exposure of the file would not have directly compromised the data within. Similarly, Misconfigured AWS S3 Bucket incidents in 2025 exposed over 86,000 healthcare worker records because the data was stored without encryption, meaning public bucket access immediately exposed readable PII.

Applications must encrypt sensitive fields (PII, financial data, credentials) at the application layer, in addition to enabling storage-level encryption (e.g., AWS S3 SSE, RDS encryption, MongoDB field-level encryption).

## Detection

```
grep -rn "\.create\|\.insert\|\.save\|\.update" --include="*.ts" --include="*.js"
grep -rn "ssn\|social_security\|credit_card\|card_number\|bank_account" --include="*.ts" --include="*.js"
grep -rn "encrypt\|decrypt\|cipher\|createCipheriv" --include="*.ts" --include="*.js"
grep -rn "Schema\|model\|define" --include="*.ts" --include="*.js"
```

Look for: sensitive field names (SSN, credit card, bank account) stored as plain String/VARCHAR types in schemas without any encryption/decryption wrapper. Absence of any `crypto` import or encryption utility in models that handle PII.

## Vulnerable Code

```typescript
import { Schema, model } from "mongoose";

// VULNERABLE: PII stored as plain text in MongoDB
const userSchema = new Schema({
  email: { type: String, required: true },
  name: String,
  ssn: String,                    // Social Security Number — unencrypted
  creditCardNumber: String,       // Credit card — unencrypted
  bankAccountNumber: String,      // Bank account — unencrypted
  dateOfBirth: Date,
});

const User = model("User", userSchema);

// Any database breach exposes all PII in readable form
await User.create({
  email: "jane@example.com",
  name: "Jane Doe",
  ssn: "123-45-6789",
  creditCardNumber: "4111111111111111",
  bankAccountNumber: "9876543210",
  dateOfBirth: new Date("1990-01-15"),
});
```

## Secure Code

```typescript
import { Schema, model } from "mongoose";
import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const ALGORITHM = "aes-256-gcm";
const KEY = Buffer.from(process.env.FIELD_ENCRYPTION_KEY!, "hex"); // 32 bytes

function encryptField(plaintext: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGORITHM, KEY, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${tag.toString("hex")}:${encrypted.toString("hex")}`;
}

function decryptField(ciphertext: string): string {
  const [ivHex, tagHex, encHex] = ciphertext.split(":");
  const decipher = createDecipheriv(ALGORITHM, KEY, Buffer.from(ivHex, "hex"));
  decipher.setAuthTag(Buffer.from(tagHex, "hex"));
  return decipher.update(encHex, "hex", "utf8") + decipher.final("utf8");
}

// SECURE: Sensitive fields encrypted before storage
const userSchema = new Schema({
  email: { type: String, required: true },
  name: String,
  ssnEncrypted: String,
  creditCardEncrypted: String,
  dateOfBirth: Date,
});

userSchema.pre("save", function () {
  if (this.isModified("ssnEncrypted") && !this.ssnEncrypted?.includes(":")) {
    this.ssnEncrypted = encryptField(this.ssnEncrypted!);
  }
});

const User = model("User", userSchema);
```

## Impact

A database breach, stolen backup, or misconfigured storage access exposes all sensitive data in readable form. This includes PII (Social Security numbers, medical records), financial data (credit card numbers, bank accounts), and credentials. Regulatory fines under GDPR can reach 4% of annual global turnover. PCI DSS non-compliance can result in loss of payment processing ability.

## References

- EY Azure Exposure (October 2025): 4TB unencrypted SQL Server backup publicly accessible
- Misconfigured AWS S3 Bucket (March 2025): 86,000 healthcare records exposed
- CWE-311: Missing Encryption of Sensitive Data — https://cwe.mitre.org/data/definitions/311.html
- OWASP A02:2021 – Cryptographic Failures
- MongoDB Client-Side Field Level Encryption documentation
