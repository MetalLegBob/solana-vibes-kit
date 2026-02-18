# OC-105: Subdomain Takeover via Dangling DNS

**Category:** Web Application Security
**Severity:** HIGH
**Auditors:** WEB-04
**CWE:** CWE-284
**OWASP:** A05:2021 - Security Misconfiguration

## Description

Subdomain takeover occurs when a DNS record (typically a CNAME) points to an external service (cloud provider, SaaS platform, CDN) that has been deprovisioned, but the DNS record was never removed. An attacker can claim the orphaned resource on the external service and serve arbitrary content under the victim's subdomain, inheriting the trust of the parent domain.

APNIC research (2024) conducted a longitudinal study from 2020-2023 identifying 20,904 subdomain hijacks across 12 cloud platforms hosting malicious content in 219 Top-Level Domains. SentinelOne (2025) reframed subdomain takeovers as supply chain attacks, noting that attackers can use hijacked subdomains to distribute malware under trusted domains. Cyber Press (2025) reported that attackers routinely exploit dangling DNS to seize control of organizational subdomains for phishing, SEO spam, and malware distribution.

Common targets include: AWS S3 buckets, Azure Blob Storage, GitHub Pages, Heroku apps, Shopify stores, Zendesk instances, and any cloud service that uses CNAME-based custom domain mapping. The attack is possible because cloud providers typically allow any account to claim an unconfigured custom domain.

## Detection

```
# DNS records in infrastructure configuration
grep -rn "CNAME\|cname" --include="*.tf" --include="*.yaml" --include="*.yml" --include="*.json"

# Cloud service references that may become dangling
grep -rn "s3\.amazonaws\.com\|blob\.core\.windows\.net\|herokuapp\.com\|github\.io\|azurewebsites\.net\|cloudfront\.net\|shopify\.com\|zendesk\.com" --include="*.tf" --include="*.yaml" --include="*.yml" --include="*.json" --include="*.ts" --include="*.js"

# Domain configuration in code
grep -rn "customDomain\|custom_domain\|subdomain" --include="*.tf" --include="*.yaml" --include="*.ts"

# External service cleanup procedures
grep -rn "decommission\|deprecated\|removed\|unused" --include="*.md" --include="*.tf"
```

## Vulnerable Code

```typescript
// Terraform/infrastructure: Dangling DNS example
// The S3 bucket was deleted, but the DNS record remains

// dns.tf - THIS RECORD IS DANGLING
resource "aws_route53_record" "staging" {
  zone_id = aws_route53_zone.main.zone_id
  name    = "staging.example.com"
  type    = "CNAME"
  ttl     = 300
  // VULNERABLE: This bucket no longer exists
  // Attacker creates "staging.example.com" bucket in their AWS account
  records = ["staging.example.com.s3-website-us-east-1.amazonaws.com"]
}

// Application code referencing decommissioned subdomain
const config = {
  // VULNERABLE: staging service was shut down but URL still referenced
  stagingApi: 'https://staging-api.example.com',
  docsUrl: 'https://docs.example.com', // Was GitHub Pages, now unclaimed
};

// Cookie scoped to parent domain -- attacker on subdomain gets cookies
app.use(session({
  cookie: {
    domain: '.example.com', // Includes any takeover subdomain
  },
}));
```

## Secure Code

```typescript
// SECURE: Audit and remove DNS records for decommissioned services

// Automated DNS audit script
import { Route53Client, ListResourceRecordSetsCommand } from '@aws-sdk/client-route-53';

async function auditDanglingRecords(zoneId: string) {
  const client = new Route53Client({});
  const { ResourceRecordSets } = await client.send(
    new ListResourceRecordSetsCommand({ HostedZoneId: zoneId })
  );

  for (const record of ResourceRecordSets || []) {
    if (record.Type === 'CNAME' && record.ResourceRecords) {
      for (const rr of record.ResourceRecords) {
        const target = rr.Value!;
        // Check if the CNAME target is still valid
        try {
          const response = await fetch(`https://${record.Name}`, {
            method: 'HEAD',
            signal: AbortSignal.timeout(5000),
          });

          if (response.status === 404 || !response.ok) {
            console.warn(
              `POTENTIAL DANGLING: ${record.Name} -> ${target} (HTTP ${response.status})`
            );
          }
        } catch (error) {
          console.warn(
            `POTENTIAL DANGLING: ${record.Name} -> ${target} (unreachable)`
          );
        }
      }
    }
  }
}

// Run as scheduled job:
// auditDanglingRecords('Z1234567890');

// SECURE: Do not scope cookies to parent domain
app.use(session({
  cookie: {
    // Omit domain to create host-only cookie
    secure: true,
    httpOnly: true,
    sameSite: 'strict',
  },
}));
```

## Impact

An attacker who takes over a subdomain can: host phishing pages under the trusted domain, steal cookies scoped to the parent domain, bypass CSP policies that allowlist the parent domain, distribute malware that appears to come from the legitimate organization, intercept email if MX records are affected, and damage the organization's reputation. APNIC documented 20,904 such hijacks over a 3-year period.

## References

- APNIC: "Abuse of dangling DNS records on cloud platforms" (2024) -- 20,904 hijacks across 12 platforms
- SentinelOne: "Re-Assessing Risk: Subdomain Takeovers As Supply Chain Attacks" (2025)
- Cyber Press: "Hackers Exploit Dangling DNS to Seize Control of Organization's Subdomain" (2025)
- CWE-284: Improper Access Control
- ThreatNG Security: "Dangling DNS Vulnerability" definition and taxonomy
- REN-ISAC: Subdomain Takeover Advisory
- can-i-take-over-xyz: Community-maintained list of services vulnerable to subdomain takeover
