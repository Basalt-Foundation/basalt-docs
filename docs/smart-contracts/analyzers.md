---
sidebar_position: 6
title: Roslyn Analyzers
description: Reference for the 12 Roslyn analyzers in Basalt.Sdk.Analyzers that enforce safety, determinism, and AOT compatibility at compile time.
---

# Roslyn Analyzers

The `Basalt.Sdk.Analyzers` package provides 12 Roslyn diagnostic analyzers that enforce safety, determinism, and AOT compatibility at compile time. These analyzers run automatically during every `dotnet build` and surface violations as errors, warnings, or informational messages directly in your IDE.

## Installation

Add the analyzer package to your contract project. If you scaffolded the project using the Basalt CLI, this reference is already present. The analyzer package is also included automatically when referencing `Basalt.Sdk.Contracts`.

```xml
<ItemGroup>
  <PackageReference Include="Basalt.Sdk.Analyzers" />
</ItemGroup>
```

No additional configuration is required. The analyzers are loaded by the .NET build system and run on every compilation.

## Analyzer Reference

| ID | Name | Category | Severity | Description |
|---|---|---|---|---|
| BST001 | No Reflection | Compatibility | Error | Blocks `System.Reflection` usage. Reflection is incompatible with AOT compilation and introduces non-deterministic behavior. |
| BST002 | No Dynamic | Compatibility | Error | Blocks the `dynamic` keyword and `ExpandoObject`. Dynamic dispatch requires the DLR, which depends on runtime code generation unavailable in AOT mode. |
| BST003 | Non-Deterministic API | Determinism | Warning | Flags `DateTime.Now`, `Random`, `Guid.NewGuid`, floating-point types, and other APIs that produce non-deterministic results across validators. |
| BST004 | Reentrancy Risk | Safety | Warning | Detects state changes after cross-contract calls without an intervening reentrancy guard. Enforces the checks-effects-interactions pattern. |
| BST005 | Unchecked Arithmetic | Safety | Warning | Flags arithmetic on `UInt256`/`Int256` outside a `checked` context or without `SafeMath` helpers. |
| BST006 | Raw Storage Access | Safety | Warning | Warns on direct storage byte manipulation that bypasses the typed `StorageValue`, `StorageMap`, and `StorageList` wrappers. |
| BST007 | Gas Estimate | Performance | Info | Estimates the gas cost of contract methods based on static analysis of storage operations, arithmetic complexity, and cross-contract calls. |
| BST008 | AOT Incompatible | Compatibility | Error | Catches patterns incompatible with .NET Native AOT, including `MakeGenericType`, `Expression.Compile`, `Reflection.Emit`, and dynamic assembly loading. |
| BST009 | Unchecked Cross-Contract Return | Safety | Warning | Flags cross-contract call results that are not checked for success or failure. Ignoring a failed cross-contract call can lead to silent state corruption. |
| BST010 | State Before Policy | Safety | Warning | Warns if contract state is modified before policy checks execute. State written before `PolicyEnforcer.EnforceAll` may not be properly reverted if the policy denies the transfer. |
| BST011 | Non-Deterministic Collection | Determinism | Warning | Flags iteration over `HashSet<T>` and `Dictionary<TKey, TValue>`, which have non-deterministic enumeration order. Use `SortedDictionary`, `SortedSet`, or `StorageMap` instead. |
| BST012 | Missing Policy Enforcement | Safety | Warning | Warns if a token contract (inheriting from `BST20Token`, `BST721Token`, or `BST1155Token`) does not include policy enforcement in its transfer path. |

## Severity Levels

**Error** (BST001, BST002, BST008): These diagnostics prevent compilation. Code containing reflection, dynamic types, or AOT-incompatible patterns will not build. These rules exist to prevent deployment failures and consensus-breaking bugs.

**Warning** (BST003, BST004, BST005, BST006, BST009, BST010, BST011, BST012): These diagnostics flag potential issues but allow compilation to proceed. Each warning should be reviewed and either fixed or suppressed with documented justification.

**Info** (BST007): Informational diagnostics that do not indicate a problem. The gas estimation diagnostic helps developers right-size gas limits and identify unexpectedly expensive operations.

## Suppressing Diagnostics

In rare cases, you may need to suppress a diagnostic. This should be done sparingly and with clear justification.

### Using #pragma

Suppress a specific diagnostic for a block of code:

```csharp
#pragma warning disable BST005 // Overflow is handled by the caller
var result = a + b;
#pragma warning restore BST005
```

### Using SuppressMessage

Suppress a diagnostic for an entire method:

```csharp
[SuppressMessage("Basalt", "BST005", Justification = "Overflow checked at call site")]
[ContractMethod]
public UInt256 UncheckedAdd(UInt256 a, UInt256 b)
{
    return a + b;
}
```

### Using .editorconfig

Change the severity of a diagnostic across the entire project:

```ini
# .editorconfig
[*.cs]
dotnet_diagnostic.BST007.severity = none    # Disable gas estimation messages
dotnet_diagnostic.BST005.severity = error   # Promote overflow warnings to errors
```

Suppressing error-level diagnostics (BST001, BST002, BST008) is strongly discouraged. If a suppression is necessary, document the justification thoroughly in a code comment.
