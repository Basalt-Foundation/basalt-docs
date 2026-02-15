---
sidebar_position: 1
title: CLI Reference
description: Complete reference for the Basalt command-line interface.
---

# Basalt CLI Reference

The Basalt CLI provides a comprehensive set of commands for interacting with the Basalt blockchain. It supports account management, transaction submission, block queries, contract development scaffolding, and node administration.

## Running the CLI

The CLI is executed via the .NET toolchain from the repository root:

```bash
dotnet run --project tools/Basalt.Cli -- <command> [options]
```

All commands accept an optional `--url` flag to specify the target node endpoint. If omitted, the CLI defaults to `http://localhost:5000`.

```bash
dotnet run --project tools/Basalt.Cli -- <command> --url http://node.example.com:5000
```

---

## Account Management

### `account create`

Generates a new Ed25519 keypair and derives the corresponding Basalt address. The address is derived using Keccak-256 over the public key bytes.

```bash
dotnet run --project tools/Basalt.Cli -- account create
```

**Output:**

- Private key (hex-encoded) -- store this securely and never share it.
- Public key (hex-encoded).
- Basalt address derived from the public key via Keccak-256.

:::warning
The private key is displayed once and is not persisted by the CLI. You are responsible for storing it securely. Loss of the private key means permanent loss of access to the associated account and funds.
:::

### `account balance <address>`

Queries the current balance of the specified account from the connected node.

```bash
dotnet run --project tools/Basalt.Cli -- account balance 0x1a2b3c...
```

**Parameters:**

| Parameter   | Type   | Required | Description                          |
|-------------|--------|----------|--------------------------------------|
| `<address>` | string | Yes      | The Basalt address to query.         |

**Output:**

- Account balance in BST (the native token).

---

## Transactions

### `tx send`

Submits a BST transfer transaction to the connected node.

```bash
dotnet run --project tools/Basalt.Cli -- tx send --to <address> --value <amount> --key <hex>
```

**Parameters:**

| Flag      | Type   | Required | Description                                      |
|-----------|--------|----------|--------------------------------------------------|
| `--to`    | string | Yes      | Recipient Basalt address.                         |
| `--value` | uint64 | Yes      | Amount of BST to transfer (in base units).        |
| `--key`   | string | Yes      | Hex-encoded Ed25519 private key of the sender.    |

The transaction is signed locally using the provided private key, then broadcast to the node for inclusion in the mempool. The CLI returns the transaction hash upon successful submission.

**Example:**

```bash
dotnet run --project tools/Basalt.Cli -- tx send \
  --to 0x9f8e7d6c5b4a3928... \
  --value 1000000 \
  --key 0xabcdef0123456789...
```

### `tx status <hash>`

Checks the current status of a previously submitted transaction.

```bash
dotnet run --project tools/Basalt.Cli -- tx status <hash>
```

**Parameters:**

| Parameter | Type   | Required | Description                                  |
|-----------|--------|----------|----------------------------------------------|
| `<hash>`  | string | Yes      | The transaction hash returned at submission.  |

**Possible statuses:**

- **Pending** -- The transaction is in the mempool awaiting inclusion.
- **Confirmed** -- The transaction has been included in a finalized block.
- **Failed** -- The transaction was rejected during execution.
- **Not Found** -- No transaction with this hash exists on the connected node.

---

## Blocks

### `block latest`

Retrieves information about the most recently finalized block.

```bash
dotnet run --project tools/Basalt.Cli -- block latest
```

**Output:**

- Block number (height).
- Block hash (BLAKE3).
- Timestamp.
- Number of transactions.
- Proposer address.

### `block get <number>`

Retrieves information about a specific block by its height.

```bash
dotnet run --project tools/Basalt.Cli -- block get <number>
```

**Parameters:**

| Parameter  | Type   | Required | Description                     |
|------------|--------|----------|---------------------------------|
| `<number>` | uint64 | Yes      | The block height to retrieve.   |

**Output:**

- Block number, hash, timestamp, transaction count, and proposer address (same fields as `block latest`).

---

## Faucet

### `faucet <address>`

Requests test tokens from the devnet faucet. This command is only available when connected to a devnet node that has the faucet endpoint enabled.

```bash
dotnet run --project tools/Basalt.Cli -- faucet <address>
```

**Parameters:**

| Parameter   | Type   | Required | Description                                       |
|-------------|--------|----------|---------------------------------------------------|
| `<address>` | string | Yes      | The Basalt address to receive the test tokens.     |

:::note
The faucet is rate-limited and only available on devnet deployments. It is not available on mainnet or production testnets.
:::

---

## Node

### `node status`

Queries the connected node for its current operational status.

```bash
dotnet run --project tools/Basalt.Cli -- node status
```

**Output:**

- **Block height** -- The latest finalized block number.
- **Peer count** -- Number of connected P2P peers.
- **Mempool size** -- Number of pending transactions in the mempool.

---

## Contract Development

### `init <name>`

Initializes a new smart contract project using the Basalt contract template. This scaffolds a .NET project pre-configured with the necessary SDK references for contract development.

```bash
dotnet run --project tools/Basalt.Cli -- init MyContract
```

**Parameters:**

| Parameter | Type   | Required | Description                                     |
|-----------|--------|----------|-------------------------------------------------|
| `<name>`  | string | Yes      | Name of the contract project to create.          |

**What gets scaffolded:**

- A new .NET class library project named `<name>`.
- A `PackageReference` to `Basalt.Sdk.Contracts`, which provides the contract base class, storage primitives (`StorageMap`, `StorageValue`), and attribute-based entry point declaration.
- A `PackageReference` to `Basalt.Sdk.Analyzers`, which provides compile-time Roslyn analyzers that enforce contract safety rules (e.g., no filesystem access, no threading, deterministic execution).
- A starter contract file with a minimal working example.

**Example workflow:**

```bash
# Scaffold the project
dotnet run --project tools/Basalt.Cli -- init MyToken

# Navigate to the project
cd MyToken

# Build the contract
dotnet build

# Run analyzer checks
dotnet build /warnaserrors
```

---

## Configuration

### Default Node URL

All network-facing commands (`account balance`, `tx send`, `tx status`, `block latest`, `block get`, `faucet`, `node status`) connect to a Basalt node over HTTP. The default endpoint is:

```
http://localhost:5000
```

### Overriding the Node URL

Use the `--url` flag on any command to target a different node:

```bash
dotnet run --project tools/Basalt.Cli -- node status --url http://192.168.1.50:5100
```

This is useful when working with remote devnet nodes, Docker Compose deployments (which expose HTTP on ports 5100--5103), or production endpoints.

---

## Exit Codes

| Code | Meaning                                                  |
|------|----------------------------------------------------------|
| `0`  | Command completed successfully.                          |
| `1`  | General error (invalid arguments, network failure, etc). |

---

## See Also

- [DevNet Setup](../node-operations/docker-devnet) -- Running a local multi-validator network.
- [Contract Development](../smart-contracts/getting-started) -- Writing and deploying smart contracts.
- [API Reference](../apis/grpc) -- Programmatic access via gRPC and GraphQL.
