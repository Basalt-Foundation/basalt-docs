---
sidebar_position: 1
title: Installation
---

# Installation

This guide covers building Basalt from source and verifying your environment is correctly configured.

## Prerequisites

| Dependency    | Version  | Required | Notes                                      |
|---------------|----------|----------|--------------------------------------------|
| .NET SDK      | 9.0+     | Yes      | Includes the runtime and `dotnet` CLI      |
| Docker        | 24.0+    | No       | Required only for running the devnet       |
| Docker Compose| 2.20+    | No       | Required only for running the devnet       |
| Git           | 2.30+    | Yes      | For cloning the repository                 |

### Install .NET 9 SDK

Download and install the .NET 9 SDK from the [official .NET download page](https://dotnet.microsoft.com/download/dotnet/9.0). Verify the installation:

```bash
dotnet --version
# Expected: 9.0.x
```

## Clone and Build

Clone the repository and build the entire solution:

```bash
git clone https://github.com/basalt-org/basalt.git
cd basalt
dotnet build
```

The solution contains 30 projects spanning the full stack -- core libraries, networking, consensus, execution, APIs, compliance, bridging, SDKs, tooling, and an explorer. A successful build produces zero warnings and zero errors.

## Run Tests

Basalt ships with comprehensive test coverage across 16 test projects:

```bash
dotnet test
```

This executes all 1,380 tests covering cryptographic primitives, consensus state machines, transaction execution, storage operations, P2P networking, compliance logic, and smart contract tooling. All tests should pass with zero failures.

To run tests for a specific project:

```bash
dotnet test tests/Basalt.Crypto.Tests
dotnet test tests/Basalt.Consensus.Tests
```

## Native AOT Publish

Basalt is designed for Native AOT compilation, producing a single self-contained binary with no runtime dependencies:

```bash
dotnet publish src/node/Basalt.Node -c Release
```

The resulting binary is located in the publish output directory and can be deployed directly without installing the .NET runtime on the target machine. This is the recommended deployment mode for production validators, delivering:

- Sub-millisecond cold startup
- Predictable memory allocation with no JIT compilation pauses
- Reduced attack surface with no reflection or dynamic code loading
- Single-file deployment with no external dependencies

### Platform-Specific Notes

**macOS (Apple Silicon):** The build uses a software Keccak-256 implementation because macOS does not expose hardware SHA3-256 support. This is handled automatically and requires no manual configuration.

**Linux (x64/ARM64):** RocksDB native libraries are included via NuGet. For Docker-based deployments, the `librocksdb-dev` package is installed in the Dockerfile to provide the correct native library.

## Next Steps

With Basalt built and tests passing, proceed to the [Quickstart](./quickstart) guide to run your first local node or spin up a multi-validator devnet.
