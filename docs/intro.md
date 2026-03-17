---
sidebar_position: 1
slug: /
title: Introduction
description: Welcome to Basalt — a compliance-native Layer 1 blockchain built on .NET 9 Native AOT with C# smart contracts, ZK compliance, and a protocol-native DEX.
---

# Welcome to Basalt

Basalt is a compliance-native Layer 1 blockchain built on .NET 9 with Native AOT compilation. It combines regulatory-grade compliance infrastructure -- identity registries, KYC/AML enforcement, sanctions screening, ZK privacy proofs -- with the performance and developer ergonomics of modern .NET. Smart contracts are written in C# and validated at compile time by Roslyn analyzers, confidential transactions use Pedersen commitments with Groth16 zero-knowledge proofs, and the protocol ships with a built-in DEX (Caldera Fusion) supporting batch auctions, concentrated liquidity, and encrypted order intents.

## At a Glance

| Category              | Details                                                                 |
|-----------------------|-------------------------------------------------------------------------|
| Block Time            | 2 seconds                                                               |
| Finality              | 4 seconds (deterministic, no probabilistic confirmation)                |
| Token Standards       | 7 -- BST-20, BST-721, BST-1155, BST-3525, BST-4626, DID, VC           |
| System Contracts      | 8 -- WBSLT, BNS, Governance, Escrow, StakingPool, SchemaRegistry, IssuerRegistry, BridgeETH |
| Roslyn Analyzers      | 12 compile-time diagnostics for contract safety                        |
| Test Suite            | 4,000+ tests across 16 test projects                                   |
| Solution Size         | 30 projects, .NET 9 Native AOT                                         |

## Cryptography

Basalt uses a layered cryptographic stack, each primitive chosen for its specific role in the protocol:

- **BLAKE3** -- Primary hash function for blocks, Merkle trees, and transaction integrity. Hardware-friendly with best-in-class throughput.
- **Ed25519** -- Transaction and message signing via libsodium. Fast signature generation and verification.
- **BLS12-381** -- Aggregate signature scheme for consensus. Multiple validator signatures are compressed into a single compact attestation.
- **Keccak-256** -- EVM-compatible address derivation from public keys. Uses a software implementation for cross-platform compatibility (macOS lacks hardware SHA3-256 support).
- **Pedersen Commitments** -- Homomorphic commitments enabling confidential transaction amounts that can be verified without revealing values.
- **Groth16 ZK Proofs** -- Zero-knowledge proof system for privacy-preserving compliance verification. Prove regulatory adherence without exposing underlying data.

## Core Capabilities

**C# Smart Contracts.** Write contracts in idiomatic C# with full IDE support. Twelve Roslyn analyzers catch reentrancy, unbounded loops, unsafe state mutations, and policy hook violations at compile time -- before code ever reaches the chain.

**ZK Compliance.** Prove that a transaction satisfies regulatory requirements (identity verification, sanctions clearance, jurisdictional rules) without revealing the underlying personal data. Built on Groth16 proofs with sparse Merkle tree commitments and nullifier-based anti-correlation.

**Confidential Transactions.** Transaction amounts are shielded using Pedersen commitments. Validators verify balance conservation and range proofs without seeing the actual values.

**Caldera Fusion DEX.** A protocol-native decentralized exchange with batch auction matching, order book support, TWAP oracle, dynamic fees, concentrated liquidity positions, encrypted order intents, and a solver network. No external AMM contracts required.

**EVM Bridge.** Lock-and-unlock bridge between Basalt and EVM-compatible chains, secured by M-of-N Ed25519 multisig relayers with Merkle proof verification.

## Quick Links

- [Installation](getting-started/installation) -- Set up your development environment and build Basalt from source.
- [Quickstart](getting-started/quickstart) -- Run a local node or spin up a 4-validator devnet in minutes.
- [Architecture](getting-started/architecture) -- Understand the 30-project layered design and dependency graph.
- [Smart Contracts](smart-contracts/overview) -- Write, test, and deploy C# smart contracts with compile-time safety.
- [API Reference](apis/rest) -- REST, gRPC, GraphQL, and WebSocket API documentation.
- [Node Operations](node-operations/running-a-node) -- Configure validators, RPC nodes, monitoring, and production deployments.
