---
sidebar_position: 1
slug: /
title: Introduction
---

# Welcome to Basalt

Basalt is a Layer 1 blockchain built on .NET 9 with Native AOT compilation, purpose-built for enterprise use cases that demand regulatory compliance, deterministic finality, and high throughput. Whether you are tokenizing real-world assets, building supply chain traceability systems, operating energy market settlements, or issuing decentralized identities, Basalt provides the infrastructure to do so within a compliance-first framework.

Unlike general-purpose blockchains that bolt on compliance as an afterthought, Basalt embeds identity verification, KYC/AML screening, and regulatory controls directly into the protocol layer. Smart contracts are written in C# and validated at compile time with Roslyn analyzers, eliminating entire classes of vulnerabilities before code ever reaches the chain. The result is a blockchain that enterprises can adopt without sacrificing the regulatory obligations they operate under.

## Key Features

- **Native AOT Compilation** -- Single-binary deployment with no JIT overhead, sub-millisecond startup, and predictable memory usage. No reflection, no runtime code generation.
- **BLAKE3 Hashing** -- Primary hash function delivering best-in-class throughput for block hashing, Merkle trees, and transaction integrity.
- **Ed25519 Signatures** -- Fast, secure digital signatures for all transaction signing and identity verification.
- **BLS12-381 Aggregate Signatures** -- Compact multi-validator signature aggregation for consensus, reducing on-chain storage and verification costs.
- **BasaltBFT Consensus** -- A HotStuff-derived Byzantine Fault Tolerant consensus protocol producing blocks every 400ms with deterministic finality. No probabilistic confirmation windows.
- **Merkle Patricia Trie + RocksDB** -- Authenticated state storage with cryptographic proofs, backed by RocksDB for persistent, crash-recoverable data.
- **C# Smart Contracts with Roslyn Analyzers** -- Write contracts in idiomatic C# with compile-time safety checks that catch reentrancy, unbounded loops, and unsafe patterns before deployment.
- **Built-in Compliance** -- Native KYC/AML identity registry, MiCA-aligned transfer controls, and GDPR-compatible data handling wired directly into the transaction executor.
- **EVM Bridge** -- Cross-chain asset movement between Basalt and EVM-compatible chains via multisig relayers and Merkle proof verification.
- **P2P Networking with Episub Gossip** -- TCP transport with Kademlia DHT for peer discovery and Episub protocol for efficient block and transaction propagation.

## Quick Links

- [Installation](getting-started/installation) -- Set up your development environment and build Basalt from source.
- [Quickstart](getting-started/quickstart) -- Run a local node or spin up a 4-validator devnet in minutes.
- [Architecture](getting-started/architecture) -- Understand the layered design and project structure.

## Token Economics

| Parameter         | Value                  |
|-------------------|------------------------|
| Token Symbol      | BSLT                   |
| Decimals          | 18                     |
| Block Time        | 400ms                  |
| Block Gas Limit   | 100,000,000            |
| Max Transactions  | 10,000 per block       |
| Finality          | Deterministic (single block) |

The BSLT token serves as the native unit of account for gas fees, staking, and governance. Validators must stake a minimum of 100,000 BSLT to participate in consensus, with stake-weighted leader selection ensuring proportional block production rights.
