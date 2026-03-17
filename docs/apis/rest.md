---
sidebar_position: 1
title: REST API
description: HTTP REST API reference for querying the Basalt blockchain and submitting transactions.
---

# REST API

The REST API provides HTTP access to chain data, account state, and transaction submission.

**Base URL:** `http://localhost:5000/v1/`

## Endpoints

### Node

| Method | Path | Description |
|---|---|---|
| `GET` | `/health` | Node health check. Returns `200 OK` when the node is operational. |
| `GET` | `/status` | Node status including current block height, connected peer count, and sync state. |

### Blocks

| Method | Path | Description |
|---|---|---|
| `GET` | `/blocks/latest` | Returns the latest finalized block. |
| `GET` | `/blocks/:number` | Returns the block at the specified height. |
| `GET` | `/blocks/:hash` | Returns the block with the specified hash. |

### Accounts

| Method | Path | Description |
|---|---|---|
| `GET` | `/accounts/:address` | Returns full account state: balance, nonce, and account type. |
| `GET` | `/accounts/:address/balance` | Returns only the account balance. |

### Mempool

| Method | Path | Description |
|---|---|---|
| `GET` | `/mempool` | Returns the list of pending transactions in the mempool. |
| `GET` | `/mempool/count` | Returns the number of pending transactions. |

### Transactions

| Method | Path | Description |
|---|---|---|
| `POST` | `/transactions` | Submit a signed transaction. The request body must contain the RLP-encoded signed transaction. |
| `GET` | `/transactions/:hash` | Returns a transaction by its hash. |
| `GET` | `/transactions/:hash/receipt` | Returns the execution receipt for a finalized transaction. |

### Faucet (Testnet and Devnet Only)

| Method | Path | Description |
|---|---|---|
| `POST` | `/faucet` | Request test tokens. |

**Faucet request body:**

```json
{
  "address": "0x..."
}
```

:::note
The faucet endpoint is only available on testnet and devnet deployments. It is disabled on mainnet.
:::

## Rate Limiting

Rate limits are applied per IP address. Validator nodes enforce stricter limits to preserve resources for consensus operations. RPC nodes apply relaxed limits since they are designed for serving application traffic.

## Response Format

All responses use JSON. Successful responses return the requested data directly. Error responses use a consistent structure:

```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Block not found"
  }
}
```

### Common Error Codes

| Code | HTTP Status | Description |
|---|---|---|
| `NOT_FOUND` | 404 | The requested resource does not exist. |
| `BAD_REQUEST` | 400 | The request is malformed or missing required fields. |
| `RATE_LIMITED` | 429 | Too many requests from this IP address. |
| `INTERNAL_ERROR` | 500 | An unexpected server error occurred. |
