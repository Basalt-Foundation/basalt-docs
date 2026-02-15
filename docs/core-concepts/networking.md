---
title: Networking
description: Basalt's peer-to-peer networking layer -- TCP transport, Kademlia DHT discovery, Episub gossip propagation, and peer reputation management.
sidebar_position: 3
---

# Networking

Basalt's peer-to-peer networking layer provides the communication substrate for transaction propagation, block dissemination, consensus messaging, and peer discovery. The design prioritizes low-latency message delivery for consensus-critical paths while maintaining robustness against adversarial peers and network partitions.

## Transport Layer

### TCP with Length-Prefixed Framing

All peer-to-peer communication uses TCP connections with a **length-prefixed framing** protocol. Each message on the wire is preceded by a 4-byte big-endian unsigned integer indicating the length of the subsequent payload in bytes.

```
+-------------------+-------------------+
| Length (4 bytes)  | Payload (N bytes) |
| Big-endian uint32 |                   |
+-------------------+-------------------+
```

This framing mechanism allows the receiver to read exactly the number of bytes required for each message, avoiding the need for delimiter-based parsing and eliminating message boundary ambiguity over the TCP byte stream.

### MessageCodec Format

Within the length-prefixed frame, the payload is structured according to the Basalt MessageCodec:

```
+-------------+------------------+------------------+-----------------+
| MessageType | SenderId         | Timestamp        | Payload         |
| 1 byte      | 32 bytes         | 8 bytes          | Variable length |
+-------------+------------------+------------------+-----------------+
```

| Field | Size | Description |
|---|---|---|
| MessageType | 1 byte | Enum identifying the message category (see Message Types below) |
| SenderId | 32 bytes | Ed25519 public key of the sending node |
| Timestamp | 8 bytes | Unix millisecond timestamp (big-endian int64) |
| Payload | Variable | Message-type-specific serialized data |

### Connection Handshake

Every new TCP connection begins with a **Hello/HelloAck handshake** that authenticates both peers and validates chain compatibility.

1. The **initiator** sends a `HELLO` message containing:
   - Its Ed25519 public key (node identity).
   - Its listening port for inbound connections.
   - The chain ID of the network it belongs to.
   - Its current best block height and hash.

2. The **responder** validates the chain ID. If the chain ID does not match, the connection is immediately terminated.

3. If the chain ID matches, the responder replies with a `HELLO_ACK` message containing:
   - Its own Ed25519 public key (node identity).
   - Its own listening port.
   - Its current best block height and hash.

4. The initiator validates the HelloAck, derives the responder's PeerId from the included public key and listening port, and registers the connection.

The entire handshake must complete within a **5-second timeout**. If either side fails to respond within this window, the connection is dropped.

#### Dual Connection Race Condition

When two peers attempt to connect to each other simultaneously, a race condition can occur where each side establishes a separate TCP connection. If both connections persist, each peer sends messages on its own connection while reading from the other, leading to message loss and eventual connection death.

Basalt resolves this by implementing a **reconnect loop** with deterministic tie-breaking. When a node detects a duplicate connection to a peer it is already connected to, it retains the connection initiated by the peer with the lexicographically lower PeerId and drops the other. The `TcpTransport.UpdatePeerId` method does not assign a PeerId until the connection is successfully added to the peer table, and does not fire `OnPeerDisconnected` for rejected duplicates.

## Message Types

The following message types are defined in the protocol:

| MessageType | Code | Direction | Description |
|---|---|---|---|
| `HELLO` | 0x00 | Bidirectional | Connection initiation with chain ID and identity |
| `TX_ANNOUNCE` | 0x01 | Broadcast | Announce a new transaction hash (IHAVE semantics) |
| `TX_REQUEST` | 0x02 | Unicast | Request full transaction data by hash (IWANT semantics) |
| `TX_PAYLOAD` | 0x03 | Unicast | Full transaction data in response to TX_REQUEST |
| `BLOCK_ANNOUNCE` | 0x04 | Broadcast | Announce a new block hash and height |
| `BLOCK_REQUEST` | 0x05 | Unicast | Request full block data by hash or height |
| `BLOCK_PAYLOAD` | 0x06 | Unicast | Full block data in response to BLOCK_REQUEST |
| `CONSENSUS_VOTE` | 0x07 | Broadcast | BLS-signed consensus vote (PREPARE, PRE-COMMIT, COMMIT) |
| `CONSENSUS_PROPOSAL` | 0x08 | Broadcast | Block proposal from the current leader |
| `PEER_EXCHANGE` | 0x09 | Unicast | Exchange known peer addresses for discovery |
| `STATUS` | 0x0A | Unicast | Periodic status update (best block, peer count) |

## Kademlia DHT

Basalt uses a **Kademlia Distributed Hash Table** for peer discovery. Kademlia provides a structured overlay network that enables any node to locate any other node in **O(log n)** hops.

### Parameters

| Parameter | Value |
|---|---|
| ID space | 256 bits |
| ID derivation | BLAKE3(Ed25519PublicKey) |
| Bucket size (k) | 20 |
| Lookup concurrency (alpha) | 3 |
| Routing table | 256 k-buckets, one per bit of XOR distance |
| Refresh interval | 60 seconds per bucket |

### Node Identity

Each node's Kademlia ID is derived deterministically from its Ed25519 public key:

```
kademlia_id = BLAKE3(ed25519_public_key)
```

This binds the DHT identity to the node's cryptographic identity, preventing Sybil attacks where an adversary claims arbitrary positions in the ID space (assuming the cost of generating Ed25519 key pairs is non-trivial due to stake requirements).

### Peer Discovery Workflow

1. A new node bootstraps by connecting to one or more **seed nodes** whose addresses are hardcoded or provided via configuration.
2. The node performs a Kademlia `FIND_NODE` lookup for its own ID, which populates its routing table with nearby peers.
3. Periodically (every 60 seconds), the node refreshes stale k-buckets by performing lookups for random IDs within each bucket's range.
4. The `PEER_EXCHANGE` message type supplements DHT-based discovery by allowing connected peers to share their known peer lists directly.

### Reputation-Based Exclusion

Peers whose reputation score falls below **0.3** are excluded from the Kademlia routing table. This prevents poorly performing or misbehaving nodes from being discovered and connected to by other nodes. The exclusion is enforced at the routing table insertion point: when a node's reputation drops below 0.3, its entry is evicted from all k-buckets and will not be re-added until its reputation recovers above the threshold.

## Episub Gossip Protocol

Basalt implements **Episub** (Epidemic Subscription), a two-tier gossip protocol for efficient message propagation across the network.

### Two-Tier Architecture

#### Priority Tier: Eager Push

The priority tier uses **eager push** semantics for latency-critical messages. When a node receives a new transaction or block for the first time, it immediately forwards the full message to all peers in its priority tier.

- **Target latency**: Full message delivery to direct peers within **50 milliseconds**.
- **Network-wide coverage**: All nodes receive the message within **200 milliseconds** under normal network conditions.
- **Peer selection**: The priority tier consists of peers with the lowest observed round-trip latency, up to a configurable maximum (default: 8 peers).

The priority tier is used for consensus-critical messages (`CONSENSUS_PROPOSAL`, `CONSENSUS_VOTE`) and new block announcements to ensure that consensus proceeds with minimal latency overhead.

#### Standard Tier: Lazy Pull

The standard tier uses **lazy pull** (IHAVE/IWANT) semantics for bandwidth-efficient propagation of non-urgent messages.

1. When a node receives a new message, it sends an `IHAVE` announcement (containing only the message hash) to all standard-tier peers.
2. A peer that does not already have the message responds with an `IWANT` request.
3. The originating node sends the full message payload in response.

- **Target coverage**: All nodes receive the message within **600 milliseconds**.
- **Bandwidth efficiency**: Only nodes that need the message request it, avoiding redundant full-message transmissions.

The standard tier is used for transaction propagation (`TX_ANNOUNCE` / `TX_REQUEST` / `TX_PAYLOAD`), where a slight increase in latency is acceptable in exchange for reduced bandwidth consumption.

### IWANT Handler

When a node receives an `IWANT` request for a message hash it has previously announced, it looks up the full message in its local cache and transmits the complete payload back to the requesting peer. If the message has already been evicted from cache (due to age or cache pressure), the node responds with a `NOT_FOUND` indicator, and the requesting peer will attempt to fetch the message from another peer that announced it.

## Peer Reputation System

Every connected peer is assigned a composite **reputation score** that reflects its observed behavior across four dimensions. The reputation score is a weighted average in the range [0.0, 1.0].

### Reputation Components

| Component | Weight | Description |
|---|---|---|
| Availability | 0.25 | Uptime and responsiveness to pings and keepalives |
| Response Latency | 0.15 | Average response time to requests (lower is better) |
| Block Validity | 0.35 | Fraction of blocks/transactions relayed by this peer that pass validation |
| Protocol Compliance | 0.25 | Adherence to protocol rules (correct message formats, valid handshakes, no spam) |

### Score Computation

```
reputation(peer) = 0.25 * availability
                 + 0.15 * response_latency_score
                 + 0.35 * block_validity
                 + 0.25 * protocol_compliance
```

Each component is normalized to [0.0, 1.0]:

- **Availability**: Ratio of successful keepalive responses to total keepalive probes sent.
- **Response Latency**: Inverse sigmoid function of the average response time, where peers responding within 100ms receive a score of 1.0 and peers exceeding 2 seconds receive a score near 0.0.
- **Block Validity**: Ratio of valid messages relayed to total messages relayed. A single invalid block reduces this score significantly.
- **Protocol Compliance**: Binary penalties for specific violations (malformed messages, handshake failures, unsolicited messages). Each violation applies a multiplicative 0.9 decay.

### Thresholds and Actions

| Threshold | Action |
|---|---|
| Below 0.3 | Excluded from Kademlia routing table |
| Below 0.2 | Disconnected and added to blacklist |
| Blacklist duration | 24 hours (configurable) |

Reputation scores are updated continuously as new observations are made. The scores decay toward 0.5 (neutral) over time if no new observations are recorded, allowing temporarily penalized peers to recover.

## Backpressure and Flood Protection

The networking layer implements multiple mechanisms to prevent resource exhaustion from high-throughput peers or denial-of-service attacks.

### Rate Limiting

Each peer connection is subject to a **per-peer rate limit of 10,000 transactions per second**. Transactions exceeding this rate are silently dropped. The rate limiter uses a token bucket algorithm with a burst capacity of 1,000 transactions, allowing short spikes while enforcing the long-term average.

### Bloom Filter Duplicate Detection

To avoid processing and relaying duplicate messages, each node maintains a **Bloom filter** for recently seen message hashes.

| Parameter | Value |
|---|---|
| Target false positive rate | 1% |
| Rotation interval | 60 seconds |
| Filter size | Dynamically sized based on expected throughput |

The Bloom filter is rotated every 60 seconds. The current filter is checked for all incoming messages; if a message hash is present, the message is discarded as a duplicate. When the filter rotates, the old filter is kept for one additional rotation period (double-buffered) to catch messages that arrive during the rotation transition.

### Mempool Capacity

The transaction mempool enforces a hard cap of **50,000 pending transactions**. When the mempool is full, new transactions are accepted only if they offer a higher gas price than the lowest-priced transaction currently in the pool (replacement policy). Evicted transactions are not re-gossiped.

## Network Parameters

| Parameter | Default Value |
|---|---|
| Maximum direct peers | 50 |
| Maximum passive peers | 200 |
| Connection timeout | 5 seconds |
| Handshake timeout | 5 seconds |
| Keepalive interval | 30 seconds |
| Keepalive timeout | 10 seconds |
| Maximum block size | 2 MB |
| Maximum transaction size (call) | 128 KB |
| Maximum transaction size (deploy) | 2 MB |
| Priority tier peers | 8 |
| DHT refresh interval | 60 seconds |
| Bloom filter rotation | 60 seconds |
| Per-peer TX rate limit | 10,000 tx/sec |
| Mempool capacity | 50,000 transactions |
| Blacklist duration | 24 hours |
