---
sidebar_position: 1
title: "Consensus"
description: "BasaltBFT consensus mechanism: a HotStuff-inspired simplified BFT protocol with pipelined finality and BLS12-381 signature aggregation."
---

# BasaltBFT Consensus

BasaltBFT is a HotStuff-inspired simplified Byzantine Fault Tolerant (BFT) consensus protocol. It achieves fast finality through a pipelined three-phase commit process with BLS12-381 aggregate signature compression.

## Three-Phase Commit

Every block progresses through three sequential voting phases before reaching finality:

1. **PREPARE** -- The elected leader broadcasts a block proposal. Validators verify the proposal and cast PREPARE votes.
2. **PRE-COMMIT** -- Once the leader collects a quorum of PREPARE votes, it assembles a PRE-COMMIT certificate and broadcasts it. Validators verify the certificate and cast PRE-COMMIT votes.
3. **COMMIT** -- Once the leader collects a quorum of PRE-COMMIT votes, it assembles a COMMIT certificate and broadcasts it. Validators apply the block to their local state.

### Consensus State Machine

The consensus engine transitions through the following states for each block:

```
Idle -> Proposing -> Preparing -> PreCommitting -> Committing -> Finalized
```

## Quorum Requirements

BasaltBFT tolerates up to `f` Byzantine validators, where:

```
f = (validatorCount - 1) / 3
```

A quorum requires `2f + 1` votes. In practice, the quorum threshold is calculated as:

```
quorum = (validatorCount * 2 / 3) + 1
```

This guarantees that any two quorums share at least one honest validator, preventing conflicting blocks from being finalized.

## Pipelined Consensus

BasaltBFT uses pipelined consensus to overlap the phases of consecutive blocks. A new block proposal can begin before the previous block has fully committed, creating a three-block pipeline overlap. This reduces effective finality time:

| Parameter | Value |
|---|---|
| Block time | 2 seconds (configurable via `BlockTimeMs`) |
| Finality | ~4 seconds (with pipelining) |
| Pipeline depth | 3 blocks |

Without pipelining, finality would require three full round-trips (approximately 6 seconds). The pipeline overlap cuts this to roughly two block intervals.

## Vote Aggregation

Validator votes use **BLS12-381 signatures**, which support efficient aggregation. Instead of transmitting and verifying each validator's vote individually, the leader aggregates all votes for a given phase into a single 96-byte aggregate signature. This compression is critical for scalability, as it keeps certificate sizes constant regardless of validator count.

## Leader Selection

Leaders are selected using **stake-weighted round-robin** rotation within the active validator set. Each validator's frequency of selection is proportional to its stake. The rotation is deterministic, so all honest validators agree on the current leader for any given block height.

## Validator Set

| Constraint | Value |
|---|---|
| Maximum validators | 64 |
| Vote tracking | `ulong` bitmap (64-bit) |

The 64-validator limit is derived from the use of a `ulong` bitmap for efficient vote tracking. Each bit position corresponds to a validator index, enabling constant-time vote recording and quorum checking.

## Epoch Transitions

The validator set is updated at epoch boundaries. Within an epoch, the validator set is fixed.

| Network | Epoch Length (blocks) |
|---|---|
| Mainnet | 1,000 |
| Testnet | 500 |
| Devnet | 100 |

At each epoch boundary, the consensus engine applies pending validator set changes (new registrations, stake updates, ejections) and begins the next epoch with the updated set.

## Circuit Breaker

The consensus engine includes a circuit breaker mechanism that prevents deadlocks during view changes. If the consensus process stalls (for example, due to a leader failure or network partition), the circuit breaker triggers a view change to elect a new leader and resume block production. This prevents the chain from permanently halting under adverse conditions.

## Slashing

Validators that violate protocol rules are subject to stake slashing:

| Violation | Penalty | Description |
|---|---|---|
| Double-signing (equivocation) | 100% of stake | Signing two different blocks at the same height. This is the most severe violation, as it can lead to chain forks. |
| Prolonged inactivity | 5% of stake | Failing to participate in consensus for an extended period. The inactivity threshold is configurable per network. |

Slashing is enforced automatically by the protocol. When equivocation is detected (two conflicting signed messages from the same validator at the same height), the validator's entire stake is forfeited. Inactivity slashing applies a smaller penalty to validators that fail to produce votes within the configured threshold window.
