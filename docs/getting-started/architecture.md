---
sidebar_position: 3
title: Architecture
---

# Architecture

Basalt is organized as a layered, modular architecture where each layer has a single responsibility and well-defined dependencies. The composition root (`Basalt.Node`) wires everything together at startup.

## Dependency Graph

```
Basalt.Core  (zero external dependencies)
+-- Basalt.Codec         -- Deterministic binary serialization
+-- Basalt.Crypto        -- BLAKE3, Ed25519, Keccak-256, BLS12-381
+-- Basalt.Storage       -- RocksDB, Merkle Patricia Trie
+-- Basalt.Network       -- TCP transport, Kademlia DHT, Episub
|   +-- Basalt.Consensus -- BasaltBFT, staking, slashing
|       +-- Basalt.Execution -- Transaction executor, BasaltVM
|           +-- Basalt.Api.Rest     -- REST API + WebSocket
|           +-- Basalt.Api.Grpc     -- gRPC services
|           +-- Basalt.Api.GraphQL  -- GraphQL (HotChocolate)
|           +-- Basalt.Compliance   -- Identity, KYC/AML
|           +-- Basalt.Bridge       -- EVM bridge
|               +-- Basalt.Node     -- Composition root
```

Dependencies flow strictly downward. `Basalt.Core` has zero external NuGet dependencies and defines the foundational types (addresses, hashes, transactions, blocks) used by every other project. Higher layers depend on lower layers but never the reverse.

## Layer Descriptions

### Core Layer

**Basalt.Core** defines the canonical data types for the entire system: `Hash256`, `PublicKey`, `Signature`, `Address`, `Transaction`, `Block`, `BlockHeader`, and chain parameters. It has no external dependencies and is designed to be fully AOT-compatible.

**Basalt.Codec** implements deterministic binary serialization using length-prefixed framing. The codec produces identical byte sequences for identical data across all platforms, which is critical for consensus -- every validator must compute the same hash for the same block.

**Basalt.Crypto** provides all cryptographic primitives:
- **BLAKE3** -- Primary hash function for blocks, transactions, and Merkle trees.
- **Ed25519** -- Transaction and message signing via libsodium (NaCl).
- **Keccak-256** -- Address derivation from public keys (software implementation for cross-platform compatibility).
- **BLS12-381** -- Aggregate signatures for consensus via Nethermind.Crypto.Bls, enabling compact multi-validator attestations.

### Storage Layer

**Basalt.Storage** manages persistent state through two subsystems:
- **RocksDB** -- Key-value store for blocks, transaction indices, and raw chain data. Column families separate block headers, block bodies, transaction lookups, and state snapshots.
- **Merkle Patricia Trie** -- Authenticated state tree where every account balance, nonce, contract storage slot, and staking record is a leaf node. The trie root is included in each block header, enabling lightweight state proofs and state sync between peers.

### Network Layer

**Basalt.Network** handles peer-to-peer communication:
- **TCP Transport** -- Length-prefixed framing with a `[1 byte MessageType][32 bytes SenderId][8 bytes Timestamp][payload]` wire format. Hello/HelloAck handshake with chain ID validation and 5-second timeout.
- **Kademlia DHT** -- Distributed hash table for peer discovery. Nodes maintain routing tables and perform iterative lookups to find validators.
- **Episub Gossip** -- Epidemic subscription protocol for efficient block and transaction propagation with IWant/IHave message deduplication.

### Consensus Layer

**Basalt.Consensus** implements BasaltBFT, a HotStuff-derived BFT protocol:
- Four-phase pipeline: PROPOSE, PREPARE, PRE-COMMIT, COMMIT.
- 400ms block time with deterministic finality (no confirmation delay).
- Stake-weighted leader selection using `BLAKE3(view || validator_address)` weighted by staked BSLT.
- **Staking** -- Validator registration (minimum 100,000 BSLT), stake delegation, unbonding with cooldown period.
- **Slashing** -- Double-sign detection (100% slash), inactivity penalty (5% after 100 blocks), invalid block proposal (1%).
- View change protocol for leader failure recovery.

### Execution Layer

**Basalt.Execution** processes transactions and runs smart contracts:
- **Transaction Executor** -- Validates signatures, checks nonces, deducts gas, executes transfers and contract calls, updates state trie.
- **BasaltVM** -- Virtual machine for executing C# smart contracts compiled to a controlled instruction set.
- Contract code is stored at the `0xFF01` storage key and loaded from state at execution time.

### API Layer

Three API surfaces expose the chain to external clients:

- **Basalt.Api.Rest** -- RESTful HTTP API with endpoints for blocks, transactions, accounts, faucet, and status. Includes WebSocket support for real-time block and transaction subscriptions.
- **Basalt.Api.Grpc** -- gRPC services defined in `basalt.proto` with 5 RPCs for programmatic access from any gRPC client.
- **Basalt.Api.GraphQL** -- GraphQL API powered by HotChocolate 14.3.0 for flexible querying of blocks, transactions, and validator state.

### Compliance Layer

**Basalt.Compliance** provides protocol-level regulatory controls:
- **Identity Registry** -- On-chain mapping of addresses to verified identities.
- **KYC/AML** -- Pluggable KYC providers that issue identity attestations. Transfer controls check sender and receiver compliance status before execution.
- **Sanctions Screening** -- Sanctions list checked during transaction validation.
- Designed to support MiCA (Markets in Crypto-Assets) requirements and GDPR-compatible data handling.

### Bridge Layer

**Basalt.Bridge** enables cross-chain interoperability:
- **EVM Bridge** -- Lock-and-mint bridge between Basalt and EVM-compatible chains.
- **Multisig Relayer** -- Relay operators co-sign cross-chain messages with threshold signatures.
- **Merkle Proofs** -- Cryptographic inclusion proofs verify that events occurred on the source chain.

## Design Principles

### AOT-First

Every library in the Basalt stack is designed for Native AOT from the ground up. This means:
- No reflection or `System.Reflection.Emit` anywhere in the codebase.
- Source generators replace runtime code generation for serialization and dependency injection.
- All types are trim-safe with no dynamic loading.
- Single-binary deployment with sub-millisecond cold startup.

### Deterministic Execution

Consensus requires every validator to produce identical results for identical inputs. Basalt enforces this through:
- No `GC.Collect()` on the hot path -- allocation-conscious design using `Span<T>`, `stackalloc`, and pooled buffers.
- Deterministic binary serialization (same bytes in, same bytes out, every time).
- Fixed genesis timestamps to prevent hash divergence across nodes.
- No floating-point arithmetic in consensus or state transition logic.

### Modularity

Each of the 30 projects has a focused responsibility and communicates through well-defined interfaces. This enables:
- Independent testing (16 test projects, 1,380 tests).
- Swappable implementations (e.g., storage backends, signature schemes).
- Incremental deployment -- run only the layers you need.

### Compliance-by-Design

Rather than treating compliance as an external add-on, Basalt integrates regulatory controls into the transaction execution pipeline. Every transfer passes through the compliance engine before state is mutated, making it impossible to bypass identity checks or sanctions screening at the protocol level.

## Project Structure

| Directory          | Contents                                                  |
|--------------------|-----------------------------------------------------------|
| `src/core/`        | Core types, Codec (serialization), Crypto (BLAKE3, Ed25519, Keccak-256, BLS12-381) |
| `src/storage/`     | RocksDB key-value store, Merkle Patricia Trie             |
| `src/network/`     | TCP transport, Kademlia DHT, Episub gossip protocol       |
| `src/consensus/`   | BasaltBFT consensus, staking, slashing, leader selection  |
| `src/execution/`   | Transaction executor, BasaltVM smart contract runtime     |
| `src/api/`         | REST (+ WebSocket), gRPC, GraphQL API surfaces            |
| `src/compliance/`  | Identity registry, KYC/AML providers, sanctions screening |
| `src/bridge/`      | EVM bridge, multisig relayer, Merkle proof verification   |
| `src/sdk/`         | Contract SDK, Roslyn analyzers, testing framework         |
| `src/explorer/`    | Blazor WebAssembly block explorer                         |
| `tools/`           | CLI tooling, DevNet orchestration                         |
| `tests/`           | 16 test projects (1,380 tests)                            |
