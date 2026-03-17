---
sidebar_position: 1
title: Smart Contracts Overview
description: An introduction to Basalt smart contracts written in C# targeting .NET 9 with AOT-safe execution, source-generated dispatch, and compile-time safety analyzers.
---

# Smart Contracts Overview

Basalt smart contracts are written in standard C# targeting .NET 9. They compile to native code through Ahead-of-Time (AOT) compilation, producing binaries that execute at near-bare-metal speed with no JIT overhead and no separate bytecode format.

## Design Principles

Basalt contracts are **AOT-safe by construction**. The contract model prohibits reflection, dynamic types, and runtime code generation. All method dispatch is source-generated at compile time, ensuring that every code path is statically known and verifiable before deployment. Twelve Roslyn analyzers enforce these constraints automatically during the build.

## Contract Model

Every contract inherits from the `BasaltContract` base class and uses the `[ContractMethod]` attribute to expose callable entry points to the outside world.

```csharp
using Basalt.Sdk.Contracts;

[Contract("Counter")]
public class Counter : BasaltContract
{
    private readonly StorageValue<int> _count = new();

    [ContractMethod]
    public void Increment()
    {
        _count.Set(_count.Get() + 1);
    }

    [ContractView]
    public int GetCount() => _count.Get();
}
```

### Storage Primitives

Contracts persist state between calls using three typed storage primitives. These abstractions manage key derivation, serialization, and Merkle proof generation automatically.

| Primitive | Description |
|---|---|
| `StorageValue<T>` | Stores a single typed value. Read with `Get()`, write with `Set()`. |
| `StorageMap<TKey, TValue>` | Key-value mapping. Supports `Get`, `Set`, `ContainsKey`, and `Remove`. |
| `StorageList<T>` | Append-only indexed list. Supports `Add`, `Get`, and `Count`. |

### Transaction Context

Every contract method can access the current execution context through the `Context` property:

| Property | Type | Description |
|---|---|---|
| `Sender` | `Address` | The address that invoked the current method. |
| `Value` | `UInt256` | Native currency attached to the call. |
| `BlockHeight` | `ulong` | Height of the block being produced. |
| `Timestamp` | `ulong` | Unix timestamp of the current block. |
| `ContractAddress` | `Address` | Address of the currently executing contract. |

### Events

Contracts emit events to record observable side effects in transaction receipts. Events are not written to contract storage but are indexed by nodes and queryable by off-chain applications.

```csharp
EmitEvent(new TransferEvent(from, to, amount));
```

### Cross-Contract Calls

Contracts can invoke methods on other deployed contracts. Cross-contract calls share the caller's gas budget and propagate the execution context.

```csharp
Call<ITokenContract>(tokenAddress, "Transfer", recipient, amount);
```

### Compliance Hooks

Contracts can integrate with the on-chain compliance engine to enforce transfer policies, KYC verification, sanctions screening, and geographic restrictions. Every token standard includes built-in compliance hook points that execute before transfers are finalized.

### Compile-Time Safety

The `Basalt.Sdk.Analyzers` package ships 12 Roslyn analyzers that run on every build:

- **BST001/BST002/BST008** (Error): Block reflection, dynamic types, and AOT-incompatible patterns. These prevent compilation.
- **BST003** (Warning): Flag non-deterministic APIs such as `DateTime.Now`, `Random`, and `Guid.NewGuid`.
- **BST004** (Warning): Detect reentrancy risk from state changes after cross-contract calls.
- **BST005** (Warning): Flag unchecked arithmetic on `UInt256`.
- **BST006** (Warning): Warn on raw storage byte manipulation.
- **BST007** (Info): Estimate gas cost of contract methods.
- **BST009-BST012** (Warning): Policy hook safety checks including unchecked cross-contract returns, state-before-policy writes, non-deterministic collection iteration, and missing policy enforcement.

See the [Analyzers](./analyzers.md) reference for full details on each diagnostic.

## Contract Lifecycle

The lifecycle of a Basalt smart contract follows four stages:

1. **Deploy.** Submit the compiled contract to the network. The contract receives a unique address derived from the deployer's address and a nonce.
2. **Initialize.** The constructor method (if defined) executes exactly once at deployment time to set initial state.
3. **Call.** External accounts and other contracts invoke entry points through signed transactions. State-modifying calls consume gas; read-only view calls do not.
4. **Persist.** All state changes from a successful call are committed to the Merkle Patricia Trie and included in the next block. State is persisted between calls and survives across blocks.

If any call reverts (via `Require` failure or an unhandled exception), all state changes from that call are rolled back atomically. Gas consumed up to the revert point is still charged.

## Next Steps

- [Getting Started](./getting-started.md) -- Write and deploy your first contract.
- [SDK Reference](./sdk-reference.md) -- Full reference for the base class, attributes, storage primitives, and types.
- [Token Standards](./token-standards.md) -- Explore the BST token standards and system contracts.
- [Policy Hooks](./policy-hooks.md) -- Transfer enforcement policies for regulated tokens.
- [Analyzers](./analyzers.md) -- Understand the 12 compile-time safety checks.
- [Testing](./testing.md) -- Test contracts with `BasaltTestHost`.
