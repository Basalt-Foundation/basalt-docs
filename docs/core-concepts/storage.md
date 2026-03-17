---
sidebar_position: 4
title: "Storage"
description: "Basalt storage layer: RocksDB with Merkle Patricia Trie, column families, account state encoding, and state database implementations."
---

# Storage

Basalt's storage layer persists blockchain state, blocks, receipts, and indexing data. It uses RocksDB as the primary storage engine, with a Merkle Patricia Trie (MPT) providing authenticated state access and proof generation.

## RocksDB Column Families

Data is organized into separate RocksDB column families, each serving a distinct purpose:

| Column Family | Purpose |
|---|---|
| `state` | Account state data (balances, nonces, storage roots) |
| `blocks` | Serialized block headers and bodies |
| `receipts` | Transaction receipts (execution results, logs, gas used) |
| `metadata` | Chain metadata (current head hash, finalized height) |
| `trie_nodes` | Merkle Patricia Trie node data |
| `block_index` | Block number to block hash index |
| `staking` | Validator stakes and unbonding records |

Column family separation allows RocksDB to optimize compaction and caching independently for each data type. For example, `trie_nodes` experiences heavy random-access reads during state queries, while `blocks` is predominantly append-only.

## Account State

Each account is encoded into a **137-byte** fixed-size record:

| Field | Size | Description |
|---|---|---|
| Nonce | 8 bytes | Transaction sequence number, incremented with each transaction |
| Balance | 32 bytes | Account balance as UInt256 |
| StorageRoot | 32 bytes | Hash256 root of the account's storage trie |
| CodeHash | 32 bytes | Hash256 of the deployed contract bytecode (zero for EOAs) |
| AccountType | 1 byte | Account classification |
| ComplianceHash | 32 bytes | Hash256 of the account's compliance attestation data |

### Account Types

| Value | Type | Description |
|---|---|---|
| 0 | ExternallyOwned | Standard user account (EOA) |
| 1 | Contract | User-deployed smart contract |
| 2 | SystemContract | Protocol-level system contract |
| 3 | Validator | Registered validator account |

## Merkle Patricia Trie

The MPT provides cryptographic authentication of the entire account state. Every state query can produce a proof that the returned data is consistent with the state root committed in the block header.

### Node Types

| Type | Description |
|---|---|
| Empty | Represents an absent key in the trie |
| Leaf | Terminal node containing the value for a specific key |
| Extension | Intermediate node compressing a shared key prefix |
| Branch | 16-way branching node (one slot per hex nibble, plus an optional value slot) |

### Implementation Details

| Property | Value |
|---|---|
| Hash function | BLAKE3 |
| Path encoding | Nibble-path with Ethereum hex-prefix compact encoding |
| Proof support | Merkle inclusion/exclusion proofs for light clients |

The hex-prefix encoding compacts nibble paths by packing two nibbles per byte, with a prefix nibble indicating whether the path is odd-length and whether the node is a leaf or extension. This matches the Ethereum trie specification.

### Proof Generation

The trie supports generating Merkle proofs for light client verification. A proof consists of the sequence of trie nodes along the path from the root to the target key. A verifier can reconstruct the root hash from the proof nodes and confirm it matches the state root in the block header, without downloading the full state.

## State Database Implementations

Basalt provides three `StateDb` implementations for different use cases:

| Implementation | Backing Store | Use Case |
|---|---|---|
| `TrieStateDb` | RocksDB + MPT | Production. Full authenticated state with proof generation. |
| `FlatStateDb` | Flat key-value store | Alternative flat state representation for faster reads without trie overhead. |
| `InMemoryStateDb` | In-memory dictionary | Testing and development. No persistence. |

`TrieStateDb` is the default for all production nodes. It maintains the full Merkle Patricia Trie, enabling state root computation and proof generation at every block height. `FlatStateDb` provides a simpler key-value mapping when trie proofs are not needed. `InMemoryStateDb` is used exclusively in unit and integration tests.
