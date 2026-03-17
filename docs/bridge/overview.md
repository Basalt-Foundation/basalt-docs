---
sidebar_position: 1
title: EVM Bridge
description: Bidirectional bridge between Basalt and EVM-compatible chains using a lock-and-mint model with multisig relayers.
---

# EVM Bridge

The Basalt EVM Bridge enables bidirectional token transfers between the Basalt network and EVM-compatible chains such as Ethereum and Polygon. It uses a lock-and-mint model secured by a multisig relayer network.

## Architecture

### Lock-and-Mint Model

- **Basalt to EVM**: BSLT tokens are locked in the BridgeETH system contract on Basalt. Wrapped BSLT (wBSLT) is minted on the destination EVM chain.
- **EVM to Basalt**: Wrapped BSLT is burned on the EVM chain. Native BSLT is unlocked from the BridgeETH contract on Basalt.

This model ensures a 1:1 backing ratio. The total supply of wrapped tokens on the EVM side never exceeds the amount locked on Basalt.

## MultisigRelayer

The bridge is secured by a decentralized set of relayers that collectively authorize cross-chain transfers.

| Property | Details |
|---|---|
| Signature scheme | M-of-N Ed25519 multisig |
| Monitoring | Relayers watch both chains for deposit and burn events |
| Authorization | Threshold signatures required to authorize minting or unlocking |
| Safety | Relayer removal is blocked if it would make the threshold unreachable |
| Accountability | Bond and slash mechanism for relayer misbehavior |

## Merkle Proof Verification

Cross-chain transfers are verified using BLAKE3 Merkle inclusion proofs.

- A BLAKE3 Merkle tree is constructed over all deposits within a batch.
- The maximum proof depth is **64**, supporting up to 2^64 leaves.
- The proof is submitted on the destination chain to claim bridged tokens.
- The destination contract verifies the proof against the published Merkle root.

## BridgeETH System Contract

The BridgeETH contract is deployed at genesis on the Basalt chain. It serves as the on-chain component of the bridge.

**Responsibilities:**

- Lock and unlock native BSLT tokens
- Verify Merkle proofs and multisig signatures
- Track bridge nonces to prevent replay attacks
- Emit events for relayer monitoring

## Bridge Flow

### Basalt to Ethereum

```
User                    Basalt                  Relayers                Ethereum
 |                       |                       |                       |
 |--- Lock BSLT -------->|                       |                       |
 |                       |--- Deposit event ----->|                       |
 |                       |                       |--- M-of-N sign ------->|
 |                       |                       |--- Merkle proof ------>|
 |                       |                       |                       |
 |<------------------------------------------- Mint wBSLT --------------|
```

1. The user locks BSLT in the BridgeETH contract on Basalt.
2. Relayers observe the deposit event on the Basalt chain.
3. M-of-N relayers independently sign the deposit attestation.
4. A Merkle proof is generated for the deposit.
5. The user (or a relayer) submits the proof and collected signatures to the Ethereum bridge contract.
6. Wrapped BSLT is minted to the user's address on Ethereum.

### Ethereum to Basalt

```
User                    Ethereum                Relayers                Basalt
 |                       |                       |                       |
 |--- Burn wBSLT ------->|                       |                       |
 |                       |--- Burn event -------->|                       |
 |                       |                       |--- M-of-N sign ------->|
 |                       |                       |--- Merkle proof ------>|
 |                       |                       |                       |
 |<--------------------------------------------- Unlock BSLT -----------|
```

1. The user burns wrapped BSLT on Ethereum.
2. Relayers observe the burn event on the Ethereum chain.
3. M-of-N relayers sign the withdrawal attestation.
4. The user submits the proof to the BridgeETH contract on Basalt.
5. Native BSLT is unlocked and transferred to the user's address on Basalt.

## Transfer Lifecycle

Each bridge transfer progresses through the following states:

| Status | Description |
|---|---|
| **Pending** | Deposit or burn transaction submitted but not yet observed by relayers. |
| **Confirmed** | Relayers have observed and attested to the transfer. Signatures are being collected. |
| **Finalized** | Threshold signatures collected and proof submitted. Tokens minted or unlocked on the destination chain. |
| **Failed** | The transfer could not be completed (e.g., proof verification failure, insufficient signatures). |

## Address Compatibility

Basalt derives addresses using Keccak-256 (last 20 bytes of the public key hash), which produces addresses in the same format as Ethereum and other EVM chains. This means:

- Users can use the same address on both Basalt and EVM chains.
- No address translation or mapping is required for bridge operations.
- Wallet software that supports EVM addresses can display Basalt addresses without modification.
