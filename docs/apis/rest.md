---
title: REST API
description: Complete reference for the Basalt REST API endpoints, rate limiting, and WebSocket subscriptions.
sidebar_position: 1
---

# REST API Reference

The Basalt REST API is built on ASP.NET Minimal APIs and provides HTTP access to all core blockchain operations. It is the primary interface for wallets, dApps, block explorers, and monitoring tools.

## Base URL

By default, the REST API listens on `http://localhost:5000`. This is configurable via the `HTTP_PORT` and `ASPNETCORE_URLS` environment variables. See the [Configuration Reference](../node-operations/configuration.md) for details.

## Endpoints

### Transactions

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/v1/transactions` | Submit a signed transaction to the mempool for inclusion in a future block. The request body must contain a fully signed transaction object. Returns the transaction hash on success. |
| `GET` | `/v1/transactions/{hash}` | Retrieve a transaction by its BLAKE3 hash. Returns the full transaction object including sender, recipient, value, data, gas, and signature fields. Returns 404 if the transaction is not found. |
| `GET` | `/v1/transactions/{hash}/receipt` | Retrieve the execution receipt for a finalized transaction. Includes status (success/failure), gas used, emitted event logs, and contract address (for contract creation transactions). Returns 404 if the transaction has not been finalized. |

### Blocks

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/v1/blocks/latest` | Retrieve the most recently finalized block. Returns the complete block including header (parent hash, state root, timestamp, height) and body (transaction list). |
| `GET` | `/v1/blocks/{hashOrHeight}` | Retrieve a block by its BLAKE3 hash or numeric height. The endpoint accepts either format and resolves accordingly. Returns 404 if no matching block exists. |

### Accounts

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/v1/accounts/{address}` | Retrieve the current state of an account by its hex-encoded address. Returns the account balance (in wei), nonce, and code hash (for contract accounts). |
| `GET` | `/v1/accounts/{address}/storage/{key}` | Read a single storage slot from a contract account. The key is hex-encoded. Returns the stored value at the specified key. |

### Contract Interaction

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/v1/call` | Execute a read-only contract call against the current state. The call is not included in a block and does not modify state. Useful for querying contract view functions. The request body specifies the target contract address, call data, and optional sender/gas parameters. |
| `POST` | `/v1/estimate-gas` | Estimate the gas cost for a given transaction. Executes the transaction against the current state without persisting the result. Returns the estimated gas units required. |

### Event Logs

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/v1/logs` | Query event logs emitted by contract execution. Supports filtering by topics, block range, and contract address. |

**Query Parameters:**

| Parameter | Type | Description |
|---|---|---|
| `topics` | string (repeated) | Filter by event topic hashes. Multiple topics are AND-combined. |
| `fromBlock` | integer | Start of the block range (inclusive). |
| `toBlock` | integer | End of the block range (inclusive). |
| `address` | string | Filter logs emitted by a specific contract address. |

### Chain Information

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/v1/chain/info` | Retrieve chain metadata including the chain ID, genesis block hash, current head block height, and network name. |
| `GET` | `/v1/status` | Retrieve the node's operational status including current block height, mempool transaction count, peer connections, sync state, and uptime. Used for health checks. |

### DevNet Utilities

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/v1/faucet` | Request test tokens on devnet. Sends BSLT to the specified address from a pre-funded faucet account. Only available when the node is running on a devnet chain. |

**Request Body:**

```json
{
  "address": "0x<hex-encoded-address>"
}
```

### Observability

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/metrics` | Prometheus-compatible metrics endpoint. Exposes counters, histograms, and gauges for block production, transaction processing, mempool size, peer connections, consensus rounds, and system resource usage. |

## WebSocket Subscriptions

The REST API server also hosts a WebSocket endpoint for real-time event streaming.

### Block Notifications

| Protocol | Endpoint | Description |
|---|---|---|
| `WS` | `/ws/blocks` | Streams real-time notifications whenever a new block is finalized. Each message contains the complete block header and transaction hashes. |

**Connection Example:**

```javascript
const ws = new WebSocket("ws://localhost:5000/ws/blocks");

ws.onmessage = (event) => {
  const block = JSON.parse(event.data);
  console.log(`New block #${block.height} with ${block.transactions.length} txs`);
};
```

**WebSocket Limits:**

| Parameter | Value |
|---|---|
| Maximum concurrent subscriptions per connection | 10 |
| Heartbeat interval | 30 seconds |
| Idle timeout | 120 seconds (closed if no heartbeat response) |

## Rate Limiting

The REST API enforces rate limits based on the client's authentication level:

| Tier | Rate Limit | Authentication |
|---|---|---|
| **Public** | 100 requests/second per IP | None (anonymous access) |
| **Authenticated** | 1,000 requests/second per API key | API key in `Authorization` header |
| **Enterprise** | Unlimited | Mutual TLS (mTLS) client certificate |

Rate limit headers are included in every response:

| Header | Description |
|---|---|
| `X-RateLimit-Limit` | Maximum requests allowed in the current window |
| `X-RateLimit-Remaining` | Requests remaining in the current window |
| `X-RateLimit-Reset` | Unix timestamp when the rate limit window resets |

When the rate limit is exceeded, the API returns HTTP `429 Too Many Requests` with a `Retry-After` header indicating when the client may retry.

## Error Responses

All error responses follow a consistent JSON format:

```json
{
  "error": {
    "code": "TRANSACTION_NOT_FOUND",
    "message": "No transaction found with hash 0xabc123..."
  }
}
```

| HTTP Status | Meaning |
|---|---|
| `400` | Bad request -- malformed input, invalid parameters |
| `404` | Resource not found -- unknown hash, height, or address |
| `429` | Rate limit exceeded |
| `500` | Internal server error |

## Content Types

- **Request bodies**: `application/json`
- **Response bodies**: `application/json`
- **Metrics endpoint**: `text/plain` (Prometheus exposition format)
- **WebSocket messages**: JSON-encoded text frames

## Usage Examples

### Submit a Transaction

```bash
curl -X POST http://localhost:5000/v1/transactions \
  -H "Content-Type: application/json" \
  -d '{
    "from": "0x<sender>",
    "to": "0x<recipient>",
    "value": 1000000,
    "nonce": 0,
    "gasLimit": 21000,
    "gasPrice": 1,
    "signature": "0x<ed25519-signature>"
  }'
```

### Query Account Balance

```bash
curl http://localhost:5000/v1/accounts/0x<address>
```

### Get Latest Block

```bash
curl http://localhost:5000/v1/blocks/latest
```

### Estimate Gas

```bash
curl -X POST http://localhost:5000/v1/estimate-gas \
  -H "Content-Type: application/json" \
  -d '{
    "from": "0x<sender>",
    "to": "0x<contract>",
    "data": "0x<calldata>"
  }'
```
