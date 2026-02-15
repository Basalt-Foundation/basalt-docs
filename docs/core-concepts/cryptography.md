---
title: Cryptography
description: Cryptographic primitives used in the Basalt blockchain -- BLAKE3, Ed25519, BLS12-381, and Keccak-256.
sidebar_position: 2
---

# Cryptography

Basalt employs four cryptographic primitives, each selected for a specific role in the protocol. This separation of concerns allows each primitive to be used where its performance and security characteristics are most advantageous, rather than relying on a single general-purpose algorithm for all operations.

## Hash Function and Signature Usage Summary

| Operation | Primitive | Rationale |
|---|---|---|
| Transaction hash | BLAKE3 | Speed, parallelism, Merkle tree compatibility |
| State trie node hash | BLAKE3 | Tree-hashing mode for parallel verification |
| Block hash | BLAKE3 | Deterministic, fast, 256-bit collision resistance |
| Merkle proof generation | BLAKE3 | Native tree-hashing support |
| Address derivation | Keccak-256 | EVM compatibility |
| Transaction signatures | Ed25519 | Fast signing/verification, small signatures |
| Consensus vote aggregation | BLS12-381 | Signature aggregation reduces bandwidth |
| Key derivation (keystore) | Argon2id | Memory-hard, resistant to GPU/ASIC attacks |
| Key encryption (keystore) | AES-256-GCM | Authenticated encryption with associated data |

## BLAKE3

BLAKE3 is the primary hash function used throughout the Basalt protocol. It serves as the backbone for transaction hashing, state trie integrity, block header hashing, and Merkle proof construction.

### Properties

| Parameter | Value |
|---|---|
| Output size | 256 bits (32 bytes) |
| Internal structure | Merkle tree of 1 KiB chunks |
| Single-threaded throughput | 3--4 GB/s on modern hardware |
| Multi-threaded throughput | Scales linearly with core count |
| Collision resistance | 128 bits (birthday bound on 256-bit output) |
| Preimage resistance | 256 bits |

### Why BLAKE3

BLAKE3 was chosen over SHA-256 and Keccak-256 for general hashing due to several advantages:

1. **Performance**: BLAKE3 achieves 3--4 GB/s single-threaded on modern x86-64 and ARM64 processors, approximately 6x faster than SHA-256 and 8x faster than Keccak-256. This directly impacts block validation time and state trie recomputation speed.

2. **Tree hashing**: BLAKE3's internal Merkle tree structure enables parallel hashing of large inputs. When hashing a block's transaction set or verifying state proofs, Basalt can distribute the computation across multiple CPU cores with no algorithmic overhead.

3. **Incremental hashing**: BLAKE3 supports incremental updates, which is useful for streaming transaction data into a hash without buffering the entire payload in memory.

4. **Keyed hashing and key derivation**: BLAKE3 natively supports keyed MAC and KDF modes, reducing the need for separate HMAC or HKDF constructions in internal protocol operations.

### Usage in Basalt

In the Basalt codebase, BLAKE3 is accessed through the `Blake3Hasher` class. The `Hash()` method returns a `Hash256` value type rather than a raw `byte[]`. To obtain a byte array for serialization or comparison, call `.ToArray()` on the returned `Hash256`.

```csharp
Hash256 txHash = Blake3Hasher.Hash(serializedTransaction);
byte[] txHashBytes = txHash.ToArray();
```

## Ed25519

Ed25519 is used for all transaction-level digital signatures. It provides fast signing and verification with compact key and signature sizes.

### Parameters

| Parameter | Value |
|---|---|
| Curve | Twisted Edwards curve over GF(2^255 - 19) |
| Private key size | 32 bytes |
| Public key size | 32 bytes |
| Signature size | 64 bytes |
| Standard | RFC 8032 |
| Implementation | NSec.Cryptography (backed by libsodium) |

### Signing and Verification

Every transaction submitted to the Basalt network must carry a valid Ed25519 signature over the transaction's canonical serialization (excluding the signature field itself). The signature binds the transaction to the sender's public key and prevents tampering with any field (nonce, recipient, value, gas parameters, or call data).

The signing workflow is:

1. Construct the unsigned transaction with all fields populated except the `Signature` field.
2. Serialize the transaction using the canonical codec (BasaltWriter).
3. Sign the serialized bytes with the sender's Ed25519 private key.
4. Attach the resulting 64-byte signature to the transaction's `Signature` field.

```csharp
(byte[] privateKey, PublicKey publicKey) = Ed25519Signer.GenerateKeyPair();
Transaction signedTx = Transaction.Sign(unsignedTx, privateKey);
```

### Batch Verification

Ed25519 supports batch verification, where multiple signatures can be verified simultaneously with a **2--3x speedup** compared to verifying each signature individually. Basalt uses batch verification during block validation to verify all transaction signatures in a block in a single batch operation, significantly reducing the CPU time required for block import.

Batch verification works by combining the individual verification equations into a single multi-scalar multiplication. If any signature in the batch is invalid, the batch check fails, and the verifier falls back to individual verification to identify the specific invalid signature(s).

### Security Note

The `PublicKey` type in Basalt is a 32-byte value type with a `ToArray()` method but no `.Bytes` property. When interacting with the Ed25519 signer, be aware of the `PublicKey` name ambiguity with `NSec.Cryptography.PublicKey` -- the Basalt codebase uses a `NSecPublicKey` alias in `Ed25519Signer.cs` to resolve this.

The `Signature` struct is a fixed 64-byte field, which matches Ed25519 signature sizes exactly. This struct cannot hold BLS signatures (96 bytes), which is why BLS is used exclusively in the consensus layer with its own serialization format rather than sharing the transaction signature type.

## BLS12-381

BLS12-381 is used exclusively for consensus vote aggregation within the BasaltBFT protocol. Its signature aggregation property allows an arbitrary number of individual validator signatures to be combined into a single constant-size proof.

### Parameters

| Parameter | Value |
|---|---|
| Curve | BLS12-381 (Barreto-Lynn-Scott) |
| Private key size | 32 bytes |
| Public key size (compressed G1) | 48 bytes |
| Signature size (compressed G2) | 96 bytes |
| Aggregated signature size | 96 bytes (constant) |
| Security level | ~128 bits |
| Domain Separation Tag | `BLS_SIG_BLS12381G2_XMD:SHA-256_SSWU_RO_POP_` |
| Implementation | Nethermind.Crypto.Bls 1.0.5 (wrapping the blst native library) |

### Signature Aggregation

The defining feature of BLS signatures in the context of BasaltBFT is **n-of-n aggregation**: given **n** individual BLS signatures over the same message (e.g., a block hash), they can be aggregated into a single 96-byte signature that is verifiable against the aggregate of the corresponding public keys.

This is critical for consensus efficiency. Without aggregation, a 100-validator network would need to transmit and store 100 individual signatures (9,600 bytes for BLS or 6,400 bytes for Ed25519) per consensus round. With BLS aggregation, this collapses to a single 96-byte signature plus a compact bitmask identifying which validators signed.

### Verification Procedure

Due to known issues with the `Pairing.Aggregate + FinalVerify` API path in the blst binding, Basalt uses a manual pairing verification approach:

```
1. H(m) = HashToCurve(message, DST)
2. e1 = MillerLoop(H(m), aggregated_public_key)
3. e2 = MillerLoop(aggregated_signature, G1_generator)
4. result = FinalExp(e1).IsEqual(FinalExp(e2))
```

This manual pairing approach produces correct results across all supported platforms (macOS ARM64, Linux ARM64, macOS x64, Linux x64).

### Key Generation

BLS private keys are 32-byte scalars that must be less than the BLS12-381 field modulus. During key generation, the most significant byte is masked:

```csharp
privateKey[0] &= 0x3F;
```

This ensures the scalar is within the valid range for the BLS12-381 curve. The corresponding public key is obtained by scalar multiplication of the private key with the G1 generator point, yielding a 48-byte compressed G1 point.

### Platform Support

The blst native library provides pre-built binaries for the following platforms:

- macOS ARM64 (Apple Silicon)
- macOS x64
- Linux ARM64
- Linux x64

## Keccak-256

Keccak-256 is used exclusively for **address derivation**, providing compatibility with Ethereum's addressing scheme.

### Address Derivation

Basalt addresses are derived from Ed25519 public keys using the following procedure:

```
address = "0x" + hex(keccak256(publicKey)[12..32])
```

This produces a 20-byte (40-character hex) address that is structurally identical to Ethereum addresses. The choice to use Keccak-256 for address derivation (rather than BLAKE3) is deliberate: it enables compatibility with existing Ethereum tooling, wallets, and block explorers that expect Keccak-256-derived addresses.

### Implementation

Basalt uses a **custom software implementation** of Keccak-256 rather than relying on the .NET `SHA3_256` managed class. This is necessary because:

1. The .NET `SHA3_256` class delegates to the operating system's cryptographic provider.
2. On macOS, the system cryptographic provider does not include SHA-3/Keccak support.
3. Since Basalt targets macOS (including Apple Silicon) as a primary development and deployment platform, a software fallback is required.

The custom implementation is used only for address derivation. All other hashing operations in the protocol use BLAKE3.

### Keccak-256 vs SHA3-256

It is important to note that Keccak-256 and NIST SHA3-256 are **not identical**. While both use the Keccak sponge construction, SHA3-256 applies a different domain separation padding. Basalt uses the original Keccak-256 variant (matching Ethereum's `keccak256`) to maintain EVM address compatibility.

## Key Storage

Private keys are stored on disk using an encrypted JSON keystore format that provides defense-in-depth against key extraction.

### Encryption Scheme

| Component | Algorithm | Parameters |
|---|---|---|
| Key Derivation Function | Argon2id | Memory: 256 MB, Iterations: 4, Parallelism: 4 |
| Encryption | AES-256-GCM | 256-bit key, 96-bit nonce, 128-bit authentication tag |

### Keystore Format

The JSON keystore file follows this structure:

```json
{
  "version": 1,
  "address": "0x1a2b3c4d5e6f...",
  "crypto": {
    "cipher": "aes-256-gcm",
    "cipherparams": {
      "nonce": "<base64-encoded 12-byte nonce>"
    },
    "ciphertext": "<base64-encoded encrypted private key>",
    "tag": "<base64-encoded 16-byte GCM authentication tag>",
    "kdf": "argon2id",
    "kdfparams": {
      "memory": 262144,
      "iterations": 4,
      "parallelism": 4,
      "salt": "<base64-encoded 32-byte salt>"
    }
  }
}
```

### Security Properties

- **Argon2id** is a memory-hard key derivation function that resists brute-force attacks using GPUs and ASICs. The 256 MB memory parameter ensures that each password guess requires a substantial memory allocation, making large-scale parallel attacks economically prohibitive.
- **AES-256-GCM** provides authenticated encryption, meaning that any tampering with the ciphertext or associated metadata will be detected during decryption. This prevents an attacker from modifying the encrypted key material without detection.
- The **nonce** is generated using a cryptographically secure random number generator and is unique per encryption operation.
- The **salt** is similarly generated randomly, ensuring that identical passwords produce different derived keys across different keystore files.

### Decryption Workflow

1. Read the JSON keystore file.
2. Prompt the user for their password.
3. Derive the AES-256 key from the password using Argon2id with the stored salt and parameters.
4. Decrypt the ciphertext using AES-256-GCM with the derived key and stored nonce.
5. Verify the GCM authentication tag. If verification fails, the password is incorrect or the file has been tampered with.
6. The decrypted output is the raw 32-byte Ed25519 private key (or 32-byte BLS private key for validator consensus keys).
