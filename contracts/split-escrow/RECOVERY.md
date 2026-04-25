# Split Escrow Compile Recovery

This document tracks the compile blockers found in `contracts/split-escrow/src/` and the
fixes applied to restore the contract to a clean baseline.

## Identified Issues

### 1. Duplicate `metadata` parameter in `create_escrow` (`lib.rs`)

`create_escrow` declared `metadata: Map<String, String>` twice — once as a required parameter
(line 99) and again as `metadata: Option<Map<String, String>>` (line 104).  Rust rejects
duplicate parameter names in function signatures.

**Fix:** Remove the duplicate parameter.  The required `Map<String, String>` form is kept;
the `Option` branch is removed.  `validate_metadata` is called on the single map directly.

### 2. Undefined `current_balance` in `deposit` (`lib.rs`)

`deposit` read `previous_balance` from `split.balances` (line 266), then shadowed it with an
identical `let previous_balance` binding (line 276), and finally referenced the never-declared
name `current_balance` in the second `balances.set` call (line 287).

**Fix:** Remove the duplicate binding.  A single `previous_balance` is read once; the balance
update is `previous_balance + amount` throughout.

### 3. Missing `emit_contract_upgraded` in `events.rs`

`upgrade_version` called `events::emit_contract_upgraded` which did not exist in `events.rs`,
causing a missing-item compile error.

**Fix:** Add `emit_contract_upgraded(env, old_version, new_version)` to `events.rs`.

### 4. Duplicate imports in `storage.rs`

`storage.rs` duplicated both `use soroban_sdk::{contracttype, Address, Env, String};` and
`use crate::types::Split;`.  While Rust tolerates some duplicate `use` items, the duplication
produced warnings that break `cargo clippy -D warnings`.

**Fix:** Deduplicate the import blocks so each item appears exactly once.

### 5. `whitelist_enabled` parameter shadowed by hard-coded `false` (`lib.rs`)

The caller-supplied `whitelist_enabled: bool` parameter was immediately overwritten with the
literal `false` (line 154), making the parameter useless and misleading.

**Fix:** Remove the shadowing assignment.  The caller-supplied value is forwarded directly to
`storage::set_whitelist_enabled`.

## Verification

After applying the fixes above, the crate should compile cleanly:

```
cargo build -p split-escrow --target wasm32-unknown-unknown --release
cargo test  -p split-escrow
cargo clippy -p split-escrow -- -D warnings
```
