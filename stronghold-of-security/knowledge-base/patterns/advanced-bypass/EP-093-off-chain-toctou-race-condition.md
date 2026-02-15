# EP-093: Off-Chain TOCTOU / Race Condition
**Category:** Race Conditions  **Severity:** HIGH  **Solana-Specific:** No
**Historical Exploits:** Aurory SyncSpace ($830K, Dec 2023), The Heist ($NANA token price drop, date unknown — confirmed exploit in P2E game with Chimps/Gorillas/NANA economy)

**Description:** Off-chain API endpoint checks balance, then debits in separate non-atomic steps. Concurrent requests pass the check before any debit occurs, inflating balances. Common in hybrid P2E games where off-chain servers bridge to on-chain state.

**Vulnerable Pattern:**
```python
async def buy_item(user_id, item_id, amount):
    balance = await get_balance(user_id)         # Check
    if balance >= price * amount:
        await credit_item(user_id, item_id, amount)  # Act
        await debit_balance(user_id, price * amount)  # Debit
    # BUG: Between check and debit, concurrent requests pass the check!
```
**Secure Pattern:**
```python
async def buy_item(user_id, item_id, amount):
    async with database.transaction() as tx:
        balance = await tx.select_for_update("balances", user_id)  # Row lock
        if balance >= price * amount:
            await tx.credit_item(user_id, item_id, amount)
            await tx.debit_balance(user_id, price * amount)
        # Transaction commit = atomic
```
**Detection:** Review off-chain endpoints for balance check/debit separation. Test concurrent request handling. Check bridges between on-chain and off-chain state.
