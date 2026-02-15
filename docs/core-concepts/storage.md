---
title: Storage
description: Basalt's storage layer -- Merkle Patricia Trie state management, RocksDB persistence, block and receipt storage, and state pruning.
sidebar_position: 4
---

# Storage

Basalt's storage layer manages all persistent state, including account balances, contract storage, block history, and transaction receipts. The design couples a **Merkle Patricia Trie** (MPT) for authenticated state representation with **RocksDB** as the underlying key-value store, providing both cryptographic verifiability and high-performance disk I/O.

## Merkle Patricia Trie

The Basalt world state is represented as a **modified Merkle Patricia Trie (MPT)** where every node is hashed with BLAKE3 (rather than Keccak-256 as in Ethereum). This trie structure provides O(log n) reads and writes with cryptographic proofs of inclusion and exclusion for any key-value pair.

### Node Types

The trie consists of three node types:

#### Branch Node

A branch node has **16 children** (one for each hexadecimal nibble 0x0 through 0xF) and an optional value field.

```
BranchNode {
    children: [Option<Hash256>; 16],  // Hash of each child node (or null)
    value: Option<byte[]>             // Value stored at this exact key prefix
}
```

Branch nodes represent a fork point in the key space. If a key's traversal reaches a branch node, the next nibble of the key determines which child branch to follow. If the key terminates at the branch node itself, the value (if present) is the stored data.

#### Extension Node

An extension node compresses a sequence of nibbles that share a common prefix into a single node, reducing trie depth and storage overhead.

```
ExtensionNode {
    shared_prefix: byte[],   // Compressed nibble sequence
    child: Hash256            // Hash of the next node
}
```

Extension nodes are a space optimization. Instead of creating a chain of branch nodes where each has only one non-null child, the shared prefix is collapsed into a single extension node.

#### Leaf Node

A leaf node stores the remaining key suffix and the associated value.

```
LeafNode {
    key_remainder: byte[],   // Remaining nibbles of the key
    value: byte[]             // The stored value
}
```

Leaf nodes are always terminal. They represent a complete key-value mapping.

### Hashing

Every trie node is hashed using **BLAKE3** to produce a 32-byte `Hash256`. The hash of the root node is the **state root**, which is included in every block header. This state root cryptographically commits to the entire world state at that block height, enabling:

- **State verification**: Any party can verify that a particular account or storage value exists in the state by providing a Merkle proof from the state root to the leaf.
- **State synchronization**: Nodes joining the network can download state from peers and verify its correctness against the state root in the latest finalized block header.
- **Light client support**: Light clients can verify individual state queries without downloading the full trie.

### Trie Operations

| Operation | Time Complexity | Description |
|---|---|---|
| Get | O(log n) | Traverse from root to leaf following key nibbles |
| Put | O(log n) | Insert or update a key-value pair, creating/splitting nodes as needed |
| Delete | O(log n) | Remove a key-value pair, merging nodes where possible |
| Prove | O(log n) | Generate a Merkle proof for a key (list of nodes from root to leaf) |
| Verify | O(log n) | Verify a Merkle proof against a known state root |

## Account State

Each account in the Basalt state trie is keyed by its 20-byte address and stores the following structure:

| Field | Type | Description |
|---|---|---|
| Nonce | uint64 | Transaction sequence number, incremented with each outbound transaction |
| Balance | UInt256 | Account balance in the smallest denomination (256-bit unsigned integer) |
| StorageRoot | Hash256 | BLAKE3 root hash of the account's storage trie (for contract accounts) |
| CodeHash | Hash256 | BLAKE3 hash of the account's contract bytecode (for contract accounts) |
| AccountType | enum | `EOA` (externally owned account), `Contract`, or `System` |
| ComplianceHash | Hash256 | Hash of the account's compliance metadata (KYC status, jurisdiction, etc.) |

### Account Types

- **EOA (Externally Owned Account)**: Controlled by an Ed25519 private key. Has no code or storage. Can initiate transactions.
- **Contract**: Created by a `ContractDeploy` transaction. Has code (stored under key `0xFF01` in the contract's storage) and a dedicated storage trie for persistent state. Cannot initiate transactions autonomously.
- **System**: Pre-deployed protocol-level accounts (e.g., staking contract, bridge contract). Functionally similar to Contract accounts but created at genesis rather than by a deploy transaction.

## RocksDB Configuration

Basalt uses **RocksDB** as its persistent key-value store. The configuration is tuned for blockchain workloads characterized by high write throughput, sequential reads, and large dataset sizes.

### Column Families

RocksDB data is organized into four **column families**, each optimized for its specific access pattern:

| Column Family | Purpose | Key Format | Value Format |
|---|---|---|---|
| `state` | Trie node storage | BLAKE3 node hash (32 bytes) | Serialized trie node |
| `blocks` | Block storage | Block hash (32 bytes) or height (8 bytes) | Serialized block (full or header-only) |
| `receipts` | Transaction receipts | Transaction hash (32 bytes) | Serialized receipt |
| `metadata` | Chain metadata | String key (e.g., "latest_height") | Variable |

Note: In the Basalt codebase, the column family references use an inner class named `CF` rather than `ColumnFamilies`, to avoid naming conflicts with the `RocksDbSharp.ColumnFamilies` type.

### Tuning Parameters

| Parameter | Value | Rationale |
|---|---|---|
| Compression | Zstd, level 3 | Good compression ratio with fast decompression for read-heavy workloads |
| Block cache | 2 GB | Large cache reduces disk reads for frequently accessed trie nodes |
| Write buffer size | 256 MB | Absorbs write bursts during block import without stalling on flushes |
| Bloom filter | 10 bits per key | Reduces false-positive rate for point lookups to ~1%, avoiding unnecessary disk reads |
| Max open files | 1024 | Sufficient for typical SST file counts without exhausting OS file descriptor limits |
| Write-ahead log | Enabled | Ensures durability of writes across crashes |

### Data Directory

The RocksDB data directory is configured via the `BASALT_DATA_DIR` environment variable. In Docker deployments, this maps to a persistent volume:

```
BASALT_DATA_DIR=/data/basalt
```

Each validator node in a Docker Compose deployment has its own volume (`validator-N-data:/data/basalt`) to ensure data isolation.

### Platform Considerations

The RocksDB NuGet package (version 8.9.1) includes a 52-byte stub for the ARM64 native library that is non-functional. For ARM64 deployments (including Apple Silicon development machines and ARM64 Docker containers), the `librocksdb-dev` system package must be installed separately. The Dockerfile handles this by installing the system library during the build stage.

## Block Storage

Blocks are stored with **dual indexing** to support both hash-based and height-based lookups efficiently.

### Index Structure

| Index | Key | Value |
|---|---|---|
| By hash | Block hash (32 bytes) | Full serialized block |
| By height | Block height (8-byte big-endian uint64) | Block hash (32 bytes) |

To retrieve a block by height, the storage layer first looks up the block hash via the height index, then fetches the full block using the hash index. This two-step lookup adds negligible overhead while avoiding data duplication for the full block.

### Retention Policy

| Block Age | Storage Format |
|---|---|
| Most recent 128 blocks | Full block (header + transactions + receipts) |
| Older than 128 blocks | Header only (transactions and receipts pruned from hot storage) |

The `BlockStore.PutFullBlock` method stores both the raw block data and the index entries atomically. The retention policy is enforced by a background compaction process that strips transaction and receipt data from blocks older than the 128-block window.

Full historical data remains available in the receipts column family (indexed by transaction hash) and can be reconstructed from archive nodes that retain all data.

### Recovery

On node restart, the chain state is reconstructed using `ChainManager.ResumeFromBlock(genesis, latest)`:

1. The latest finalized block height is read from the metadata column family.
2. The raw block data for the latest block is loaded from the blocks column family.
3. The state trie is reconstructed as `TrieStateDb(trieNodeStore, stateRoot)` using the state root from the latest block header.
4. The consensus layer resumes from the recovered block height.

## Receipt Storage

Every executed transaction produces a **TransactionReceipt** that records the outcome of execution.

### Receipt Structure

| Field | Type | Description |
|---|---|---|
| TxHash | Hash256 | BLAKE3 hash of the transaction |
| BlockHeight | uint64 | Height of the block containing this transaction |
| TxIndex | uint32 | Index of the transaction within the block |
| Success | bool | Whether the transaction executed successfully |
| GasUsed | uint64 | Actual gas consumed by execution |
| ReturnData | byte[] | Data returned by the transaction (for contract calls) |
| Logs | EventLog[] | Events emitted during execution |
| PostStateRoot | Hash256 | State root after this transaction's execution |

### Event Log Indexing

Events emitted by contracts during execution are indexed using a **Bloom filter** attached to each receipt and to each block header.

| Bloom Filter Parameter | Value |
|---|---|
| Filter size | 2048 bits (256 bytes) |
| Hash functions | 3 |
| Hash algorithm | BLAKE3 (truncated to bit index) |

Each event log entry contains:

- **Contract address**: The address of the contract that emitted the event.
- **Topics**: Up to 4 indexed topic values (each 32 bytes).
- **Data**: Arbitrary unindexed data payload.

The Bloom filter for a block is the bitwise OR of the Bloom filters for all receipts in that block. This allows efficient filtering: a client searching for events from a specific contract or with specific topic values can first check the block-level Bloom filter. If the filter indicates a possible match, the client then examines individual receipts. The 1-in-100 false positive rate means that at most 1% of blocks will require receipt-level inspection when they do not actually contain matching events.

## State Pruning

Over time, the state trie accumulates a large number of historical node versions that are no longer referenced by the current state root. State pruning reclaims storage space by removing these obsolete nodes.

### Pruning Rules

| Rule | Value |
|---|---|
| Eligibility threshold | Trie nodes unreferenced for > 256 blocks |
| Pruning process | Background thread with rate limiting |
| Rate limit | Configurable (default: 10,000 nodes per second) |
| State expiry | Accounts inactive for 12 months are candidates for archival |

### Pruning Procedure

1. **Mark phase**: Starting from the current state root, traverse the trie and mark all reachable nodes. Any node in the `state` column family that is not marked is a candidate for pruning.
2. **Age check**: For each candidate node, verify that it has been unreferenced for at least 256 blocks. This safety margin ensures that nodes needed for recent state queries, re-orgs (which cannot happen in BFT consensus but may be needed for state sync edge cases), or in-progress Merkle proofs are not prematurely deleted.
3. **Delete phase**: Remove eligible nodes from the `state` column family in batches, with a configurable rate limit to avoid overwhelming the disk I/O subsystem and impacting block processing performance.

### State Expiry

Accounts that have been completely inactive (no incoming or outgoing transactions) for **12 months** are eligible for migration to an **Archive Database**:

1. The account's full state (balance, nonce, storage trie, code) is serialized and written to the archive database.
2. A **witness proof** is retained in the active state trie. This proof consists of the Merkle path from the state root to the account's leaf node, sufficient to verify the account's existence and state at the time of archival.
3. The account's storage trie nodes are pruned from the active state database.
4. If the account receives a transaction after expiry, it is **resurrected**: the archive database is consulted, the full state is restored to the active trie, and the transaction is processed normally.

State expiry is an optimization for long-running networks where the majority of accounts become dormant. It reduces the active state size, improving trie traversal performance and reducing memory requirements for state caching.
