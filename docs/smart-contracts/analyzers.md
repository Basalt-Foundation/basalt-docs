---
title: Roslyn Analyzers
description: Reference for Basalt.Sdk.Analyzers, the compile-time safety checks enforced on all Basalt smart contracts.
sidebar_position: 5
---

# Roslyn Analyzers

The `Basalt.Sdk.Analyzers` package provides a set of Roslyn diagnostic analyzers that enforce safety, determinism, and AOT compatibility rules at compile time. These analyzers run automatically during every build and surface violations as errors, warnings, or informational messages directly in your IDE and CI pipeline.

## Why Compile-Time Analysis?

Smart contract bugs are uniquely expensive. Once deployed, contract code is immutable and operates on real assets. Runtime errors can result in locked funds, incorrect state transitions, or exploitable vulnerabilities. The Basalt analyzers shift as many of these failure modes as possible to compile time, where they can be caught and fixed before deployment.

The analyzers enforce three categories of rules:

1. **Determinism.** Every validator must produce identical results when executing the same transaction. Non-deterministic operations (random number generation, system time, floating-point arithmetic) are banned.
2. **AOT compatibility.** .NET Native AOT does not support all CLR features. Operations that require runtime code generation (reflection, dynamic dispatch, `MakeGenericType`) will fail at runtime in AOT mode and are flagged at compile time.
3. **Security best practices.** Common smart contract pitfalls (reentrancy, unchecked arithmetic, raw storage access) are detected and flagged.

## Installation

Add the analyzer package to your contract project. If you scaffolded the project using the Basalt CLI, this reference is already present.

```xml
<ItemGroup>
  <PackageReference Include="Basalt.Sdk.Analyzers" />
</ItemGroup>
```

No additional configuration is required. The analyzers are loaded automatically by the .NET build system and run on every compilation.

## Analyzer Reference

### BST001: No Reflection (Error)

**Severity:** Error (build fails)

Detects usage of the `System.Reflection` namespace, `typeof()` on non-constant types, and any API that inspects or manipulates type metadata at runtime. Reflection is incompatible with AOT compilation and introduces non-deterministic behavior.

**Triggers on:**

- `typeof(T)` where `T` is a generic type parameter
- `Type.GetType()`, `Assembly.GetTypes()`
- `MethodInfo.Invoke()`, `PropertyInfo.GetValue()`
- `Activator.CreateInstance()`
- Any member access on types in the `System.Reflection` namespace

**Example violation:**

```csharp
[BasaltEntrypoint]
public void BadMethod()
{
    // BST001: Usage of System.Reflection is not allowed in contracts
    var type = typeof(TokenContract);
    var methods = type.GetMethods();
}
```

**Fix:** Use direct method calls, generics with concrete type parameters, or source-generated serialization instead of reflection-based approaches.

---

### BST002: No Dynamic (Error)

**Severity:** Error (build fails)

Blocks the use of the `dynamic` keyword and `System.Dynamic.ExpandoObject`. Dynamic dispatch requires the DLR (Dynamic Language Runtime), which depends on runtime code generation that is unavailable in AOT mode.

**Triggers on:**

- Variable declarations with `dynamic` type
- Method parameters or return types declared as `dynamic`
- Usage of `ExpandoObject` or `DynamicObject`

**Example violation:**

```csharp
[BasaltEntrypoint]
public void BadMethod()
{
    // BST002: Dynamic keyword is not allowed in contracts
    dynamic value = GetSomeValue();
    value.Transfer();
}
```

**Fix:** Use concrete types or interfaces. If the shape of the data is not known at compile time, define an explicit data structure or use `IBasaltSerializable`.

---

### BST003: Determinism (Error)

**Severity:** Error (build fails)

Flags operations that produce non-deterministic results. If different validators produce different outputs for the same input, consensus will fail and the network will halt.

**Triggers on:**

- `DateTime.Now`, `DateTime.UtcNow`, `DateTimeOffset.Now`, `DateTimeOffset.UtcNow`
- `System.Random` constructors and methods
- `Guid.NewGuid()`
- `Environment.TickCount`, `Stopwatch` usage
- Floating-point types: `float`, `double`, `decimal` (IEEE 754 operations can produce platform-dependent results)
- `Task.Delay()`, `Thread.Sleep()`, and any threading/async primitives
- `Dictionary<K,V>` iteration order (use `SortedDictionary` or `StorageMap` instead)

**Example violation:**

```csharp
[BasaltEntrypoint]
public void BadMethod()
{
    // BST003: DateTime.UtcNow is non-deterministic; use Context.BlockTimestamp
    var now = DateTime.UtcNow;

    // BST003: System.Random is non-deterministic
    var rng = new Random();
    var value = rng.Next();

    // BST003: Floating-point arithmetic is non-deterministic across platforms
    double rate = 0.05;
}
```

**Fix:** Use `Context.BlockTimestamp` for time, derive pseudo-randomness from block hashes, and use `UInt256`/`Int256` for all arithmetic.

---

### BST004: Reentrancy Guard (Warning)

**Severity:** Warning

Detects patterns where contract state is read after a cross-contract call without an intervening state write or explicit reentrancy guard. This is the smart contract equivalent of the "check-effects-interactions" pattern violation.

**Triggers on:**

- Storage reads (`.Get()`) that occur after a `call_contract` invocation within the same method, where the read value was not refreshed by a preceding write.

**Example violation:**

```csharp
[BasaltEntrypoint]
public void Withdraw(UInt256 amount)
{
    var balance = _balances.Get(Context.Caller);
    Require(balance >= amount, "Insufficient balance");

    // Cross-contract call -- the target contract could call back into this contract
    call_contract(targetAddress, callData, 50_000);

    // BST004: State read after cross-contract call without reentrancy guard
    _balances.Set(Context.Caller, _balances.Get(Context.Caller) - amount);
}
```

**Fix:** Follow the checks-effects-interactions pattern. Update state before making external calls:

```csharp
[BasaltEntrypoint]
public void Withdraw(UInt256 amount)
{
    var balance = _balances.Get(Context.Caller);
    Require(balance >= amount, "Insufficient balance");

    // Effect: update state first
    _balances.Set(Context.Caller, balance - amount);

    // Interaction: external call after state is updated
    call_contract(targetAddress, callData, 50_000);
}
```

---

### BST005: Overflow Protection (Warning)

**Severity:** Warning

Flags arithmetic operations on `UInt256` and `Int256` types that are not wrapped in a `checked` context. While C# 9+ defaults to checked arithmetic for built-in integer types, the `UInt256` and `Int256` types are custom structs that do not inherit this behavior.

**Triggers on:**

- Addition, subtraction, multiplication, and division on `UInt256`/`Int256` outside a `checked` block
- Implicit conversions that could lose precision

**Example violation:**

```csharp
[BasaltEntrypoint]
public void BadMath(UInt256 a, UInt256 b)
{
    // BST005: Arithmetic on UInt256 without overflow protection
    var result = a * b;
}
```

**Fix:** Wrap arithmetic in a `checked` block, or use the `SafeMath` helper methods:

```csharp
[BasaltEntrypoint]
public void SafeMathExample(UInt256 a, UInt256 b)
{
    // Option 1: checked block
    var result = checked(a * b);

    // Option 2: SafeMath helpers
    var result2 = SafeMath.Mul(a, b);
}
```

---

### BST006: Storage Access (Warning)

**Severity:** Warning

Detects direct access to the raw storage API, bypassing the typed storage wrappers (`StorageValue`, `StorageMap`, `StorageList`, `StorageSet`). Raw storage access is error-prone because it requires manual key derivation and serialization.

**Triggers on:**

- Calls to `RawStorage.Get()`, `RawStorage.Set()`, `RawStorage.Delete()`
- Manual BLAKE3 key construction for storage operations

**Example violation:**

```csharp
[BasaltEntrypoint]
public void BadStorage()
{
    // BST006: Raw storage access detected; use typed StorageMap instead
    var key = Blake3Hasher.Hash(Context.ContractAddress.ToArray().Concat(slot).ToArray());
    RawStorage.Set(key, value);
}
```

**Fix:** Use the typed storage primitives, which handle key derivation and serialization automatically:

```csharp
private readonly StorageMap<Address, UInt256> _balances = new();

[BasaltEntrypoint]
public void GoodStorage(Address account, UInt256 value)
{
    _balances.Set(account, value);
}
```

---

### BST007: Gas Estimation (Info)

**Severity:** Info (informational, does not affect build)

Estimates the gas cost of entrypoint methods based on static analysis of storage operations, arithmetic complexity, and cross-contract calls. The estimate is displayed as an informational diagnostic in the IDE.

**What it reports:**

- Estimated minimum gas cost (best-case execution path)
- Estimated maximum gas cost (worst-case execution path)
- Breakdown by category: storage reads, storage writes, computation, cross-contract calls

This diagnostic helps developers right-size gas limits for transactions and identify unexpectedly expensive operations.

**Example output:**

```
BST007: Method 'Transfer' estimated gas: min=21,000 max=45,000
  Storage reads: 2 (10,000 gas)
  Storage writes: 2 (20,000 gas)
  Events: 1 (5,000 gas)
  Computation: ~10,000 gas
```

---

### BST008: AOT Compatibility (Error)

**Severity:** Error (build fails)

Validates that all code within the contract is compatible with .NET Native AOT compilation. AOT compilation does not support runtime code generation, and certain reflection-adjacent APIs that are not caught by BST001 are flagged here.

**Triggers on:**

- `Type.MakeGenericType()` and `MethodInfo.MakeGenericMethod()` (runtime generic instantiation)
- `System.Linq.Expressions.Expression.Compile()` (runtime lambda compilation)
- `System.Reflection.Emit` namespace usage (IL generation)
- `Marshal.GetDelegateForFunctionPointer()` with non-blittable types
- `Assembly.Load()` and `Assembly.LoadFrom()` (dynamic assembly loading)

**Example violation:**

```csharp
[BasaltEntrypoint]
public void BadMethod()
{
    // BST008: MakeGenericType is not supported in AOT mode
    var listType = typeof(List<>).MakeGenericType(someRuntimeType);
}
```

**Fix:** Use concrete generic instantiations that are known at compile time. If a type must be determined dynamically, restructure the code to use interfaces or discriminated unions.

## Summary Table

| ID | Severity | Rule | Description |
|---|---|---|---|
| BST001 | Error | No Reflection | Blocks `System.Reflection`, `typeof()` on non-constant types |
| BST002 | Error | No Dynamic | Blocks `dynamic` keyword, `ExpandoObject` |
| BST003 | Error | Determinism | Flags `DateTime.Now`, `Random`, `Guid.NewGuid`, floating-point |
| BST004 | Warning | Reentrancy Guard | Detects state reads after cross-contract calls |
| BST005 | Warning | Overflow Protection | Flags unchecked arithmetic on `UInt256`/`Int256` |
| BST006 | Warning | Storage Access | Detects raw storage access bypassing typed wrappers |
| BST007 | Info | Gas Estimation | Estimates gas cost of entrypoint methods |
| BST008 | Error | AOT Compatibility | Validates ILC compatibility (no `MakeGenericType`, etc.) |

## Suppressing Diagnostics

In rare cases, you may need to suppress a diagnostic. This should be done sparingly and with clear justification.

### Using `#pragma`

Suppress a specific diagnostic for a block of code:

```csharp
#pragma warning disable BST005 // Overflow is handled by the caller
var result = a + b;
#pragma warning restore BST005
```

### Using `SuppressMessage`

Suppress a diagnostic for an entire method:

```csharp
using System.Diagnostics.CodeAnalysis;

[SuppressMessage("Basalt", "BST005", Justification = "Overflow checked at call site")]
[BasaltEntrypoint]
public UInt256 UncheckedAdd(UInt256 a, UInt256 b)
{
    return a + b;
}
```

### Using `.editorconfig`

Suppress or change the severity of a diagnostic across the entire project:

```ini
# .editorconfig
[*.cs]
dotnet_diagnostic.BST007.severity = none    # Disable gas estimation messages
dotnet_diagnostic.BST005.severity = error   # Promote overflow warnings to errors
```

Suppressing error-level diagnostics (BST001, BST002, BST003, BST008) is strongly discouraged. These rules exist to prevent deployment failures and consensus-breaking bugs. If a suppression is necessary, document the justification thoroughly in a code comment.
