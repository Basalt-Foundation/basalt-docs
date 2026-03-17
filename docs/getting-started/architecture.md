---
sidebar_position: 3
title: Architecture
description: Layered architecture, dependency graph, and project structure of the Basalt blockchain.
---

# Architecture

Basalt is organized as a 30-project .NET 9 solution with a strict layered architecture. Each layer has a single responsibility, depends only on layers below it, and communicates through well-defined interfaces. The composition root (`Basalt.Node`) wires everything together at startup via dependency injection.

## Project Structure

```
src/core/            Core types, Crypto (BLAKE3, Ed25519, BLS12-381, Keccak-256), Codec
src/storage/         RocksDB + Merkle Patricia Trie, flat state
src/network/         P2P networking (TCP, Kademlia DHT, Episub gossip)
src/consensus/       BasaltBFT consensus engine, staking, slashing, epochs
src/execution/       Transaction executor, BasaltVM, gas metering
src/api/             REST API, gRPC, GraphQL, WebSocket
src/compliance/      Identity registry, KYC, sanctions, ZK compliance
src/confidentiality/ Pedersen commitments, Groth16 verifier, sparse Merkle trees
src/bridge/          EVM bridge, multisig relayer, Merkle proofs
src/sdk/             SDK contracts, Roslyn analyzers, testing framework, wallet
src/explorer/        Blazor WASM block explorer
src/node/            Node entry point, configuration, dependency injection
tools/               CLI, DevNet orchestrator
tests/               16 test projects
```

## Dependency Graph

Dependencies flow strictly downward. Lower layers never reference higher layers.

```
Basalt.Core  (zero external dependencies)
  |
  +-- Basalt.Codec            Deterministic binary serialization
  +-- Basalt.Crypto           BLAKE3, Ed25519, Keccak-256, BLS12-381
  |
  +-- Basalt.Storage          RocksDB, Merkle Patricia Trie, flat state
  |
  +-- Basalt.Network          TCP transport, Kademlia DHT, Episub gossip
  |     |
  |     +-- Basalt.Consensus  BasaltBFT, staking, slashing, epochs
  |           |
  |           +-- Basalt.Execution     Transaction executor, BasaltVM, gas metering
  |                 |
  |                 +-- Basalt.Api.Rest       REST API + WebSocket subscriptions
  |                 +-- Basalt.Api.Grpc       gRPC services
  |                 +-- Basalt.Api.GraphQL    GraphQL API (HotChocolate)
  |                 +-- Basalt.Compliance     Identity, KYC/AML, sanctions
  |                 +-- Basalt.Confidentiality  Pedersen, Groth16, sparse Merkle
  |                 +-- Basalt.Bridge         EVM bridge, multisig relayer
  |
  +-- Basalt.Node             Composition root (wires all layers)
```

## Layer Descriptions

### Core Layer

**Basalt.Core** defines the canonical data types used by every other project: `Hash256`, `PublicKey`, `Signature`, `Address`, `Transaction`, `Block`, `BlockHeader`, and chain parameters. It has zero external NuGet dependencies and is fully AOT-compatible.

**Basalt.Codec** implements deterministic binary serialization using length-prefixed framing. The codec produces identical byte sequences for identical data across all platforms -- a hard requirement for consensus, where every validator must compute the same hash for the same block.

**Basalt.Crypto** provides all cryptographic primitives:

| Primitive   | Algorithm   | Purpose                                                  |
|-------------|-------------|----------------------------------------------------------|
| Hashing     | BLAKE3      | Blocks, transactions, Merkle trees, state roots          |
| Signatures  | Ed25519     | Transaction signing, identity verification (via libsodium) |
| Addresses   | Keccak-256  | EVM-compatible address derivation from public keys       |
| Consensus   | BLS12-381   | Aggregate multi-validator attestations                   |

### Storage Layer

**Basalt.Storage** manages persistent state through two subsystems:

- **RocksDB** -- Key-value store for blocks, transaction indices, and raw chain data. Column families separate block headers, block bodies, transaction lookups, and state snapshots for isolated access patterns.
- **Merkle Patricia Trie** -- Authenticated state tree where every account balance, nonce, contract storage slot, and staking record is a leaf node. The trie root is included in each block header, enabling lightweight state proofs and state synchronization between peers.
- **Flat State** -- An optimized read path that caches frequently accessed state (account balances, nonces) in a flat key-value layout, avoiding trie traversal for common queries.

### Network Layer

**Basalt.Network** handles peer-to-peer communication:

- **TCP Transport** -- Length-prefixed framing with a `[1 byte MessageType][32 bytes SenderId][8 bytes Timestamp][payload]` wire format. Hello/HelloAck handshake with chain ID validation and 5-second timeout.
- **Kademlia DHT** -- Distributed hash table for peer discovery. Nodes maintain routing tables organized by XOR distance and perform iterative lookups to find validators.
- **Episub Gossip** -- Epidemic subscription protocol for efficient block and transaction propagation with IWant/IHave message deduplication, reducing bandwidth overhead.

### Consensus Layer

**Basalt.Consensus** implements BasaltBFT, a HotStuff-derived BFT protocol:

- **Four-phase pipeline:** PROPOSE, PREPARE, PRE-COMMIT, COMMIT.
- **2-second block time** with deterministic finality at 4 seconds (no confirmation delay, no probabilistic settlement).
- **Stake-weighted leader selection** using `BLAKE3(epoch || view || validator_address)` weighted by staked BSLT.
- **Staking** -- Validator registration (minimum 100,000 BSLT), stake delegation, unbonding with cooldown period.
- **Slashing** -- Double-sign detection (100% slash), inactivity penalty (5% after 100 missed blocks), invalid block proposal (1% slash).
- **Epochs** -- Validator set transitions at epoch boundaries with BLS aggregate signature checkpoints.
- **Circuit breaker** -- Deadlock prevention for consensus stalls, including finalization gap recovery and cooldown-period block production.
- **View change protocol** for leader failure recovery.

### Execution Layer

**Basalt.Execution** processes transactions and runs smart contracts:

- **Transaction Executor** -- Validates Ed25519 signatures, checks nonces, deducts gas (EIP-1559 dynamic base fee), executes transfers and contract calls, updates the state trie. Compliance checks are enforced here, before any state mutation commits.
- **BasaltVM** -- Sandboxed virtual machine for executing C# smart contracts compiled to a controlled instruction set. Contracts run in isolation with metered gas consumption and cannot access the host filesystem, network, or system clock.
- **Gas Metering** -- EIP-1559 dynamic base fee with per-block gas limits (100,000,000 gas per block, 10,000 max transactions).

### Compliance Layer

**Basalt.Compliance** provides protocol-level regulatory controls, enforced at the execution layer before state changes commit:

- **Identity Registry** -- On-chain mapping of addresses to verified identities with tiered KYC levels.
- **KYC/AML** -- Pluggable KYC providers that issue identity attestations. Transfer controls check sender and receiver compliance status during transaction execution.
- **Sanctions Screening** -- Sanctions list checked during transaction validation.
- **ZK Compliance** -- Zero-knowledge proofs (Groth16) allow users to prove regulatory compliance without revealing personal data. Sparse Merkle tree commitments and nullifier-based anti-correlation prevent linkability across proofs.

### Confidentiality Layer

**Basalt.Confidentiality** enables private transactions:

- **Pedersen Commitments** -- Homomorphic commitments hide transaction amounts while allowing validators to verify balance conservation.
- **Groth16 Verifier** -- Verifies zero-knowledge proofs submitted with confidential transactions.
- **Sparse Merkle Trees** -- Efficient membership and non-membership proofs for nullifier sets and commitment registries.

### Bridge Layer

**Basalt.Bridge** enables cross-chain interoperability with EVM-compatible chains:

- **EVM Bridge** -- Lock-and-unlock mechanism for moving BSLT between Basalt and Ethereum/EVM chains.
- **Multisig Relayer** -- M-of-N Ed25519 multisig relayer operators co-sign cross-chain attestations.
- **Merkle Proofs** -- Cryptographic inclusion proofs verify that lock events occurred on the source chain before releasing funds on the destination chain.

### API Layer

Three API surfaces expose the chain to external clients:

- **Basalt.Api.Rest** -- RESTful HTTP API with endpoints for blocks, transactions, accounts, faucet, and status. Includes WebSocket support for real-time block and transaction subscriptions.
- **Basalt.Api.Grpc** -- gRPC services for programmatic access from any gRPC-compatible client.
- **Basalt.Api.GraphQL** -- GraphQL API powered by HotChocolate for flexible querying of blocks, transactions, and validator state.

### SDK Layer

**Basalt.Sdk** provides the smart contract development toolkit:

- **Basalt.Sdk.Contracts** -- 7 token standards (BST-20, BST-721, BST-1155, BST-3525, BST-4626, DID, VC) and 8 system contracts (WBSLT, BNS, Governance, Escrow, StakingPool, SchemaRegistry, IssuerRegistry, BridgeETH). Includes policy hooks (ITransferPolicy, INftTransferPolicy) with reference implementations (HoldingLimit, Lockup, Jurisdiction, Sanctions).
- **Basalt.Sdk.Analyzers** -- 12 Roslyn analyzers that catch reentrancy, unbounded loops, unsafe state mutations, and policy hook violations at compile time.
- **Basalt.Sdk.Testing** -- Testing framework for contract unit tests and integration tests.

### Explorer

**Basalt.Explorer** -- A Blazor WebAssembly block explorer providing a browser-based UI for inspecting blocks, transactions, accounts, and validator state.

## Design Principles

### AOT-First

Every library is designed for Native AOT from the ground up:

- No reflection or `System.Reflection.Emit` anywhere in the codebase.
- Source generators replace runtime code generation for serialization and dependency injection.
- All types are trim-safe with no dynamic loading.
- Single-binary deployment with sub-millisecond cold startup.

### Deterministic Execution

Consensus requires every validator to produce identical results for identical inputs:

- No `GC.Collect()` on the hot path -- allocation-conscious design using `Span<T>`, `stackalloc`, and pooled buffers.
- Deterministic binary serialization (same bytes in, same bytes out, on every platform).
- Fixed genesis timestamps to prevent hash divergence across nodes.
- No floating-point arithmetic in consensus or state transition logic.

### Compliance by Design

Regulatory controls are integrated into the transaction execution pipeline, not bolted on as middleware. Every transfer passes through the compliance engine before state is mutated, making it impossible to bypass identity checks, sanctions screening, or policy hooks at the protocol level.

### Modularity

Each of the 30 projects has a focused responsibility and communicates through well-defined interfaces. This enables independent testing (16 test projects, 4,000+ tests), swappable implementations (storage backends, signature schemes, KYC providers), and incremental deployment.
