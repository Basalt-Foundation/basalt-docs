---
sidebar_position: 1
title: CLI Reference
description: Command reference for the Basalt CLI tool, covering account management, transaction submission, and project scaffolding.
---

# CLI Reference

The Basalt CLI provides command-line access to common operations including account management, transaction submission, and smart contract project scaffolding.

**Usage:**

```bash
dotnet run --project tools/Basalt.Cli -- <command>
```

**Default node URL:** `http://localhost:5000`

To target a different node, set the `BASALT_NODE_URL` environment variable:

```bash
export BASALT_NODE_URL=http://my-node:5000
```

## Commands

### `init`

Scaffold a new smart contract project.

```bash
basalt init <project-name>
```

Creates a new .NET project directory with:

- A reference to `Basalt.Sdk.Contracts`
- A starter contract template
- A standard project structure ready for development

### `account create`

Generate a new Ed25519 keypair.

```bash
basalt account create [--output <file>]
```

**Output:**

- Address (`0x...`)
- Public key (hex)
- Private key (hex)

If `--output` is specified, the keypair is written to the given file path in addition to being printed to the console.

:::warning
Store your private key securely. It cannot be recovered if lost. Anyone with access to the private key has full control over the associated account.
:::

### `account balance`

Query the balance of an account.

```bash
basalt account balance <address>
```

Returns the current BSLT balance for the specified address.

### `tx send`

Send a signed transaction to the network.

```bash
basalt tx send \
  --to <address> \
  --value <amount> \
  --key <private-key> \
  [--gas <limit>] \
  [--chain-id <id>]
```

**Parameters:**

| Parameter | Required | Description |
|---|---|---|
| `--to` | Yes | Recipient address. |
| `--value` | Yes | Amount of BSLT to transfer. |
| `--key` | Yes | Sender's Ed25519 private key (hex). |
| `--gas` | No | Gas limit for the transaction. Uses a default if not specified. |
| `--chain-id` | No | Chain ID for replay protection. Defaults to the node's chain ID. |

The CLI constructs the transaction, signs it with the provided key, and submits it to the node's REST API. The transaction hash is printed on success.
