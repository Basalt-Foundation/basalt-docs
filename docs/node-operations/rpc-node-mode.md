---
sidebar_position: 4
title: RPC Node Mode
description: Deploy a query-only Basalt node that follows the validator chain and serves API requests.
---

# RPC Node Mode

An RPC node is a query-only node that follows the chain produced by validators. It does not participate in consensus and does not produce blocks. RPC nodes are the recommended deployment for serving application traffic.

## Configuration

```bash
BASALT_MODE=rpc \
BASALT_SYNC_SOURCE=http://validator-0:5000 \
dotnet run --project src/node/Basalt.Node
```

The `BASALT_SYNC_SOURCE` variable must point to the HTTP endpoint of a running validator or another synced RPC node.

## Behavior

### Chain Synchronization

- Fetches blocks from the sync source via HTTP on startup
- Subscribes to new blocks from the sync source via WebSocket for real-time updates
- Maintains a local copy of the full chain state in RocksDB

### API Serving

- Serves REST, gRPC, GraphQL, and WebSocket queries against the local state
- Relaxed rate limits compared to validator nodes, since RPC nodes are designed for high query throughput
- CORS is enabled by default to support browser-based clients (dApps, explorers)

### Transaction Forwarding

RPC nodes accept transaction submissions but do not process them locally. Instead, submitted transactions are forwarded to the upstream validator via the `ITxForwarder` interface. The validator includes the transaction in a future block through normal consensus.

## WebSocket Block Broadcast

RPC nodes re-broadcast new blocks to their own connected WebSocket clients. When the node receives a new block from the sync source, it pushes a notification to all subscribers.

- **Latency**: blocks are broadcast within approximately 200 milliseconds of finality
- **Endpoint**: `ws://<host>:<port>/ws/blocks`

**Message format:**

```json
{
  "type": "new_block",
  "block": {
    "number": 12345,
    "hash": "0x...",
    "parentHash": "0x...",
    "stateRoot": "0x..."
  }
}
```

## Fork Detection and Recovery

The RPC node continuously validates that incoming blocks are consistent with its local chain state.

1. Each incoming block's parent hash is compared against the local chain tip.
2. If a mismatch is detected (indicating a fork on the validator side), the RPC node rolls back its local state to the common ancestor.
3. The node re-syncs from the validator to converge on the canonical chain.

This mechanism ensures that RPC nodes remain consistent with the validator network even through reorganizations.

## When to Use an RPC Node

| Use Case | Why RPC Mode |
|---|---|
| dApp backends | High query volume without validator overhead |
| Block explorers and indexers | Full chain data access with relaxed rate limits |
| Wallet infrastructure | Transaction submission via forwarding, balance and nonce queries |
| Analytics pipelines | Historical and real-time block data via WebSocket |

## When Not to Use an RPC Node

- **Block production**: RPC nodes cannot produce blocks. Use validator mode.
- **Consensus participation**: RPC nodes have no stake and do not vote. Use validator mode.
- **Offline or air-gapped environments**: RPC nodes require a persistent connection to a sync source.
