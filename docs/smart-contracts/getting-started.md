---
title: Getting Started
description: Write, test, and deploy your first Basalt smart contract in C#.
sidebar_position: 2
---

# Getting Started

This guide walks through creating a complete BST-20 fungible token contract, testing it locally, and deploying it to the network. By the end, you will have a working token with mint, transfer, and balance-query functionality.

## Prerequisites

Before you begin, ensure the following tools are installed:

- **.NET 9 SDK** (version 9.0 or later). Download from [dot.net](https://dot.net/download).
- **Basalt CLI**. The CLI is included in the Basalt repository under `tools/Basalt.Cli`.

Verify your .NET installation:

```bash
dotnet --version
# Expected: 9.0.x or later
```

## Scaffold a New Contract Project

The Basalt CLI provides an `init` command that generates a contract project with the correct NuGet references, build configuration, and directory structure:

```bash
dotnet run --project tools/Basalt.Cli -- init MyToken
```

This creates a `MyToken/` directory containing:

```
MyToken/
  MyToken.csproj          # Project file with Basalt.Sdk.Contracts reference
  TokenContract.cs        # Starter contract template
  MyToken.Tests/
    MyToken.Tests.csproj  # Test project with xUnit + Basalt.Sdk.Testing
    TokenTests.cs         # Starter test file
```

The generated `.csproj` already references the required SDK packages:

```xml
<ItemGroup>
  <PackageReference Include="Basalt.Sdk.Contracts" />
  <PackageReference Include="Basalt.Sdk.Analyzers" />
</ItemGroup>
```

## Writing a BST-20 Token Contract

Replace the contents of `TokenContract.cs` with the following complete BST-20 token implementation:

```csharp
using Basalt.Sdk.Contracts;
using Basalt.Sdk.Contracts.Attributes;
using Basalt.Sdk.Contracts.Storage;
using Basalt.Sdk.Contracts.Types;

[BasaltContract]
public class TokenContract
{
    private readonly StorageMap<Address, UInt256> _balances = new();
    private readonly StorageValue<UInt256> _totalSupply = new();
    private readonly StorageValue<string> _name = new();

    [BasaltEvent]
    public record Transfer([Indexed] Address From, [Indexed] Address To, UInt256 Amount);

    [BasaltConstructor]
    public void Initialize(string name, UInt256 initialSupply)
    {
        _name.Set(name);
        _totalSupply.Set(initialSupply);
        _balances.Set(Context.Caller, initialSupply);
        Emit(new Transfer(Address.Zero, Context.Caller, initialSupply));
    }

    [BasaltEntrypoint]
    public bool Transfer(Address to, UInt256 amount)
    {
        var sender = Context.Caller;
        Require(_balances.Get(sender) >= amount, "Insufficient balance");

        _balances.Set(sender, _balances.Get(sender) - amount);
        _balances.Set(to, _balances.Get(to) + amount);

        Emit(new Transfer(sender, to, amount));
        return true;
    }

    [BasaltView]
    public UInt256 BalanceOf(Address account) => _balances.Get(account);
}
```

The following sections explain each component of this contract in detail.

## Contract Attributes

### `[BasaltContract]`

Applied to the class declaration. This attribute marks the class as a deployable Basalt smart contract. The AOT compiler and deployment toolchain use this attribute to identify contract entry points, generate serialization code, and apply sandbox restrictions.

Every contract must have exactly one class annotated with `[BasaltContract]`.

```csharp
[BasaltContract]
public class TokenContract
{
    // ...
}
```

### `[BasaltConstructor]`

Marks a method as the contract's initialization function. This method is called exactly once when the contract is first deployed. It is used to set initial state such as the token name, total supply, and the deployer's initial balance.

A contract may have at most one `[BasaltConstructor]` method. If no constructor is defined, the contract is deployed with default-initialized storage.

```csharp
[BasaltConstructor]
public void Initialize(string name, UInt256 initialSupply)
{
    _name.Set(name);
    _totalSupply.Set(initialSupply);
    _balances.Set(Context.Caller, initialSupply);
    Emit(new Transfer(Address.Zero, Context.Caller, initialSupply));
}
```

### `[BasaltEntrypoint]`

Marks a method as a state-modifying entrypoint. These methods can read and write storage, emit events, and call other contracts. They are invoked through signed transactions and consume gas.

If an entrypoint method throws an exception or a `Require()` check fails, all state changes made during that invocation are reverted atomically.

```csharp
[BasaltEntrypoint]
public bool Transfer(Address to, UInt256 amount)
{
    // State modifications happen here
}
```

### `[BasaltView]`

Marks a method as a read-only view function. View methods can read storage but cannot modify it, emit events, or call state-modifying methods on other contracts. They execute without consuming gas and do not require a signed transaction.

View methods are ideal for balance queries, configuration lookups, and other read operations.

```csharp
[BasaltView]
public UInt256 BalanceOf(Address account) => _balances.Get(account);
```

### `[BasaltEvent]`

Applied to a `record` type nested inside the contract class. Events are logged during contract execution and stored in the transaction receipt. They are not written to contract storage and cannot be read by other contracts, but they are indexed by the node and can be queried by off-chain applications.

```csharp
[BasaltEvent]
public record Transfer([Indexed] Address From, [Indexed] Address To, UInt256 Amount);
```

### `[Indexed]`

Applied to parameters of an event record. Indexed parameters are stored in a searchable index, allowing clients to efficiently filter events by specific field values (for example, all `Transfer` events where `From` is a specific address). Up to three parameters per event may be indexed.

```csharp
public record Transfer([Indexed] Address From, [Indexed] Address To, UInt256 Amount);
//                      ^^^^^^^^^              ^^^^^^^^^
//                      These fields are indexed for efficient querying
```

## Compiling the Contract

Build the contract using the standard .NET build command:

```bash
dotnet build
```

The Basalt Roslyn analyzers run automatically during the build. If the contract contains any determinism violations, reflection usage, or AOT-incompatible patterns, the build will fail with a descriptive error. See the [Analyzers](./analyzers.md) documentation for the full list of checks.

A successful build produces a native binary ready for deployment.

## Testing the Contract

Create a test class in the test project using xUnit and `BasaltTestHost`:

```csharp
using Xunit;
using Basalt.Sdk.Testing;
using Basalt.Crypto;

public class TokenTests
{
    [Fact]
    public void Transfer_SufficientBalance_Succeeds()
    {
        // Arrange: create a test host and generate two accounts
        var host = new BasaltTestHost();
        var (aliceKey, alicePub) = Ed25519Signer.GenerateKeyPair();
        var (bobKey, bobPub) = Ed25519Signer.GenerateKeyPair();

        // Deploy the token contract as Alice with 1000 initial supply
        var contract = host.Deploy<TokenContract>(
            aliceKey,
            "TestToken",
            (UInt256)1000
        );

        // Act: Alice transfers 200 tokens to Bob
        host.Call(contract, aliceKey, c => c.Transfer(bobPub.ToAddress(), (UInt256)200));
        host.AdvanceBlock();

        // Assert: verify balances
        var aliceBalance = host.Query(contract, c => c.BalanceOf(alicePub.ToAddress()));
        var bobBalance = host.Query(contract, c => c.BalanceOf(bobPub.ToAddress()));

        Assert.Equal((UInt256)800, aliceBalance);
        Assert.Equal((UInt256)200, bobBalance);
    }

    [Fact]
    public void Transfer_InsufficientBalance_Reverts()
    {
        var host = new BasaltTestHost();
        var (aliceKey, alicePub) = Ed25519Signer.GenerateKeyPair();
        var (bobKey, bobPub) = Ed25519Signer.GenerateKeyPair();

        var contract = host.Deploy<TokenContract>(
            aliceKey,
            "TestToken",
            (UInt256)100
        );

        // Attempting to transfer more than the balance should revert
        Assert.Throws<ContractRevertException>(() =>
        {
            host.Call(contract, aliceKey, c => c.Transfer(bobPub.ToAddress(), (UInt256)999));
        });
    }
}
```

Run the tests with the standard .NET test runner:

```bash
dotnet test
```

No running node or network connection is required. The `BasaltTestHost` simulates the full blockchain execution environment in-process. See the [Testing](./testing.md) documentation for advanced features such as time manipulation, snapshot/restore, and gas profiling.

## Deploying the Contract

Once the contract builds and all tests pass, deploy it to a running Basalt network using the CLI:

```bash
dotnet run --project tools/Basalt.Cli -- deploy \
  --contract ./bin/Release/net9.0/MyToken.dll \
  --args "MyToken" "1000000" \
  --private-key <path-to-keyfile> \
  --node http://localhost:5100
```

The CLI submits a deployment transaction, waits for it to be included in a block, and prints the resulting contract address.

## Next Steps

- [SDK Reference](./sdk-reference.md) -- Full reference for storage primitives, the Context API, and cross-contract calls.
- [Token Standards](./token-standards.md) -- Explore the built-in BST token standards for fungible, non-fungible, and semi-fungible tokens.
- [Analyzers](./analyzers.md) -- Understand the compile-time safety checks enforced by the Roslyn analyzers.
- [Testing](./testing.md) -- Advanced testing techniques with `BasaltTestHost`.
