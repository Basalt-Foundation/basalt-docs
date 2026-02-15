---
title: Token Standards
description: Reference for Basalt token standards including BST-20, BST-721, BST-1155, BST-3525, BST-4626, BST-DID, and BST-VC.
sidebar_position: 4
---

# Token Standards

Basalt defines a family of token standards that provide familiar interfaces for common asset types while integrating compliance enforcement at the protocol level. Each standard ships as a base class in the `Basalt.Sdk.Contracts` package that can be extended with custom logic.

## Standards at a Glance

| Standard | Description | ERC Equivalent | Key Additions |
|---|---|---|---|
| BST-20 | Fungible token | ERC-20 | Compliance hooks, gas sponsoring, pausable |
| BST-721 | Non-fungible token | ERC-721 | On-chain metadata, royalty enforcement |
| BST-1155 | Multi-token | ERC-1155 | Batch compliance checks |
| BST-3525 | Semi-fungible token | ERC-3525 | Slot-based compliance, maturity dates |
| BST-4626 | Tokenized vault | ERC-4626 | Yield blocking for e-money, audit hooks |
| BST-DID | Decentralized identity | W3C DID | eIDAS 2.0 compatible, revocable |
| BST-VC | Verifiable credential | W3C VC | Selective disclosure, ZK proofs |

## Compliance Pipeline

All token transfer operations across every standard pass through a unified compliance pipeline before execution. This pipeline is enforced at the contract runtime level and cannot be bypassed by callers.

The pipeline executes the following checks in order:

1. **KYC verification.** Both sender and receiver must have a valid KYC attestation on-chain. The required KYC level (basic, enhanced, institutional) is configurable per token.
2. **Sanctions screening.** Addresses are checked against the on-chain sanctions list. Transfers involving sanctioned addresses are rejected.
3. **Geographic restrictions.** Transfers can be restricted based on the country codes associated with sender and receiver identities. This enables compliance with jurisdiction-specific regulations.
4. **Holding limits.** Maximum balance limits can be enforced per address to comply with concentration regulations or offering memorandum terms.
5. **Lock-up schedules.** Tokens can be subject to time-based transfer restrictions. Lock-up periods, vesting schedules, and cliff dates are enforced automatically.
6. **Travel rule.** For transfers exceeding configurable thresholds, the pipeline enforces travel rule data requirements, ensuring originator and beneficiary information is recorded.

The compliance pipeline is configured per token contract at deployment time. Token issuers specify which checks are active and their parameters. Once deployed, the compliance configuration can only be modified by the designated compliance officer address.

---

## BST-20: Fungible Token

BST-20 is the standard for fungible tokens on Basalt, analogous to ERC-20 on Ethereum. It defines the interface for tokens where every unit is interchangeable.

### Key Features

- **Full ERC-20 compatibility.** `Transfer`, `Approve`, `TransferFrom`, `BalanceOf`, `TotalSupply`, and `Allowance` methods follow the familiar ERC-20 semantics.
- **Compliance hooks.** Every `Transfer` and `TransferFrom` call passes through the compliance pipeline. Non-compliant transfers revert with a descriptive reason.
- **Gas sponsoring.** Token issuers can designate a sponsor address that pays gas fees on behalf of users. This enables gasless transactions for end users interacting with regulated tokens.
- **Pausable.** The designated pauser address can halt all transfers in an emergency. Individual addresses can also be frozen.

### Usage

```csharp
[BasaltContract]
public class MyToken : BST20Token
{
    [BasaltConstructor]
    public void Initialize()
    {
        InitToken("My Token", "MTK", 18);
        Mint(Context.Caller, UInt256.Parse("1000000000000000000000000"));
    }

    [BasaltEntrypoint]
    public void MintAdditional(Address to, UInt256 amount)
    {
        Require(Context.Caller == Owner(), "Only owner");
        Mint(to, amount);
    }
}
```

### Interface

| Method | Mutability | Description |
|---|---|---|
| `Transfer(Address to, UInt256 amount)` | Entrypoint | Transfer tokens from caller to recipient. |
| `Approve(Address spender, UInt256 amount)` | Entrypoint | Approve a spender to transfer tokens on behalf of the caller. |
| `TransferFrom(Address from, Address to, UInt256 amount)` | Entrypoint | Transfer tokens using an allowance. |
| `BalanceOf(Address account)` | View | Returns the token balance of an account. |
| `TotalSupply()` | View | Returns the total token supply. |
| `Allowance(Address owner, Address spender)` | View | Returns the remaining allowance. |

---

## BST-721: Non-Fungible Token

BST-721 is the standard for non-fungible tokens (NFTs), analogous to ERC-721. Each token has a unique identifier and is not interchangeable with other tokens in the same contract.

### Key Features

- **On-chain metadata.** Token metadata (name, description, attributes) is stored directly on-chain rather than relying on external URIs. This ensures metadata availability and immutability.
- **Royalty enforcement.** Royalty payments are enforced at the protocol level on every transfer. The royalty recipient and percentage are set at mint time and cannot be circumvented by marketplace contracts.
- **Compliance per token.** Individual tokens can have different compliance requirements based on their classification.

### Usage

```csharp
[BasaltContract]
public class MyNFT : BST721Token
{
    [BasaltConstructor]
    public void Initialize()
    {
        InitToken("My NFT Collection", "MNFT");
    }

    [BasaltEntrypoint]
    public UInt256 Mint(Address to, string name, string description, byte royaltyPercent)
    {
        var tokenId = NextTokenId();
        MintWithMetadata(to, tokenId, name, description);
        SetRoyalty(tokenId, Context.Caller, royaltyPercent);
        return tokenId;
    }
}
```

### Interface

| Method | Mutability | Description |
|---|---|---|
| `TransferFrom(Address from, Address to, UInt256 tokenId)` | Entrypoint | Transfer ownership of a token. |
| `Approve(Address to, UInt256 tokenId)` | Entrypoint | Approve an address to transfer a specific token. |
| `SetApprovalForAll(Address operator, bool approved)` | Entrypoint | Approve or revoke an operator for all tokens. |
| `OwnerOf(UInt256 tokenId)` | View | Returns the owner of a token. |
| `BalanceOf(Address owner)` | View | Returns the number of tokens owned by an address. |
| `TokenMetadata(UInt256 tokenId)` | View | Returns the on-chain metadata for a token. |
| `RoyaltyInfo(UInt256 tokenId, UInt256 salePrice)` | View | Returns the royalty recipient and amount for a sale. |

---

## BST-1155: Multi-Token

BST-1155 is the standard for contracts that manage multiple token types within a single deployment, analogous to ERC-1155. A single BST-1155 contract can represent fungible tokens, non-fungible tokens, and semi-fungible tokens simultaneously.

### Key Features

- **Batch operations.** Transfer, mint, and burn operations can be batched into a single transaction, reducing gas costs.
- **Batch compliance checks.** The compliance pipeline processes all tokens in a batch atomically. If any individual transfer in a batch fails compliance, the entire batch reverts.
- **Shared contract state.** All token types within a BST-1155 contract share storage, enabling efficient cross-token logic.

### Interface

| Method | Mutability | Description |
|---|---|---|
| `SafeTransferFrom(Address from, Address to, UInt256 id, UInt256 amount, byte[] data)` | Entrypoint | Transfer a specific token type. |
| `SafeBatchTransferFrom(Address from, Address to, UInt256[] ids, UInt256[] amounts, byte[] data)` | Entrypoint | Batch transfer multiple token types. |
| `BalanceOf(Address account, UInt256 id)` | View | Returns the balance of a specific token type for an account. |
| `BalanceOfBatch(Address[] accounts, UInt256[] ids)` | View | Returns balances for multiple account-token pairs. |

---

## BST-3525: Semi-Fungible Token

BST-3525 is designed for real-world assets (RWAs) such as bonds, structured products, and tokenized securities. It extends ERC-3525 semantics with compliance features specific to regulated financial instruments.

### Key Features

- **Slot-based compliance.** Tokens are organized into slots, where each slot can represent a different asset class or tranche. Compliance rules are configured per slot, allowing a single contract to manage multiple regulated instruments with different requirements.
- **Maturity dates.** Tokens can have an associated maturity date after which they become redeemable or expire. The runtime enforces maturity-related transfer restrictions automatically.
- **Fractional transfers.** Unlike BST-721, BST-3525 tokens can be split and merged. A token with value 1000 can be split into two tokens with values 600 and 400, each retaining the same slot and compliance properties.

### Interface

| Method | Mutability | Description |
|---|---|---|
| `TransferFrom(UInt256 fromTokenId, Address to, UInt256 value)` | Entrypoint | Transfer value from a token to an address (creates new token). |
| `TransferFrom(UInt256 fromTokenId, UInt256 toTokenId, UInt256 value)` | Entrypoint | Transfer value between two tokens in the same slot. |
| `SlotOf(UInt256 tokenId)` | View | Returns the slot of a token. |
| `ValueOf(UInt256 tokenId)` | View | Returns the value held by a token. |
| `MaturityDate(UInt256 tokenId)` | View | Returns the maturity timestamp of a token. |

---

## BST-4626: Tokenized Vault

BST-4626 is the standard for tokenized vaults that hold an underlying asset and issue shares to depositors, analogous to ERC-4626. It is used for yield-bearing products, staking pools, and lending protocols.

### Key Features

- **Yield blocking for e-money.** When the underlying asset is classified as e-money under regulations such as MiCA, the vault can be configured to block yield distribution. Depositors receive their principal back but accrued yield is directed to a designated compliance address.
- **Audit hooks.** The vault exposes hooks that allow designated auditor addresses to inspect internal accounting, share pricing, and asset ratios without requiring elevated permissions.
- **Standardized accounting.** Deposit, withdrawal, share minting, and share redemption follow a standardized accounting model that simplifies integration with off-chain reporting systems.

### Interface

| Method | Mutability | Description |
|---|---|---|
| `Deposit(UInt256 assets, Address receiver)` | Entrypoint | Deposit underlying assets and mint shares. |
| `Withdraw(UInt256 assets, Address receiver, Address owner)` | Entrypoint | Withdraw underlying assets by burning shares. |
| `Mint(UInt256 shares, Address receiver)` | Entrypoint | Mint a specific number of shares by depositing assets. |
| `Redeem(UInt256 shares, Address receiver, Address owner)` | Entrypoint | Redeem shares for underlying assets. |
| `TotalAssets()` | View | Returns the total amount of underlying assets held. |
| `ConvertToShares(UInt256 assets)` | View | Returns the number of shares for a given asset amount. |
| `ConvertToAssets(UInt256 shares)` | View | Returns the asset amount for a given number of shares. |

---

## BST-DID: Decentralized Identity

BST-DID implements the W3C Decentralized Identifiers (DID) specification on-chain, providing a self-sovereign identity primitive that other contracts and compliance checks can reference.

### Key Features

- **eIDAS 2.0 compatibility.** DID documents can include verification methods and service endpoints that conform to the European Digital Identity framework, enabling interoperability with EU digital identity wallets.
- **Revocable.** DID controllers can deactivate their DID document, which propagates to all dependent credentials and compliance attestations.
- **Multiple verification methods.** A single DID can have multiple public keys for different purposes (authentication, assertion, key agreement), each with independent expiration and revocation status.

### Interface

| Method | Mutability | Description |
|---|---|---|
| `CreateDID(Address controller, byte[] document)` | Entrypoint | Create a new DID with the given controller and initial document. |
| `UpdateDID(byte[] didId, byte[] document)` | Entrypoint | Update the DID document. Only callable by the controller. |
| `DeactivateDID(byte[] didId)` | Entrypoint | Deactivate the DID. Irreversible. |
| `ResolveDID(byte[] didId)` | View | Returns the current DID document. |
| `IsActive(byte[] didId)` | View | Returns whether the DID is active. |

---

## BST-VC: Verifiable Credentials

BST-VC implements the W3C Verifiable Credentials specification, enabling issuers to create tamper-evident credentials that holders can present to verifiers without contacting the issuer.

### Key Features

- **Selective disclosure.** Credential holders can reveal only specific claims from a credential without exposing the entire document. For example, a holder can prove they are over 18 without revealing their exact date of birth.
- **Zero-knowledge proofs.** For advanced privacy scenarios, BST-VC supports ZK proof generation and verification. Holders can prove credential properties (such as "country of residence is in the EU") without revealing the underlying data.
- **On-chain revocation registry.** Issuers can revoke credentials by updating an on-chain revocation registry. Verifiers check the registry as part of the verification process, ensuring revoked credentials are rejected in real time.

### Interface

| Method | Mutability | Description |
|---|---|---|
| `IssueCredential(byte[] credentialData, byte[] holderDid)` | Entrypoint | Issue a new verifiable credential to a holder. |
| `RevokeCredential(byte[] credentialId)` | Entrypoint | Revoke a previously issued credential. Only callable by the issuer. |
| `VerifyCredential(byte[] credentialId, byte[] proof)` | View | Verify a credential's validity, including revocation status. |
| `IsRevoked(byte[] credentialId)` | View | Check whether a credential has been revoked. |
| `VerifySelectiveDisclosure(byte[] disclosure, byte[] proof)` | View | Verify a selective disclosure presentation. |
