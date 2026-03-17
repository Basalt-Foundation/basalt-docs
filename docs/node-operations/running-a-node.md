---
sidebar_position: 1
title: Running a Node
description: How to start and operate a Basalt node in standalone, validator, or RPC mode.
---

# Running a Node

Basalt supports three node modes, each suited to a different operational role.

## Node Modes

| Mode | Purpose | Consensus Participation |
|---|---|---|
| **Standalone** | Single-node operation with self-produced blocks. Intended for local development and testing. | No |
| **Validator** | Participates in BasaltBFT consensus alongside other validators. Produces and finalizes blocks. | Yes |
| **RPC** | Query-only mode that follows a validator's chain. Serves API requests without participating in consensus. See [RPC Node Mode](./rpc-node-mode.md). | No |

## Starting a Standalone Node

A standalone node is the simplest way to run Basalt locally. It produces blocks on its own without requiring peers.

```bash
dotnet run --project src/node/Basalt.Node
```

**Default ports:**

| Service | Port |
|---|---|
| REST API | 5000 |
| gRPC API | 5001 |
| P2P | 30303 |

## Starting a Validator Node

Validator nodes require a valid Ed25519 keypair and must be configured to connect to other validators in the network.

```bash
BASALT_MODE=validator \
BASALT_VALIDATOR_INDEX=0 \
BASALT_VALIDATOR_ADDRESS=0x... \
BASALT_VALIDATOR_KEY=<ed25519-private-key> \
BASALT_PEERS=peer1:30303,peer2:30303 \
dotnet run --project src/node/Basalt.Node
```

- `BASALT_VALIDATOR_INDEX` identifies this validator's position in the active validator set.
- `BASALT_VALIDATOR_ADDRESS` is the hex-encoded address derived from the validator's public key.
- `BASALT_VALIDATOR_KEY` is the hex-encoded Ed25519 private key used to sign blocks and consensus messages.
- `BASALT_PEERS` is a comma-separated list of peer addresses that the node will connect to on startup.

Refer to the [Configuration](./configuration.md) page for the full list of environment variables.

## System Requirements

| Requirement | Details |
|---|---|
| Runtime | .NET 9 |
| Native dependency | RocksDB native library |
| Memory | 4+ GB RAM recommended for validators |
| Storage | SSD strongly recommended for RocksDB performance |

## Architecture

The node entry point uses dependency injection to wire the following layers in order:

1. **Core** -- data types, cryptographic primitives, chain parameters
2. **Storage** -- RocksDB-backed state storage with Merkle Patricia Trie
3. **Network** -- QUIC transport, Kademlia DHT, Episub gossip
4. **Consensus** -- BasaltBFT finality
5. **Execution** -- transaction execution and VM
6. **API** -- REST, gRPC, GraphQL, and WebSocket endpoints

Each layer is registered as a set of services and resolved at startup, ensuring clean separation of concerns and testability.
