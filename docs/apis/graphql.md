---
sidebar_position: 3
title: GraphQL API
description: GraphQL query and mutation reference for the Basalt blockchain.
---

# GraphQL API

The GraphQL API provides a flexible query interface for retrieving chain data and submitting transactions. It is served on the same port as the REST API.

**Endpoint:** `POST /graphql` (default port 5000)

## Queries

### Block by Number

```graphql
query {
  block(number: 42) {
    number
    hash
    parentHash
    stateRoot
    timestamp
    transactions {
      hash
      from
      to
      value
    }
  }
}
```

### Account State

```graphql
query {
  account(address: "0x...") {
    balance
    nonce
    accountType
  }
}
```

### Latest Block

```graphql
query {
  latestBlock {
    number
    hash
    timestamp
  }
}
```

## Mutations

### Submit Transaction

```graphql
mutation {
  submitTransaction(signedTx: "0x...") {
    hash
    status
  }
}
```

The `signedTx` parameter accepts a hex-encoded, RLP-serialized signed transaction.

## Complexity Limits

To prevent abuse and protect node resources, the GraphQL API enforces limits on query complexity:

- **Depth limit**: queries cannot nest beyond a configured maximum depth.
- **Breadth limit**: the total number of fields resolved per query is capped.
- **Pagination**: nested collections (such as transactions within a block) are paginated. Large result sets must be fetched in pages.

Queries that exceed complexity limits are rejected with an error before execution.

## Error Handling

GraphQL errors follow the standard GraphQL error format:

```json
{
  "data": null,
  "errors": [
    {
      "message": "Block not found",
      "locations": [{ "line": 2, "column": 3 }],
      "path": ["block"]
    }
  ]
}
```
