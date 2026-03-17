---
sidebar_position: 2
title: Getting Started
description: Step-by-step guide to writing, testing, and deploying your first Basalt smart contract -- a BST-20 fungible token in C#.
---

# Getting Started

This guide walks through creating a BST-20 fungible token contract from scratch, testing it locally with `BasaltTestHost`, and deploying it to a devnet. By the end, you will have a working token with mint, transfer, and balance-query functionality.

## Prerequisites

- **.NET 9 SDK** (version 9.0 or later). Download from [dot.net](https://dot.net/download).
- **Basalt CLI**. Included in the Basalt repository under `tools/Basalt.Cli`.

Verify your .NET installation:

```bash
dotnet --version
# Expected: 9.0.x or later
```

## Scaffold a New Project

The Basalt CLI generates a contract project with the correct NuGet references, build configuration, and directory structure:

```bash
dotnet run --project tools/Basalt.Cli -- init MyToken
```

This creates a `MyToken/` directory with a `.csproj` that references `Basalt.Sdk.Contracts` and `Basalt.Sdk.Analyzers`, plus a companion test project referencing `Basalt.Sdk.Testing` and xUnit.

## Write the Contract

A BST-20 token is the simplest starting point. Create a contract that inherits from `BST20Token`, the SDK's built-in fungible token base class:

```csharp
using Basalt.Sdk.Contracts;

[Contract("MyToken")]
public class MyToken : BST20Token
{
    public MyToken() : base("My Token", "MTK", 18) { }

    [ContractMethod]
    public void Mint(Address to, UInt256 amount)
    {
        RequireOwner();
        _Mint(to, amount);
    }
}
```

This contract:

- Inherits all BST-20 functionality (transfer, approve, transferFrom, balanceOf, totalSupply, allowance) from the `BST20Token` base class.
- Defines the token name as "My Token", the symbol as "MTK", and 18 decimal places.
- Exposes a `Mint` method restricted to the contract owner that creates new tokens and assigns them to the target address.

## Build

Compile the contract using the standard .NET build command:

```bash
dotnet build
```

The 12 Roslyn analyzers from `Basalt.Sdk.Analyzers` run automatically during the build. If the contract contains reflection usage, dynamic types, non-deterministic APIs, or other prohibited patterns, the build will fail with a descriptive error pointing to the exact line and violation.

A clean build with zero warnings and zero errors means the contract is AOT-safe, deterministic, and ready for testing.

## Test with BasaltTestHost

Write tests using xUnit and `BasaltTestHost`, the in-process blockchain emulator. No running node or network connection is required.

```csharp
[Fact]
public void Mint_IncreasesBalance()
{
    var host = new BasaltTestHost();
    var token = host.Deploy<MyToken>(owner);
    host.Call(token, owner, t => t.Mint(alice, 1000));
    Assert.Equal(1000, host.Query(token, t => t.BalanceOf(alice)));
}
```

The test host provides a complete execution environment:

- **`host.Deploy<T>(deployer)`** deploys the contract and returns a handle.
- **`host.Call(contract, caller, c => c.Method(args))`** executes a state-modifying method as the specified caller.
- **`host.Query(contract, c => c.ReadMethod(args))`** executes a read-only view method.
- **`host.AdvanceBlock()`** and **`host.AdvanceBlocks(n)`** advance the simulated block height.
- **`host.SetTimestamp(DateTimeOffset)`** sets the simulated block timestamp for testing time-dependent logic.
- **`host.CreateAddress()`** generates test addresses.

Test reverts by asserting that invalid operations throw `ContractRevertException`:

```csharp
[Fact]
public void Mint_NonOwner_Reverts()
{
    var host = new BasaltTestHost();
    var token = host.Deploy<MyToken>(owner);
    Assert.Throws<ContractRevertException>(() =>
        host.Call(token, alice, t => t.Mint(alice, 1000)));
}
```

Run all tests:

```bash
dotnet test
```

## Deploy to Devnet

Once the contract builds cleanly and all tests pass, deploy it to a running devnet using the Basalt CLI or the REST API:

```bash
dotnet run --project tools/Basalt.Cli -- deploy \
  --contract ./bin/Release/net9.0/MyToken.dll \
  --private-key <path-to-keyfile> \
  --node http://localhost:5100
```

The CLI submits a deployment transaction, waits for block inclusion, and prints the resulting contract address.

## Full IDE Debugging

Basalt contracts support step-through debugging in Visual Studio and JetBrains Rider. Set breakpoints inside contract methods, inspect storage state, and step through execution exactly as you would with any other .NET application. The `BasaltTestHost` test harness runs in-process, so the standard debugger attaches without additional configuration.

## Next Steps

- [SDK Reference](./sdk-reference.md) -- Full reference for the base class, attributes, storage primitives, and types.
- [Token Standards](./token-standards.md) -- Explore all seven BST token standards and eight system contracts.
- [Policy Hooks](./policy-hooks.md) -- Add transfer enforcement policies to your token.
- [Analyzers](./analyzers.md) -- Understand the compile-time safety checks.
- [Testing](./testing.md) -- Advanced testing techniques with `BasaltTestHost`.
