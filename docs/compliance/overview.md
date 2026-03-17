---
sidebar_position: 1
title: "Compliance Engine"
description: "Hybrid compliance model combining zero-knowledge proofs with on-chain attestation for regulatory verification."
---

# Compliance Engine

Basalt uses a hybrid compliance model that combines zero-knowledge proofs (preferred, privacy-preserving) with on-chain attestation as a fallback path. Compliance is enforced at the execution layer -- before any state changes commit. Transactions that fail compliance are reverted with a descriptive error code.

---

## Verification Pipeline

### Attestation Path

When ZK proofs are not available or not configured, the compliance engine follows an 8-step verification pipeline. Each step is evaluated in order; failure at any step immediately rejects the transaction.

| Step | Check            | Description                                   |
|------|------------------|-----------------------------------------------|
| 0    | Paused           | Global transfer halt check                    |
| 1    | Sender KYC       | Minimum KYC level verification for the sender |
| 2    | Receiver KYC     | Minimum KYC level verification for the receiver |
| 3    | Sanctions        | OFAC and sanctions list screening             |
| 4    | Geographic       | Country code blocklist enforcement            |
| 5    | Holding Limit    | Maximum balance per address verification      |
| 6    | Lock-up          | Time-based transfer restriction enforcement   |
| 7    | Travel Rule      | Large transfer reporting requirements         |

### ZK Path

When configured, the ZK compliance path is evaluated first. If it succeeds, the attestation checks are skipped entirely.

1. **Format validation** -- the proof must be exactly 192 bytes (the expected size for a Groth16 proof).
2. **Nullifier uniqueness check** -- prevents proof replay within the same block.
3. **Verification key lookup** -- retrieves the appropriate verification key from the `SchemaRegistry` system contract.
4. **Groth16 verification** -- the proof is verified using BLS12-381 pairings.
5. **Bypass** -- if the ZK proof is valid, all attestation checks are skipped and the transaction proceeds.

---

## KYC Levels

The compliance engine recognizes four KYC levels, ordered by increasing verification depth:

| Level           | Description                                                  |
|-----------------|--------------------------------------------------------------|
| `None`          | No identity verification performed                           |
| `Basic`         | Minimal verification (e.g., email, phone)                    |
| `Enhanced`      | Full identity verification with document checks              |
| `Institutional` | Institutional-grade due diligence for regulated entities      |

Token issuers and policy contracts can specify the minimum KYC level required for transfers involving their tokens.

---

## Core Classes

| Class                  | Responsibility                                            |
|------------------------|-----------------------------------------------------------|
| `ComplianceEngine`     | Hybrid verifier orchestrator; routes to ZK or attestation path |
| `ZkComplianceVerifier` | Groth16 proof validator using BLS12-381 pairings          |
| `IdentityRegistry`     | On-chain identity attestation storage and lookup          |
| `SanctionsList`        | Sanctioned address registry for OFAC screening            |

---

## ComplianceCheckResult

Every compliance check returns a `ComplianceCheckResult` containing:

| Field       | Type     | Description                                                    |
|-------------|----------|----------------------------------------------------------------|
| `Allowed`   | `bool`   | Whether the transaction is permitted                           |
| `ErrorCode` | `string` | Machine-readable error code (empty if allowed)                 |
| `Reason`    | `string` | Human-readable explanation of the rejection reason             |
| `RuleId`    | `string` | Identifier of the rule that triggered rejection (e.g., `KYC_SENDER`, `SANCTIONS_RECEIVER`) |

---

## Enforcement

Compliance verification occurs at the execution layer, after transaction signature validation but before any state mutations are applied. If a transaction fails compliance:

1. All pending state changes for that transaction are discarded.
2. The transaction is marked as failed with the corresponding error code.
3. Gas is still consumed up to the point of the compliance check.
4. The `ComplianceCheckResult` is included in the transaction receipt for transparency.
