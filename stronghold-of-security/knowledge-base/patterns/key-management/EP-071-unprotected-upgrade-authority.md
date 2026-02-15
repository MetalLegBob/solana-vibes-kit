# EP-071: Unprotected Upgrade Authority
**Category:** Key Management  **Severity:** CRITICAL  **Solana-Specific:** Yes
**Historical Exploits:** OptiFi ($661K, Sep 2022) - accidental program close

**Description:** Program upgrade authority is single keypair. `program close` is irreversible.

**Vulnerable Pattern:**
```bash
solana program deploy --upgrade-authority keypair.json # Single key!
```
**Secure Pattern:**
```bash
solana program set-upgrade-authority <PROG> --new-upgrade-authority <MULTISIG>
# Or: solana program set-upgrade-authority <PROG> --final
```
**Detection:** Check upgrade authority is multisig or immutable.
