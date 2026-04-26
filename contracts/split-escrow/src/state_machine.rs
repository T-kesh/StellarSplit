/// Escrow state machine for split-escrow.
///
/// Centralises all valid state transitions and provides a single call-site for
/// enforcing them, so `lib.rs` never mutates `SplitStatus` directly — it always
/// goes through `transition`.  This makes invalid transitions immediately
/// detectable and keeps lifecycle event emission co-located with the transition
/// that caused it.
///
/// ## State graph
///
/// ```text
///  ┌─────────┐  deposit (obligations met)   ┌───────┐
///  │ Pending │ ────────────────────────────► │ Ready │
///  └─────────┘                               └───────┘
///       │                                        │
///       │ cancel (creator)                       │ release (creator)
///       ▼                                        ▼
///  ┌───────────┐                          ┌──────────┐
///  │ Cancelled │                          │ Released │
///  └───────────┘                          └──────────┘
///       ▲
///       │ cancel (creator, from Ready)
///       │
///  ───────
/// ```
///
/// Terminal states (`Released`, `Cancelled`) have no outgoing transitions.
use crate::errors::Error;
use crate::types::SplitStatus;

/// Every valid (from, to) pair in the state machine.
const ALLOWED_TRANSITIONS: &[(SplitStatus, SplitStatus)] = &[
    (SplitStatus::Pending, SplitStatus::Ready),
    (SplitStatus::Pending, SplitStatus::Cancelled),
    (SplitStatus::Ready, SplitStatus::Released),
    (SplitStatus::Ready, SplitStatus::Cancelled),
];

/// Attempt to transition `current` to `next`.
///
/// Returns `Ok(())` when the transition is allowed; otherwise returns
/// `Err(Error::SplitNotActive)` for terminal-state violations or
/// `Err(Error::InvalidInput)` for any other forbidden move.
pub fn transition(current: &SplitStatus, next: &SplitStatus) -> Result<(), Error> {
    // Terminal states may never be left.
    if *current == SplitStatus::Released || *current == SplitStatus::Cancelled {
        return Err(Error::SplitNotActive);
    }

    for (from, to) in ALLOWED_TRANSITIONS {
        if from == current && to == next {
            return Ok(());
        }
    }

    Err(Error::InvalidInput)
}

/// Returns `true` when the status is one from which deposits and metadata
/// updates are still accepted (i.e. the escrow is not yet finalised).
pub fn is_active(status: &SplitStatus) -> bool {
    *status == SplitStatus::Pending || *status == SplitStatus::Ready
}

/// Returns `true` when funds can be deposited into the escrow.
pub fn accepts_deposits(status: &SplitStatus) -> bool {
    *status == SplitStatus::Pending
}

/// Returns `true` when the escrow can be released (all obligations met).
pub fn can_release(status: &SplitStatus) -> bool {
    *status == SplitStatus::Ready
}

/// Returns `true` when the escrow can be cancelled by its creator.
pub fn can_cancel(status: &SplitStatus) -> bool {
    *status == SplitStatus::Pending || *status == SplitStatus::Ready
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn pending_to_ready_allowed() {
        assert!(transition(&SplitStatus::Pending, &SplitStatus::Ready).is_ok());
    }

    #[test]
    fn pending_to_cancelled_allowed() {
        assert!(transition(&SplitStatus::Pending, &SplitStatus::Cancelled).is_ok());
    }

    #[test]
    fn ready_to_released_allowed() {
        assert!(transition(&SplitStatus::Ready, &SplitStatus::Released).is_ok());
    }

    #[test]
    fn ready_to_cancelled_allowed() {
        assert!(transition(&SplitStatus::Ready, &SplitStatus::Cancelled).is_ok());
    }

    #[test]
    fn released_is_terminal() {
        assert!(transition(&SplitStatus::Released, &SplitStatus::Pending).is_err());
        assert!(transition(&SplitStatus::Released, &SplitStatus::Cancelled).is_err());
    }

    #[test]
    fn cancelled_is_terminal() {
        assert!(transition(&SplitStatus::Cancelled, &SplitStatus::Pending).is_err());
        assert!(transition(&SplitStatus::Cancelled, &SplitStatus::Ready).is_err());
    }

    #[test]
    fn pending_to_released_forbidden() {
        assert!(transition(&SplitStatus::Pending, &SplitStatus::Released).is_err());
    }
}
