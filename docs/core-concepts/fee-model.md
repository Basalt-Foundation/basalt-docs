---
sidebar_position: 6
title: "Fee Model (EIP-1559)"
description: "Basalt EIP-1559 dynamic fee model: base fee adjustment, priority fees, fee burning, and gas cost schedule."
---

# Fee Model (EIP-1559)

Basalt implements the EIP-1559 dynamic fee model, where the base fee adjusts automatically based on network demand. This mechanism provides more predictable transaction pricing, eliminates first-price auction inefficiencies, and introduces deflationary pressure through fee burning.

## Network Parameters

| Parameter | Mainnet | Testnet | Devnet |
|---|---|---|---|
| Initial Base Fee | 1 gwei | 0.1 gwei | 1 wei |
| Base Fee Change Denominator | 8 | 8 | 8 |
| Elasticity Multiplier | 2 | 2 | 2 |
| Block Gas Limit | 100,000,000 | 100,000,000 | 100,000,000 |
| Target Gas Usage | 50,000,000 | 50,000,000 | 50,000,000 |

The **target gas usage** is half the block gas limit (determined by the elasticity multiplier of 2). Blocks can temporarily exceed the target up to the full block gas limit, but doing so causes the base fee to increase.

## Base Fee Adjustment

The base fee adjusts after every block based on how the actual gas usage compares to the target:

- If gas used **exceeds** the target, the base fee **increases**.
- If gas used is **below** the target, the base fee **decreases**.
- The **maximum change per block** is 12.5% (1/8 of the current base fee), governed by the change denominator.

### Formula

```
newBaseFee = baseFee + baseFee * (gasUsed - targetGas) / targetGas / denominator
```

Where:
- `baseFee` is the current block's base fee
- `gasUsed` is the actual gas consumed in the current block
- `targetGas` is the target gas usage (50,000,000)
- `denominator` is the base fee change denominator (8)

### Examples

Given a current base fee of 100 gwei:

| Block Gas Used | Utilization | Base Fee Change | New Base Fee |
|---|---|---|---|
| 50,000,000 | 100% of target | No change | 100 gwei |
| 100,000,000 | 200% of target | +12.5% | 112.5 gwei |
| 75,000,000 | 150% of target | +6.25% | 106.25 gwei |
| 25,000,000 | 50% of target | -6.25% | 93.75 gwei |
| 0 | 0% of target | -12.5% | 87.5 gwei |

Over sustained periods of high demand, the base fee increases exponentially, naturally throttling demand. During low-activity periods, the base fee decreases to its floor.

## Transaction Types

### Legacy Transactions

Legacy transactions specify a single `GasPrice` field. The effective gas price is the `GasPrice` value itself. Legacy transactions are accepted as long as `GasPrice >= BaseFee`.

### EIP-1559 Transactions

EIP-1559 transactions specify two fee parameters:

| Field | Description |
|---|---|
| `MaxFeePerGas` | The absolute maximum the sender is willing to pay per unit of gas |
| `MaxPriorityFeePerGas` | The maximum tip the sender is willing to pay the block proposer |

The **effective gas price** is calculated as:

```
effectiveGasPrice = min(MaxFeePerGas, BaseFee + MaxPriorityFeePerGas)
```

This ensures the sender never pays more than `MaxFeePerGas`, even if the base fee increases between submission and inclusion.

## Fee Distribution

Transaction fees are split into two components:

| Component | Destination | Effect |
|---|---|---|
| Base fee | Burned (destroyed) | Deflationary pressure on BSLT supply |
| Priority fee (tip) | Block proposer | Incentivizes validators to include transactions |

The **base fee burn** removes BSLT from circulation with every transaction, creating a deflationary mechanism that counterbalances new token issuance from staking rewards. During periods of high network activity, the burn rate can exceed the issuance rate, making BSLT net-deflationary.

## Gas Cost Schedule

| Operation | Gas Cost | Description |
|---|---|---|
| Transfer | 21,000 | Native BSLT transfer between accounts |
| Contract Deploy | 500,000 | Deploy compiled contract bytecode |
| Contract Call | 50,000 | Base cost for invoking a contract method |
| DEX Operations | 30,000 -- 120,000 | Variable cost depending on operation complexity |

DEX operation costs vary by type:

- **Limit order placement**: lower end of the range
- **Batch auction settlement**: higher end, due to multi-party matching
- **Liquidity provision with concentrated ranges**: mid-range, includes tick boundary calculations

All gas costs are denominated in gas units. The actual BSLT cost is determined by multiplying the gas consumed by the effective gas price.
