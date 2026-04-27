# Contract CI Documentation

This document explains the contract CI system, supported contracts, and how to contribute new contracts to the StellarSplit project.

## Overview

The StellarSplit project uses a dedicated CI script (`contracts/scripts/ci-contracts.sh`) to validate smart contracts before they are accepted into the supported set. This ensures that all contracts meet quality standards and compile correctly under the pinned Soroban toolchain.

## CI Script Structure

### Location and Purpose

- **Script**: `contracts/scripts/ci-contracts.sh`
- **Purpose**: Validates formatting, runs tests, and builds WASM for supported contracts
- **Scope**: Only contracts that compile cleanly are included in CI

### Supported Commands

```bash
# Run all checks (fmt + test + build) for all supported contracts
bash scripts/ci-contracts.sh all

# Run individual checks
bash scripts/ci-contracts.sh fmt    # Check code formatting
bash scripts/ci-contracts.sh test   # Run unit tests
bash scripts/ci-contracts.sh build  # Build WASM binaries
```

### CI Process Flow

1. **Format Check**: Ensures code follows Rust formatting standards
2. **Test Execution**: Runs all unit tests for each contract
3. **WASM Build**: Compiles contracts to WebAssembly for deployment

## Supported Contracts

### Currently Supported (CI-Passing)

The following contracts are included in CI and must pass all checks:

| Contract | Status | Description |
|----------|--------|-------------|
| `achievement-badges` | Production | NFT achievement badges system |
| `dispute-resolution` | Production | On-chain dispute voting and escrow settlement |
| `flash-loan` | Production | Flash loan protocol implementation |
| `path-payment` | Production | Automatic currency conversion via Stellar path payments |
| `split-template` | Production | Reusable split templates with versioning |
| `staking` | Production | Staking, governance delegation, and reward distribution |

### Experimental/Broken Contracts

These contracts remain in the workspace for development but are **excluded from CI**:

| Contract | Status | Issue | Resolution Path |
|----------|--------|-------|-----------------|
| `split-escrow` | Experimental | Many compilation errors (draft/broken source) | Complete rewrite or major fixes needed |
| `multi-sig-splits` | Experimental | E0507 move error (needs ownership fix) | Fix ownership issues in Rust code |

### Archived Contracts

Contracts that are no longer maintained:

| Contract | Status | Reason |
|----------|--------|--------|
| `reminder` | Archived | Orphaned contract area; incomplete structure |

## Workspace Configuration

### Cargo.toml Structure

The `contracts/Cargo.toml` workspace includes:

```toml
[workspace]
members = [
    # All contracts (including experimental)
    "achievement-badges",
    "flash-loan", 
    "dispute-resolution",
    "path-payment",
    "split-template",
    "staking",
    "split-escrow",        # Experimental - excluded from CI
    "multi-sig-splits",    # Experimental - excluded from CI
]
```

**Key Points**:
- Experimental contracts remain in workspace for dependency sharing
- Only supported contracts are included in `SUPPORTED_CONTRACTS` array in CI script
- This allows local development while maintaining CI quality gates

## Contribution Guidelines

### Adding New Contracts

#### 1. Initial Development

1. Create your contract directory under `contracts/`
2. Add to `contracts/Cargo.toml` members array
3. Implement contract with proper tests
4. Ensure it compiles to WASM

#### 2. Local Validation

Before submitting, run the full CI suite locally:

```bash
cd contracts
bash scripts/ci-contracts.sh all
```

#### 3. Graduation Process

To graduate a contract from experimental to supported:

1. **Fix All Compilation Issues**: Contract must compile cleanly
2. **Add Comprehensive Tests**: Ensure good test coverage
3. **Update CI Script**: Add contract to `SUPPORTED_CONTRACTS` array
4. **Update Documentation**: Update status tables in README files
5. **Submit PR**: Include CI script changes and documentation updates

#### 4. PR Requirements

Your pull request should include:

- Contract source code with tests
- Updated `contracts/Cargo.toml` (if new contract)
- Updated `scripts/ci-contracts.sh` (if graduating to supported)
- Updated documentation files:
  - `contracts/README.md`
  - `docs/contract-ci.md`
  - `CONTRIBUTING.md`

### Experimental Contract Development

When developing experimental contracts:

1. **Add to Workspace**: Include in `contracts/Cargo.toml` members
2. **Do NOT Add to CI**: Keep out of `SUPPORTED_CONTRACTS` array
3. **Document Status**: Clearly mark as experimental in documentation
4. **Track Issues**: Document known problems and resolution path

### Contract Quality Standards

#### Code Quality Requirements

- **Formatting**: Must pass `cargo fmt --all -- --check`
- **Testing**: Must have comprehensive unit tests
- **Compilation**: Must build cleanly for `wasm32-unknown-unknown` target
- **Clippy**: Should pass clippy lints (warnings acceptable for experimental)

#### Documentation Requirements

Each contract should include:

- **README.md**: Contract purpose, usage, and API documentation
- **Inline Documentation**: Comprehensive code comments
- **Test Documentation**: Clear test descriptions and edge case coverage

## CI Integration

### GitHub Actions Integration

The CI script is designed to integrate with GitHub Actions:

```yaml
- name: Run Contract CI
  run: |
    cd contracts
    bash scripts/ci-contracts.sh all
```

### Local Development Workflow

1. **Make Changes**: Edit contract code
2. **Run Local CI**: `bash scripts/ci-contracts.sh all`
3. **Fix Issues**: Address any formatting, test, or build failures
4. **Submit PR**: Only submit when local CI passes

### Troubleshooting Common Issues

#### Compilation Errors

```bash
# Check specific contract compilation
cd contracts/your-contract
cargo build --target wasm32-unknown-unknown --release

# Check for detailed errors
cargo build --target wasm32-unknown-unknown --release --verbose
```

#### Test Failures

```bash
# Run tests with output
cd contracts/your-contract
cargo test -- --nocapture

# Run specific test
cargo test test_function_name
```

#### Formatting Issues

```bash
# Auto-fix formatting
cd contracts/your-contract
cargo fmt

# Check what would change
cargo fmt --all -- --check
```

## Policy and Governance

### CI Support Policy

- **Supported Contracts**: Must always pass CI
- **Experimental Contracts**: May fail CI, but should be actively worked on
- **Breaking Changes**: Must not break existing supported contracts
- **Dependencies**: Use workspace dependencies when possible

### Release Process

1. **CI Validation**: All supported contracts must pass CI
2. **Version Bump**: Update contract versions if needed
3. **Documentation**: Update all relevant documentation
4. **Release Tag**: Create release tag with changelog

### Maintenance Responsibilities

- **CI Script**: Maintained by core team
- **Contract Updates**: Original authors or assigned maintainers
- **Documentation**: Community contributions with core review

## Getting Help

### Resources

- **Soroban Documentation**: https://soroban.stellar.org/docs/
- **Rust Book**: https://doc.rust-lang.org/book/
- **StellarSplit Repository**: Issue tracking and discussions

### Contact Channels

- **GitHub Issues**: For bug reports and feature requests
- **GitHub Discussions**: For general questions and community support
- **Core Team**: For CI script and policy issues

## Appendix

### CI Script Reference

The `SUPPORTED_CONTRACTS` array in `scripts/ci-contracts.sh` is the single source of truth for CI-supported contracts:

```bash
SUPPORTED_CONTRACTS=(
  "achievement-badges"
  "dispute-resolution" 
  "flash-loan"
  "path-payment"
  "split-template"
  "staking"
)
```

### Workspace Dependencies

Common dependencies are managed at the workspace level:

```toml
[workspace.dependencies]
soroban-sdk = "21.0.0"
```

This ensures version consistency across all contracts.
