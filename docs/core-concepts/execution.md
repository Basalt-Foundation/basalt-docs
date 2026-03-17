---
sidebar_position: 5
title: "Execution"
description: "Basalt execution layer: BasaltVM sandboxed execution, source-generated dispatch, gas metering, transaction validation pipeline, and contract safety analyzers."
---

# Execution

The execution layer processes transactions and smart contract calls within a sandboxed virtual machine. It enforces deterministic execution, gas metering, and compliance checks on every transaction.

## BasaltVM

BasaltVM is Basalt's smart contract execution engine. It executes C# contract code in a sandboxed environment with the following properties:

- **Source-generated dispatch** for AOT-safe method routing. All contract method resolution uses compile-time source generators rather than runtime reflection, ensuring compatibility with .NET Native AOT compilation.
- **Gas metering** on every operation. Each instruction and storage access consumes gas, preventing infinite loops and bounding resource consumption.
- **Deterministic execution**. Contract code cannot access non-deterministic APIs (system clock, random number generators, file I/O, network calls).

## Transaction Types

| Type | Description | Base Gas Cost |
|---|---|---|
| Transfer | Native BSLT token transfer between accounts | 21,000 |
| Contract Deploy | Deploy compiled C# contract bytecode to the chain | 500,000 |
| Contract Call | Invoke a method on a deployed contract | 50,000 |

The base gas cost represents the minimum gas consumed by a transaction of that type. Actual gas usage may be higher depending on the operations performed during execution.

## Validation Pipeline

Every transaction passes through a sequential validation pipeline before execution. If any step fails, the transaction is rejected and no state changes are applied.

```
1. Signature Verification (Ed25519)
        |
2. Nonce Check (sequential, gap-free)
        |
3. Balance Check (value + gas * gasPrice)
        |
4. Gas Limit Validation
        |
5. Compliance Check (ZK proof or attestation pipeline)
        |
6. Execution
        |
7. State Commit (only if all checks pass)
```

### Step Details

1. **Signature verification** -- The transaction's Ed25519 signature is verified against the sender's public key. Invalid signatures are rejected immediately.

2. **Nonce check** -- The transaction nonce must equal the sender's current nonce. Nonces are sequential and gap-free; a transaction with nonce `n` cannot be processed until all transactions with nonces `0` through `n-1` have been committed.

3. **Balance check** -- The sender must hold a balance sufficient to cover both the transferred value and the maximum possible gas cost (`gas limit * gas price`). This ensures the sender can pay for execution even if the transaction consumes its full gas allocation.

4. **Gas limit validation** -- The transaction's gas limit must fall within the acceptable range (above the minimum for its type, below the block gas limit).

5. **Compliance check** -- If the network requires compliance verification, the transaction must include a valid ZK proof or pass through the attestation pipeline. This step enforces regulatory requirements without exposing personal data on-chain.

6. **Execution** -- The transaction is executed by BasaltVM. For transfers, this debits the sender and credits the recipient. For contract calls, the VM dispatches to the target method and tracks gas consumption.

7. **State commit** -- If execution completes without error and within the gas limit, all state changes are committed atomically. If execution reverts or runs out of gas, all state changes are rolled back and only the gas fee is deducted.

## EIP-1559 Fee Model

Basalt implements the EIP-1559 dynamic base fee mechanism. See the dedicated [Fee Model](/docs/core-concepts/fee-model) page for full details.

Key points:

- The **base fee** adjusts dynamically based on block gas utilization.
- The base fee portion of transaction fees is **burned**, creating deflationary pressure.
- The **priority fee** (tip) is paid directly to the block proposer.
- Transactions specify `MaxFeePerGas` and `MaxPriorityFeePerGas` instead of a single gas price.

## Contract Sandboxing

Smart contracts execute in a restricted environment that prohibits non-deterministic and unsafe operations. The following constraints are enforced:

- **No reflection** -- Runtime type inspection and dynamic method invocation are forbidden.
- **No dynamic types** -- The `dynamic` keyword and late-bound dispatch are prohibited.
- **No non-deterministic APIs** -- System clock, random number generation, file system access, and network calls are blocked.

These constraints are enforced at compile time by **12 Roslyn analyzers** that inspect contract source code before deployment. Contracts that violate any constraint are rejected by the analyzers and cannot be compiled for deployment.

### Analyzer Enforcement

The Roslyn analyzers run as part of the SDK build process. They produce compiler errors (not warnings) for any prohibited pattern, ensuring that unsafe contracts never reach the deployment stage. This compile-time enforcement is strictly preferable to runtime checks, as it catches violations before any gas is spent.
