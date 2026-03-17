---
sidebar_position: 1
title: Installation
description: Prerequisites, build instructions, and environment setup for the Basalt blockchain.
---

# Installation

This guide covers the prerequisites for building Basalt from source, platform-specific dependencies, and verification steps.

## Prerequisites

| Dependency     | Version  | Required | Notes                                                    |
|----------------|----------|----------|----------------------------------------------------------|
| .NET SDK       | 9.0+     | Yes      | Includes the runtime, compiler, and `dotnet` CLI         |
| RocksDB        | 8.0+     | Yes      | Native library, installed per platform (see below)       |
| Git            | 2.30+    | Yes      | For cloning the repository                               |
| Docker         | 24.0+    | No       | Required only for the Docker DevNet                      |
| Docker Compose | 2.20+    | No       | Required only for the Docker DevNet                      |

### Install .NET 9 SDK

Download and install the .NET 9 SDK from [dotnet.microsoft.com](https://dotnet.microsoft.com/download/dotnet/9.0). Verify the installation:

```bash
dotnet --version
# Expected: 9.0.x
```

### Install RocksDB Native Library

Basalt uses RocksDB as its persistent key-value store. The native library must be available on your system.

**Linux (Debian/Ubuntu):**

```bash
sudo apt-get install -y librocksdb-dev
```

**Linux (Fedora/RHEL):**

```bash
sudo dnf install -y rocksdb-devel
```

**macOS (Homebrew):**

```bash
brew install rocksdb
```

**Windows (vcpkg):**

```powershell
vcpkg install rocksdb:x64-windows
```

The NuGet package `RocksDB` includes prebuilt native binaries for most platforms, but installing the system library ensures compatibility with Native AOT builds.

## Clone and Build

Clone the repository and build the full 30-project solution:

```bash
git clone https://github.com/Basalt-Foundation/Basalt.git
cd Basalt
dotnet build
```

A successful build completes with zero warnings and zero errors across all 30 projects.

:::note
On some systems, the build output may appear in French (e.g., "0 avertissement(s), 0 erreur(s)"). This is expected and depends on the system locale. The build is successful as long as the warning and error counts are both zero.
:::

## Run Tests

Basalt ships with over 4,000 tests across 16 test projects, covering cryptographic primitives, consensus state machines, transaction execution, storage operations, P2P networking, compliance logic, smart contract tooling, and Roslyn analyzers.

```bash
dotnet test
```

All tests should pass with zero failures. To run a specific test project:

```bash
dotnet test tests/Basalt.Crypto.Tests
dotnet test tests/Basalt.Consensus.Tests
dotnet test tests/Basalt.Sdk.Tests
dotnet test tests/Basalt.Sdk.Analyzers.Tests
```

## Native AOT Publish

Basalt is designed for Native AOT compilation, producing a single self-contained binary with no JIT overhead:

```bash
dotnet publish src/node/Basalt.Node -c Release
```

The resulting binary can be deployed directly without installing the .NET runtime on the target machine. Benefits of Native AOT deployment:

- Sub-millisecond cold startup
- Predictable memory allocation with no JIT compilation pauses
- Reduced attack surface -- no reflection, no runtime code generation
- Single-file deployment with no external runtime dependencies

### Platform-Specific Notes

**macOS (Apple Silicon and Intel):** Basalt uses a software Keccak-256 implementation because macOS does not expose hardware SHA3-256 support. This is handled automatically and requires no manual configuration.

**Linux (x64/ARM64):** RocksDB native libraries are resolved via NuGet. For Docker-based deployments, the Dockerfile installs `librocksdb-dev` to provide the correct native library within the container.

**Windows (x64):** Ensure the RocksDB native DLL is on the system PATH or installed via vcpkg with the appropriate triplet.

## Docker Alternative

If you prefer not to install .NET and RocksDB locally, you can run the full Basalt stack via Docker. See the [Quickstart](./quickstart) guide for instructions on spinning up a 4-validator devnet with Docker Compose.

## IDE Recommendations

| IDE                         | Notes                                                             |
|-----------------------------|-------------------------------------------------------------------|
| Visual Studio 2022+         | Full .NET 9 support, integrated test runner, NuGet management     |
| JetBrains Rider             | Cross-platform, excellent refactoring tools, built-in profiler    |
| VS Code + C# DevKit         | Lightweight option with IntelliSense, debugging, and test support |

All three IDEs provide Roslyn analyzer feedback in the editor, surfacing Basalt's 12 custom contract diagnostics as you write smart contract code.

## Next Steps

With Basalt built and tests passing, proceed to the [Quickstart](./quickstart) guide to run your first local node or spin up a multi-validator devnet.
