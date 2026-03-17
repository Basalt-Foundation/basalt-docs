---
sidebar_position: 7
title: Testing Framework
description: Guide to testing Basalt smart contracts with BasaltTestHost, the in-process blockchain emulator for xUnit.
---

# Testing Framework

The `Basalt.Sdk.Testing` package provides `BasaltTestHost`, an in-process blockchain emulator for testing smart contracts with xUnit. No running node, Docker container, or network connection is required. Tests execute instantly and deterministically.

## BasaltTestHost API

`BasaltTestHost` simulates the full contract execution environment: block production, storage, gas metering, event emission, compliance checks, and cross-contract calls. It runs entirely in memory within the test process.

### Core Methods

| Method | Description |
|---|---|
| `host.Deploy<T>(deployer)` | Deploys a contract as the specified deployer address and returns a contract handle. |
| `host.Call(contract, caller, c => c.Method(args))` | Executes a state-modifying method as the specified caller. Consumes gas and modifies state. |
| `host.Query(contract, c => c.ReadMethod(args))` | Executes a read-only view method. Does not consume gas or modify state. Returns the result. |
| `host.AdvanceBlock()` | Advances the simulated block height by one. |
| `host.AdvanceBlocks(n)` | Advances the simulated block height by `n` blocks. |
| `host.SetTimestamp(DateTimeOffset)` | Sets the simulated block timestamp to an exact value. Useful for testing time-dependent logic. |
| `host.CreateAddress()` | Generates a new test address. |

### Gas Profiling

```csharp
var result = host.CallWithGas(contract, caller, c => c.Method(args));
ulong gasUsed = result.GasUsed;
```

`CallWithGas` returns a result object that includes the gas consumed by the call. This is useful for regression testing gas consumption, comparing implementation strategies, and ensuring operations stay within the block gas limit.

### Policy Testing

Deploy policy contracts, register them with a token, and verify that transfers are blocked or allowed as expected:

```csharp
var policy = host.Deploy<HoldingLimitPolicy>(owner);
host.Call(policy, owner, p => p.SetLimit(tokenAddress, maxBalance));
host.Call(token, owner, t => t.AddPolicy(policy.Address));

// This transfer should succeed (within limit)
host.Call(token, owner, t => t.Transfer(alice, smallAmount));

// This transfer should revert (exceeds limit)
Assert.Throws<ContractRevertException>(() =>
    host.Call(token, owner, t => t.Transfer(alice, excessiveAmount)));
```

## Example Test Class

A complete test class demonstrating the arrange-act-assert pattern with `BasaltTestHost`:

```csharp
public class MyTokenTests
{
    private readonly BasaltTestHost _host = new();
    private readonly Address _owner;
    private readonly Address _alice;

    public MyTokenTests()
    {
        _owner = _host.CreateAddress();
        _alice = _host.CreateAddress();
    }

    [Fact]
    public void Transfer_UpdatesBalances()
    {
        var token = _host.Deploy<MyToken>(_owner);
        _host.Call(token, _owner, t => t.Mint(_owner, 1000));
        _host.Call(token, _owner, t => t.Transfer(_alice, 500));

        Assert.Equal(500, _host.Query(token, t => t.BalanceOf(_owner)));
        Assert.Equal(500, _host.Query(token, t => t.BalanceOf(_alice)));
    }

    [Fact]
    public void Transfer_InsufficientBalance_Reverts()
    {
        var token = _host.Deploy<MyToken>(_owner);
        Assert.Throws<ContractRevertException>(() =>
            _host.Call(token, _owner, t => t.Transfer(_alice, 1000)));
    }
}
```

## Testing Time-Dependent Logic

`BasaltTestHost` gives you explicit control over the simulated clock. Time does not advance automatically; it changes only when you call `SetTimestamp`, `AdvanceBlock`, or `AdvanceBlocks`.

```csharp
[Fact]
public void Lockup_BlocksTransferBeforeExpiry()
{
    var token = _host.Deploy<RegulatedToken>(_owner);
    var lockup = _host.Deploy<LockupPolicy>(_owner);

    // Configure a 90-day lockup
    _host.Call(lockup, _owner, p => p.SetLockup(token.Address, TimeSpan.FromDays(90)));
    _host.Call(token, _owner, t => t.AddPolicy(lockup.Address));

    _host.Call(token, _owner, t => t.Mint(_owner, 1000));

    // Transfer should fail before lockup expires
    Assert.Throws<ContractRevertException>(() =>
        _host.Call(token, _owner, t => t.Transfer(_alice, 100)));

    // Advance past the lockup period
    _host.SetTimestamp(DateTimeOffset.UtcNow.AddDays(91));
    _host.AdvanceBlock();

    // Transfer should now succeed
    _host.Call(token, _owner, t => t.Transfer(_alice, 100));
    Assert.Equal(100, _host.Query(token, t => t.BalanceOf(_alice)));
}
```

## Running Tests

Execute all tests using the standard .NET test runner:

```bash
dotnet test
```

Full xUnit integration is supported. Tests can be run and debugged from Visual Studio Test Explorer, JetBrains Rider, and VS Code with breakpoints, step-through debugging, and watch expressions working exactly as they do for any other .NET test project.

Filter to a specific test class:

```bash
dotnet test --filter "FullyQualifiedName~MyTokenTests"
```

Run with code coverage:

```bash
dotnet test --collect:"XPlat Code Coverage"
```
