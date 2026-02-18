# OC-020: No Key Access Audit Trail

**Category:** Secrets & Credentials
**Severity:** MEDIUM
**Auditors:** SEC-01
**CWE:** CWE-778 (Insufficient Logging)
**OWASP:** A09:2021 – Security Logging and Monitoring Failures

## Description

When cryptographic key access is not logged or audited, organizations cannot detect unauthorized key usage, investigate breaches, or prove compliance with security policies. Without an audit trail, a compromised key can be used repeatedly without triggering alerts, and post-incident forensics becomes nearly impossible.

Key access auditing means logging every instance where a private key is loaded, used for signing, or accessed by a service — without logging the key material itself. This includes: which service requested the key, when, from what IP, for what purpose, and whether the operation succeeded.

The Bybit incident analysis (February 2025) highlighted that the attack went undetected during its execution phase partly because signing operations did not have sufficient real-time monitoring. Chainalysis emphasized in their 2025 report that organizations with comprehensive audit trails and anomaly detection recovered from incidents significantly faster and limited losses more effectively than those without.

In the Solana off-chain context, this means logging every transaction signing event, every keypair load operation, and every administrative key access, with alerts on anomalous patterns such as unusual signing frequency, unexpected signing sources, or out-of-hours operations.

## Detection

```
grep -rn "audit\|log.*sign\|log.*key\|track.*access\|monitor.*key" --include="*.ts" --include="*.js"
grep -rn "sign\(.*\)\|signTransaction\|signAllTransactions" --include="*.ts" --include="*.js"
```

Look for absence of: logging around key loading operations, audit events for signing operations, alerting on anomalous key usage patterns, centralized key access log aggregation. Check that signing functions include logging of: caller identity, timestamp, transaction summary (not the key itself), and operation result.

## Vulnerable Code

```typescript
import { Keypair, Transaction, Connection } from "@solana/web3.js";

// VULNERABLE: No logging or audit trail for key operations
class TransactionSigner {
  private keypair: Keypair;

  constructor() {
    this.keypair = loadKeypair();
    // No log of key being loaded
  }

  async signAndSend(tx: Transaction): Promise<string> {
    tx.sign(this.keypair);
    const connection = new Connection(process.env.RPC_URL!);
    // No log of what was signed, by whom, or why
    return connection.sendRawTransaction(tx.serialize());
  }
}
```

## Secure Code

```typescript
import { Keypair, Transaction, Connection } from "@solana/web3.js";

interface SigningAuditEvent {
  timestamp: string;
  service: string;
  signerPublicKey: string;
  transactionSignature?: string;
  instructionSummary: string;
  callerIp?: string;
  result: "success" | "failure";
  error?: string;
}

class AuditedTransactionSigner {
  private keypair: Keypair;
  private serviceName: string;
  private logger: AuditLogger;

  constructor(serviceName: string) {
    this.serviceName = serviceName;
    this.keypair = loadKeypair();
    this.logger = new AuditLogger();

    // Log key loading event
    this.logger.logKeyAccess({
      timestamp: new Date().toISOString(),
      service: serviceName,
      signerPublicKey: this.keypair.publicKey.toBase58(),
      event: "keypair_loaded",
    });
  }

  async signAndSend(tx: Transaction, purpose: string): Promise<string> {
    const auditEvent: SigningAuditEvent = {
      timestamp: new Date().toISOString(),
      service: this.serviceName,
      signerPublicKey: this.keypair.publicKey.toBase58(),
      instructionSummary: purpose,
      result: "success",
    };

    try {
      tx.sign(this.keypair);
      const connection = new Connection(process.env.RPC_URL!);
      const sig = await connection.sendRawTransaction(tx.serialize());
      auditEvent.transactionSignature = sig;
      this.logger.logSigning(auditEvent);

      // Alert on anomalous patterns
      await this.logger.checkAnomalies(this.serviceName);
      return sig;
    } catch (error) {
      auditEvent.result = "failure";
      auditEvent.error = (error as Error).message;
      this.logger.logSigning(auditEvent);
      throw error;
    }
  }
}
// NOTE: Never log the private key itself — only the public key and operation metadata
```

## Impact

Without an audit trail, unauthorized key usage goes undetected. Compromised keys can be exploited for extended periods because there are no alerts to trigger investigation. Post-incident response is severely hampered: the organization cannot determine what was signed, when, or by whom. This delays key rotation, makes it impossible to assess the scope of damage, and prevents effective incident response. Regulatory and compliance frameworks (SOC 2, ISO 27001) require key access auditing.

## References

- Bybit incident analysis: Insufficient signing monitoring during attack execution (February 2025)
- Chainalysis 2025: Organizations with audit trails recover faster from incidents
- CWE-778: Insufficient Logging — https://cwe.mitre.org/data/definitions/778.html
- OWASP A09:2021: Security Logging and Monitoring Failures
- NIST SP 800-57: Key Management — audit requirements for cryptographic key lifecycle
