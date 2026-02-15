---
title: SDK Reference
description: Complete reference for the Basalt.Sdk.Contracts package, including attributes, storage primitives, context API, and cross-contract calls.
sidebar_position: 3
---

# SDK Reference

This document provides a complete reference for the `Basalt.Sdk.Contracts` package. It covers contract attributes, storage primitives, the execution context, cross-contract calls, event emission, assertions, and serialization.

## Contract Attributes

Attributes control how the Basalt runtime discovers and invokes contract methods. They are applied to classes, methods, and record types.

| Attribute | Target | Description |
|---|---|---|
| `[BasaltContract]` | Class | Marks a class as a deployable smart contract. Exactly one per assembly. |
| `[BasaltConstructor]` | Method | Initialization method called once at deployment. At most one per contract. |
| `[BasaltEntrypoint]` | Method | State-modifying method callable via signed transactions. Consumes gas. |
| `[BasaltView]` | Method | Read-only method callable without a transaction. No gas cost. Cannot modify state. |
| `[BasaltEvent]` | Record | Defines a typed event that can be emitted during execution and indexed by nodes. |
| `[Indexed]` | Parameter | Marks an event parameter for indexing. Up to three indexed parameters per event. |

### Attribute Rules

- A class annotated with `[BasaltContract]` must not be abstract, generic, or nested inside another class.
- `[BasaltConstructor]` methods must return `void`. Parameters are supplied at deployment time.
- `[BasaltEntrypoint]` methods may return any serializable type or `void`.
- `[BasaltView]` methods must not call `Emit()`, write to storage, or invoke state-modifying methods on other contracts.
- `[BasaltEvent]` records must be nested inside the contract class. All parameters must be serializable types.

## Storage Primitives

Basalt provides four typed storage primitives that abstract over the underlying Merkle Patricia Trie. Each primitive manages its own key derivation, serialization, and proof generation.

### StorageValue\<T\>

Stores a single typed value at a deterministic storage slot.

```csharp
private readonly StorageValue<UInt256> _totalSupply = new();
```

**Key derivation:** `BLAKE3(contractAddress + slotIndex)`

| Method | Description |
|---|---|
| `T Get()` | Returns the stored value, or `default(T)` if unset. |
| `void Set(T value)` | Writes the value to storage. |
| `bool Exists()` | Returns `true` if the slot has been written to. |
| `void Delete()` | Removes the value from storage. |

### StorageMap\<K, V\>

Stores a mapping from keys of type `K` to values of type `V`. Conceptually equivalent to a `Dictionary<K, V>` but backed by on-chain storage.

```csharp
private readonly StorageMap<Address, UInt256> _balances = new();
```

**Key derivation:** `BLAKE3(contractAddress + slotIndex + key)`

| Method | Description |
|---|---|
| `V Get(K key)` | Returns the value for the given key, or `default(V)` if unset. |
| `void Set(K key, V value)` | Writes or overwrites the value for the given key. |
| `bool ContainsKey(K key)` | Returns `true` if the key has been written to. |
| `void Delete(K key)` | Removes the key-value pair from storage. |

### StorageList\<T\>

Stores an ordered, indexed list of elements with automatic length tracking.

```csharp
private readonly StorageList<Address> _holders = new();
```

**Key derivation:**
- Length: `BLAKE3(contractAddress + slotIndex + "length")`
- Element at index `i`: `BLAKE3(contractAddress + slotIndex + i)`

| Method | Description |
|---|---|
| `T Get(uint index)` | Returns the element at the given index. Reverts if out of bounds. |
| `void Push(T value)` | Appends an element to the end of the list. |
| `T Pop()` | Removes and returns the last element. Reverts if empty. |
| `uint Length()` | Returns the current number of elements. |
| `void Set(uint index, T value)` | Overwrites the element at the given index. |

### StorageSet\<T\>

Stores an unordered set of unique elements with constant-time membership checks.

```csharp
private readonly StorageSet<Address> _approvedOperators = new();
```

**Key derivation:** `BLAKE3(contractAddress + slotIndex + element)`

| Method | Description |
|---|---|
| `bool Contains(T element)` | Returns `true` if the element is in the set. |
| `bool Add(T element)` | Adds the element. Returns `false` if already present. |
| `bool Remove(T element)` | Removes the element. Returns `false` if not present. |
| `uint Count()` | Returns the number of elements in the set. |

### Storage Slot Assignment

Storage slots are assigned automatically based on the declaration order of storage fields in the contract class. The first declared field receives slot index `0`, the second receives `1`, and so on. Reordering storage field declarations in an upgraded contract will break storage compatibility.

## Context Object

The `Context` object provides information about the current execution environment. It is accessible from any contract method.

| Property | Type | Description |
|---|---|---|
| `Context.Caller` | `Address` | The address of the account or contract that invoked the current method. For top-level calls, this is the transaction sender. For cross-contract calls, this is the calling contract's address. |
| `Context.BlockTimestamp` | `ulong` | The Unix timestamp (in seconds) of the block being produced. Deterministic across all validators for the same block. |
| `Context.BlockHeight` | `ulong` | The height of the block being produced. |
| `Context.Value` | `UInt256` | The amount of native currency (in smallest denomination) attached to the current call. Zero for view calls and calls that do not transfer value. |
| `Context.GasRemaining` | `ulong` | The amount of gas remaining for the current execution. Useful for gas-aware logic, but avoid writing contracts that depend on specific gas values. |
| `Context.ContractAddress` | `Address` | The address of the currently executing contract. |
| `Context.Origin` | `Address` | The address of the original external account that signed the transaction. Unlike `Caller`, this does not change during cross-contract calls. |

### Example

```csharp
[BasaltEntrypoint]
public void Deposit()
{
    Require(Context.Value > UInt256.Zero, "Must send value");
    _deposits.Set(Context.Caller, _deposits.Get(Context.Caller) + Context.Value);
    _lastDepositBlock.Set(Context.Caller, Context.BlockHeight);
}
```

## Cross-Contract Calls

Contracts can invoke methods on other deployed contracts using `call_contract`. Cross-contract calls propagate the execution context and share the caller's gas budget.

```csharp
[BasaltEntrypoint]
public void SwapAndTransfer(Address tokenContract, Address recipient, UInt256 amount)
{
    // Encode the call data for the target contract's Transfer method
    var callData = Codec.Encode("Transfer", recipient, amount);

    // Invoke the target contract with a gas limit
    var result = call_contract(tokenContract, callData, gasLimit: 100_000);

    Require(result.Success, "Token transfer failed");
}
```

### Parameters

| Parameter | Type | Description |
|---|---|---|
| `address` | `Address` | The address of the target contract. |
| `data` | `byte[]` | ABI-encoded call data (method selector + arguments). |
| `gasLimit` | `ulong` | Maximum gas the called contract may consume. Must not exceed the caller's remaining gas. |

### Return Value

`call_contract` returns a `CallResult` with the following properties:

| Property | Type | Description |
|---|---|---|
| `Success` | `bool` | `true` if the call completed without reverting. |
| `ReturnData` | `byte[]` | The serialized return value from the called method. |
| `GasUsed` | `ulong` | The amount of gas consumed by the call. |

If `Success` is `false`, any state changes made by the called contract are reverted, but the calling contract continues executing (unless it explicitly reverts via `Require`).

## Event Emission

Events are emitted using the `Emit()` method, which accepts any record type annotated with `[BasaltEvent]`.

```csharp
[BasaltEvent]
public record Transfer([Indexed] Address From, [Indexed] Address To, UInt256 Amount);

[BasaltEvent]
public record Approval([Indexed] Address Owner, [Indexed] Address Spender, UInt256 Amount);

[BasaltEntrypoint]
public bool Approve(Address spender, UInt256 amount)
{
    _allowances.Set((Context.Caller, spender), amount);
    Emit(new Approval(Context.Caller, spender, amount));
    return true;
}
```

Events are included in the transaction receipt and indexed by the node. Off-chain applications can subscribe to events through the WebSocket API or query historical events through the GraphQL API.

### Indexed Parameters

Parameters annotated with `[Indexed]` are stored in a bloom filter and a dedicated index, enabling efficient filtering. A maximum of three indexed parameters per event is supported. Non-indexed parameters are stored in the event data payload and must be decoded by the consumer.

## Assertions with Require

The `Require()` method validates a boolean condition and reverts the entire transaction if the condition is `false`. The revert reason string is included in the transaction receipt.

```csharp
Require(condition, "Human-readable revert reason");
```

When `Require()` triggers a revert:

1. All state changes made during the current transaction are rolled back.
2. All events emitted during the current transaction are discarded.
3. Gas consumed up to the revert point is still charged.
4. The revert reason is stored in the transaction receipt.

### Examples

```csharp
// Check balance before transfer
Require(_balances.Get(sender) >= amount, "Insufficient balance");

// Enforce access control
Require(Context.Caller == _owner.Get(), "Only owner");

// Validate input
Require(to != Address.Zero, "Cannot transfer to zero address");
Require(amount > UInt256.Zero, "Amount must be positive");
```

## Serialization

All types used in contract storage, method parameters, method return values, and events must be serializable. Basalt uses source-generated serialization through `BasaltCodec` to ensure AOT compatibility. No reflection is involved.

### Built-in Serializable Types

The following types are serializable out of the box:

- Numeric types: `byte`, `sbyte`, `short`, `ushort`, `int`, `uint`, `long`, `ulong`, `UInt256`, `Int256`
- `bool`
- `string` (UTF-8 encoded, length-prefixed)
- `byte[]` (length-prefixed)
- `Address` (20 bytes, fixed-length)
- `Hash256` (32 bytes, fixed-length)
- Tuples of serializable types: `(T1, T2)`, `(T1, T2, T3)`, etc.

### Custom Serializable Types

Custom types must implement the `IBasaltSerializable` interface. The recommended approach is to use the `[BasaltSerializable]` source generator attribute, which generates the implementation at compile time:

```csharp
[BasaltSerializable]
public partial struct TokenMetadata
{
    public string Name { get; set; }
    public string Symbol { get; set; }
    public byte Decimals { get; set; }
}
```

The source generator produces `Serialize` and `Deserialize` methods that are fully AOT-compatible. Manual implementation is also supported for advanced scenarios:

```csharp
public struct TokenMetadata : IBasaltSerializable
{
    public string Name;
    public string Symbol;
    public byte Decimals;

    public void Serialize(ref BasaltWriter writer)
    {
        writer.WriteString(Name);
        writer.WriteString(Symbol);
        writer.WriteByte(Decimals);
    }

    public static TokenMetadata Deserialize(ref BasaltReader reader)
    {
        return new TokenMetadata
        {
            Name = reader.ReadString(),
            Symbol = reader.ReadString(),
            Decimals = reader.ReadByte()
        };
    }
}
```

Note that `BasaltWriter` and `BasaltReader` are `ref struct` types and cannot be captured in lambdas or used in async methods.
