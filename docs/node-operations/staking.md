---
sidebar_position: 5
title: Staking
description: Validator staking, delegation, slashing, and reward mechanics on the Basalt network.
---

# Staking

Basalt uses a proof-of-stake model where validators must lock BSLT tokens to participate in consensus. This page covers the full lifecycle of staking, from initial deposit through rewards and potential slashing.

## Becoming a Validator

1. **Stake the minimum required amount**: 100,000 BSLT on mainnet, 10,000 BSLT on testnet, or 1,000 BSLT on devnet.
2. **Register via the StakingPool system contract**: call the staking registration method with your validator address and stake amount.
3. **Wait for the epoch boundary**: new validators do not enter the active set immediately. They are queued and activated at the start of the next epoch.
4. **Run your validator node**: start the node in validator mode with your Ed25519 keypair and peer connections. See [Running a Node](./running-a-node.md).

## Delegation

Token holders who do not wish to operate a validator can delegate their stake to an existing validator through the StakingPool system contract.

- Delegated stake contributes to the validator's total stake and voting power.
- Rewards are distributed proportionally between the validator and its delegators.
- Delegators can undelegate at any time, subject to the unbonding period.

## Epoch Transitions

The validator set is updated at epoch boundaries. During an epoch transition:

- Newly registered validators with sufficient stake are added to the active set (up to the maximum set size).
- Validators whose stake falls below the minimum are removed.
- Accumulated rewards are distributed.

**Epoch lengths:**

| Network | Epoch Length |
|---|---|
| Mainnet | 1,000 blocks |
| Testnet | 500 blocks |
| Devnet | 100 blocks |

## Slashing

Validators that violate protocol rules are penalized by having a portion (or all) of their stake destroyed.

| Offense | Penalty | Detection |
|---|---|---|
| Double-signing (equivocation) | 100% of stake | A validator signs two different blocks at the same height. Any node can submit the conflicting signatures as evidence. |
| Prolonged inactivity | 5% of stake | A validator falls below the participation threshold for an extended period. |

### Key Details

- **Double-signing** is the most severe offense. When evidence of equivocation is submitted and verified, the validator's entire stake is slashed immediately.
- **Inactivity slashing** is applied when a validator fails to participate in consensus for a sustained period, degrading network liveness.
- **Slashed funds are burned.** They are not redistributed to other validators or delegators. This ensures that slashing is purely punitive and cannot be exploited for profit.

:::caution
Delegators share in slashing risk. If a validator is slashed, delegated stake is slashed proportionally. Choose your validator carefully.
:::

## Unbonding

When a validator or delegator withdraws their stake, it enters an unbonding period during which the tokens are locked and cannot be transferred or re-delegated.

| Network | Unbonding Period | Approximate Duration |
|---|---|---|
| Mainnet | 907,200 blocks | ~21 days (at 2s block time) |
| Testnet | 43,200 blocks | ~5 days (at 2s block time) |
| Devnet | -- | No unbonding period |

The unbonding period exists to ensure that validators can still be slashed for misbehavior that is detected after they attempt to exit.

## Rewards

Block rewards follow the EIP-1559 fee model:

- **Base fee**: determined dynamically by network congestion. The base fee is **burned** and does not go to validators.
- **Priority fee (tip)**: set by the transaction sender as an incentive for inclusion. The priority fee is paid to the **block proposer**.

Validators earn revenue exclusively from priority fees. This design aligns validator incentives with transaction inclusion while maintaining a deflationary pressure on the BSLT supply through base fee burning.
