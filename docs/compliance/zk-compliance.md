---
sidebar_position: 2
title: "ZK Compliance"
description: "Zero-knowledge proofs for privacy-preserving regulatory compliance using Groth16 on BLS12-381."
---

# ZK Compliance

Zero-knowledge compliance allows users to prove regulatory compliance without revealing any personal data. The system uses Groth16 proofs on the BLS12-381 curve to verify that a user holds valid credentials meeting the required compliance level -- without the ledger ever seeing the underlying identity information.

---

## How It Works

1. **Credential Acquisition**: The user obtains a verifiable credential from an accredited KYC provider registered in the `IssuerRegistry`.
2. **Proof Generation**: The user generates a Groth16 ZK proof locally, proving they hold a valid credential that meets the compliance requirements of the target token or contract.
3. **Submission**: The proof is submitted alongside the transaction as a 192-byte payload.
4. **On-Chain Verification**: The on-chain verifier checks the proof against the registered verification key retrieved from `SchemaRegistry`.
5. **Execution**: If valid, the transaction proceeds without any PII touching the ledger. If invalid, the transaction is rejected with a descriptive error code.

---

## Groth16 Proofs

Basalt uses Groth16, a succinct non-interactive zero-knowledge proof system, for all ZK compliance operations.

| Property             | Value                                              |
|----------------------|----------------------------------------------------|
| Proof size           | 192 bytes (3 curve points)                         |
| Proof structure      | A on G1, B on G2, C on G1                         |
| Verification time    | ~5ms on BLS12-381                                  |
| Verification keys    | Registered in `SchemaRegistry` system contract     |
| Nullifier scope      | Unique per block (prevents replay within a block)  |

The 192-byte proof consists of three elliptic curve points: point A on the G1 subgroup (48 bytes compressed), point B on the G2 subgroup (96 bytes compressed), and point C on the G1 subgroup (48 bytes compressed).

---

## SchemaRegistry

The `SchemaRegistry` is a system contract that manages credential schemas and their associated cryptographic parameters.

- Stores credential schema definitions that describe the structure and semantics of verifiable credentials.
- Maps schema IDs to Groth16 verification keys, enabling on-chain verifiers to look up the correct key for any given credential type.
- Schema and key registration is managed through governance proposals, ensuring community oversight of trusted credential formats.

---

## IssuerRegistry

The `IssuerRegistry` manages the trust hierarchy for credential issuers using a Sovereign Trust Chain model.

### Trust Tiers

Credential issuers are organized into four trust tiers, each with distinct requirements and authorization scopes:

| Tier   | Requirements                                  | Use Cases                                    |
|--------|-----------------------------------------------|----------------------------------------------|
| Tier 1 | Sovereign authority vouching + max collateral  | Institutional KYC, regulated securities      |
| Tier 2 | Governance approval + high collateral          | Standard KYC/AML for financial services      |
| Tier 3 | Community vouching + moderate collateral       | Basic identity verification                  |
| Tier 4 | Self-registration + minimum collateral         | Low-risk, non-financial use cases            |

### Sovereign Authorities

Real-world regulatory authorities serve as trust anchors in the system. Recognized authorities include:

- **AMF** (France)
- **BaFin** (Germany)
- **FCA** (United Kingdom)
- **FINMA** (Switzerland)
- **MAS** (Singapore)

Sovereign authorities are onboarded via governance votes and can vouch for accredited KYC providers within their jurisdiction. All issuers must stake collateral proportional to their trust tier, providing accountability for the credentials they issue.

---

## Sparse Merkle Tree

A Sparse Merkle Tree is used for credential revocation tracking, enabling efficient and privacy-preserving revocation checks.

| Property       | Value                |
|----------------|----------------------|
| Depth          | 256                  |
| Hash function  | BLAKE3               |
| Storage        | Compact lazy storage (only populated paths stored) |

ZK proofs include a **non-membership verification** step: the prover demonstrates that their credential has NOT been revoked by proving that the credential's leaf in the Sparse Merkle Tree is empty. This verification reveals nothing about which specific credential is being checked.

---

## Anti-Correlation

The nullifier construction is specifically designed to prevent linking multiple transactions to the same underlying credential.

- Each proof uses **ephemeral randomness** during nullifier derivation, ensuring that two proofs generated from the same credential produce different nullifiers.
- Nullifiers are unique per block, preventing replay attacks while ensuring that cross-block transaction patterns cannot be correlated back to a single identity.
- This property is critical for maintaining user privacy in a system where compliance proofs are publicly visible on the ledger.
