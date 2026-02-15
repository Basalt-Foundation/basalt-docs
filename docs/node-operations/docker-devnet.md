---
title: Docker DevNet
description: Run a local 4-validator Basalt devnet using Docker Compose.
sidebar_position: 3
---

# Docker DevNet

The Docker Compose devnet provides a fully functional 4-validator Basalt network running locally. This is the fastest way to test consensus behavior, transaction processing, state sync, and multi-node interactions without deploying to remote infrastructure.

## Quick Start

```bash
docker compose up --build
```

This single command builds the Basalt node image and starts four validator containers with pre-configured identities, peer lists, and persistent storage.

## Validator Network Topology

The devnet runs four validators, each with dedicated HTTP and P2P ports:

| Validator | Container Name | REST API Port | P2P Port | Data Volume |
|---|---|---|---|---|
| Validator 0 | `validator-0` | 5100 | 30300 | `validator-0-data:/data/basalt` |
| Validator 1 | `validator-1` | 5101 | 30301 | `validator-1-data:/data/basalt` |
| Validator 2 | `validator-2` | 5102 | 30302 | `validator-2-data:/data/basalt` |
| Validator 3 | `validator-3` | 5103 | 30303 | `validator-3-data:/data/basalt` |

All four validators participate in BasaltBFT consensus. With 4 validators, the network tolerates up to 1 Byzantine fault (f = 1, where n = 3f + 1).

## Docker Compose Configuration

Below is a representative excerpt from the Docker Compose file illustrating the configuration pattern for a single validator:

```yaml
version: "3.8"

services:
  validator-0:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: validator-0
    environment:
      - BASALT_CHAIN_ID=31337
      - BASALT_NETWORK=basalt-devnet
      - BASALT_VALIDATOR_INDEX=0
      - BASALT_VALIDATOR_ADDRESS=${VALIDATOR_0_ADDRESS}
      - BASALT_VALIDATOR_KEY=${VALIDATOR_0_KEY}
      - BASALT_PEERS=validator-1:30303,validator-2:30303,validator-3:30303
      - BASALT_DATA_DIR=/data/basalt
      - HTTP_PORT=5000
      - P2P_PORT=30303
      - ASPNETCORE_URLS=http://+:5000
    ports:
      - "5100:5000"
      - "30300:30303"
    volumes:
      - validator-0-data:/data/basalt
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:5000/v1/status"]
      interval: 5s
      timeout: 3s
      retries: 5
      start_period: 10s
    restart: unless-stopped

  validator-1:
    # ... same pattern with VALIDATOR_INDEX=1,
    # PEERS excluding self, ports 5101:5000 and 30301:30303

  validator-2:
    # ... same pattern with VALIDATOR_INDEX=2

  validator-3:
    # ... same pattern with VALIDATOR_INDEX=3

volumes:
  validator-0-data:
  validator-1-data:
  validator-2-data:
  validator-3-data:
```

Each validator excludes itself from its own `BASALT_PEERS` list and maps unique host ports to the standard container ports.

## Genesis Configuration

The devnet uses a deterministic genesis block with:

- **Fixed timestamp**: All validators share an identical genesis block hash. A fixed timestamp is critical -- using `DateTimeOffset.UtcNow` would produce different genesis hashes on each node and prevent consensus.
- **Pre-funded accounts**: Several genesis accounts are initialized with balances for testing. These accounts can submit transactions immediately without requiring a faucet.
- **Validator set**: The four validators are registered in the genesis state with their public keys and initial stake.

## Persistent Storage

Each validator stores its blockchain data in a dedicated Docker volume (`validator-N-data`). RocksDB is used as the storage backend, providing:

- **Block storage**: Raw blocks and indexed block data via `BlockStore.PutFullBlock`.
- **State trie**: Merkle Patricia Trie nodes persisted to disk for state verification.
- **Transaction index**: Hash-based transaction lookups across all stored blocks.

### Recovery on Restart

When a validator container restarts, it recovers its full state from the persisted data:

1. The node reads stored raw blocks from RocksDB.
2. `ChainManager.ResumeFromBlock` replays the chain from genesis to the latest stored block.
3. The state trie is reconstructed from the stored trie nodes using `TrieStateDb(trieNodeStore, stateRoot)`.
4. The node resumes participating in consensus from its last known height.

This allows validators to survive container restarts, host reboots, and rolling upgrades without requiring a full chain resync from peers.

## State Sync

Before joining consensus, a validator that is behind its peers performs state synchronization:

1. `TrySyncFromPeers()` is called during startup, before the consensus engine activates.
2. The node sends `SyncRequestMessage` to connected peers requesting blocks it does not yet have.
3. Peers respond with `SyncResponseMessage` containing batches of blocks.
4. The node applies the received blocks sequentially to catch up to the network head.

This mechanism ensures that a validator rejoining the network after downtime does not propose or vote on blocks it cannot validate.

## Peer Discovery

The devnet uses **static peer lists** rather than dynamic discovery. Each validator's `BASALT_PEERS` environment variable contains the explicit list of all other validators. This is appropriate for a devnet where the validator set is fixed and known in advance.

The P2P transport layer:

1. Establishes TCP connections to all configured peers.
2. Performs a Hello/HelloAck handshake with chain ID validation (5-second timeout).
3. Maintains persistent connections with automatic reconnection on failure.
4. Exchanges `NodePublicKey` and `ListenPort` during HelloAck for proper peer identity resolution.

## Health Checks

Each validator container includes a Docker health check that polls `/v1/status` every 5 seconds. The health check:

- **Test**: `curl -f http://localhost:5000/v1/status`
- **Interval**: 5 seconds
- **Timeout**: 3 seconds
- **Retries**: 5 attempts before marking unhealthy
- **Start period**: 10 seconds grace period for initial startup

Docker Compose uses these health checks to report container status and can be configured with `depends_on` conditions to control startup ordering.

## Common Operations

### Viewing Logs

```bash
# All validators
docker compose logs -f

# Single validator
docker compose logs -f validator-0
```

### Checking Node Status

```bash
# Query each validator's status
curl http://localhost:5100/v1/status
curl http://localhost:5101/v1/status
curl http://localhost:5102/v1/status
curl http://localhost:5103/v1/status
```

### Requesting Test Tokens

```bash
# Request tokens from the devnet faucet
curl -X POST http://localhost:5100/v1/faucet \
  -H "Content-Type: application/json" \
  -d '{"address": "<hex-encoded-address>"}'
```

### Resetting the Network

```bash
# Stop all containers and remove volumes
docker compose down -v

# Rebuild and start fresh
docker compose up --build
```

### Inspecting Stored Data

```bash
# Access a validator's data volume
docker compose exec validator-0 ls /data/basalt
```

## RocksDB on ARM64

The RocksDB NuGet package (version 8.9.1) ships a 52-byte ARM64 stub that is not functional. When building the Docker image for ARM64 targets (e.g., Apple Silicon), the Dockerfile installs `librocksdb-dev` from the system package manager to provide a working native library. This is handled automatically in the provided Dockerfile.

## Troubleshooting

| Symptom | Cause | Resolution |
|---|---|---|
| Validators cannot reach consensus | Genesis hash mismatch | Ensure all validators use the same deterministic genesis timestamp. Reset volumes with `docker compose down -v`. |
| Connection drops between peers | Dual TCP connection race | The reconnect loop handles this automatically. If persistent, check firewall rules between containers. |
| Validator not producing blocks | Incorrect `BASALT_VALIDATOR_INDEX` | Verify the index matches the validator's position in the genesis validator set. |
| State divergence after restart | Incomplete block storage | Ensure `BASALT_DATA_DIR` is set and the volume is properly mounted. |
