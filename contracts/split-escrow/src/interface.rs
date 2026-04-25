/// Canonical parameter contract for `create_escrow`.
///
/// This module defines the single unambiguous input type accepted by
/// `SplitEscrowContract::create_escrow`, eliminating the conflicting duplicate
/// `metadata` parameters and the ignored `whitelist_enabled` flag that existed
/// in the previous signature.
///
/// ## Design decisions
///
/// * `metadata` is a plain `Map<String, String>` — always present, empty by
///   default.  An `Option` wrapper is unnecessary because an empty map is
///   already a valid "no metadata" state.
///
/// * `note` remains `Option<String>` because `None` and an empty string have
///   the same storage representation and callers should be explicit.
///
/// * `whitelist_enabled` is removed from the create call.  Whitelist state is
///   managed after creation via `toggle_whitelist` / `add_to_whitelist` /
///   `remove_from_whitelist`.  Initialising it at creation time was confusing
///   because the flag was immediately overwritten with `false` in the old code.
///
/// * `max_participants` stays as `Option<u32>`; `None` means "use the
///   contract-level default of 50".
use soroban_sdk::{contracttype, Address, Map, String};

/// Input type for `create_escrow`.
///
/// All validation rules (note length, metadata entry count/length, obligation
/// sum == total_amount) are enforced inside `create_escrow` itself; this type
/// is a plain data carrier.
#[contracttype]
#[derive(Clone, Debug)]
pub struct CreateEscrowParams {
    /// Address that will own and be able to finalise the escrow.
    pub creator: Address,

    /// Human-readable description stored on-chain.
    pub description: String,

    /// Exact total that must be deposited before the escrow can be released.
    /// Must be positive and equal to the sum of all obligation values.
    pub total_amount: i128,

    /// Per-participant expected contribution amounts.
    /// `sum(obligations.values()) == total_amount` is enforced on creation.
    pub obligations: Map<Address, i128>,

    /// Optional upper bound on distinct depositing participants.
    /// Defaults to the contract constant `DEFAULT_MAX_PARTICIPANTS` (50) when
    /// `None`.
    pub max_participants: Option<u32>,

    /// Arbitrary key/value pairs attached to the escrow (max 32 entries, each
    /// key and value ≤ 128 bytes).  Pass an empty map when no metadata is
    /// needed.
    pub metadata: Map<String, String>,

    /// Short on-chain context string (≤ 128 bytes).  `None` stores an empty
    /// string; callers should use `set_note` to update it after creation.
    pub note: Option<String>,
}
