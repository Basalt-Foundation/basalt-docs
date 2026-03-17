---
sidebar_position: 3
title: "Confidential Transactions"
description: "Pedersen commitments, range proofs, private channels, and selective disclosure for transaction privacy."
---

# Confidential Transactions

Confidential transaction support hides transfer amounts while maintaining full verifiability. Validators can confirm that transactions are balanced and that all values are positive without ever learning the actual amounts involved.

---

## Pedersen Commitments

Basalt uses Pedersen commitments on the BLS12-381 G1 curve to hide transaction amounts.

**Scheme**: `C = v*G + r*H`

| Symbol | Meaning                                            |
|--------|----------------------------------------------------|
| `C`    | The commitment (a compressed G1 point, 48 bytes)   |
| `v`    | The transaction amount (hidden)                    |
| `r`    | The blinding factor (random scalar, known only to the sender) |
| `G`    | Generator point of the G1 subgroup                 |
| `H`    | A second generator, chosen such that the discrete log relation to `G` is unknown |

### Homomorphic Property

Pedersen commitments are additively homomorphic:

```
C(a) + C(b) = C(a + b)
```

This property allows validators to verify that transaction inputs and outputs balance -- that is, no value is created or destroyed -- without knowing the individual amounts. The validator checks that the sum of input commitments equals the sum of output commitments plus the fee commitment.

| Property        | Value                        |
|-----------------|------------------------------|
| Commitment size | 48 bytes (compressed G1 point) |
| Binding         | Computationally binding       |
| Hiding          | Perfectly hiding               |

---

## Range Proofs

Groth16 ZK proofs are used to prove that committed values are positive and within a valid range. Without range proofs, an attacker could commit to a negative value, effectively creating tokens out of nothing through arithmetic wraparound.

| Property          | Value              |
|-------------------|--------------------|
| Proof system      | Groth16            |
| Proof size        | 192 bytes          |
| Verification time | ~5ms               |
| Curve             | BLS12-381          |

Range proofs are verified alongside the transaction's Pedersen commitments during execution. A transaction with a valid commitment but an invalid or missing range proof is rejected.

---

## Private Channels

Bilateral off-chain communication channels allow transaction participants to exchange blinding factors, amount openings, and other sensitive data without on-chain visibility.

### Key Exchange and Encryption

| Component        | Algorithm                  | Purpose                                         |
|------------------|----------------------------|-------------------------------------------------|
| Key exchange     | X25519 ECDH                | Derive a shared secret between two parties      |
| Key derivation   | HKDF-SHA256                | Derive symmetric encryption keys from the shared secret |
| Encryption       | AES-256-GCM                | Authenticated encryption of channel messages    |
| Signing          | Ed25519                    | Message authentication and integrity            |
| Nonce            | Monotonic construction     | Replay prevention within a channel              |

### Channel Identification

Channel IDs are derived deterministically from the public keys of both participants. This ensures that a given pair of parties always resolves to the same channel, regardless of which party initiates communication.

---

## Selective Disclosure

Selective disclosure mechanisms allow authorized parties -- such as regulators or auditors -- to decrypt specific transaction amounts without granting blanket access to all transaction data.

### Viewing Keys

- Viewing keys are generated using **ephemeral X25519 ECDH** key agreement, with no on-chain visibility of the key exchange.
- An authorized auditor receiving a viewing key can decrypt the Pedersen commitment openings (the value `v` and blinding factor `r`) for specific transactions.
- Viewing key access is **forward-secure**: keys derived for past transactions cannot be used to decrypt future transactions.
- Viewing key access is **revocable**: the disclosing party can rotate keys to terminate an auditor's access to future disclosures.

### Disclosure Proofs

Disclosure proofs reveal the opening of a Pedersen commitment to a specific authorized party. The proof demonstrates that the revealed value and blinding factor correspond to the on-chain commitment, without revealing this information to any other observer.

---

## Credential Revocation

Credential revocation for confidential transactions uses the same Sparse Merkle Tree infrastructure as the ZK compliance system.

| Property       | Value                                               |
|----------------|-----------------------------------------------------|
| Tree depth     | 256                                                 |
| Hash function  | BLAKE3                                              |
| Storage model  | Compact lazy storage (only populated paths stored)  |

ZK proofs accompanying confidential transactions include a non-membership verification step, proving that the sender's credential has not been revoked. The compact lazy storage model ensures that the Sparse Merkle Tree remains efficient even as the total credential space grows, since only paths corresponding to revoked credentials consume storage.
