---
sidebar_position: 2
title: Quickstart
description: Run a standalone Basalt node, spin up a 4-validator devnet, and execute your first transactions.
---

# Quickstart

This guide walks you through running a Basalt node, interacting with the REST API, and using the CLI to create accounts and send transactions.

## 1. Build the Project

Ensure the solution is built before running any commands:

```bash
dotnet build
```

## 2. Run a Standalone Node

Start a single Basalt node in standalone development mode:

```bash
dotnet run --project src/node/Basalt.Node
```

The node starts with the following defaults:

| Parameter   | Default Value          |
|-------------|------------------------|
| REST API    | `http://localhost:5000`|
| gRPC        | `http://localhost:5001`|
| P2P         | Port 30303             |
| Mode        | Standalone validator   |

In standalone mode, the node acts as the sole validator, producing and finalizing blocks locally. This is suitable for development, contract testing, and API exploration.

## 3. Verify the Node Is Running

Check the health endpoint to confirm the node is operational:

```bash
curl http://localhost:5000/v1/health
```

Query the node status for detailed information:

```bash
curl -s http://localhost:5000/v1/status | jq
```

The response includes the node's public key, current block height, chain ID, and peer count.

## 4. Create an Account

Generate a new Ed25519 keypair with a Keccak-256 derived address using the CLI:

```bash
dotnet run --project tools/Basalt.Cli -- account create
```

This outputs the new address and private key. Store the private key securely -- it is required for signing transactions.

## 5. Check Balance

Query the balance of any address:

```bash
dotnet run --project tools/Basalt.Cli -- account balance --address <ADDRESS> --node http://localhost:5000
```

Replace `<ADDRESS>` with the hex-encoded address from the previous step.

## 6. Send a Transaction

Transfer BSLT tokens to another address:

```bash
dotnet run --project tools/Basalt.Cli -- tx send \
  --from <PRIVATE_KEY> \
  --to <RECIPIENT_ADDRESS> \
  --amount <AMOUNT> \
  --node http://localhost:5000
```

The CLI signs the transaction with the provided private key, submits it to the node, and returns the transaction hash.

## 7. Run the 4-Validator Docker DevNet

For a realistic multi-validator environment with full BasaltBFT consensus, use Docker Compose:

```bash
docker compose up -d
```

This spins up four validator nodes that discover each other via Kademlia DHT, perform the BFT handshake, and begin producing blocks through the full consensus pipeline (PROPOSE, PREPARE, PRE-COMMIT, COMMIT).

### Validator Port Mapping

| Validator     | REST API Port | P2P Port |
|---------------|---------------|----------|
| validator-0   | 5100          | 30300    |
| validator-1   | 5101          | 30301    |
| validator-2   | 5102          | 30302    |
| validator-3   | 5103          | 30303    |

### Verify the DevNet

```bash
# Check validator-0 status
curl -s http://localhost:5100/v1/status | jq

# Get the latest block from validator-1
curl -s http://localhost:5101/v1/blocks/latest | jq

# Request test tokens from the faucet
curl -s -X POST http://localhost:5100/v1/faucet \
  -H "Content-Type: application/json" \
  -d '{"address": "YOUR_ADDRESS_HEX"}' | jq
```

### Reset the DevNet

To tear down the devnet and start from a fresh genesis:

```bash
docker compose down -v
docker compose up -d
```

The `-v` flag removes persistent Docker volumes, ensuring all chain state is cleared.

## Default Ports Reference

| Service   | Standalone Node | DevNet (per validator)     |
|-----------|-----------------|----------------------------|
| REST API  | 5000            | 5100, 5101, 5102, 5103     |
| gRPC      | 5001            | --                         |
| P2P       | 30303           | 30300, 30301, 30302, 30303 |

## Next Steps

- [Architecture](./architecture) -- Understand the 30-project layered design and how the system is structured.
- [Smart Contracts](../smart-contracts/overview) -- Write, test, and deploy C# smart contracts with compile-time Roslyn analyzer safety.
