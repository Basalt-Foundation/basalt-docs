---
sidebar_position: 5
title: Policy Hooks
description: Transfer enforcement policy hooks for Basalt token contracts, including the PolicyEnforcer, reference policies, and safety analyzers.
---

# Policy Hooks

Policy hooks provide a composable transfer enforcement system for Basalt token contracts. Token issuers attach policies to their contracts that are automatically checked on every transfer. If any single policy denies a transfer, the entire operation reverts.

## Interfaces

The policy system defines two interfaces, one for fungible tokens and one for NFTs:

### ITransferPolicy

Verifies fungible token transfers. Implementations inspect the sender, receiver, and amount and either allow or deny the transfer.

```csharp
public interface ITransferPolicy
{
    bool CheckTransfer(Address from, Address to, UInt256 amount);
}
```

### INftTransferPolicy

Verifies non-fungible token transfers. Implementations inspect the sender, receiver, and token ID.

```csharp
public interface INftTransferPolicy
{
    bool CheckNftTransfer(Address from, Address to, UInt256 tokenId);
}
```

Both interfaces return `true` to allow the transfer and `false` to deny it.

## PolicyEnforcer

`PolicyEnforcer` is a storage-backed policy list manager that attaches to token contracts. It maintains an ordered list of policy contract addresses and invokes each one sequentially on every transfer.

### Behavior

- **Maximum 16 policies per token.** Attempting to register a 17th policy reverts.
- **Ordered evaluation.** Policies are invoked in the order they were registered.
- **First-deny-reverts.** If any single policy returns `false`, the entire transfer reverts immediately. Subsequent policies are not evaluated.
- **Owner-restricted management.** Only the contract owner can add or remove policies.

### Events

| Event | Description |
|---|---|
| `PolicyAddedEvent` | Emitted when a new policy is registered. Contains the policy address and the current policy count. |
| `PolicyRemovedEvent` | Emitted when a policy is removed. Contains the policy address and the updated policy count. |
| `TransferDeniedEvent` | Emitted when a transfer is denied by a policy. Contains the policy address, sender, receiver, and the reason. |

## Reference Policies

Basalt ships four reference policy implementations that cover common regulatory and operational requirements.

| Policy | Purpose | Example Use Case |
|---|---|---|
| `HoldingLimitPolicy` | Enforces a maximum token balance per address. | Cap individual holdings at 5% of total supply to comply with concentration regulations. |
| `LockupPolicy` | Enforces time-based transfer restrictions. | Lock tokens until a vesting cliff date. Transfers from locked addresses revert before the lockup expires. |
| `JurisdictionPolicy` | Enforces geographic transfer restrictions. | Block transfers to or from addresses in sanctioned jurisdictions. Jurisdiction codes are mapped to addresses via the compliance engine. |
| `SanctionsPolicy` | Screens addresses against a sanctions list. | Deny transfers involving addresses on an OFAC-style sanctions list. The list is maintained on-chain and updateable by the compliance officer. |

## Usage in a Contract

To integrate policy hooks into a token contract, instantiate a `PolicyEnforcer`, expose methods to manage policies, and call `EnforceAll` in the transfer hook.

```csharp
public class RegulatedToken : BST20Token
{
    private readonly PolicyEnforcer _enforcer = new();

    [ContractMethod]
    public void AddPolicy(Address policyAddress)
    {
        RequireOwner();
        _enforcer.AddPolicy(policyAddress);
    }

    [ContractMethod]
    public void RemovePolicy(Address policyAddress)
    {
        RequireOwner();
        _enforcer.RemovePolicy(policyAddress);
    }

    protected override void BeforeTransfer(Address from, Address to, UInt256 amount)
    {
        _enforcer.EnforceAll(from, to, amount);
    }
}
```

The `BeforeTransfer` hook is called by the base class before any balance modification occurs. If `EnforceAll` reverts, no state changes take effect and the transfer is denied.

### Deploying and Registering a Policy

Policies are standalone contracts deployed independently and then registered with the token:

```csharp
// Deploy the policy contract
var holdingLimit = host.Deploy<HoldingLimitPolicy>(owner);

// Configure the policy (e.g., max 5% of supply per address)
host.Call(holdingLimit, owner, p => p.SetLimit(tokenAddress, maxAmount));

// Register the policy with the token
host.Call(token, owner, t => t.AddPolicy(holdingLimit.Address));
```

Once registered, the policy is enforced automatically on every subsequent transfer. No changes to the transfer call site are required.

## Analyzers

Two Roslyn analyzers provide compile-time safety checks specific to policy hooks:

### BST010: State Before Policy

**Severity:** Warning

Warns if contract state is written before a policy check executes. This is a correctness issue: if state is modified before the policy enforcer runs and the policy subsequently denies the transfer, the state modification may not be properly reverted in all code paths.

**Pattern detected:**

```csharp
// BST010: State written before policy check
_balances.Set(from, newBalance);  // State modification
_enforcer.EnforceAll(from, to, amount);  // Policy check happens after
```

**Fix:** Always invoke `EnforceAll` before any state modifications.

### BST012: Missing Policy Enforcement

**Severity:** Warning

Warns if a token contract (any class inheriting from `BST20Token`, `BST721Token`, or `BST1155Token`) does not include policy enforcement in its transfer path. This diagnostic catches cases where a developer creates a regulated token but forgets to wire up the `PolicyEnforcer`.

**Fix:** Add a `PolicyEnforcer` and call `EnforceAll` in the `BeforeTransfer` override, or suppress the diagnostic with justification if the token is intentionally unregulated.
