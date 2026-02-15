---
sidebar_position: 1
title: Compliance Overview
description: Protocol-level regulatory compliance framework built into the Basalt blockchain.
---

# Compliance Overview

Basalt integrates regulatory compliance at the protocol level. Unlike approaches that retrofit compliance as an external layer or middleware, Basalt's compliance framework is embedded directly into the transaction execution pipeline. Every compliant transfer passes through a deterministic rule engine before it is committed to state.

---

## Design Philosophy

Blockchain compliance is typically treated as an afterthought -- bolted on via centralized oracles or off-chain gatekeepers that can be bypassed. Basalt takes a different approach: compliance logic executes on-chain as part of the transaction validation process. This ensures that compliance rules are:

- **Deterministic**: Every validator evaluates the same rules and reaches the same conclusion.
- **Auditable**: All compliance decisions are recorded as immutable on-chain events.
- **Configurable**: Token issuers define compliance policies per-token without modifying protocol code.
- **Privacy-preserving**: No personal data is stored on-chain. Only cryptographic commitments and attestation metadata are recorded.

---

## Components

### Identity Registry

The Identity Registry is an on-chain registry of verified identities. It stores attestation metadata that links addresses to verified identity claims without exposing personal information.

Each attestation record contains:

| Field          | Description                                                                 |
|----------------|-----------------------------------------------------------------------------|
| `Subject`      | The Basalt address of the attested party.                                   |
| `Issuer`       | The Basalt address of the KYC provider that issued the attestation.         |
| `Level`        | The KYC verification level (see KYC Levels below).                          |
| `CountryCode`  | ISO 3166-1 numeric country code of the attested party's jurisdiction.       |
| `ClaimHash`    | A Pedersen commitment over the identity claim data.                         |
| `IssuedAt`     | Timestamp of attestation issuance.                                          |
| `ExpiresAt`    | Timestamp of attestation expiry (attestations must be periodically renewed).|

**Privacy guarantee**: No personal data (name, date of birth, document numbers) is stored on-chain. The `ClaimHash` is a Pedersen commitment that allows zero-knowledge verification of claim properties without revealing the underlying data.

### Compliance Engine

The Compliance Engine is the rule evaluation component. It is invoked during transaction execution for every transfer involving a token that has an associated `CompliancePolicy`. The engine evaluates a configurable pipeline of checks and either permits or blocks the transfer.

The engine is instantiated with two dependencies:

```csharp
var engine = new ComplianceEngine(identityRegistry, sanctionsList);
```

Transfer evaluation is performed via:

```csharp
engine.CheckTransfer(tokenAddress, sender, receiver, amount, currentTimestamp, ...);
```

Token issuers configure compliance behavior through a `CompliancePolicy` attached to their token. This policy specifies which checks are enabled, minimum KYC levels, geographic restrictions, holding limits, and lock-up schedules.

### Sanctions List

The Sanctions List is an on-chain blocklist of addresses that are prohibited from participating in compliant transfers. It is checked on every compliant transfer for both the sender and receiver.

```csharp
sanctionsList.AddSanction(address, reason);
bool blocked = sanctionsList.IsSanctioned(address);
```

The sanctions list is governed through the protocol governance process. Additions and removals are recorded as immutable audit events.

### Audit Trail

The Audit Trail provides an immutable record of all compliance-related events. Every significant compliance action emits an audit event that is permanently recorded on-chain.

Auditable events include:

- **Attestation issuance**: A KYC provider issues a new identity attestation.
- **Attestation revocation**: An attestation is revoked (e.g., due to expiry or GDPR erasure request).
- **Compliance check passed**: A transfer passed all compliance checks.
- **Transfer blocked**: A transfer was rejected by the compliance engine, including the specific rule that triggered the rejection.
- **Policy change**: A token issuer modifies the compliance policy for their token.
- **Sanction added/removed**: An address is added to or removed from the sanctions list.

---

## KYC Levels

The protocol defines four KYC verification levels, each representing an increasing degree of identity verification:

| Level | Name            | Description                                                                                   |
|-------|-----------------|-----------------------------------------------------------------------------------------------|
| 0     | None            | No KYC verification. The address has no associated attestation.                                |
| 1     | Basic           | Basic identity verification. Typically involves government ID check and liveness detection.     |
| 2     | Enhanced        | Enhanced due diligence. Includes source-of-funds verification and additional document checks.   |
| 3     | Institutional   | Full institutional onboarding. Includes corporate structure verification, UBO identification, and ongoing monitoring. |

Token issuers specify the minimum KYC level required for their token via the `CompliancePolicy`. For example, a regulated security token might require Level 2 (Enhanced) for all participants, while a utility token might only require Level 1 (Basic).

---

## KYC Providers

KYC providers are entities authorized to issue identity attestations on the Basalt network. They serve as the bridge between off-chain identity verification and on-chain attestation records.

### Requirements

To become a KYC provider, an entity must:

1. **Governance approval**: Be whitelisted through the Basalt governance process.
2. **Stake bond**: Post a bond of 50,000 BST as collateral. This bond can be slashed if the provider is found to have issued fraudulent attestations.
3. **Interface compliance**: Implement the `IKycProvider` interface, which defines the standard methods for attestation issuance, renewal, and revocation.

### Attestation Issuance

KYC providers issue attestations through the on-chain registry:

```csharp
var provider = new MockKycProvider(identityRegistry, providerAddress);
provider.IssueBasic(subjectAddress, countryCode);  // countryCode is ushort (ISO 3166-1 numeric)
```

Attestations are bound to the issuing provider. If a provider is de-whitelisted, all attestations issued by that provider can be flagged for re-verification.

---

## Compliance Pipeline

Every compliant transfer is evaluated against a seven-step pipeline. Each step is independently configurable per token via the `CompliancePolicy`. If any step fails, the transfer is rejected and an audit event is emitted.

### Step 1: Sender KYC Validation

Verifies that the sender address has a valid, non-expired attestation at or above the minimum KYC level specified in the token's compliance policy.

### Step 2: Receiver KYC Validation

Verifies that the receiver address has a valid, non-expired attestation at or above the minimum KYC level. This prevents tokens from being transferred to unverified addresses.

### Step 3: Sanctions Check

Checks both the sender and receiver addresses against the on-chain sanctions list. If either address is sanctioned, the transfer is blocked unconditionally regardless of KYC status.

### Step 4: Geographic Restrictions

Evaluates the country codes associated with the sender and receiver attestations against the token's geographic restriction list. Issuers can maintain either an allowlist (only these jurisdictions permitted) or a blocklist (these jurisdictions prohibited).

### Step 5: Holding Limits

Checks whether the receiver's post-transfer balance would exceed the maximum holding limit defined in the compliance policy. This is used by regulated securities to enforce investor concentration limits.

### Step 6: Lock-up and Vesting

Evaluates whether the sender's tokens are subject to a lock-up or vesting schedule that prevents transfer at the current time. This is commonly used for team allocations, investor lock-ups, and vesting contracts.

### Step 7: Travel Rule (FATF Recommendation 16)

For transfers above the Travel Rule threshold (typically 1,000 USD equivalent), the compliance engine enforces FATF Recommendation 16 by requiring that originator and beneficiary information be available to the relevant Virtual Asset Service Providers (VASPs). This information is exchanged off-chain between VASPs and referenced on-chain via a commitment.

---

## Regulatory Framework Compliance

### GDPR (General Data Protection Regulation)

Basalt's compliance framework is designed for GDPR compatibility:

- **No personal data on-chain**: All identity data remains off-chain with KYC providers. Only Pedersen commitments (cryptographic hashes) are stored on-chain, which do not constitute personal data under GDPR guidance.
- **Right to erasure**: Fulfilled through attestation revocation. When an attestation is revoked, the on-chain record is marked as invalid. The commitment becomes meaningless without the off-chain data, which can be deleted by the KYC provider.
- **Data portability**: Supported through BST-VC (Basalt Verifiable Credentials), a standard format for exporting identity attestations between providers. Users can request their attestation data from one provider and present it to another without repeating the full KYC process.

### MiCA (Markets in Crypto-Assets Regulation)

Basalt provides built-in support for MiCA compliance requirements applicable to asset-referenced tokens and e-money tokens:

- **White paper registration**: Token issuers can register their white paper hash on-chain, providing an immutable record of the published disclosure document.
- **Reserve proof**: Integration with oracle services allows issuers to publish periodic attestations of reserve backing. These attestations are stored on-chain and can be independently verified.
- **Redemption SLA**: The compliance policy supports configurable redemption time limits, ensuring that token holders can redeem their tokens within the timeframes mandated by MiCA.
- **Automatic reporting**: The audit trail provides the data foundation for automated regulatory reporting. Compliance events can be exported in standardized formats for submission to national competent authorities.

---

## Integration with Transaction Execution

The compliance engine is invoked by the `TransactionExecutor` during block production. The execution flow is:

1. The transaction executor receives a transfer transaction.
2. It checks whether the target token has an associated `CompliancePolicy`.
3. If a policy exists, the compliance engine is invoked with the transfer details.
4. The engine evaluates all seven pipeline steps.
5. If all steps pass, the transfer proceeds to state mutation.
6. If any step fails, the transaction is marked as failed, an audit event is emitted, and no state mutation occurs.

This integration ensures that compliance is enforced uniformly across all validators and cannot be circumvented by submitting transactions directly to a non-compliant node.

---

## See Also

- [EVM Bridge](../bridge/overview) -- How compliance checks apply to cross-chain transfers.
- [Staking and Slashing](../node-operations/staking) -- KYC provider bond requirements and slashing conditions.
