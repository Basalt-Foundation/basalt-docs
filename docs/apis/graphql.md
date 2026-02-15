---
title: GraphQL API
description: Flexible GraphQL API for querying Basalt blockchain data, built with HotChocolate 14.3.0.
sidebar_position: 3
---

# GraphQL API Reference

The Basalt GraphQL API provides a flexible query interface for exploring blockchain state, analyzing transactions, and building dashboards. Unlike the REST API's fixed endpoints, GraphQL allows clients to request exactly the data they need in a single query, reducing over-fetching and minimizing round trips.

## Overview

- **Framework**: [HotChocolate 14.3.0](https://chillicream.com/docs/hotchocolate) for .NET
- **Endpoint**: `/graphql`
- **Playground**: Banana Cake Pop interactive explorer available at `/graphql` in the browser
- **Protocol**: HTTP POST with `application/json` body (standard GraphQL over HTTP)

## Getting Started

The GraphQL endpoint is served on the same port as the REST API (default: `5000`). Navigate to `http://localhost:5000/graphql` in a browser to access the Banana Cake Pop interactive playground, which provides schema exploration, query autocompletion, and documentation.

### Making Queries

Send GraphQL queries as HTTP POST requests with a JSON body:

```bash
curl -X POST http://localhost:5000/graphql \
  -H "Content-Type: application/json" \
  -d '{
    "query": "{ latestBlock { height timestamp transactionCount } }"
  }'
```

## Schema

### Query Type

The root `Query` type exposes the following fields for reading blockchain state.

#### Blocks

```graphql
type Query {
  """Retrieve the most recently finalized block."""
  latestBlock: Block!

  """Retrieve a block by its numeric height."""
  block(height: Long!): Block

  """Retrieve a block by its BLAKE3 hash (hex-encoded)."""
  blockByHash(hash: String!): Block

  """Retrieve a range of blocks with pagination."""
  blocks(
    first: Int = 10
    after: String
    fromHeight: Long
    toHeight: Long
  ): BlockConnection!
}
```

#### Transactions

```graphql
type Query {
  """Retrieve a transaction by its BLAKE3 hash (hex-encoded)."""
  transaction(hash: String!): Transaction

  """Retrieve the execution receipt for a transaction."""
  receipt(hash: String!): TransactionReceipt

  """Query transactions with filtering and pagination."""
  transactions(
    first: Int = 10
    after: String
    from: String
    to: String
    fromBlock: Long
    toBlock: Long
  ): TransactionConnection!
}
```

#### Accounts

```graphql
type Query {
  """Retrieve account state by hex-encoded address."""
  account(address: String!): Account

  """Read a storage slot from a contract account."""
  storageAt(address: String!, key: String!): String
}
```

#### Chain Information

```graphql
type Query {
  """Retrieve chain metadata."""
  chainInfo: ChainInfo!

  """Retrieve node operational status."""
  nodeStatus: NodeStatus!
}
```

### Object Types

```graphql
type Block {
  height: Long!
  hash: String!
  parentHash: String!
  stateRoot: String!
  transactionsRoot: String!
  timestamp: DateTime!
  proposer: String!
  transactionCount: Int!
  transactions: [Transaction!]!
}

type Transaction {
  hash: String!
  from: String!
  to: String
  value: Decimal!
  nonce: Long!
  gasLimit: Long!
  gasPrice: Long!
  data: String
  signature: String!
  blockHeight: Long
  blockHash: String
  index: Int
}

type TransactionReceipt {
  transactionHash: String!
  status: TransactionStatus!
  gasUsed: Long!
  contractAddress: String
  logs: [EventLog!]!
  blockHeight: Long!
  blockHash: String!
}

type EventLog {
  address: String!
  topics: [String!]!
  data: String!
  blockHeight: Long!
  transactionHash: String!
  logIndex: Int!
}

type Account {
  address: String!
  balance: Decimal!
  nonce: Long!
  codeHash: String
  isContract: Boolean!
}

type ChainInfo {
  chainId: Int!
  networkName: String!
  genesisHash: String!
  headBlockHeight: Long!
  headBlockHash: String!
}

type NodeStatus {
  blockHeight: Long!
  mempoolSize: Int!
  peerCount: Int!
  isSyncing: Boolean!
  uptime: Long!
}

enum TransactionStatus {
  SUCCESS
  FAILURE
  PENDING
}
```

### Pagination Types

The API uses Relay-style cursor-based pagination for list queries:

```graphql
type BlockConnection {
  edges: [BlockEdge!]!
  pageInfo: PageInfo!
  totalCount: Int!
}

type BlockEdge {
  cursor: String!
  node: Block!
}

type TransactionConnection {
  edges: [TransactionEdge!]!
  pageInfo: PageInfo!
  totalCount: Int!
}

type TransactionEdge {
  cursor: String!
  node: Transaction!
}

type PageInfo {
  hasNextPage: Boolean!
  hasPreviousPage: Boolean!
  startCursor: String
  endCursor: String
}
```

### Mutation Type

```graphql
type Mutation {
  """Submit a signed transaction to the mempool."""
  submitTransaction(input: TransactionInput!): TransactionPayload!
}

input TransactionInput {
  from: String!
  to: String
  value: Decimal!
  nonce: Long!
  gasLimit: Long!
  gasPrice: Long!
  data: String
  signature: String!
}

type TransactionPayload {
  hash: String
  accepted: Boolean!
  error: String
}
```

## Example Queries

### Get Block by Height

```graphql
query GetBlock {
  block(height: 42) {
    height
    hash
    parentHash
    timestamp
    proposer
    transactionCount
    transactions {
      hash
      from
      to
      value
    }
  }
}
```

### Get Account Balance

```graphql
query GetAccount {
  account(address: "0xaabbccdd...") {
    address
    balance
    nonce
    isContract
  }
}
```

### List Recent Transactions

```graphql
query RecentTransactions {
  transactions(first: 20) {
    edges {
      node {
        hash
        from
        to
        value
        gasUsed
        blockHeight
      }
    }
    pageInfo {
      hasNextPage
      endCursor
    }
    totalCount
  }
}
```

### Transaction with Receipt

```graphql
query TransactionWithReceipt {
  transaction(hash: "0xabc123...") {
    hash
    from
    to
    value
    blockHeight
  }
  receipt(hash: "0xabc123...") {
    status
    gasUsed
    logs {
      address
      topics
      data
    }
  }
}
```

### Chain Status Dashboard

```graphql
query Dashboard {
  chainInfo {
    chainId
    networkName
    headBlockHeight
  }
  nodeStatus {
    blockHeight
    mempoolSize
    peerCount
    isSyncing
  }
  latestBlock {
    height
    timestamp
    transactionCount
    proposer
  }
}
```

### Submit a Transaction

```graphql
mutation SubmitTx {
  submitTransaction(input: {
    from: "0x<sender>"
    to: "0x<recipient>"
    value: 1000000
    nonce: 5
    gasLimit: 21000
    gasPrice: 1
    signature: "0x<ed25519-signature>"
  }) {
    hash
    accepted
    error
  }
}
```

## Query Complexity Limits

To protect the node from resource-exhaustive queries, the GraphQL API enforces the following complexity limits:

| Parameter | Limit | Description |
|---|---|---|
| **Maximum query depth** | 10 | Queries nested deeper than 10 levels are rejected. Prevents deeply recursive queries that could cause excessive data loading. |
| **Maximum field count** | 100 | Queries selecting more than 100 fields (across all levels) are rejected. Prevents queries that request an unreasonable amount of data in a single request. |
| **Execution timeout** | 30 seconds | Queries that take longer than 30 seconds to execute are terminated. Prevents long-running queries from monopolizing server resources. |
| **Maximum page size** | 100 | The `first` argument on paginated queries is capped at 100. Larger pages must be fetched through cursor-based pagination. |

Queries that exceed these limits receive an error response with a descriptive message indicating which limit was violated:

```json
{
  "errors": [
    {
      "message": "Query exceeds maximum depth of 10.",
      "extensions": {
        "code": "QUERY_TOO_COMPLEX"
      }
    }
  ]
}
```

## Banana Cake Pop Playground

HotChocolate includes the Banana Cake Pop GraphQL IDE, accessible by navigating to the `/graphql` endpoint in a web browser. The playground provides:

- **Schema explorer**: Browse all available types, queries, mutations, and their documentation.
- **Query editor**: Write and execute queries with syntax highlighting and autocompletion.
- **Response viewer**: View formatted JSON responses with collapsible sections.
- **History**: Access previously executed queries.
- **Variable editor**: Define query variables in a dedicated panel.
- **HTTP headers**: Set custom headers (e.g., authorization tokens) for authenticated requests.

The playground is enabled by default in development mode. For production deployments, consider disabling it or restricting access to internal networks.

## GraphQL vs. REST vs. gRPC

Choose the right API for your use case:

| Criterion | REST | gRPC | GraphQL |
|---|---|---|---|
| **Best for** | Simple integrations, standard tooling | High-throughput backend services | Analytical queries, dashboards, explorers |
| **Data format** | JSON | Protobuf (binary) | JSON |
| **Flexibility** | Fixed endpoints | Fixed RPCs | Client-defined queries |
| **Streaming** | WebSocket only | Bidirectional streaming | Not supported |
| **Tooling** | curl, Postman | grpcurl, language-specific clients | Banana Cake Pop, Apollo, Insomnia |
| **Over-fetching** | Common | Minimal (typed responses) | None (client selects fields) |
| **Performance** | Moderate | Highest | Moderate |
