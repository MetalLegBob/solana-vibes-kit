# AI-Generated Code Pitfalls

Common security mistakes made by AI code generators (ChatGPT, Claude, Copilot, etc.) organized by off-chain security domain. Each auditor agent receives the pitfalls checklist for its domain to specifically watch for these patterns.

## Why This Matters

AI-generated code is increasingly common in production codebases. LLMs consistently make certain categories of security mistakes because they optimize for "working code" over "secure code." These pitfalls are patterns we've observed repeatedly in AI-generated off-chain code.

## Domain Files

| File | Category | Auditors |
|------|----------|----------|
| `secrets.md` | Secrets & Credentials | SEC-01, SEC-02 |
| `auth.md` | Authentication & Authorization | AUTH-01 through AUTH-04 |
| `injection.md` | Injection | INJ-01 through INJ-06 |
| `web.md` | Web Application Security | WEB-01 through WEB-04 |
| `blockchain.md` | Blockchain Interaction | CHAIN-01 through CHAIN-06 |
| `api-network.md` | API & Network | API-01 through API-05 |
| `data.md` | Data Security | DATA-01 through DATA-06 |
| `frontend.md` | Frontend & Client | FE-01 through FE-03 |
| `infrastructure.md` | Infrastructure | INFRA-01 through INFRA-05 |
| `supply-chain.md` | Supply Chain & Dependencies | DEP-01 |
| `automation.md` | Automation & Bots | BOT-01 through BOT-03 |
| `error-handling.md` | Error Handling & Resilience | ERR-01 through ERR-03 |
| `crypto.md` | Cryptographic Operations | CRYPTO-01 |
| `business-logic.md` | Business Logic | LOGIC-01, LOGIC-02 |

## How Auditors Use These

During Phase 1 (analyze), each context auditor agent reads the pitfalls file for its domain. When analyzing code, the agent specifically checks whether any of these AI-generated patterns are present, giving them extra scrutiny because:

1. They look correct at first glance
2. They often pass basic tests
3. They may have been copy-pasted without security review
4. The developer may trust AI output more than hand-written code
