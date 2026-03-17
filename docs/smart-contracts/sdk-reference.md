---
sidebar_position: 3
title: SDK Reference
description: Complete reference for the Basalt.Sdk.Contracts package, covering the base class, attributes, storage primitives, types, events, cross-contract calls, and serialization.
---

# SDK Reference

This document provides a complete reference for the `Basalt.Sdk.Contracts` package. It covers the contract base class, method attributes, storage primitives, core types, event emission, cross-contract calls, and serialization.

## Base Class: BasaltContract

All contracts inherit from `BasaltContract`. This base class provides access to the execution context, event emission, cross-contract calls, and assertion utilities.

### Context

The `Context` property exposes information about the current execution environment. It is accessible from any contract method.

| Property | Type | Description |
|---|---|---|
| `Sender` | `Address` | The address that invoked the current method. For top-level calls, this is the transaction signer. For cross-contract calls, this is the calling contract's address. |
| `Value` | `UInt256` | The amount of native currency (in smallest denomination) attached to the current call. Zero for view calls and calls without value transfer. |
| `BlockHeight` | `ulong` | The height of the block being produced. |
| `Timestamp` | `ulong` | The Unix timestamp (in seconds) of the block being produced. Deterministic across all validators for the same block. |
| `ContractAddress` | `Address` | The address of the currently executing contract. |

### EmitEvent

```csharp
EmitEvent<T>(T eventData)
```

Emits a typed event that is recorded in the transaction receipt. Events are indexed by nodes and can be queried by off-chain applications through the WebSocket or GraphQL APIs. Events are not written to contract storage and cannot be read by other contracts.

### Call (Cross-Contract)

```csharp
Call<TContract>(Address target, string method, params object[] args)
```

Invokes a method on another deployed contract. Cross-contract calls propagate the execution context and share the caller's gas budget. If the called contract reverts, its state changes are rolled back, but the calling contract continues executing unless it explicitly checks the result.

### RequireOwner

```csharp
RequireOwner()
```

Reverts the transaction if `Context.Sender` is not the contract owner (the address that deployed the contract). This is a convenience method equivalent to `Require(Context.Sender == owner, "Only owner")`.

### Require

```csharp
Require(bool condition, string message)
```

Validates a boolean condition. If the condition is `false`, the entire transaction reverts atomically: all state changes are rolled back, all emitted events are discarded, and the revert reason is stored in the transaction receipt. Gas consumed up to the revert point is still charged.

## Attributes

Attributes control how the Basalt runtime discovers and dispatches contract methods. All dispatch is source-generated at compile time.

| Attribute | Target | Description |
|---|---|---|
| `[Contract("Name")]` | Class | Marks a class as a deployable smart contract. The name parameter is the human-readable contract identifier. |
| `[ContractMethod]` | Method | Exposes a method as a callable entry point. State-modifying; consumes gas. |
| `[ContractView]` | Method | Marks a method as read-only. Cannot modify state, emit events, or make state-modifying cross-contract calls. No gas cost. |
| `[ContractEvent]` | Record | Marks a record type as an event that can be emitted during execution and indexed by nodes. |

### Attribute Rules

- A class annotated with `[Contract]` must not be abstract, generic, or nested.
- `[ContractMethod]` methods may return any serializable type or `void`.
- `[ContractView]` methods must not write to storage, call `EmitEvent`, or invoke state-modifying methods on other contracts.
- `[ContractEvent]` records must use serializable parameter types. Up to three parameters per event may be marked with `[Indexed]` for efficient off-chain filtering.

## Storage Primitives

Basalt provides three typed storage primitives that abstract over the underlying Merkle Patricia Trie. Each primitive handles key derivation, binary serialization, and proof generation automatically.

### StorageValue\<T\>

Stores a single typed value at a deterministic storage slot.

```csharp
private readonly StorageValue<UInt256> _totalSupply = new();
```

| Method | Description |
|---|---|
| `T Get()` | Returns the stored value, or `default(T)` if unset. |
| `void Set(T value)` | Writes the value to storage. |

### StorageMap\<TKey, TValue\>

Stores a key-value mapping. Conceptually equivalent to a dictionary but backed by on-chain storage.

```csharp
private readonly StorageMap<Address, UInt256> _balances = new();
```

| Method | Description |
|---|---|
| `TValue Get(TKey key)` | Returns the value for the given key, or `default(TValue)` if unset. |
| `void Set(TKey key, TValue value)` | Writes or overwrites the value for the given key. |
| `bool ContainsKey(TKey key)` | Returns `true` if the key exists in storage. |
| `void Remove(TKey key)` | Deletes the key-value pair from storage. |

### StorageList\<T\>

Stores an ordered, indexed list of elements with automatic length tracking.

```csharp
private readonly StorageList<Address> _holders = new();
```

| Method | Description |
|---|---|
| `T Get(uint index)` | Returns the element at the given index. Reverts if out of bounds. |
| `void Add(T value)` | Appends an element to the end of the list. |
| `uint Count()` | Returns the current number of elements. |

## Types

The SDK defines three core value types used throughout contract code.

### Address

A 20-byte value derived from the Keccak-256 hash of a public key. Represents an account or contract on the network.

```csharp
Address recipient = new Address("0x...");
```

### UInt256

A 256-bit unsigned integer used for all token amounts, balances, and numeric values that require large range. All arithmetic on `UInt256` should be performed inside a `checked` context or use the `SafeMath` helpers to prevent silent overflow.

```csharp
UInt256 amount = UInt256.Parse("1000000000000000000");
```

### Hash256

A 32-byte hash value. Used for transaction hashes, block hashes, and Merkle roots.

```csharp
Hash256 txHash = Hash256.FromBytes(hashBytes);
```

## Serialization

All types used in contract storage, method parameters, return values, and events must be serializable. Basalt uses **deterministic binary serialization** with source-generated serializers. There is no JSON, no custom formatters, and no reflection involved at any point in the serialization pipeline.

Built-in serializable types include: `byte`, `int`, `uint`, `long`, `ulong`, `UInt256`, `bool`, `string` (UTF-8, length-prefixed), `byte[]` (length-prefixed), `Address`, `Hash256`, and tuples of serializable types.

Custom types can implement `IBasaltSerializable` manually or use the `[BasaltSerializable]` source generator attribute for automatic compile-time implementation.
