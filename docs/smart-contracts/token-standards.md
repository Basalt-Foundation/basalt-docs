---
sidebar_position: 4
title: Token Standards
description: Reference for the seven Basalt token standards (BST-20 through BST-VC) and eight genesis system contracts.
---

# Token Standards

Basalt defines seven token standards and eight system contracts. Each token standard ships as a base class in the `Basalt.Sdk.Contracts` package. System contracts are deployed at genesis and provide core network functionality.

All token standards support policy hooks via `PolicyEnforcer`. Policies are checked on every transfer.

## Token Standards

| Standard | Type | Base Class | Description |
|---|---|---|---|
| BST-20 | Fungible | `BST20Token` | ERC-20 equivalent. Transfer, approve, transferFrom. |
| BST-721 | Non-Fungible | `BST721Token` | ERC-721 equivalent. Mint, burn, transfer with metadata URI. |
| BST-1155 | Multi-Token | `BST1155Token` | ERC-1155 equivalent. Batch operations supporting fungible and non-fungible tokens in a single contract. |
| BST-3525 | Semi-Fungible | `BST3525Token` | ERC-3525 equivalent. Slot-based tokens with per-token values. Ideal for financial instruments such as bonds, tranches, and structured products. |
| BST-4626 | Tokenized Vault | `BST4626Vault` | ERC-4626 equivalent. Deposit, withdraw, and redeem with standardized share accounting. |
| BST-DID | Decentralized ID | `BSTDIDRegistry` | DID document management with service endpoints and verification methods. W3C DID compatible. |
| BST-VC | Verifiable Credential | `BSTVCRegistry` | W3C VC-compatible credential issuance, verification, and revocation with selective disclosure and ZK proof support. |

---

## BST-20: Fungible Token

The standard for fungible tokens on Basalt, analogous to ERC-20 on Ethereum. Every unit of a BST-20 token is interchangeable.

**Interface:**

| Method | Mutability | Description |
|---|---|---|
| `Transfer(Address to, UInt256 amount)` | Write | Transfer tokens from caller to recipient. |
| `Approve(Address spender, UInt256 amount)` | Write | Approve a spender to transfer tokens on behalf of the caller. |
| `TransferFrom(Address from, Address to, UInt256 amount)` | Write | Transfer tokens using an allowance. |
| `BalanceOf(Address account)` | View | Returns the token balance of an account. |
| `TotalSupply()` | View | Returns the total token supply. |
| `Allowance(Address owner, Address spender)` | View | Returns the remaining allowance for a spender. |

---

## BST-721: Non-Fungible Token

The standard for non-fungible tokens, analogous to ERC-721. Each token has a unique identifier and can carry an associated metadata URI.

**Interface:**

| Method | Mutability | Description |
|---|---|---|
| `TransferFrom(Address from, Address to, UInt256 tokenId)` | Write | Transfer ownership of a token. |
| `Approve(Address to, UInt256 tokenId)` | Write | Approve an address to transfer a specific token. |
| `SetApprovalForAll(Address operator, bool approved)` | Write | Approve or revoke an operator for all of the caller's tokens. |
| `Mint(Address to, UInt256 tokenId, string metadataUri)` | Write | Mint a new token with metadata. |
| `Burn(UInt256 tokenId)` | Write | Burn a token permanently. |
| `OwnerOf(UInt256 tokenId)` | View | Returns the owner of a token. |
| `BalanceOf(Address owner)` | View | Returns the number of tokens owned by an address. |
| `TokenURI(UInt256 tokenId)` | View | Returns the metadata URI for a token. |

---

## BST-1155: Multi-Token

Manages multiple token types within a single contract, analogous to ERC-1155. A single BST-1155 contract can represent fungible tokens, non-fungible tokens, and semi-fungible tokens simultaneously. Batch operations reduce gas costs by combining multiple transfers into a single transaction.

**Interface:**

| Method | Mutability | Description |
|---|---|---|
| `SafeTransferFrom(Address from, Address to, UInt256 id, UInt256 amount, byte[] data)` | Write | Transfer a specific token type. |
| `SafeBatchTransferFrom(Address from, Address to, UInt256[] ids, UInt256[] amounts, byte[] data)` | Write | Batch transfer multiple token types in one call. |
| `BalanceOf(Address account, UInt256 id)` | View | Returns the balance of a specific token type for an account. |
| `BalanceOfBatch(Address[] accounts, UInt256[] ids)` | View | Returns balances for multiple account-token pairs. |

---

## BST-3525: Semi-Fungible Token

Designed for real-world assets (RWAs) such as bonds, structured products, and tokenized securities, analogous to ERC-3525. Tokens are organized into slots, where each slot can represent a different asset class or tranche. Tokens within the same slot can transfer value between each other and can be split or merged.

**Interface:**

| Method | Mutability | Description |
|---|---|---|
| `TransferFrom(UInt256 fromTokenId, Address to, UInt256 value)` | Write | Transfer value from a token to an address (creates a new token). |
| `TransferFrom(UInt256 fromTokenId, UInt256 toTokenId, UInt256 value)` | Write | Transfer value between two tokens in the same slot. |
| `SlotOf(UInt256 tokenId)` | View | Returns the slot of a token. |
| `ValueOf(UInt256 tokenId)` | View | Returns the value held by a token. |

---

## BST-4626: Tokenized Vault

The standard for tokenized vaults that hold an underlying asset and issue shares to depositors, analogous to ERC-4626. Used for yield-bearing products, staking pools, and lending protocols. Provides standardized deposit, withdrawal, and share accounting.

**Interface:**

| Method | Mutability | Description |
|---|---|---|
| `Deposit(UInt256 assets, Address receiver)` | Write | Deposit underlying assets and mint shares to the receiver. |
| `Withdraw(UInt256 assets, Address receiver, Address owner)` | Write | Withdraw underlying assets by burning the owner's shares. |
| `Mint(UInt256 shares, Address receiver)` | Write | Mint a specific number of shares by depositing the equivalent assets. |
| `Redeem(UInt256 shares, Address receiver, Address owner)` | Write | Redeem shares for underlying assets. |
| `TotalAssets()` | View | Returns the total amount of underlying assets held by the vault. |
| `ConvertToShares(UInt256 assets)` | View | Returns the number of shares for a given asset amount. |
| `ConvertToAssets(UInt256 shares)` | View | Returns the asset amount for a given number of shares. |

---

## BST-DID: Decentralized Identity

Implements the W3C Decentralized Identifiers (DID) specification on-chain. Provides self-sovereign identity management with support for multiple verification methods, service endpoints, and revocation.

**Interface:**

| Method | Mutability | Description |
|---|---|---|
| `CreateDID(Address controller, byte[] document)` | Write | Create a new DID with the given controller and initial document. |
| `UpdateDID(byte[] didId, byte[] document)` | Write | Update the DID document. Only callable by the controller. |
| `DeactivateDID(byte[] didId)` | Write | Deactivate the DID. Irreversible. |
| `ResolveDID(byte[] didId)` | View | Returns the current DID document. |
| `IsActive(byte[] didId)` | View | Returns whether the DID is active. |

---

## BST-VC: Verifiable Credentials

Implements the W3C Verifiable Credentials specification. Enables credential issuance, verification, revocation, and selective disclosure with optional zero-knowledge proof support.

**Interface:**

| Method | Mutability | Description |
|---|---|---|
| `IssueCredential(byte[] credentialData, byte[] holderDid)` | Write | Issue a new verifiable credential to a holder. |
| `RevokeCredential(byte[] credentialId)` | Write | Revoke a previously issued credential. Only callable by the issuer. |
| `VerifyCredential(byte[] credentialId, byte[] proof)` | View | Verify a credential's validity including revocation status. |
| `IsRevoked(byte[] credentialId)` | View | Check whether a credential has been revoked. |
| `VerifySelectiveDisclosure(byte[] disclosure, byte[] proof)` | View | Verify a selective disclosure presentation. |

---

## System Contracts (Genesis)

System contracts are deployed at genesis and provide core network services. They reside at reserved system addresses and are accessible to all contracts and users.

| Contract | Address | Purpose |
|---|---|---|
| WBSLT | System | Wrapped native token. BST-20 compatible wrapper around the native BST currency, enabling it to be used in contracts that expect the BST-20 interface. |
| BNS | System | Basalt Name Service. Human-readable name registration and resolution, mapping names like `alice.bslt` to addresses. |
| Governance | System | On-chain governance with quadratic voting and delegation. Manages protocol parameter changes and treasury allocation through community proposals. |
| Escrow | System | Time-locked escrow for conditional transfers. Holds funds until predefined conditions (time, approval, or external trigger) are met. |
| StakingPool | System | Validator staking, delegation, and reward distribution. Manages the proof-of-stake validator set and distributes block rewards to stakers. |
| SchemaRegistry | System | Credential schema definitions for ZK compliance. Stores and validates the schemas used by verifiable credentials across the network. |
| IssuerRegistry | System | Trust-tiered credential issuer management. Maintains a registry of authorized credential issuers with configurable trust levels. |
| BridgeETH | System | EVM bridge lock/unlock with M-of-N Ed25519 multisig verification. Enables cross-chain asset transfers between Basalt and Ethereum-compatible networks. |
