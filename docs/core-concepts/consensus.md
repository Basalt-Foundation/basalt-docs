---
title: Consensus Protocol
description: BasaltBFT -- a HotStuff-derived Byzantine Fault Tolerant consensus protocol with deterministic finality and BLS signature aggregation.
sidebar_position: 1
---

# BasaltBFT Consensus Protocol

BasaltBFT is a HotStuff-derived Byzantine Fault Tolerant (BFT) consensus protocol engineered for deterministic finality, high throughput, and low latency. It achieves a target block time of 400 milliseconds on the mainnet and tolerates up to **f = (n - 1) / 3** Byzantine validators, where **n** is the total number of validators in the active set. Unlike probabilistic consensus mechanisms such as Nakamoto consensus, BasaltBFT provides immediate, irreversible finality -- once a block is committed, it cannot be reverted under any circumstances within the fault tolerance bound.

## Three-Phase Commit

BasaltBFT finalizes blocks through a three-phase voting pipeline. Each phase serves a distinct purpose and requires a quorum of **2f + 1** votes to advance.

### Phase 1: PREPARE

1. The designated leader for the current view constructs a candidate block by selecting transactions from the mempool, ordering them deterministically, and executing them against the current world state.
2. The leader computes the resulting **post-state root** from the Merkle Patricia Trie after execution.
3. The leader broadcasts a `CONSENSUS_PROPOSAL` message containing the block header, transaction list, and post-state root to all validators.
4. Each validator independently executes every transaction in the proposed block against its own local state copy.
5. Each validator verifies that the resulting state root matches the one declared by the leader.
6. If verification succeeds, the validator signs a BLS vote over the block hash and state root, then broadcasts the signed `PREPARE` vote to the network.

If a validator detects a state root mismatch, it rejects the proposal and does not vote. This ensures that only blocks producing a consistent, deterministic state transition can advance past the PREPARE phase.

### Phase 2: PRE-COMMIT

1. The leader collects `PREPARE` votes until it has gathered at least **2f + 1** valid BLS signatures.
2. The leader aggregates these individual BLS signatures into a single 96-byte aggregated signature using BLS12-381 signature aggregation.
3. The leader broadcasts the aggregated `PRE-COMMIT` certificate to all validators.
4. Each validator verifies the aggregated signature against the known public keys of the signers.
5. Upon successful verification, each validator signs and broadcasts a `PRE-COMMIT` vote, indicating its acknowledgment that a quorum of validators have endorsed the block.

The PRE-COMMIT phase establishes a **lock** on the proposed block. Once a validator has sent a PRE-COMMIT vote, it will not vote for any conflicting block at the same height, preventing equivocation.

### Phase 3: COMMIT

1. The leader collects `PRE-COMMIT` votes until it has gathered at least **2f + 1** valid BLS signatures.
2. The leader aggregates the pre-commit signatures into a final aggregated COMMIT certificate.
3. The leader broadcasts the `COMMIT` certificate to all validators.
4. Each validator verifies the aggregated COMMIT signature.
5. Upon verification, the block is **finalized**: it is appended to the chain, the world state is updated, and the block height is incremented.
6. Non-leader validators who deferred execution now apply the block's state transitions via `OnBlockFinalized`.

At this point, the block has achieved deterministic finality. No rollback is possible.

## Pipelining

BasaltBFT pipelines consensus phases across consecutive blocks to maximize throughput and minimize idle time. At any given moment, the protocol can be processing up to three blocks simultaneously at different stages of the commit pipeline:

| Pipeline Slot | Block | Phase |
|---|---|---|
| Slot 0 | Block N | COMMIT |
| Slot 1 | Block N+1 | PRE-COMMIT |
| Slot 2 | Block N+2 | PREPARE |

This pipelining architecture means that the effective finality latency is **2 round-trips (approximately 800 milliseconds)** from the moment a block enters PREPARE until it reaches COMMIT. While each individual phase requires a single network round-trip, the overlapping execution ensures that the network is never stalled waiting for a single block to complete all three phases sequentially.

The pipelining invariant is strict: a block at height **H** cannot enter COMMIT until block **H-1** has been committed. This preserves the sequential consistency of state transitions while allowing the proposal and voting for future blocks to proceed concurrently.

## Leader Selection

BasaltBFT uses a **weighted round-robin** leader selection algorithm that accounts for both validator stake and reputation. The leader for a given view is determined by a deterministic, verifiable computation.

### Weight Formula

Each validator's selection weight is computed as:

```
weight(v) = stake(v) * reputation(v)
```

Where:

- **stake(v)** is the total staked amount (self-stake plus delegated stake) for validator **v**.
- **reputation(v)** is the validator's current reputation score, a floating-point value in the range [0.0, 1.0] that reflects historical performance (uptime, vote participation, block validity).

### Selection Procedure

For each consensus view, the leader is selected as follows:

1. Compute a deterministic seed: `seed = BLAKE3(view_number ++ validator_address)` for each active validator.
2. Weight the seed by the validator's computed weight.
3. The validator with the highest weighted score is designated as the leader for that view.

This mechanism ensures that validators with higher stake and better track records are selected as leaders more frequently, aligning incentives with network reliability. The use of BLAKE3 hashing guarantees that the selection is deterministic and verifiable by all participants without requiring any communication.

### Fairness Properties

- Validators with zero reputation (below the 0.2 threshold) are excluded from leader selection entirely.
- The weighting ensures proportional representation: a validator with twice the effective weight will be selected as leader approximately twice as often over a long time horizon.
- The BLAKE3 seed introduces sufficient entropy to prevent any validator from predicting or manipulating their selection across multiple consecutive views.

## View Change

When the designated leader fails to produce a valid block within the expected time window, the protocol initiates a **view change** to elect a new leader and maintain liveness.

### Timeout Schedule

The view change timeout follows an exponential backoff schedule:

| Attempt | Timeout |
|---|---|
| 1 | 2 seconds |
| 2 | 4 seconds |
| 3 | 8 seconds |
| 4 | 16 seconds |
| 5 | 32 seconds |
| 6+ | 60 seconds (maximum) |

The initial timeout of 2 seconds provides a generous window relative to the 400ms target block time, accounting for network latency and transient delays. The exponential backoff prevents view change storms during sustained network partitions while the 60-second cap ensures that liveness is eventually restored.

### View Change Procedure

1. When a validator's view timer expires without receiving a valid proposal, it broadcasts a `VIEW-CHANGE` message containing its current view number, the highest block it has committed, and any lock certificates it holds from the PRE-COMMIT phase.
2. Once **2f + 1** `VIEW-CHANGE` messages for the same new view are collected, the next leader (determined by the leader selection algorithm applied to the new view number) takes over.
3. The new leader constructs its proposal based on the highest committed block reported across all VIEW-CHANGE messages, ensuring no committed blocks are lost.
4. The protocol resumes normal three-phase operation under the new leader.

To avoid key collisions in the vote-tracking data structures, VIEW-CHANGE votes use a dedicated vote phase identifier `(VotePhase)0xFF`, which is distinct from the PREPARE, PRE-COMMIT, and COMMIT phase identifiers used during normal consensus rounds.

## BLS Signature Aggregation

BasaltBFT uses **BLS12-381** signatures for consensus vote aggregation, providing significant bandwidth and verification efficiency compared to individually transmitted signatures.

### Parameters

| Parameter | Value |
|---|---|
| Curve | BLS12-381 |
| Private key size | 32 bytes |
| Public key size (compressed G1) | 48 bytes |
| Signature size (compressed G2) | 96 bytes |
| Aggregated signature size | 96 bytes (constant, regardless of signer count) |
| Domain Separation Tag (DST) | `BLS_SIG_BLS12381G2_XMD:SHA-256_SSWU_RO_POP_` |
| Implementation | Nethermind.Crypto.Bls (wrapping the blst native library) |
| Quorum threshold | 2f + 1 |

### Aggregation Benefits

Without BLS aggregation, a committee of 100 validators would need to transmit 100 individual 64-byte Ed25519 signatures (6,400 bytes) per voting round. With BLS aggregation, the same quorum is represented by a single 96-byte aggregated signature plus a bitmask identifying the signers. This reduces consensus message overhead by approximately **98%** at 100 validators and scales even more favorably as the validator set grows.

### Verification

Aggregated BLS signatures are verified using a manual pairing computation rather than the `Pairing.Aggregate + FinalVerify` API path, which has known correctness issues in the blst binding. The verification procedure is:

1. Compute the hash-to-curve of the signed message: `H(m)`.
2. Compute the Miller loop of `H(m)` with the aggregated public key: `e1 = MillerLoop(H(m), aggregated_pk)`.
3. Compute the Miller loop of the aggregated signature with the G1 generator: `e2 = MillerLoop(sig, G1)`.
4. Compute the final exponentiation and compare: `FinalExp(e1).IsEqual(FinalExp(e2))`.

This approach ensures correct pairing verification across all supported platforms (macOS ARM64, Linux ARM64, macOS x64, Linux x64).

## Performance Characteristics

The following table summarizes expected performance across different deployment configurations:

| Configuration | Validators | Throughput (TPS) | Finality Latency | Block Time |
|---|---|---|---|---|
| Mainnet | 100 | ~12,000 | 800 ms | 400 ms |
| Enterprise Subnet | 21 | ~25,000 | 400 ms | 200 ms |
| Private Network | 7 | ~50,000 | 200 ms | 100 ms |

Performance scales inversely with validator count due to the O(n) communication complexity of the voting phases. Smaller validator sets benefit from reduced network round-trip times and faster quorum assembly.

### Factors Affecting Throughput

- **Network latency**: The dominant factor. Intra-datacenter deployments achieve near-theoretical maximum throughput.
- **Transaction complexity**: Throughput figures assume a representative mix of transfers and contract calls. Pure transfer workloads achieve higher TPS.
- **Block size**: The 2 MB maximum block size constrains the number of transactions per block. At the target block time, this translates to approximately 5,000 transactions per block on mainnet.
- **State access patterns**: Transactions requiring cold storage reads are more expensive and reduce effective throughput.

## Enterprise Subnets

Enterprise subnets are permissioned consensus domains that operate with a restricted, KYC-verified validator set while maintaining a cryptographic anchor to the Basalt mainnet.

### Architecture

- Each enterprise subnet runs its own independent BasaltBFT consensus instance with a smaller validator committee (typically 7 to 21 validators).
- Validators in an enterprise subnet must pass identity verification through the Basalt compliance layer (IdentityRegistry with KYC attestations).
- The subnet produces blocks at its own cadence, independent of the mainnet block time.

### Mainnet Anchoring

Every **100 blocks**, the enterprise subnet publishes an **anchor transaction** to the Basalt mainnet. This anchor contains:

1. The subnet's chain ID.
2. The block height range covered by the anchor (e.g., blocks 901 through 1000).
3. The state root of the subnet at the anchor height.
4. An aggregated BLS signature from the subnet's validator set attesting to the state root.

This anchoring mechanism provides the following guarantees:

- **Auditability**: Any party can verify the subnet's state transitions by checking the anchor against the mainnet's immutable record.
- **Finality inheritance**: Once an anchor is committed on mainnet, the corresponding subnet blocks inherit the mainnet's finality guarantees.
- **Fraud detection**: If a subnet's validators attempt to finalize a fraudulent state, the discrepancy will be detectable when the anchor is published or when cross-chain verification is performed.

### Isolation Properties

Enterprise subnets maintain full execution isolation from the mainnet. Transactions on a subnet do not affect mainnet state and vice versa. Cross-subnet communication is facilitated through the bridge layer using Merkle proof-based message passing, with the mainnet anchors serving as trust roots for cross-domain verification.
