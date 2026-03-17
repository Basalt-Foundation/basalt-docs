---
sidebar_position: 3
title: Docker DevNet
description: Run a local 4-validator Basalt network using Docker Compose.
---

# Docker DevNet

The Docker DevNet provides a self-contained, 4-validator Basalt network for local development and integration testing.

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/)
- [Docker Compose](https://docs.docker.com/compose/install/) (v2 or later)

## Starting the DevNet

```bash
docker compose up -d
```

This starts four validator nodes (`validator-0` through `validator-3`) with pre-configured keys and addresses.

## Port Mapping

Each validator exposes its REST API on a unique host port:

| Validator | REST Port | P2P Port |
|---|---|---|
| validator-0 | localhost:5100 | 30300 |
| validator-1 | localhost:5101 | 30301 |
| validator-2 | localhost:5102 | 30302 |
| validator-3 | localhost:5103 | 30303 |

## Verifying the Network

### Health Check

```bash
curl http://localhost:5100/v1/health
```

### View Logs

Follow the log output for a specific validator:

```bash
docker compose logs -f validator-0
```

## Configuration Details

| Setting | Value |
|---|---|
| Chain ID | 31337 |
| Validator keys | Deterministic (development only) |
| Docker network | `basalt-devnet` (bridge mode) |
| Storage | Per-validator persistent RocksDB volumes |
| Restart policy | `unless-stopped` |

:::danger
The devnet uses deterministic validator addresses and private keys that are publicly known. **Never use devnet keys in production.**
:::

### Security Hardening

Even in development mode, the Docker containers apply the following security constraints:

- `security_opt: no-new-privileges` -- prevents privilege escalation inside the container
- `cap_drop: ALL` -- drops all Linux capabilities

### Health Checks

Each container runs an internal health check:

```
curl -sf http://localhost:5000/v1/health
```

Health checks execute every 30 seconds with a 10-second timeout.

## Dockerfile

The devnet uses a multi-stage Dockerfile:

| Stage | Base Image | Purpose |
|---|---|---|
| Build | `mcr.microsoft.com/dotnet/sdk:9.0` | Compile the Basalt node |
| Runtime | `mcr.microsoft.com/dotnet/aspnet:9.0` | Run the compiled binary |

The runtime container runs as a non-root `basalt` user and exposes the following ports:

| Port | Service |
|---|---|
| 5000 | REST API |
| 5001 | gRPC API |
| 30303 | P2P |

## Common Operations

### Rebuild Without Cache

Force a clean rebuild of the Docker image and restart all validators:

```bash
docker compose build --no-cache && docker compose up -d
```

### Stop and Clean Up

Stop all containers and remove persistent volumes:

```bash
docker compose down -v
```

This removes all blockchain data. The network will start from genesis on the next `docker compose up`.
