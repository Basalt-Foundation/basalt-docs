---
sidebar_position: 2
title: gRPC API
description: gRPC service reference for the Basalt node, including available RPCs and streaming endpoints.
---

# gRPC API

The gRPC API provides high-performance, strongly-typed access to the Basalt node. It is suitable for backend services, indexers, and any client that benefits from Protocol Buffer serialization and HTTP/2 transport.

**Default port:** 5001

**Service name:** `BasaltNode`

**Max concurrent streams:** 100

## Methods

| RPC | Request | Response | Type | Description |
|---|---|---|---|---|
| `GetStatus` | `Empty` | `StatusResponse` | Unary | Returns node status including block height, peer count, and sync state. |
| `GetBlock` | `BlockRequest` | `BlockResponse` | Unary | Returns a block by number or hash. |
| `GetAccount` | `AccountRequest` | `AccountResponse` | Unary | Returns account state (balance, nonce, account type). |
| `GetTransaction` | `TxRequest` | `TxResponse` | Unary | Returns a transaction by hash. |
| `SubmitTransaction` | `SubmitTxRequest` | `SubmitTxResponse` | Unary | Submits a signed transaction for inclusion. |
| `SubscribeBlocks` | `Empty` | `stream BlockResponse` | Server streaming | Streams new blocks as they are finalized. |

## Proto Definition

The service is defined in `basalt_node.proto` within the `Basalt.Api.Grpc` project. Client stubs can be generated from this file for any language with gRPC support.

## Usage Example

Using [grpcurl](https://github.com/fullstorydev/grpcurl):

```bash
grpcurl -plaintext localhost:5001 basalt.BasaltNode/GetStatus
```

### Streaming Blocks

```bash
grpcurl -plaintext localhost:5001 basalt.BasaltNode/SubscribeBlocks
```

This command opens a server-streaming connection and prints each new block as it is finalized. Press `Ctrl+C` to disconnect.

## Transport Security

The gRPC endpoint runs **unencrypted** by default, which is appropriate for local development and devnet deployments.

:::warning
Production deployments should terminate TLS in front of the gRPC port using a reverse proxy or load balancer. Do not expose unencrypted gRPC endpoints to the public internet.
:::
