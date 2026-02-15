---
title: Configuration
description: Complete environment variable reference for Basalt node configuration.
sidebar_position: 2
---

# Configuration Reference

Basalt nodes are configured exclusively through environment variables. This design follows the twelve-factor app methodology, making deployments straightforward across bare metal, containers, and orchestration platforms.

## Environment Variables

The following table lists all environment variables recognized by a Basalt node.

| Variable | Default | Description |
|---|---|---|
| `BASALT_CHAIN_ID` | `31337` | Numeric chain identifier. Used during the P2P handshake to ensure peers belong to the same network. Mainnet, testnet, and devnet each use distinct chain IDs. |
| `BASALT_NETWORK` | `basalt-devnet` | Human-readable network name. Included in node status responses and peer advertisements. |
| `BASALT_VALIDATOR_INDEX` | `-1` | Index of this validator in the genesis validator set. When set to a value >= 0 **and** `BASALT_PEERS` is configured, the node enters consensus mode. When set to `-1` or left unset, the node runs in standalone mode with timer-based block production. |
| `BASALT_VALIDATOR_ADDRESS` | -- | Hex-encoded validator account address. Identifies this validator's on-chain identity for staking, rewards, and slashing. Required in consensus mode. |
| `BASALT_PEERS` | -- | Comma-separated list of peer endpoints in `host:port` format (e.g., `validator-1:30303,validator-2:30303`). Each entry specifies the P2P TCP listen address of a peer validator. Required for consensus mode. |
| `BASALT_VALIDATOR_KEY` | -- | Hex-encoded Ed25519 private key for signing blocks, votes, and protocol messages. If unset, a random key pair is generated at startup (suitable only for development). **Never commit this value to source control.** |
| `HTTP_PORT` | `5000` | TCP port for the HTTP API server (REST, GraphQL, gRPC, WebSocket, metrics). |
| `P2P_PORT` | `30303` | TCP port for the P2P transport layer. Used for peer-to-peer communication including consensus messages, transaction gossip, and state sync. |
| `BASALT_DATA_DIR` | -- | Filesystem path for RocksDB persistent storage. When set, the node stores blocks, state, and indexes to disk and can recover on restart. When unset, all storage is in-memory and lost on shutdown. |
| `BASALT_USE_PIPELINING` | `false` | Enable pipelined consensus. When `true`, the leader begins building the next block while the current block is still in the commit phase. Improves throughput at the cost of slightly higher resource usage. |
| `BASALT_USE_SANDBOX` | `false` | Enable sandboxed contract execution. When `true`, smart contract bytecode runs in an isolated execution environment with stricter resource limits. Recommended for public-facing nodes. |
| `ASPNETCORE_URLS` | `http://+:5000` | ASP.NET Core listen address binding. Controls which interfaces and ports the HTTP server binds to. Supports multiple bindings separated by semicolons (e.g., `http://+:5000;https://+:5001`). |

## Configuration Patterns

### Local Development

For local development, minimal configuration is required. The defaults are tuned for a single-node devnet:

```bash
# No environment variables needed -- all defaults apply
dotnet run --project src/node/Basalt.Node
```

This starts a standalone node with in-memory storage, a random key pair, chain ID 31337, and the REST API on port 5000.

### Single Validator with Persistence

To run a single validator with persistent storage for iterative development:

```bash
export BASALT_DATA_DIR=./data
dotnet run --project src/node/Basalt.Node
```

### Multi-Validator Consensus

For a multi-validator network, each node requires explicit identity and peer configuration:

```bash
# Validator 0
export BASALT_VALIDATOR_INDEX=0
export BASALT_VALIDATOR_ADDRESS="aabbccdd..."
export BASALT_VALIDATOR_KEY="11223344..."
export BASALT_PEERS="validator-1:30303,validator-2:30303,validator-3:30303"
export BASALT_DATA_DIR=/data/basalt
export HTTP_PORT=5100
export P2P_PORT=30300

dotnet run --project src/node/Basalt.Node
```

### Production Deployment

Production nodes should set all security-relevant variables and enable sandboxing:

```bash
export BASALT_CHAIN_ID=1
export BASALT_NETWORK=basalt-mainnet
export BASALT_VALIDATOR_INDEX=0
export BASALT_VALIDATOR_ADDRESS="<address>"
export BASALT_VALIDATOR_KEY="<key>"
export BASALT_PEERS="<peer-list>"
export BASALT_DATA_DIR=/var/lib/basalt
export BASALT_USE_SANDBOX=true
export BASALT_USE_PIPELINING=true
export ASPNETCORE_URLS="http://+:5000"
```

## Security Considerations

- **`BASALT_VALIDATOR_KEY`**: This is the most sensitive configuration value. It controls the node's ability to sign blocks and votes. Compromise of this key allows an attacker to double-sign and trigger slashing of the validator's entire stake. Use secrets management systems (e.g., HashiCorp Vault, AWS Secrets Manager, Kubernetes Secrets) to inject this value at runtime. Never store it in environment files committed to version control.

- **`ASPNETCORE_URLS`**: In production, bind the HTTP API to internal interfaces only unless the node is intended to serve public API traffic. Use a reverse proxy (e.g., Nginx, Envoy) with TLS termination for public-facing endpoints.

- **`BASALT_DATA_DIR`**: Ensure this directory has appropriate filesystem permissions. The RocksDB data directory contains the full blockchain state and should be backed up regularly.

## Precedence

Environment variables are the sole configuration source. There is no configuration file fallback. This ensures that configuration is explicit, auditable, and consistent across deployment environments.
