---
title: Running a Node
description: How to run a Basalt blockchain node in standalone or consensus mode.
sidebar_position: 1
---

# Running a Basalt Node

Basalt nodes are built on .NET 9 with Native AOT compilation, producing a single self-contained binary that assembles all core modules -- crypto, storage, network, consensus, execution, API, compliance, and bridge -- into one composition root. This guide covers both standalone development mode and multi-validator consensus mode.

## Operating Modes

Basalt supports two primary operating modes depending on your use case.

### Standalone Mode

Standalone mode runs a single node with timer-based block production. No peers are required. This is the recommended mode for local development, testing, and contract iteration.

```bash
dotnet run --project src/node/Basalt.Node
```

By default, standalone mode:

- Starts on the **devnet** chain (chain ID `31337`).
- Exposes the REST API on port **5000**.
- Produces blocks every **400ms** using an internal timer.
- Uses in-memory storage (no persistence between restarts).
- Generates a random Ed25519 key pair for the node identity.

Standalone mode is active whenever `BASALT_VALIDATOR_INDEX` is unset or set to `-1`, or when no peers are configured.

### Consensus Mode

Consensus mode connects the node to a network of peer validators and participates in BasaltBFT, the protocol's Byzantine Fault Tolerant consensus mechanism. To enable consensus mode, two conditions must be met:

1. `BASALT_VALIDATOR_INDEX` must be set to a value **>= 0**.
2. `BASALT_PEERS` must contain at least one peer endpoint.

```bash
export BASALT_VALIDATOR_INDEX=0
export BASALT_VALIDATOR_ADDRESS="<hex-encoded address>"
export BASALT_VALIDATOR_KEY="<hex-encoded Ed25519 private key>"
export BASALT_PEERS="validator-1:30303,validator-2:30303,validator-3:30303"

dotnet run --project src/node/Basalt.Node
```

In consensus mode, the node:

- Establishes TCP connections to all configured peers using length-prefixed framing.
- Performs a Hello/HelloAck handshake with chain ID validation (5-second timeout).
- Participates in leader election via `WeightedLeaderSelector`, where the leader builds and proposes blocks.
- Processes BFT voting rounds (PREPARE, PRE-COMMIT, COMMIT) to finalize blocks.
- Gossips transactions to peers through the Episub protocol.

## Composition Root

`Basalt.Node` serves as the composition root for the entire system. At startup, it assembles and wires together the following modules:

| Module | Responsibility |
|---|---|
| **Crypto** | BLAKE3 hashing, Ed25519 signatures, BLS12-381 aggregate signatures, Keccak-256 address derivation |
| **Storage** | RocksDB-backed persistent storage with Merkle Patricia Trie state |
| **Network** | TCP transport with length-prefixed framing, Kademlia DHT, Episub gossip |
| **Consensus** | BasaltBFT with view changes, double-sign detection, weighted leader selection |
| **Execution** | Virtual machine, transaction executor, gas metering |
| **API** | REST (Minimal APIs), gRPC (Protobuf), GraphQL (HotChocolate) |
| **Compliance** | Identity registry, KYC verification, sanctions screening |
| **Bridge** | EVM bridge, multisig relayer, Merkle proofs |

All modules are resolved through dependency injection and initialized during the host startup sequence.

## Building for Production

For production deployments, publish the node as a Native AOT binary. This produces a single self-contained executable with no dependency on the .NET runtime.

```bash
dotnet publish src/node/Basalt.Node -c Release
```

The resulting binary is located in the publish output directory and can be deployed directly to the target machine. Native AOT compilation provides:

- **Fast startup time** -- no JIT compilation overhead.
- **Reduced memory footprint** -- no runtime metadata or JIT compiler in memory.
- **Single file deployment** -- no external `.dll` dependencies to manage.
- **Predictable performance** -- no tiered compilation warmup period.

:::note
Native AOT builds are platform-specific. Build on the same OS and architecture as your deployment target, or use cross-compilation toolchains.
:::

## Health Checks

Every Basalt node exposes a health check endpoint at `/v1/status`. This endpoint is polled every **5 seconds** by default and returns the current node status, including:

- Current block height.
- Mempool transaction count.
- Peer connection status.
- Sync state.

Use this endpoint for container orchestration health probes, load balancer checks, and monitoring systems.

```bash
curl http://localhost:5000/v1/status
```

A healthy node returns an HTTP 200 response with a JSON body containing the node's operational state. Unhealthy or syncing nodes return appropriate non-200 status codes.

## Persistent Storage

By default, Basalt uses in-memory storage, which is suitable for development but loses all state on restart. For persistent storage, set the `BASALT_DATA_DIR` environment variable to a directory path:

```bash
export BASALT_DATA_DIR=/data/basalt
dotnet run --project src/node/Basalt.Node
```

This enables RocksDB-backed storage. On restart, the node recovers its state from the stored blocks via `ChainManager.ResumeFromBlock`, replaying the chain from genesis to the latest finalized block and reconstructing the state trie.

## Next Steps

- [Configuration Reference](./configuration.md) -- full list of environment variables.
- [Docker DevNet](./docker-devnet.md) -- run a 4-validator network locally.
- [Staking and Slashing](./staking.md) -- validator economics and penalties.
