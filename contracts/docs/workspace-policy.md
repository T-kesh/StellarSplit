# Contracts Workspace Policy

This document is the authoritative reference for which Soroban contracts belong
to the Cargo workspace, which are CI-supported, and how a contract graduates
from experimental to production.

---

## Workspace Membership

All contracts under `contracts/` are members of the Cargo workspace defined in
`contracts/Cargo.toml`. Membership lets every crate share the pinned
`soroban-sdk` version and workspace-level build profiles.

Being a workspace member does **not** mean a contract is CI-supported. The two
concepts are intentionally separate:

| Concept | Controlled by | Purpose |
|---------|--------------|---------|
| Workspace membership | `contracts/Cargo.toml` `members` list | Shared deps, local builds |
| CI support | `scripts/ci-contracts.sh` `SUPPORTED_CONTRACTS` | Gate on fmt + test + build |

---

## Contract Tiers

### Production

Contracts that compile cleanly, have passing tests, and are included in CI.

| Contract | Notes |
|----------|-------|
| achievement-badges | NFT achievement badges |
| flash-loan | Flash loan protocol |
| path-payment | Automatic currency conversion via Stellar path payments |
| split-template | Reusable split templates with versioning |
| staking | Staking, governance delegation, and reward distribution |
| dispute-resolution | On-chain dispute voting and escrow settlement |

### Experimental

Contracts that are in the workspace for local development but are **excluded
from CI** because they do not yet compile cleanly.

| Contract | Blocking issue |
|----------|---------------|
| split-escrow | Many compilation errors (draft/broken source) |
| multi-sig-splits | E0507 move error; needs ownership fix |

Experimental contracts must not be added to `SUPPORTED_CONTRACTS` in
`ci-contracts.sh` until they pass all three CI steps (fmt, test, build).

### Archived

Contracts that are no longer actively developed and have been moved out of the
active source tree.

| Contract | Notes |
|----------|-------|
| reminder | Orphaned; incomplete structure |

---

## Graduating a Contract from Experimental to Production

1. Fix all compilation errors so `cargo build --manifest-path <crate>/Cargo.toml --target wasm32-unknown-unknown --release` succeeds.
2. Add unit tests covering the contract's public interface.
3. Verify `cargo fmt --manifest-path <crate>/Cargo.toml --all -- --check` passes.
4. Add the contract name to `SUPPORTED_CONTRACTS` in `scripts/ci-contracts.sh`.
5. Update the status table in `contracts/README.md` from **Experimental** to **Production**.
6. Open a PR referencing this policy document.

---

## Demoting a Contract

If a previously Production contract stops compiling (e.g. after a toolchain
bump):

1. Remove it from `SUPPORTED_CONTRACTS` in `ci-contracts.sh`.
2. Update its status in `contracts/README.md` to **Experimental**.
3. Open a tracking issue describing the compilation failure.
4. Do **not** remove it from the workspace `members` list — local builds should
   still be possible.

---

## CI Script Reference

`scripts/ci-contracts.sh` accepts one of four commands:

| Command | Action |
|---------|--------|
| `all` (default) | Run fmt, test, and build for every supported contract |
| `fmt` | Check formatting only |
| `test` | Run unit tests only |
| `build` | Compile to WASM only |

Example:

```bash
bash scripts/ci-contracts.sh all
bash scripts/ci-contracts.sh test
```

Only contracts listed in `SUPPORTED_CONTRACTS` are processed. Experimental
contracts are skipped automatically.
