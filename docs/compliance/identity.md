---
sidebar_position: 4
title: "Identity & Credentials"
description: "Decentralized identity infrastructure with W3C-compatible DIDs, verifiable credentials, and a sovereign trust chain."
---

# Identity & Credentials

Basalt provides a decentralized identity infrastructure that supports W3C-compatible decentralized identifiers (DIDs) and verifiable credentials (VCs). No personally identifiable information (PII) is stored on-chain. The identity layer stores only attestation hashes, KYC levels, and credential validity proofs.

---

## BST-DID (Decentralized Identifiers)

BST-DID implements W3C DID-compatible document management on the Basalt ledger.

### Capabilities

- **DID Document Management**: Create, update, deactivate, and resolve DID documents on-chain.
- **Service Endpoints**: DID documents can declare service endpoints for off-chain resolution, enabling discovery of external services associated with an identity.
- **Verification Methods**: Each DID document contains one or more verification methods, currently supporting Ed25519 public keys for authentication and assertion.
- **System Contract**: All DID operations are managed via the `BSTDIDRegistry` system contract.

### DID Document Structure

A BST-DID document contains:

| Field                  | Description                                              |
|------------------------|----------------------------------------------------------|
| `id`                   | The DID identifier (e.g., `did:bst:<address>`)           |
| `verificationMethod`   | Array of Ed25519 public keys for authentication          |
| `service`              | Array of service endpoint descriptors                    |
| `controller`           | The address authorized to update this DID document       |
| `created`              | Block height at which the DID was registered             |
| `updated`              | Block height of the most recent update                   |

---

## BST-VC (Verifiable Credentials)

BST-VC implements W3C VC-compatible credential issuance and verification.

### Lifecycle

1. **Issuance**: An accredited provider (registered in `IssuerRegistry`) issues a verifiable credential to a subject.
2. **Storage**: The credential is stored off-chain by the holder. Only a commitment hash is recorded on-chain.
3. **Presentation**: The holder generates a ZK proof from the credential to prove compliance without revealing the credential contents.
4. **Revocation**: The issuer can revoke a credential by inserting its identifier into the Sparse Merkle Tree. ZK proofs automatically fail for revoked credentials.

### Properties

| Property            | Description                                                |
|---------------------|------------------------------------------------------------|
| W3C VC compatible   | Follows the W3C Verifiable Credentials data model          |
| Privacy-preserving  | ZK proof generation for selective attribute disclosure      |
| On-chain revocation | Sparse Merkle Tree enables efficient revocation checks     |
| Issuer-bound        | Credentials are cryptographically bound to their issuer    |

---

## Identity Registry

The `IdentityRegistry` is the on-chain attestation store that the compliance engine queries during transaction validation.

| Field       | Description                                           |
|-------------|-------------------------------------------------------|
| Address     | The Basalt address being attested                     |
| KYC Level   | The verified KYC level for this address               |
| Attestation | Hash of the off-chain identity verification record    |
| Expiry      | Block height at which the attestation expires         |

### KYC Levels

| Level           | Description                                                  |
|-----------------|--------------------------------------------------------------|
| `None`          | No identity verification performed                           |
| `Basic`         | Minimal verification (e.g., email, phone)                    |
| `Enhanced`      | Full identity verification with document checks              |
| `Institutional` | Institutional-grade due diligence for regulated entities      |

The compliance engine queries the `IdentityRegistry` for both sender and receiver KYC levels during every transfer. Token issuers and policy contracts specify the minimum KYC level required for their tokens.

---

## Sovereign Trust Chain

The Sovereign Trust Chain is a hierarchical trust model that anchors on-chain credential verification to real-world regulatory authority.

### Hierarchy

```
Sovereign Authorities (AMF, BaFin, FCA, FINMA, MAS)
        |
        v
  Accredited KYC Providers (via IssuerRegistry)
        |
        v
  Verifiable Credentials (BST-VC)
        |
        v
  ZK Compliance Proofs (Groth16)
```

Sovereign authorities are onboarded through governance votes. Once registered, they can vouch for accredited KYC providers within their jurisdiction. Those providers then issue BST-VC credentials to end users, who generate ZK proofs for on-chain compliance verification.

---

## IssuerRegistry Trust Tiers

The `IssuerRegistry` system contract manages credential issuers across four trust tiers. Each tier has distinct onboarding requirements, collateral obligations, and authorization scopes.

| Tier   | Requirements                                  | Use Cases                                    |
|--------|-----------------------------------------------|----------------------------------------------|
| Tier 1 | Sovereign authority vouching + max collateral  | Institutional KYC, regulated securities      |
| Tier 2 | Governance approval + high collateral          | Standard KYC/AML for financial services      |
| Tier 3 | Community vouching + moderate collateral       | Basic identity verification                  |
| Tier 4 | Self-registration + minimum collateral         | Low-risk, non-financial use cases            |

### Collateral Staking

All credential issuers must stake collateral proportional to their trust tier. This collateral serves as an accountability mechanism:

- If an issuer is found to have issued fraudulent or negligent credentials, their collateral can be slashed through a governance action.
- Higher trust tiers require more collateral, reflecting the greater responsibility and regulatory exposure of issuing credentials for institutional and financial use cases.
- Issuers can withdraw their collateral only after a cooldown period following deregistration.
