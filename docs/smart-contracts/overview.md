---
title: Smart Contracts Overview
description: An introduction to Basalt smart contracts built with C# and .NET 9 Native AOT.
sidebar_position: 1
---

# Smart Contracts Overview

Basalt smart contracts are standard C# classes compiled to native code through .NET 9 Ahead-of-Time (AOT) compilation. There is no proprietary language to learn, no custom bytecode format to debug, and no separate toolchain to maintain. If you can write C#, you can write Basalt smart contracts.

## Why C# for Smart Contracts?

Most blockchain platforms require developers to learn a domain-specific language such as Solidity, Move, or Ink!. Basalt takes a fundamentally different approach: contracts are written in C#, one of the most widely adopted programming languages in the world, and leverage the full .NET 9 ecosystem.

This design choice delivers several concrete advantages:

- **End-to-end strong typing.** The C# type system catches entire categories of bugs at compile time that would otherwise surface as expensive on-chain failures. Generic constraints, nullable reference types, and pattern matching all work exactly as expected.
- **Native unit testing with xUnit.** Contract logic is tested using the same xUnit framework used across the .NET ecosystem. No special test harness or blockchain-specific test runner is required.
- **Step-through debugging.** Set breakpoints and inspect contract state in Visual Studio, JetBrains Rider, or VS Code with the C# Dev Kit. The debugging experience is identical to any other .NET application.
- **Roslyn static analysis.** Basalt ships a set of Roslyn analyzers (`Basalt.Sdk.Analyzers`) that enforce determinism, AOT compatibility, and security best practices at compile time. Issues are flagged as squiggly underlines in your IDE before you ever deploy.
- **NuGet distribution.** The contract SDK is distributed as a standard NuGet package (`Basalt.Sdk.Contracts`), installed and updated through `dotnet add package` like any other dependency.

## Execution Modes

Basalt supports two contract execution modes to accommodate different use cases:

### Native C# AOT

The primary execution mode compiles contracts directly to native machine code using the .NET 9 Native AOT compiler. This eliminates the JIT compilation step entirely and produces binaries that execute at near-bare-metal speed.

Performance benchmarks show **10-50x improvement** over bytecode-interpreted virtual machines such as the EVM or WASM-based runtimes. The AOT compilation also provides a deterministic execution environment, since there is no JIT optimizer making platform-specific decisions at runtime.

### WASM (WebAssembly)

For workloads that require interoperability with code written in Rust, C, or C++, Basalt supports a WebAssembly execution mode. Contracts compiled to WASM run inside a sandboxed WASM runtime with the same security guarantees as native contracts. This mode is particularly useful for integrating existing cryptographic libraries or porting contracts from other WASM-based chains.

## Built-in Compliance Hooks

Every token standard in Basalt includes compliance hooks that execute automatically on transfers and other state-changing operations. These hooks integrate with the on-chain compliance pipeline to enforce:

- KYC/AML verification status
- Sanctions screening
- Geographic transfer restrictions
- Holding limits and concentration caps
- Lock-up schedules and vesting
- Travel rule data requirements

Compliance is not an afterthought bolted onto the application layer. It is woven into the contract execution model itself, ensuring that regulated assets cannot bypass policy checks regardless of how they are transferred.

## Sandboxed Execution

Contract execution is fully sandboxed to prevent malicious or buggy contracts from affecting the host system or other contracts:

- **Isolated memory.** Each contract invocation receives its own memory region. Contracts cannot read or write memory belonging to other contracts or the node process.
- **No filesystem access.** Contracts cannot open files, read directories, or interact with the filesystem in any way. All persistent state flows through the typed storage primitives (`StorageValue`, `StorageMap`, `StorageList`, `StorageSet`).
- **No network access.** Contracts cannot open sockets, make HTTP requests, or communicate with external services. External data enters the chain exclusively through oracle contracts or bridge mechanisms.
- **seccomp restrictions.** On Linux hosts, the contract execution sandbox applies seccomp-bpf filters to restrict the set of allowed system calls to the absolute minimum required for computation.
- **Gas metering.** Every operation consumes gas. Contracts that exceed their gas budget are halted and their state changes are reverted. This prevents infinite loops and denial-of-service attacks.

## Contract Lifecycle

The typical lifecycle of a Basalt smart contract is:

1. **Author.** Write the contract as a C# class annotated with `[BasaltContract]` and related attributes.
2. **Analyze.** The Roslyn analyzers flag determinism violations, AOT incompatibilities, and potential security issues during the build.
3. **Test.** Exercise the contract logic using xUnit and `BasaltTestHost`, an in-process blockchain emulator that requires no running node.
4. **Compile.** Build the contract with `dotnet build`. The AOT compiler produces a native binary.
5. **Deploy.** Submit the compiled contract to the network using the Basalt CLI or a transaction.
6. **Interact.** Call contract entrypoints through transactions (state-modifying) or view calls (read-only).

## Next Steps

- [Getting Started](./getting-started.md) -- Write and deploy your first contract.
- [SDK Reference](./sdk-reference.md) -- Full reference for attributes, storage primitives, and the Context API.
- [Token Standards](./token-standards.md) -- Explore the BST token standards.
- [Analyzers](./analyzers.md) -- Understand the compile-time safety checks.
- [Testing](./testing.md) -- Learn how to test contracts with `BasaltTestHost`.
