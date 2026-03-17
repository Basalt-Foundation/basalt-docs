---
sidebar_position: 2
title: Configuration
description: Environment variables and chain parameters for configuring a Basalt node.
---

# Configuration

Basalt nodes are configured exclusively through environment variables. No configuration file is required.

## Environment Variables

| Variable | Description | Default |
|---|---|---|
| `BASALT_MODE` | Node mode: `standalone`, `validator`, or `rpc` | `standalone` |
| `BASALT_SYNC_SOURCE` | HTTP URL of the validator to sync from (RPC mode) | -- |
| `BASALT_VALIDATOR_INDEX` | Validator index in the active set (`-1` for standalone) | `-1` |
| `BASALT_VALIDATOR_ADDRESS` | Validator address in hex format | -- |
| `BASALT_VALIDATOR_KEY` | Ed25519 private key in hex format | -- |
| `BASALT_PEERS` | Comma-separated list of peer addresses (`host:port`) | -- |
| `BASALT_NETWORK` | Network name identifier | `mainnet` |
| `BASALT_CHAIN_ID` | Numeric chain identifier | `1` |
| `HTTP_PORT` | REST API listen port | `5000` |
| `P2P_PORT` | P2P listen port | `30303` |
| `BASALT_DATA_DIR` | Directory for RocksDB data storage | `./data` |

:::tip
For local development, the defaults are sufficient. Simply run the node without setting any variables to start in standalone mode.
:::

## Chain Configurations

Basalt defines three standard network profiles. Each network shares the same block time and transaction limits but differs in validator set size, staking requirements, and epoch length.

### Block and Transaction Parameters

| Parameter | Mainnet | Testnet | Devnet |
|---|---|---|---|
| Chain ID | 1 | 2 | 31337 |
| Block Time | 2s | 2s | 2s |
| Max Block Size | 2 MB | 2 MB | 2 MB |
| Max Transactions Per Block | 10,000 | 10,000 | 10,000 |
| Max Transaction Data | 128 KB | 128 KB | 128 KB |

### Validator and Epoch Parameters

| Parameter | Mainnet | Testnet | Devnet |
|---|---|---|---|
| Validator Set Size | 64 | 32 | 4 |
| Minimum Validator Stake | 100,000 BSLT | 10,000 BSLT | 1,000 BSLT |
| Epoch Length | 1,000 blocks | 500 blocks | 100 blocks |
| Unbonding Period | ~21 days | ~5 days | -- |

### Notes

- **Chain ID** must match between the node configuration and transaction signatures. Transactions signed with a mismatched chain ID are rejected.
- **Unbonding period** on devnet is disabled to allow rapid iteration.
- **Validator set size** defines the maximum number of validators that can be active in a single epoch. Additional stakers are queued until the next epoch boundary.
