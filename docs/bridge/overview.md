---
sidebar_position: 1
title: EVM Bridge Overview
description: Architecture and operation of the bidirectional bridge between Basalt and EVM-compatible chains.
---

# EVM Bridge Overview

The Basalt EVM Bridge enables bidirectional asset transfers between the Basalt blockchain and EVM-compatible chains such as Ethereum and Polygon. It follows a lock-and-mint / burn-and-unlock model secured by a multisig relayer network and Merkle proof verification.

---

## Architecture

The bridge system is composed of three principal components operating across two chains:

```
Basalt Chain                              EVM Chain (Ethereum/Polygon)
+-----------------+                       +---------------------+
| BridgeManager   |  <-- Relayers -->     | BasaltBridge.sol    |
| (on-chain)      |                       | (Solidity contract) |
+-----------------+                       +---------------------+
        |                                          |
        |              MultisigRelayer             |
        |           (off-chain service)            |
        +------------------------------------------+
                           |
                   Merkle Proof Verification
```

### BridgeManager

The BridgeManager is the on-chain contract on the Basalt side responsible for managing lock and unlock operations. When a user initiates a bridge transfer from Basalt to an EVM chain, the BridgeManager locks the specified BST amount in escrow. When a return transfer is attested by the relayer network, the BridgeManager releases (unlocks) the escrowed BST to the designated recipient.

Key responsibilities:

- Accepting and escrowing BST deposits for outbound transfers.
- Validating multisig attestations on inbound transfers before releasing funds.
- Maintaining a ledger of all bridge operations for auditability.
- Rejecting duplicate or replayed attestations.

### MultisigRelayer

The MultisigRelayer is an off-chain component that observes events on both chains and produces cryptographic attestations for cross-chain transfers. It operates under a threshold signature scheme (t-of-n), meaning that a transfer is only considered valid when at least `t` out of `n` registered relayers have independently signed the attestation.

Key properties:

- **Threshold security**: No single relayer can authorize a transfer. A configurable quorum (e.g., 3-of-5 or 5-of-7) must agree before an attestation is valid.
- **Independent observation**: Each relayer independently monitors on-chain events and produces its own signature. There is no leader or coordinator.
- **Liveness**: The system tolerates up to `n - t` relayer failures without halting bridge operations.
- **Slashable stake**: Relayers are required to post collateral that can be slashed for provably malicious behavior (e.g., signing conflicting attestations).

### Merkle Proof Verification

The bridge employs light-client-style Merkle proof verification to provide cryptographic evidence of Basalt state on the EVM side. Rather than requiring EVM contracts to process full Basalt blocks, the bridge periodically anchors Basalt block headers on-chain, and individual transfers are proven via Merkle inclusion proofs against the anchored state root.

This design ensures:

- **Minimal on-chain cost**: Only block headers are stored on the EVM chain; individual state entries are proven via compact Merkle paths.
- **Trustless verification**: Any party can independently verify that a lock operation occurred on Basalt by checking the Merkle proof against the anchored header.
- **Composability**: The anchored headers can be consumed by other protocols that need verified Basalt state.

---

## Solidity Contracts

Two Solidity contracts are deployed on the EVM side:

### BasaltBridge.sol

The primary bridge contract on the EVM chain. It performs the following functions:

- Accepts and validates multisig attestations from the relayer network.
- Verifies Merkle proofs of lock events against anchored Basalt block headers.
- Triggers minting of WBST tokens upon successful verification.
- Accepts WBST burn requests for return transfers and emits events consumed by the relayer network.
- Manages the set of authorized relayer public keys and the signature threshold.

### WBST (Wrapped BST)

An ERC-20 token representing BST on the EVM chain. WBST is minted 1:1 against locked BST and can be freely transferred, traded, or used in DeFi protocols on Ethereum or Polygon.

- **Minting**: Only the BasaltBridge contract can mint WBST, and only upon receipt of a valid multisig attestation backed by a Merkle proof.
- **Burning**: Any WBST holder can burn their tokens via the bridge contract to initiate a return transfer to Basalt.
- **Standard compliance**: Full ERC-20 implementation with `transfer`, `approve`, `transferFrom`, and event emission.

---

## Transfer Flows

### Basalt to EVM (Lock and Mint)

The outbound flow transfers BST from the Basalt chain to an EVM chain as WBST:

1. **Lock**: The user submits a bridge transaction on Basalt, specifying the amount of BST and the destination EVM address. The BridgeManager locks the BST in escrow.

2. **Observation**: Each relayer independently detects the lock event by monitoring Basalt block finalization.

3. **Attestation**: Each relayer produces a signature over the lock event details (amount, sender, recipient, nonce). Once at least `t` relayers have signed, the threshold is met.

4. **Submission**: The aggregated multisig attestation and accompanying Merkle proof are submitted to the BasaltBridge.sol contract on the EVM chain.

5. **Verification**: The EVM contract verifies the multisig signatures against the registered relayer set and validates the Merkle proof against the most recently anchored Basalt block header.

6. **Minting**: Upon successful verification, the bridge contract mints the equivalent amount of WBST to the specified EVM address.

### EVM to Basalt (Burn and Unlock)

The inbound flow transfers WBST back to the Basalt chain as BST:

1. **Burn**: The user calls the burn function on the BasaltBridge.sol contract, specifying the amount of WBST and the destination Basalt address. The WBST tokens are burned.

2. **Observation**: Each relayer detects the burn event by monitoring the EVM chain.

3. **Attestation**: Each relayer independently signs an attestation for the burn event. Once the threshold is met, the attestation is considered valid.

4. **Submission**: The aggregated attestation is submitted to the BridgeManager on the Basalt chain.

5. **Verification**: The BridgeManager verifies the multisig attestation against the registered relayer set.

6. **Unlock**: The BridgeManager releases the equivalent amount of BST from escrow to the specified Basalt address.

---

## Security Model

The bridge security rests on multiple independent layers:

### Multisig Threshold

The t-of-n multisig scheme ensures that compromising a single relayer (or even a minority of relayers) is insufficient to forge a cross-chain transfer. The threshold `t` is configured at deployment and can be updated through governance.

### Merkle Proof Verification

Every outbound transfer (Basalt to EVM) is backed by a Merkle inclusion proof that cryptographically ties the lock event to a specific Basalt block header. This provides trustless verification independent of the relayer set.

### Periodic Header Anchoring

Basalt block headers are periodically anchored to the EVM chain. This anchoring occurs under two conditions:

- **Block interval**: Every 100 Basalt blocks, the latest finalized block header is submitted to the EVM bridge contract.
- **Time interval**: If 60 seconds have elapsed since the last anchoring, a new header is submitted regardless of block count.

These anchored headers serve as trust anchors for Merkle proof verification.

### Replay Protection

Each bridge transfer includes a unique nonce that is tracked on both sides. The bridge contracts reject any attestation with a nonce that has already been processed, preventing double-spending via replay attacks.

---

## Enterprise Subnet Anchoring

For enterprise deployments running private Basalt subnets, the bridge infrastructure supports subnet-to-mainnet anchoring. Subnet block headers are periodically committed to the Basalt mainnet at the same cadence as EVM anchoring (every 100 blocks or 60 seconds). This provides:

- **Auditability**: Enterprise subnet activity is provably anchored to the public mainnet.
- **Interoperability**: Subnet state can be proven on mainnet (and transitively on EVM chains) via chained Merkle proofs.
- **Regulatory compliance**: Anchoring provides a tamper-evident timeline of subnet operations for regulatory review.

---

## See Also

- [Compliance Overview](../compliance/overview) -- Regulatory compliance checks that apply to bridge transfers.
- [Consensus](../core-concepts/consensus) -- How Basalt achieves block finality, which the bridge relies on.
- [Staking and Slashing](../node-operations/staking) -- Economic security model underpinning relayer accountability.
