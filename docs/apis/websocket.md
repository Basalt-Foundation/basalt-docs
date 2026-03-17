---
sidebar_position: 4
title: WebSocket
description: Real-time block notifications via WebSocket for the Basalt blockchain.
---

# WebSocket API

The WebSocket API provides real-time push notifications for new blocks as they are finalized. It is designed for applications that need immediate awareness of chain progression without polling.

**Endpoint:** `ws://localhost:5000/ws/blocks`

**Maximum concurrent connections:** 1,000

## Message Format

When a new block is finalized, the server pushes a JSON message to all connected clients:

```json
{
  "type": "new_block",
  "block": {
    "number": 12345,
    "hash": "0x...",
    "parentHash": "0x...",
    "stateRoot": "0x...",
    "timestamp": 1710000000,
    "transactionCount": 42
  }
}
```

### Fields

| Field | Type | Description |
|---|---|---|
| `type` | string | Message type. Currently always `"new_block"`. |
| `block.number` | integer | Block height. |
| `block.hash` | string | BLAKE3 hash of the block header. |
| `block.parentHash` | string | Hash of the parent block. |
| `block.stateRoot` | string | Merkle Patricia Trie root of the state after this block. |
| `block.timestamp` | integer | Unix timestamp of block production. |
| `block.transactionCount` | integer | Number of transactions included in the block. |

## Timing

New blocks are broadcast to all connected clients within approximately **200 milliseconds** of finality.

## Client Timeout

Each client is given a **5-second window** to accept a broadcast message. If a client cannot receive the message within this window (due to a slow connection or backpressure), it is disconnected. This prevents slow consumers from degrading broadcast performance for other clients.

## Usage Example

### JavaScript

```javascript
const ws = new WebSocket('ws://localhost:5000/ws/blocks');

ws.onopen = () => {
  console.log('Connected to Basalt block stream');
};

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  if (data.type === 'new_block') {
    console.log('New block:', data.block.number);
  }
};

ws.onclose = () => {
  console.log('Disconnected from block stream');
};
```

## RPC Node Behavior

When running in [RPC mode](../node-operations/rpc-node-mode.md), the node subscribes to the WebSocket feed of its sync source. As it receives new blocks, it re-broadcasts them to its own connected WebSocket clients. This allows applications to connect to an RPC node for block notifications without requiring direct access to a validator.
