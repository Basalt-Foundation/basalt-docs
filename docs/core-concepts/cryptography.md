---
sidebar_position: 2
title: "Cryptography"
description: "Cryptographic primitives used in Basalt: BLAKE3, Ed25519, BLS12-381, Keccak-256, Pedersen commitments, Groth16 ZK-SNARKs, and authenticated encryption."
---

# Cryptography

Basalt uses a purpose-selected set of cryptographic primitives across its stack. Each algorithm was chosen to balance performance, security, and compatibility with the chain's Native AOT compilation target.

## Primitive Overview

| Algorithm | Use | Details |
|---|---|---|
| BLAKE3 | Block hashing, state roots, Merkle trees | 256-bit output, 3--4 GB/s throughput |
| Ed25519 | Transaction signing, P2P authentication | 32-byte keys, 64-byte signatures, batch verification support |
| BLS12-381 | Consensus vote aggregation, ZK proofs | 48-byte public key, 96-byte signature, pairing-friendly curve |
| Keccak-256 | Address derivation | Last 20 bytes of public key hash, EVM-compatible addressing |
| Pedersen | Confidential transaction commitments | `C = v*G + r*H` on BLS12-381 G1, additively homomorphic |
| Groth16 | ZK-SNARK proofs | 192-byte proofs (3 G1/G2 points), ~5 ms verification |
| X25519 | Private channel key exchange | ECDH key agreement with HKDF-SHA256 key derivation |
| AES-256-GCM | Private channel encryption | Authenticated encryption for off-chain messages |

## Hashing: BLAKE3

BLAKE3 is the primary hash function throughout the protocol. It produces 256-bit digests and achieves 3--4 GB/s throughput on modern hardware, making it significantly faster than SHA-256 or Keccak-256.

BLAKE3 is used for:

- Block header hashing
- Transaction hashing
- State root computation (Merkle Patricia Trie nodes)
- Merkle tree construction (bridge proofs, receipt proofs)

## Transaction Signatures: Ed25519

All transactions are signed using Ed25519. This scheme provides:

- **32-byte public keys** and **64-byte signatures**, keeping transaction sizes compact.
- **Batch verification** support, enabling the execution layer to verify multiple signatures in a single operation for improved throughput.
- **Deterministic signatures**, eliminating the need for a secure random number generator at signing time.

Ed25519 is also used for P2P peer authentication during the handshake process.

## Consensus Aggregation: BLS12-381

Consensus votes use BLS12-381 signatures, which support **signature aggregation**. Multiple individual signatures over the same message can be combined into a single 96-byte aggregate signature, regardless of how many validators contributed. This property is essential for keeping consensus certificates compact.

BLS12-381 is a pairing-friendly elliptic curve, which also enables its use in ZK-SNARK proof systems (see Groth16 below).

## Address Derivation: Keccak-256

Basalt addresses are derived using Keccak-256 for EVM compatibility:

1. Take the Ed25519 public key (32 bytes).
2. Hash it with Keccak-256 (32-byte output).
3. Take the last 20 bytes as the address.

:::note Platform Consideration
Keccak-256 uses a custom software implementation because macOS lacks native SHA3-256 support in its cryptographic libraries. This ensures consistent behavior across all target platforms.
:::

## Confidential Commitments: Pedersen

Pedersen commitments enable confidential transaction amounts using the formula:

```
C = v * G + r * H
```

Where `v` is the value, `r` is a random blinding factor, and `G` and `H` are generator points on the BLS12-381 G1 curve. The **additive homomorphic** property allows verification that inputs equal outputs without revealing individual amounts:

```
C(a) + C(b) = C(a + b)
```

## Zero-Knowledge Proofs: Groth16

Groth16 ZK-SNARKs provide privacy-preserving compliance verification. A proof demonstrates that a statement is true without revealing the underlying data.

| Property | Value |
|---|---|
| Proof size | 192 bytes (3 G1/G2 curve points) |
| Verification time | ~5 ms |
| Trusted setup | Required (per-circuit) |

Groth16 proofs are used in the compliance layer to prove regulatory attestations (such as KYC status or jurisdiction eligibility) without exposing personal data on-chain.

## Private Channels

Private peer-to-peer communication uses a two-layer encryption scheme:

1. **Key exchange**: X25519 (Elliptic Curve Diffie-Hellman) establishes a shared secret between two peers. The raw shared secret is processed through HKDF-SHA256 to derive the symmetric encryption key.
2. **Encryption**: AES-256-GCM provides authenticated encryption for message payloads, ensuring both confidentiality and integrity of off-chain messages.

## Key Storage

| Key Type | Storage | Usage |
|---|---|---|
| Ed25519 private keys | Local filesystem | Transaction signing, P2P authentication |
| BLS12-381 private keys | Local filesystem | Consensus voting (validators only) |

There is no HSM (Hardware Security Module) requirement for devnet or testnet environments. Production deployments may integrate HSM support for validator key protection.
