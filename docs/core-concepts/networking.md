---
sidebar_position: 3
title: "Networking"
description: "Basalt P2P networking layer: TCP transport, Kademlia DHT peer discovery, and Episub two-tier gossip protocol for block and transaction propagation."
---

# Networking

Basalt's peer-to-peer networking layer handles node discovery, connection management, and message propagation. It is built on TCP with a custom framing protocol, Kademlia DHT for peer discovery, and Episub for efficient gossip.

## Transport

| Parameter | Value |
|---|---|
| Protocol | TCP with length-prefixed framing |
| Default port | 30303 (configurable) |
| Max message size | 16 MB |
| Handshake timeout | 5 seconds |
| Frame read timeout | 120 seconds |
| Connection timeout | 10 seconds |
| Max peers | 50 (default) |

All peer communication uses TCP connections with length-prefixed message framing. Each message is preceded by its size, allowing receivers to correctly delimit and parse incoming data on the stream.

## Message Format

Every network message includes a **41-byte header** followed by a variable-length payload:

| Offset | Size | Field | Description |
|---|---|---|---|
| 0 | 1 byte | MessageType | Identifies the message kind (block, transaction, vote, etc.) |
| 1 | 32 bytes | SenderId | Ed25519 public key of the sending node |
| 33 | 8 bytes | Timestamp | Unix timestamp (milliseconds) |
| 41 | N bytes | Payload | Serialized message body |

The `SenderId` field enables immediate sender identification and is used for peer reputation tracking and authentication.

## Kademlia DHT

Peer discovery uses a **Kademlia Distributed Hash Table (DHT)**:

- **k-buckets** organize the routing table by XOR distance from the local node's ID. Each bucket holds up to `k` peers at a given distance range.
- **Node lookup** uses iterative resolution: the querying node contacts the closest known peers, which return their closest known peers, converging on the target.
- **Bootstrap nodes** provide initial entry points for new nodes joining the network.

Kademlia ensures that any node can discover any other node in `O(log n)` hops, where `n` is the total number of nodes in the network.

## Episub: Two-Tier Gossip Protocol

Episub is a two-tier gossip protocol optimized for low-latency block and transaction propagation. It classifies peers into two categories based on observed delivery performance:

### Eager Peers

| Property | Value |
|---|---|
| Target count | 6 peers |
| Delivery method | Immediate full message push |
| Latency target | ~200 ms |

Eager peers receive the full message payload as soon as it is available. This tier ensures rapid dissemination to a core subset of well-connected peers.

### Lazy Peers

| Property | Value |
|---|---|
| Target count | 12 peers |
| Delivery method | IHAVE/IWANT announcement protocol |
| Latency target | ~600 ms |

Lazy peers receive only an `IHAVE` announcement containing the message hash. If the peer has not yet received the message through another path, it responds with an `IWANT` request to fetch the full payload. This reduces bandwidth consumption for peers that have already received the message via an eager connection.

### Peer Promotion and Demotion

Peers are dynamically promoted from lazy to eager (or demoted from eager to lazy) based on their message delivery performance. Peers that consistently deliver messages quickly are promoted to the eager tier, while underperforming eager peers are demoted to lazy.

## Peer Reputation

The networking layer maintains a reputation score for each connected peer. Reputation is influenced by:

- **Delivery latency** -- how quickly a peer forwards new blocks and transactions.
- **Message validity** -- whether messages from the peer pass validation (correct signatures, well-formed payloads).
- **Protocol compliance** -- whether the peer follows the expected handshake and messaging protocols.

Peers whose reputation drops below a threshold are **banned** and their connections are rejected. This protects the network against spam, eclipse attacks, and misbehaving nodes.
