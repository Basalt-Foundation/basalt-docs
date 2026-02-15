---
title: Staking and Slashing
description: Validator staking mechanics, delegation, slashing conditions, and reward distribution in Basalt.
sidebar_position: 4
---

# Staking and Slashing

Basalt uses a stake-weighted Byzantine Fault Tolerant consensus protocol. Validators must lock BSLT tokens as collateral to participate in block production and earn rewards. This stake serves as an economic guarantee of honest behavior -- validators that violate protocol rules face partial or total loss of their staked funds.

## Staking Overview

### Minimum Stake

Validators must stake a minimum of **100,000 BSLT** to register and participate in consensus. This threshold ensures that validators have meaningful economic exposure to the network's security, deterring sybil attacks and frivolous validator registrations.

### Staking Operations

The `StakingState` module supports four core operations:

| Operation | Description |
|---|---|
| **RegisterValidator** | Registers a new validator with an initial stake deposit. The validator becomes eligible for leader selection after the registration is included in a finalized block. |
| **DelegateStake** | Allows any BSLT holder to delegate tokens to an existing validator. Delegated stake increases the validator's weight in leader selection and shares proportionally in both rewards and slashing penalties. |
| **RequestUnbond** | Initiates the unbonding process for staked or delegated tokens. The tokens enter an unbonding period and cannot be transferred or withdrawn until the period completes. |
| **ProcessUnbonding** | Finalizes unbonding requests that have completed their waiting period. The tokens are released back to the owner's account. |

### Unbonding Period

When a validator or delegator requests to unbond their stake, the tokens enter an unbonding period of approximately **21 days**. During this period:

- The tokens remain locked and cannot be transferred.
- The tokens are still **subject to slashing** if the validator commits a slashable offense.
- The validator's consensus weight is reduced immediately, but the economic risk persists.
- After the unbonding period completes, `ProcessUnbonding` must be called to release the tokens.

The 21-day unbonding period provides a window for detecting and penalizing misbehavior that may not be immediately apparent, such as delayed evidence of equivocation submitted by other validators.

## Delegation

BSLT holders who do not wish to operate a validator node can delegate their tokens to an existing validator. Delegation allows token holders to participate in securing the network and earning staking rewards without running infrastructure.

### Delegation Mechanics

- **Proportional rewards**: Delegators receive staking rewards proportional to their share of the validator's total stake.
- **Proportional slashing**: If the validator is slashed, delegators lose a proportional share of their delegation. This aligns incentives -- delegators are motivated to choose reliable, well-operated validators.
- **No minimum delegation**: Any amount of BSLT can be delegated to a validator, though gas costs may make very small delegations uneconomical.
- **Multiple delegations**: A single account can delegate to multiple validators simultaneously.

### Choosing a Validator

When selecting a validator to delegate to, consider:

- **Uptime history**: Validators with extended downtime risk inactivity slashing.
- **Commission rate**: Validators may charge a commission on delegator rewards.
- **Self-stake ratio**: Higher self-stake indicates greater alignment between the validator operator and delegators.
- **Infrastructure quality**: Well-provisioned nodes with redundant connectivity reduce the risk of missed blocks.

## Leader Selection

Basalt uses the `WeightedLeaderSelector` to determine which validator proposes the next block. The selection algorithm:

1. Computes `BLAKE3(view_number ++ validator_address)` for each active validator.
2. Weights the resulting hash by each validator's total stake (self-stake plus delegations).
3. Selects the validator with the highest weighted score as the leader for that view.

This mechanism ensures that:

- Leader selection is **deterministic** -- all honest validators agree on the leader for any given view.
- Higher-staked validators are selected **proportionally more often**, reflecting their greater economic commitment.
- The selection is **unpredictable** in advance (due to the BLAKE3 hash), preventing targeted attacks on future leaders.

## Slashing Conditions

Slashing is the mechanism by which validators are penalized for protocol violations. The `SlashingEngine` monitors validator behavior and enforces three categories of slashable offenses:

| Offense | Penalty | Evidence | Detection |
|---|---|---|---|
| **Double signing (equivocation)** | **100%** of stake burned | Two conflicting signed blocks or votes at the same height and view | The `_proposalsByView` dictionary in `NodeCoordinator` detects when a validator signs two different proposals for the same view. Any validator can submit equivocation evidence. |
| **Extended inactivity** | **5%** of stake burned | Absence from 2/3 or more views within a 24-hour period | `NodeCoordinator` tracks `_lastActiveBlock` per validator. When a validator exceeds the `InactivityThresholdBlocks` (100 blocks), the slashing engine is notified. |
| **Invalid block proposal** | **1%** of stake burned | A proposed block that fails validation by 2f+1 validators | When a supermajority of validators reject a block proposal during the PREPARE phase, the proposer is subject to slashing. |

### Double Signing

Double signing is the most severe offense. It occurs when a validator signs two different blocks or votes for the same height and view. This behavior threatens consensus safety by potentially causing honest validators to finalize conflicting blocks.

The penalty is intentionally set to **100% stake burned** because equivocation can only be caused by deliberate malicious action or catastrophic operational failures (such as running two instances of the same validator). There is no partial penalty -- the entire stake (including delegated tokens) is destroyed.

Evidence of equivocation is the pair of conflicting signed messages. Any network participant can submit this evidence, and the slashing is applied automatically once the evidence is verified.

### Extended Inactivity

Validators are expected to actively participate in consensus by voting on proposals and producing blocks when selected as leader. Extended absence degrades network liveness and throughput.

A validator is considered inactive when it has not participated in consensus for more than **100 consecutive blocks** (the `InactivityThresholdBlocks` threshold). Over a 24-hour period, absence from 2/3 or more views triggers a **5% stake slash**.

This penalty is moderate because inactivity may result from infrastructure issues rather than malicious intent. The goal is to incentivize reliable operations without being punitive toward temporary outages.

### Invalid Block Proposal

When a validator proposes a block that fails validation (e.g., invalid state transitions, incorrect parent hash, malformed transactions), and this failure is confirmed by a supermajority of validators (2f+1), the proposer incurs a **1% stake slash**.

This penalty is the lightest because invalid proposals can occasionally result from software bugs or edge cases in state transition logic. The penalty discourages but does not devastate validators operating in good faith.

## Key Rotation

Validators use BLS12-381 keys for aggregate signature operations in consensus. These keys must be rotated periodically to limit the impact of key compromise:

- **Rotation interval**: Every **90 days**, validators must register a new BLS consensus key.
- **Activation delay**: New keys take effect after a **24-hour activation delay**, providing a window for the network to detect and respond to unauthorized key changes.
- **Old key invalidation**: The previous key becomes invalid after the new key activates. Votes signed with the old key are rejected.

Key rotation does not affect the validator's Ed25519 identity key or on-chain address.

## Staking Rewards

Basalt distributes staking rewards to validators and their delegators through a decreasing emission schedule over 10 years.

### Emission Schedule

- **Total staking rewards pool**: 120,000,000 BSLT (12% of the 1 billion BSLT total supply).
- **Distribution period**: 10 years from mainnet genesis.
- **Emission curve**: Decreasing -- higher rewards in early years to incentivize early validators, tapering over time.

### Reward Distribution

Rewards are distributed per finalized block and divided among all active validators proportional to their stake weight:

1. The block reward for the current epoch is calculated from the emission schedule.
2. The reward is split among all validators who participated in finalizing the block (i.e., submitted valid votes).
3. Each validator's share is further split between the validator operator (commission) and delegators (remainder).
4. Rewards are credited directly to the validator and delegator accounts in the state trie.

### Economic Model

The staking reward mechanism creates the following economic dynamics:

- **Early participation premium**: Higher emission rates in the first years reward validators who secure the network during its most vulnerable period.
- **Inflation reduction**: As the emission rate decreases, the inflationary impact of staking rewards diminishes over time.
- **Stake concentration deterrent**: Proportional distribution means that a single entity staking 50% of all staked BSLT receives 50% of rewards -- there is no superlinear advantage to concentration.
