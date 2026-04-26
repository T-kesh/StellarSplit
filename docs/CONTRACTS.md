# StellarSplit Smart Contract Developer Guide

This guide explains how the Soroban smart contracts work, how to deploy them, and how to interact with them from the backend.

> ⚠️ **IMPORTANT: CONTRACT STATUS**  
> Several contracts (including `split-escrow`, `dispute-resolution`, and `multi-sig-splits`) are currently **BROKEN** and undergoing maintenance. They cannot be deployed or integrated at this time.
> For a full breakdown of which contracts are safe to use, please review the [Contracts Status Matrix](./contracts-status.md) before writing any integration code.

## Architecture Overview

StellarSplit relies on a modular suite of Soroban smart contracts. Instead of a single monolithic contract, functionalities are split into targeted workspaces:

### Production-Ready Modules
These modules are fully tested, compile successfully, and are ready for integration:
- **`split-template`**: Manages reusable split templates with versioning.
- **`staking`**: Handles staking, governance delegation, and reward distribution.
- **`flash-loan`**: A flash loan protocol for advanced financial operations.
- **`path-payment`**: Automatic currency conversion via Stellar path payments.
- **`achievement-badges`**: Manages NFT achievement badges.

### Broken/Experimental Modules
These modules currently have compilation errors or structural issues and **should not be integrated**:
- **`split-escrow`**: Trustless bill split escrow (DO NOT USE).
- **`dispute-resolution`**: On-chain dispute handling (DO NOT USE).
- **`multi-sig-splits`**: Multi-signature coordination (DO NOT USE).

---

## Local Setup

### Prerequisites
- **Rust**: `rustup default nightly`
- **Soroban CLI**: `cargo install --locked soroban-cli`
- **Stellar CLI**: `cargo install --locked stellar-cli`

### Network Configuration
```bash
# Add testnet
stellar network add testnet \
  --rpc-url https://soroban-testnet.stellar.org:443 \
  --network-passphrase "Test SDF Network ; September 2015"

# Generate/Add identity
stellar keys generate dev --network testnet
```

---

## Building and Testing

> Note: Because some contracts are broken, you should rely on the CI scripts or specify the package explicitly to avoid workspace-wide errors.

### Build (Healthy Contracts Only)
```bash
# Run from the /contracts directory using the CI script
bash scripts/ci-contracts.sh build
```

### Run Tests (Healthy Contracts Only)
```bash
# Test a specific package
cargo test -p split-template

# Or test all healthy contracts via CI script
bash scripts/ci-contracts.sh test
```

---

## Deployment

Deploying a production-ready contract (e.g., `split-template`):

```bash
# Deploy to testnet
stellar contract deploy \
  --wasm target/wasm32-unknown-unknown/release/split_template.wasm \
  --source dev \
  --network testnet
```

---

## Backend Integration

The backend interacts with the contracts using the `@stellar/stellar-sdk` and `@stellar/freighter-api`. Ensure you track the contract IDs returned during deployment and listen for contract events (like `deposit`, `released`, or `template_created`) using Horizon to update local database states.

**Reminder**: Do not write backend integration code targeting the `split-escrow` contract until it is marked as `Production` in the [Contracts Status Matrix](./contracts-status.md).
