---
title: gRPC API
description: High-performance Protobuf-based gRPC API reference for Basalt with bidirectional streaming.
sidebar_position: 2
---

# gRPC API Reference

The Basalt gRPC API provides a high-performance, strongly-typed interface for interacting with the blockchain. Built on Protocol Buffers (Protobuf) and HTTP/2, it is designed for backend services, infrastructure tooling, and high-throughput applications that benefit from binary serialization and bidirectional streaming.

## Connection

The gRPC service is hosted on the same port as the HTTP API (default: `5000`). ASP.NET Core's Kestrel server multiplexes HTTP/1.1 (REST), HTTP/2 (gRPC), and WebSocket traffic on a single port.

```
grpc://localhost:5000
```

For production deployments behind a reverse proxy, ensure that HTTP/2 traffic is forwarded correctly. Envoy and Nginx both support gRPC proxying with appropriate configuration.

## Service Definition

The `BasaltNode` service is defined in `basalt.proto` and exposes the following RPCs:

### Transaction Operations

| RPC | Request | Response | Description |
|---|---|---|---|
| `SendTransaction` | `SignedTransaction` | `TxResponse` | Submit a signed transaction to the node's mempool. Returns the transaction hash and acceptance status. The transaction is gossiped to peers and included in a future block by the leader. |
| `GetTransaction` | `TxHashRequest` | `Transaction` | Retrieve a transaction by its BLAKE3 hash. Returns the full transaction including sender, recipient, value, data, nonce, gas parameters, and signature. |
| `GetReceipt` | `TxHashRequest` | `TransactionReceipt` | Retrieve the execution receipt for a finalized transaction. Includes execution status, gas consumed, emitted event logs, and contract address for deployment transactions. |
| `EstimateGas` | `CallRequest` | `GasEstimate` | Estimate gas consumption for a transaction without persisting any state changes. Useful for setting appropriate gas limits before submission. |

### Block Operations

| RPC | Request | Response | Description |
|---|---|---|---|
| `GetBlock` | `BlockRequest` | `Block` | Retrieve a block by hash or height. The `BlockRequest` message includes a oneof field that accepts either a BLAKE3 hash or a numeric height. |
| `GetLatestBlock` | `Empty` | `Block` | Retrieve the most recently finalized block. Equivalent to querying the chain head. |
| `StreamBlocks` | `StreamRequest` | `stream Block` | Server-side streaming RPC that pushes new blocks as they are finalized. The client receives a continuous stream of `Block` messages. The `StreamRequest` can optionally specify a starting height to replay historical blocks before switching to live streaming. |

### Account and State Operations

| RPC | Request | Response | Description |
|---|---|---|---|
| `GetAccount` | `AddressRequest` | `AccountState` | Retrieve the current state of an account including balance, nonce, and code hash. |
| `GetStorageAt` | `StorageRequest` | `StorageValue` | Read a single storage slot from a contract account. The request specifies the contract address and storage key. |
| `Call` | `CallRequest` | `CallResult` | Execute a read-only contract call against the current state. Does not produce a transaction or modify state. Returns the call result and gas consumed. |

### Event Log Operations

| RPC | Request | Response | Description |
|---|---|---|---|
| `GetLogs` | `LogFilter` | `LogResponse` | Query event logs matching the specified filter criteria. Supports filtering by topics, block range, and contract address. Returns a batch of matching logs. |
| `StreamLogs` | `LogFilter` | `stream EventLog` | Server-side streaming RPC that pushes event logs matching the filter as they are emitted in real time. Useful for monitoring specific contract events without polling. |

### Network and Status Operations

| RPC | Request | Response | Description |
|---|---|---|---|
| `GetPeers` | `Empty` | `PeerList` | Retrieve the list of currently connected peers, including their node IDs, addresses, and connection duration. |
| `GetSyncStatus` | `Empty` | `SyncStatus` | Retrieve the node's synchronization status, including current height, highest known peer height, and sync progress percentage. |
| `GetChainInfo` | `Empty` | `ChainInfo` | Retrieve chain metadata including chain ID, genesis hash, network name, and protocol version. |

## Implementation Status

The following RPCs are currently implemented in the `BasaltNodeService`:

| RPC | Status |
|---|---|
| `GetStatus` | Implemented |
| `GetBlock` | Implemented |
| `GetAccount` | Implemented |
| `SendTransaction` | Implemented |
| `StreamBlocks` | Implemented |
| `GetTransaction` | Planned |
| `GetReceipt` | Planned |
| `EstimateGas` | Planned |
| `GetLatestBlock` | Planned |
| `GetStorageAt` | Planned |
| `Call` | Planned |
| `GetLogs` | Planned |
| `StreamLogs` | Planned |
| `GetPeers` | Planned |
| `GetSyncStatus` | Planned |
| `GetChainInfo` | Planned |

RPCs marked as "Planned" are defined in the Protobuf service definition but return an `UNIMPLEMENTED` status code. They will be enabled in future releases.

## Message Types

### Core Messages

```protobuf
message SignedTransaction {
  bytes from = 1;
  bytes to = 2;
  uint64 value = 3;
  uint64 nonce = 4;
  uint64 gas_limit = 5;
  uint64 gas_price = 6;
  bytes data = 7;
  bytes signature = 8;
}

message TxResponse {
  bytes tx_hash = 1;
  bool accepted = 2;
  string error = 3;
}

message TxHashRequest {
  bytes hash = 1;
}

message BlockRequest {
  oneof identifier {
    bytes hash = 1;
    uint64 height = 2;
  }
}

message Block {
  BlockHeader header = 1;
  repeated SignedTransaction transactions = 2;
}

message BlockHeader {
  bytes parent_hash = 1;
  bytes state_root = 2;
  bytes transactions_root = 3;
  uint64 height = 4;
  uint64 timestamp = 5;
  bytes proposer = 6;
  bytes signature = 7;
}

message AccountState {
  bytes address = 1;
  uint64 balance = 2;
  uint64 nonce = 3;
  bytes code_hash = 4;
}

message AddressRequest {
  bytes address = 1;
}
```

### Filter and Streaming Messages

```protobuf
message StreamRequest {
  uint64 from_height = 1;
}

message LogFilter {
  repeated bytes topics = 1;
  uint64 from_block = 2;
  uint64 to_block = 3;
  bytes address = 4;
}

message EventLog {
  bytes address = 1;
  repeated bytes topics = 2;
  bytes data = 3;
  uint64 block_height = 4;
  bytes tx_hash = 5;
  uint32 log_index = 6;
}
```

## Usage Examples

### .NET Client

```csharp
using Grpc.Net.Client;

var channel = GrpcChannel.ForAddress("http://localhost:5000");
var client = new BasaltNode.BasaltNodeClient(channel);

// Get latest block
var block = await client.GetLatestBlockAsync(new Empty());
Console.WriteLine($"Block #{block.Header.Height}");

// Stream new blocks
using var stream = client.StreamBlocks(new StreamRequest { FromHeight = 0 });
await foreach (var newBlock in stream.ResponseStream.ReadAllAsync())
{
    Console.WriteLine($"New block #{newBlock.Header.Height}");
}
```

### Go Client

```go
import (
    "context"
    pb "basalt/proto"
    "google.golang.org/grpc"
)

conn, _ := grpc.Dial("localhost:5000", grpc.WithInsecure())
client := pb.NewBasaltNodeClient(conn)

// Get account state
account, _ := client.GetAccount(context.Background(), &pb.AddressRequest{
    Address: addressBytes,
})
fmt.Printf("Balance: %d\n", account.Balance)
```

### grpcurl

```bash
# List available services
grpcurl -plaintext localhost:5000 list

# Get latest block
grpcurl -plaintext localhost:5000 basalt.BasaltNode/GetLatestBlock

# Stream blocks
grpcurl -plaintext localhost:5000 basalt.BasaltNode/StreamBlocks
```

## Performance Considerations

The gRPC API is optimized for high-throughput use cases:

- **Binary serialization**: Protobuf encoding is significantly more compact and faster to parse than JSON.
- **HTTP/2 multiplexing**: Multiple concurrent RPCs share a single TCP connection, reducing connection overhead.
- **Server-side streaming**: `StreamBlocks` and `StreamLogs` push data to clients without polling overhead.
- **Connection reuse**: gRPC channels maintain persistent HTTP/2 connections. Create a single channel and reuse it across requests.

For latency-sensitive applications, the gRPC API is preferred over REST due to lower serialization overhead and connection management costs.
