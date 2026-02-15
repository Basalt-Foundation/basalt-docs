---
title: Testing Framework
description: Guide to testing Basalt smart contracts with BasaltTestHost, the in-process blockchain emulator.
sidebar_position: 6
---

# Testing Framework

The `Basalt.Sdk.Testing` package provides `BasaltTestHost`, an in-process blockchain emulator that allows you to test smart contracts without running a node, configuring a network, or waiting for block confirmations. Tests execute instantly and deterministically using standard xUnit.

## Overview

`BasaltTestHost` simulates the full contract execution environment: block production, storage, gas metering, event emission, the compliance pipeline, and cross-contract calls. It runs entirely in memory within the test process, making it suitable for both local development and CI pipelines.

Key characteristics:

- **No external dependencies.** No running node, no Docker containers, no network configuration.
- **Deterministic execution.** Block timestamps and heights are controlled programmatically. Tests produce identical results on every run.
- **Full fidelity.** The execution environment matches production behavior. Storage layout, gas costs, compliance checks, and revert semantics behave identically.
- **Standard tooling.** Tests are written with xUnit and run with `dotnet test`. All .NET test ecosystem tools (code coverage, parallel execution, test filtering) work out of the box.

## Getting Started

Add the testing package to your test project:

```xml
<ItemGroup>
  <PackageReference Include="Basalt.Sdk.Testing" />
  <PackageReference Include="xunit" />
  <PackageReference Include="xunit.runner.visualstudio" />
</ItemGroup>
```

## Writing Tests

### Basic Test Structure

A typical contract test follows the arrange-act-assert pattern:

```csharp
using Xunit;
using Basalt.Sdk.Testing;
using Basalt.Crypto;

public class TokenTests
{
    [Fact]
    public void Transfer_SufficientBalance_Succeeds()
    {
        // Arrange: create a test host and generate accounts
        var host = new BasaltTestHost();
        var (aliceKey, alicePub) = Ed25519Signer.GenerateKeyPair();
        var (bobKey, bobPub) = Ed25519Signer.GenerateKeyPair();

        // Deploy the contract as Alice
        var contract = host.Deploy<TokenContract>(
            aliceKey,
            "TestToken",
            (UInt256)1_000_000
        );

        // Act: transfer tokens from Alice to Bob
        host.Call(contract, aliceKey, c => c.Transfer(bobPub.ToAddress(), (UInt256)250_000));
        host.AdvanceBlock();

        // Assert: verify resulting balances
        var aliceBalance = host.Query(contract, c => c.BalanceOf(alicePub.ToAddress()));
        var bobBalance = host.Query(contract, c => c.BalanceOf(bobPub.ToAddress()));

        Assert.Equal((UInt256)750_000, aliceBalance);
        Assert.Equal((UInt256)250_000, bobBalance);
    }
}
```

### Testing Reverts

Verify that invalid operations revert with the expected reason:

```csharp
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

    var ex = Assert.Throws<ContractRevertException>(() =>
    {
        host.Call(contract, aliceKey, c => c.Transfer(bobPub.ToAddress(), (UInt256)999));
    });

    Assert.Equal("Insufficient balance", ex.Reason);
}
```

### Testing Events

Inspect events emitted during contract execution:

```csharp
[Fact]
public void Transfer_EmitsTransferEvent()
{
    var host = new BasaltTestHost();
    var (aliceKey, alicePub) = Ed25519Signer.GenerateKeyPair();
    var (bobKey, bobPub) = Ed25519Signer.GenerateKeyPair();

    var contract = host.Deploy<TokenContract>(
        aliceKey,
        "TestToken",
        (UInt256)1000
    );

    var receipt = host.Call(contract, aliceKey, c => c.Transfer(bobPub.ToAddress(), (UInt256)500));

    var transferEvent = Assert.Single(receipt.Events.OfType<TokenContract.Transfer>());
    Assert.Equal(alicePub.ToAddress(), transferEvent.From);
    Assert.Equal(bobPub.ToAddress(), transferEvent.To);
    Assert.Equal((UInt256)500, transferEvent.Amount);
}
```

## Deterministic Time Control

`BasaltTestHost` provides explicit control over the simulated blockchain clock. Time does not advance automatically; it only changes when you call `AdvanceTime` or `AdvanceBlock`.

### AdvanceBlock

Advances the block height by one and the block timestamp by the configured block time (default: 2 seconds):

```csharp
host.AdvanceBlock();
// Block height: N -> N+1
// Block timestamp: T -> T + 2s
```

### AdvanceTime

Advances the block timestamp by a specified duration without changing the block height. This is useful for testing time-dependent logic such as lock-up periods, vesting schedules, and maturity dates:

```csharp
// Advance time by 30 days
host.AdvanceTime(TimeSpan.FromDays(30));

// Now produce a block at the new timestamp
host.AdvanceBlock();
```

### SetTimestamp

Sets the block timestamp to an exact value:

```csharp
host.SetTimestamp(1_700_000_000); // Unix timestamp in seconds
```

### Example: Testing a Time Lock

```csharp
[Fact]
public void Withdraw_BeforeLockExpiry_Reverts()
{
    var host = new BasaltTestHost();
    var (userKey, userPub) = Ed25519Signer.GenerateKeyPair();

    var vault = host.Deploy<TimeLockVault>(userKey, TimeSpan.FromDays(90));

    host.Call(vault, userKey, v => v.Deposit((UInt256)1000));
    host.AdvanceBlock();

    // Only 30 days have passed -- lock has not expired
    host.AdvanceTime(TimeSpan.FromDays(30));
    host.AdvanceBlock();

    Assert.Throws<ContractRevertException>(() =>
    {
        host.Call(vault, userKey, v => v.Withdraw());
    });

    // Advance past the 90-day lock
    host.AdvanceTime(TimeSpan.FromDays(61));
    host.AdvanceBlock();

    // Now withdrawal should succeed
    host.Call(vault, userKey, v => v.Withdraw());
}
```

## Snapshot and Restore

`BasaltTestHost` supports snapshot and restore for efficient test isolation. A snapshot captures the entire blockchain state (storage, balances, block height, timestamp) and can be restored to reset to that point.

This is particularly useful when multiple tests share an expensive setup phase:

```csharp
public class VaultTests : IDisposable
{
    private readonly BasaltTestHost _host;
    private readonly int _snapshot;
    private readonly ContractHandle<TimeLockVault> _vault;

    public VaultTests()
    {
        _host = new BasaltTestHost();
        var (deployerKey, _) = Ed25519Signer.GenerateKeyPair();
        _vault = _host.Deploy<TimeLockVault>(deployerKey, TimeSpan.FromDays(90));
        _host.AdvanceBlock();

        // Capture state after deployment
        _snapshot = _host.Snapshot();
    }

    [Fact]
    public void Test_Deposit()
    {
        // Test runs against the post-deployment state
        // ...
    }

    [Fact]
    public void Test_Withdraw()
    {
        // This test also starts from the same post-deployment state
        // ...
    }

    public void Dispose()
    {
        // Restore to the snapshot after each test
        _host.Restore(_snapshot);
    }
}
```

## Gas Profiling

`BasaltTestHost` tracks gas consumption for every contract call. Use `GetGasUsed` to retrieve the gas consumed by the most recent call:

```csharp
[Fact]
public void Transfer_GasCost_IsReasonable()
{
    var host = new BasaltTestHost();
    var (aliceKey, alicePub) = Ed25519Signer.GenerateKeyPair();
    var (bobKey, bobPub) = Ed25519Signer.GenerateKeyPair();

    var contract = host.Deploy<TokenContract>(
        aliceKey,
        "TestToken",
        (UInt256)1_000_000
    );

    host.Call(contract, aliceKey, c => c.Transfer(bobPub.ToAddress(), (UInt256)100));
    var gasUsed = host.GetGasUsed();

    // Assert that gas consumption is within expected bounds
    Assert.InRange(gasUsed, 20_000UL, 50_000UL);
}
```

Gas profiling is useful for:

- **Regression testing.** Detect unexpected increases in gas consumption after code changes.
- **Optimization.** Compare gas costs of different implementation strategies.
- **Budgeting.** Ensure that contract operations stay within the block gas limit.

## Code Coverage Integration

`BasaltTestHost` tests are standard .NET tests and work with all .NET code coverage tools. No special configuration is required.

### Coverlet (CLI)

```bash
dotnet test --collect:"XPlat Code Coverage"
```

### JetBrains dotCover (Rider)

Right-click the test project in Rider and select "Cover Unit Tests." The coverage report highlights which lines of your contract code were exercised by the test suite.

### Coverage Tips

- Aim for high branch coverage on all `[BasaltEntrypoint]` methods, particularly around `Require` checks and conditional logic.
- Test both the success and failure paths of every entrypoint.
- Use parameterized tests (`[Theory]` + `[InlineData]`) to cover boundary conditions:

```csharp
[Theory]
[InlineData(0)]
[InlineData(1)]
[InlineData(999_999)]
[InlineData(1_000_000)]
public void Transfer_BoundaryAmounts_BehavesCorrectly(ulong amount)
{
    var host = new BasaltTestHost();
    var (aliceKey, alicePub) = Ed25519Signer.GenerateKeyPair();
    var (bobKey, bobPub) = Ed25519Signer.GenerateKeyPair();

    var contract = host.Deploy<TokenContract>(
        aliceKey,
        "TestToken",
        (UInt256)1_000_000
    );

    if (amount <= 1_000_000)
    {
        host.Call(contract, aliceKey, c => c.Transfer(bobPub.ToAddress(), (UInt256)amount));
        var balance = host.Query(contract, c => c.BalanceOf(bobPub.ToAddress()));
        Assert.Equal((UInt256)amount, balance);
    }
    else
    {
        Assert.Throws<ContractRevertException>(() =>
        {
            host.Call(contract, aliceKey, c => c.Transfer(bobPub.ToAddress(), (UInt256)amount));
        });
    }
}
```

## Running Tests

Execute all tests in a project:

```bash
dotnet test
```

Run a specific test class:

```bash
dotnet test --filter "FullyQualifiedName~TokenTests"
```

Run a specific test method:

```bash
dotnet test --filter "FullyQualifiedName~Transfer_SufficientBalance_Succeeds"
```

Run tests with detailed output:

```bash
dotnet test --verbosity detailed
```

All standard `dotnet test` flags and filters are supported. Tests can also be run and debugged directly from Visual Studio, Rider, or VS Code with breakpoints, step-through debugging, and watch expressions working exactly as they do for any other .NET test project.
