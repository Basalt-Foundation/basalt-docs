---
sidebar_position: 2
title: Quickstart
---

# Quickstart

This guide walks you through running a single Basalt node in standalone mode and deploying a full 4-validator devnet using Docker Compose.

## Run a Local Node

Start a single Basalt node in standalone development mode:

```bash
dotnet run --project src/node/Basalt.Node
```

The node starts with the following defaults:

| Parameter   | Value                |
|-------------|----------------------|
| Chain ID    | 31337                |
| REST API    | http://localhost:5000 |
| Block Time  | 400ms                |
| Mode        | Standalone validator |

In standalone mode, the node acts as the sole validator, producing and finalizing blocks locally. This is suitable for development, contract testing, and API exploration.

## Run a 4-Validator Devnet

For a realistic multi-validator environment with Byzantine Fault Tolerant consensus, use Docker Compose:

```bash
docker compose up --build
```

This spins up four validator nodes that discover each other, perform the BFT handshake, and begin producing blocks through the full BasaltBFT consensus pipeline (PROPOSE, PREPARE, PRE-COMMIT, COMMIT).

### Validator Configuration

| Validator     | REST API Port | P2P Port |
|---------------|---------------|----------|
| validator-0   | 5100          | 30300    |
| validator-1   | 5101          | 30301    |
| validator-2   | 5102          | 30302    |
| validator-3   | 5103          | 30303    |

### Persistent Storage

Each validator stores its chain data in a Docker volume mapped to `/data/basalt` inside the container:

```
validator-0-data:/data/basalt
validator-1-data:/data/basalt
validator-2-data:/data/basalt
validator-3-data:/data/basalt
```

RocksDB data is persisted across container restarts. When a validator rejoins the network, it recovers its state from stored blocks and synchronizes any missed blocks from peers via the state sync protocol before re-entering consensus.

To reset the devnet and start from a fresh genesis:

```bash
docker compose down -v
docker compose up --build
```

## Test It

Once the node or devnet is running, verify everything is working with the following commands.

### Check Node Status

```bash
curl -s http://localhost:5100/v1/status | jq
```

Expected response includes the node's public key, current block height, chain ID, and peer count.

### Get the Latest Block

```bash
curl -s http://localhost:5100/v1/blocks/latest | jq
```

Returns the most recently finalized block, including its hash, height, timestamp, transaction count, and state root.

### Request Tokens from the Faucet

The devnet includes a built-in faucet for funding test accounts:

```bash
curl -s -X POST http://localhost:5100/v1/faucet \
  -H "Content-Type: application/json" \
  -d '{"address": "YOUR_ADDRESS_HEX"}' | jq
```

The faucet dispenses test BSLT tokens to the specified address. Use this to fund accounts before submitting transactions.

## CLI Quick Commands

The Basalt CLI provides a convenient interface for common operations.

### Create an Account

```bash
dotnet run --project tools/Basalt.Cli -- account create
```

Generates a new Ed25519 keypair and derives a Keccak-256 address. The private key is printed to stdout -- store it securely.

### Check Balance

```bash
dotnet run --project tools/Basalt.Cli -- account balance --address <ADDRESS> --node http://localhost:5100
```

### Send a Transfer

```bash
dotnet run --project tools/Basalt.Cli -- tx send \
  --from <PRIVATE_KEY> \
  --to <RECIPIENT_ADDRESS> \
  --amount 1000 \
  --node http://localhost:5100
```

### Query Node Status

```bash
dotnet run --project tools/Basalt.Cli -- node status --node http://localhost:5100
```

## Next Steps

Now that you have a running network, explore the [Architecture](./architecture) guide to understand how the system is structured, or dive into smart contract development.
