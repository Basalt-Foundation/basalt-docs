---
sidebar_position: 1
title: "Caldera Fusion DEX"
description: "Protocol-native decentralized exchange with batch auctions, encrypted intents, and concentrated liquidity."
---

# Caldera Fusion DEX

Caldera Fusion is Basalt's protocol-native decentralized exchange. It operates at the execution layer directly, requiring no external AMM contracts or off-chain matching engines. All settlement logic is built into the protocol itself.

**Frontend**: [caldera.basalt.foundation](https://caldera.basalt.foundation)
**Whitepaper**: [Caldera Fusion Whitepaper](https://basalt.foundation/whitepapers/caldera-fusion)

---

## Architecture

Caldera Fusion combines several mechanisms into a single, unified trading system:

### Batch Auction Matching

Orders collected during a block are matched simultaneously at a uniform clearing price. This design eliminates front-running and sandwich attacks structurally -- there is no ordering advantage within a batch. All participants in a given batch receive the same execution price.

### Order Book

Traditional limit orders are supported alongside AMM-style liquidity. Traders can place limit buy and sell orders at specified prices, which persist until filled or cancelled. The order book and AMM liquidity are unified during batch settlement to maximize available depth.

### Concentrated Liquidity

Liquidity providers can concentrate their capital within specific price ranges, similar to the tick-based system in Uniswap v3. This allows LPs to deploy capital more efficiently by targeting the price ranges where they expect the most trading activity, rather than spreading liquidity uniformly across all prices.

### TWAP Oracle

A time-weighted average price oracle is computed over configurable windows:

| Network  | Window Size  | Approximate Duration |
|----------|-------------|----------------------|
| Mainnet  | 7,200 blocks | ~4 hours             |
| Testnet  | 3,600 blocks | ~2 hours             |

The TWAP oracle provides manipulation-resistant price feeds for use by other on-chain contracts and the dynamic fee system.

### Dynamic Fees

Fee tiers adjust automatically based on real-time volatility and pool utilization. During periods of high volatility or heavy trading activity, fees increase to compensate liquidity providers for impermanent loss risk. During calm periods, fees decrease to attract more trading volume.

### EC-ElGamal Encrypted Intents

Traders submit encrypted orders using EC-ElGamal encryption. Orders remain opaque to all network participants -- including validators and block producers -- until batch settlement time. The solver network decrypts orders only at the moment of execution. This prevents all forms of MEV extraction, including front-running, back-running, and sandwich attacks.

### Solver Network

A competitive network of solvers optimizes batch settlements for maximum user surplus. Solvers analyze decrypted order intents and compute the optimal matching that maximizes the total value returned to traders. Solvers must post bonds to participate and are subject to slashing for submitting invalid or suboptimal settlements.

### Threshold Decryption

A validator committee jointly decrypts order intents using Feldman Verifiable Secret Sharing (VSS). No single validator can decrypt orders unilaterally. The decryption threshold requires a quorum of committee members to participate, ensuring that order privacy is maintained even if a minority of validators are compromised.

---

## Trading Flow

The end-to-end lifecycle of a trade on Caldera Fusion proceeds as follows:

1. **Encrypt**: The trader encrypts their order intent using EC-ElGamal encryption with the current committee public key.
2. **Submit**: The encrypted intent is submitted as a standard Basalt transaction and included in a block.
3. **Decrypt**: At the block boundary, the validator committee performs threshold decryption, and the solver network receives the plaintext intents.
4. **Solve**: Solvers compute the optimal batch settlement, maximizing total user surplus across all orders in the batch.
5. **Select**: The best settlement proposal is selected based on surplus maximization.
6. **Execute**: The settlement is executed atomically -- all matched orders settle or none do.
7. **Price**: A uniform clearing price is applied to all matched orders in the batch.

---

## Gas Costs

| Operation                  | Approximate Gas |
|----------------------------|-----------------|
| Simple swap                | 30,000          |
| Limit order placement      | 45,000          |
| Liquidity provision        | 80,000          |
| Complex multi-hop routing  | 120,000         |

Gas costs range from 30,000 to 120,000 depending on operation type and complexity.
