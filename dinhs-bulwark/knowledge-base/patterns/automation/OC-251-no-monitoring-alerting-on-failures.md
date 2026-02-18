# OC-251: No Monitoring/Alerting on Failures

**Category:** Automation & Bots
**Severity:** MEDIUM
**Auditors:** BOT-01
**CWE:** CWE-778 — Insufficient Logging
**OWASP:** A09:2021 — Security Logging and Monitoring Failures

## Description

Automated bots and keepers that operate without monitoring and alerting infrastructure can silently fail, accumulate losses, or be exploited without the operator ever knowing. In the crypto bot space, "silent failures" are particularly dangerous because every minute of undetected malfunction represents potential financial loss or missed opportunities.

A keeper bot that stops cranking a DeFi protocol's operations (such as liquidations on Drift or Mango Markets) can leave the protocol exposed to bad debt. A trading bot that encounters repeated slippage without alerting the operator can hemorrhage funds. Without structured logging, error rate tracking, and proactive alerting, operators discover problems only when they manually check balances -- often hours or days after the damage is done.

The AIXBT incident in April 2025, where an AI crypto bot lost $100K in ETH, was exacerbated by insufficient monitoring. The unauthorized dashboard access went undetected until the funds were already gone. Proper alerting on anomalous access patterns or unexpected outflows would have enabled faster response.

## Detection

```
# Check for structured logging usage
grep -rn "console\.log\|console\.error" --include="*.ts" --include="*.js"
grep -rn "logger\.\|winston\|pino\|bunyan" --include="*.ts" --include="*.js"

# Check for alerting/notification integrations
grep -rn "sendAlert\|notify\|webhook\|slack\|discord\|telegram.*alert\|pagerduty" --include="*.ts" --include="*.js"

# Look for health check endpoints
grep -rn "healthcheck\|health_check\|\/health\|\/ready\|\/live" --include="*.ts" --include="*.js"

# Check for metrics collection
grep -rn "prometheus\|metrics\|statsd\|datadog\|gauge\|counter\|histogram" --include="*.ts" --include="*.js"
```

## Vulnerable Code

```typescript
async function runLiquidationBot(connection: Connection) {
  while (true) {
    try {
      const positions = await getUnderwaterPositions(connection);
      for (const pos of positions) {
        await liquidate(connection, pos);
      }
    } catch (err) {
      // VULNERABLE: Only console.log, no alerting, no metrics
      console.log('Error in liquidation loop:', err);
    }
    await sleep(5000);
  }
}
```

## Secure Code

```typescript
import pino from 'pino';
import { Counter, Gauge, Histogram, register } from 'prom-client';

const logger = pino({ level: 'info' });

const metrics = {
  operationsTotal: new Counter({ name: 'bot_operations_total', help: 'Total operations', labelNames: ['status'] }),
  errorsTotal: new Counter({ name: 'bot_errors_total', help: 'Total errors', labelNames: ['type'] }),
  balanceLamports: new Gauge({ name: 'bot_balance_lamports', help: 'Current wallet balance' }),
  operationDuration: new Histogram({ name: 'bot_operation_seconds', help: 'Operation latency' }),
  lastSuccessTimestamp: new Gauge({ name: 'bot_last_success_timestamp', help: 'Last successful op' }),
};

async function alertOperator(message: string, severity: 'info' | 'warn' | 'critical') {
  logger[severity === 'critical' ? 'error' : severity]({ alert: true }, message);
  if (severity === 'critical') {
    await fetch(process.env.ALERT_WEBHOOK_URL!, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: `[CRITICAL] ${message}`, priority: 'high' }),
    });
  }
}

async function runLiquidationBot(connection: Connection) {
  let consecutiveErrors = 0;

  while (isRunning) {
    const timer = metrics.operationDuration.startTimer();
    try {
      const balance = await connection.getBalance(botWallet.publicKey);
      metrics.balanceLamports.set(balance);

      if (balance < MIN_OPERATING_BALANCE) {
        await alertOperator(`Balance critically low: ${balance} lamports`, 'critical');
      }

      const positions = await getUnderwaterPositions(connection);
      for (const pos of positions) {
        await liquidate(connection, pos);
        metrics.operationsTotal.inc({ status: 'success' });
      }
      metrics.lastSuccessTimestamp.set(Date.now());
      consecutiveErrors = 0;
    } catch (err) {
      consecutiveErrors++;
      metrics.errorsTotal.inc({ type: (err as Error).name });
      logger.error({ err, consecutiveErrors }, 'Liquidation loop error');

      if (consecutiveErrors >= 5) {
        await alertOperator(`${consecutiveErrors} consecutive failures`, 'critical');
      }
    } finally {
      timer();
    }
    await sleep(5000);
  }
}
```

## Impact

- Silent fund drainage goes undetected for hours or days
- Keeper downtime leaves DeFi protocols exposed to bad debt
- No forensic data available for post-incident analysis
- Operator cannot distinguish between healthy operation and total failure

## References

- AIXBT AI bot: $100K loss went undetected due to insufficient access monitoring (April 2025)
- OWASP Top 10 A09:2021 — Security Logging and Monitoring Failures
- Drift Protocol keeper documentation: recommended monitoring setup for keeper bots
- Prometheus + Grafana standard for crypto infrastructure monitoring
