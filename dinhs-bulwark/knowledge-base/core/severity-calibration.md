# Off-Chain Severity Calibration Guide
<!-- Adapted for off-chain code: backends, APIs, bots, frontends, infrastructure -->
<!-- Last updated: 2026-02-18 -->

## Severity Framework

### Impact x Likelihood Matrix

| Impact \ Likelihood | Probable | Possible | Unlikely | Rare |
|---------------------|----------|----------|----------|------|
| **Severe** | CRITICAL | HIGH | MEDIUM | LOW |
| **High** | HIGH | MEDIUM | MEDIUM | LOW |
| **Medium** | MEDIUM | MEDIUM | LOW | INFO |
| **Low** | LOW | LOW | INFO | INFO |

### Severity Definitions — Off-Chain Context

**CRITICAL** — Complete compromise of funds, credentials, or system control
- Direct loss of funds via key compromise or transaction manipulation
- Remote code execution (RCE) on backend servers
- Full database breach exposing all user data
- Authentication bypass granting admin access
- Private key extraction from production systems
- Example: Hardcoded private key in client bundle (OC-001)
- Example: SQL injection with database admin privileges (OC-049)
- Example: Command injection on backend server (OC-055)

**HIGH** — Major loss or disruption requiring urgent attention
- Fund loss requiring specific but achievable preconditions
- Partial data breach (subset of users, limited data types)
- Session hijacking or credential theft at scale
- SSRF accessing cloud metadata/internal services
- Bot/keeper logic flaw causing financial damage
- Trading bot executing with wrong slippage (sandwich attack enabler)
- Example: JWT algorithm confusion (none/HS256) (OC-025)
- Example: SSRF to cloud metadata endpoint (OC-057)
- Example: Race condition in balance check → withdrawal (OC-200)

**MEDIUM** — Limited or situational risk affecting part of the system
- XSS in authenticated context (stored or reflected)
- CSRF on non-critical state-changing endpoints
- Information disclosure of internal architecture
- Missing rate limiting on sensitive endpoints
- Stale on-chain data used in non-critical decisions
- Insecure direct object reference (IDOR) for non-sensitive data
- Example: Reflected XSS in search parameter (OC-093)
- Example: CORS misconfiguration with credentials (OC-098)
- Example: Missing rate limit on password reset (OC-180)

**LOW** — Minor inefficiencies or best-practice improvements
- Information disclosure of software versions
- Missing security headers (non-exploitable context)
- Verbose error messages without sensitive data
- Debug endpoints behind authentication
- Outdated dependency with no known exploit path
- Example: Missing X-Content-Type-Options header (OC-100)
- Example: Source maps served in production (OC-120)

**INFORMATIONAL** — Observations and recommendations
- Code quality suggestions
- Documentation gaps
- Defense-in-depth recommendations
- Performance observations

---

## Off-Chain vs On-Chain Severity Calibration

### Why Off-Chain Severity Is Different

Off-chain vulnerabilities often have **different blast radius** than on-chain:

| Factor | On-Chain (SOS) | Off-Chain (DB) |
|--------|---------------|---------------|
| Immutability | Deployed code is permanent | Can hot-fix in minutes |
| Blast radius | All users of the program | Depends on component |
| Attribution | Pseudonymous (hard to trace) | IP-based (easier to trace) |
| Reversibility | Usually irreversible | Sometimes reversible (refunds, rollbacks) |
| Attack cost | Just gas/priority fees | May need infrastructure |
| Defense layers | Only the program code | WAF, rate limits, monitoring, etc. |

### Severity Adjustments for Off-Chain

**Upgrade if:**
- Vulnerability provides access to private keys or signing operations
- Off-chain vulnerability undermines on-chain security assumptions
- Automated exploitation is trivial (scriptable, no interaction)
- Affects financial operations (deposits, withdrawals, trading)
- Data breach involves credentials, keys, or financial data

**Downgrade if:**
- Requires physical access or insider position
- Protected by additional defense layers (WAF, rate limiting)
- Can be hot-fixed before exploitation (with monitoring in place)
- Affects only non-sensitive, non-financial operations
- Requires social engineering as a prerequisite

---

## Impact Categories for Off-Chain Code

### 1. Fund Impact
- **Direct fund loss:** Key compromise → wallet drain
- **Indirect fund loss:** Bot logic flaw → bad trades
- **Transaction manipulation:** Modified instructions before signing
- **Fee exploitation:** Attacker profits from fee manipulation

### 2. Data Impact
- **Full breach:** All user data exposed
- **Partial breach:** Subset of data exposed
- **Credential leak:** API keys, tokens, passwords
- **Key material leak:** Private keys, mnemonics, seeds

### 3. Availability Impact
- **Service outage:** Full application unavailable
- **Partial degradation:** Some features unavailable
- **Resource exhaustion:** Slow but functional
- **Automation failure:** Keeper/crank stops operating

### 4. Integrity Impact
- **State corruption:** Database/cache poisoned
- **Transaction integrity:** Modified transactions submitted
- **Data integrity:** On-chain/off-chain state desync
- **Trust model breach:** Bypass of intended access controls

---

## Cross-Boundary Severity (On-Chain + Off-Chain)

When a finding spans the on-chain/off-chain boundary:

| Off-Chain Finding | On-Chain Effect | Combined Severity |
|-------------------|----------------|-------------------|
| Key compromise | Fund drainage | CRITICAL (escalate) |
| Transaction manipulation | Wrong instructions executed | CRITICAL (escalate) |
| RPC response spoofing | Bad data used in TX construction | HIGH → CRITICAL |
| Stale state cache | Incorrect program interactions | MEDIUM → HIGH |
| Frontend XSS | Wallet transaction approval | MEDIUM → HIGH |
| Missing auth | Unauthorized program calls | Depends on program |

**Rule:** If off-chain vulnerability enables on-chain fund loss, always escalate to at least HIGH.
