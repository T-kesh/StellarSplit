//! # Achievement Badges NFT Contract
//!
//! This contract implements an NFT minting system for achievement badges
//! in the StellarSplit application.

#![no_std]

use soroban_sdk::{contract, contractimpl, panic_with_error, Address, Env, Vec};

mod eligibility;
mod events;
mod storage;
mod types;

#[cfg(test)]
mod test;

pub use eligibility::*;
pub use events::*;
pub use storage::*;
pub use types::*;

/// The main Achievement Badges contract
#[contract]
pub struct AchievementBadgesContract;

#[contractimpl]
impl AchievementBadgesContract {
    /// Initialize the contract with an admin address
    pub fn initialize(env: Env, admin: Address) {
        // Ensure the contract hasn't been initialized already
        if storage::has_admin(&env) {
            panic_with_error!(&env, BadgeError::Unauthorized);
        }

        // Verify the admin is authorizing this call
        admin.require_auth();

        // Store the admin address
        storage::set_admin(&env, &admin);

        // Emit initialization event
        events::emit_initialized(&env, &admin);
    }

    /// Check if a user is eligible for a specific badge based on achievement evidence
    ///
    /// This function evaluates real achievement evidence against badge criteria.
    /// It takes explicit contract inputs to back the eligibility decision.
    pub fn check_badge_eligibility_with_evidence(
        env: Env,
        user: Address,
        badge_type: BadgeType,
        evidence: AchievementEvidence,
    ) -> EligibilityResult {
        // Verify the user is authorizing this call
        user.require_auth();

        // Use the eligibility provider with standard BigSpender threshold
        // (can be parameterized per deployment)
        let big_spender_threshold = 1_000_000_000; // Configurable threshold
        eligibility::evaluate_eligibility(&badge_type, &evidence, big_spender_threshold)
    }

    /// Mint a badge NFT for a user backed by real achievement evidence
    ///
    /// This function mints a new badge NFT if:
    /// 1. The user hasn't already minted this badge type
    /// 2. The provided evidence meets the badge eligibility criteria
    pub fn mint_badge_with_evidence(
        env: Env,
        user: Address,
        badge_type: BadgeType,
        evidence: AchievementEvidence,
    ) -> Result<u64, BadgeError> {
        // Verify the user is authorizing this call
        user.require_auth();

        // Check if user has already minted this badge
        if storage::has_minted_badge(&env, &user, &badge_type) {
            return Err(BadgeError::AlreadyMinted);
        }

        // Evaluate eligibility based on evidence
        let big_spender_threshold = 1_000_000_000; // Configurable threshold
        let eligibility_result =
            eligibility::evaluate_eligibility(&badge_type, &evidence, big_spender_threshold);

        match eligibility_result {
            EligibilityResult::Eligible => {
                // Generate token ID
                let token_id = storage::get_next_token_id(&env);

                // Create user badge record
                let badge = UserBadge {
                    badge_type: badge_type.clone(),
                    token_id: token_id,
                    minted_at: env.ledger().timestamp(),
                };

                // Store the badge
                storage::add_user_badge(&env, &user, &badge);
                storage::set_minted_badge(&env, &user, &badge_type);

                // Emit minting event
                events::emit_badge_minted(&env, &user, &badge_type, &token_id);

                Ok(token_id)
            }
            EligibilityResult::NotEligible(_) => Err(BadgeError::NotEligible),
        }
    }

    /// Get all badges owned by a user
    pub fn get_user_badges(env: Env, user: Address) -> Vec<UserBadge> {
        storage::get_user_badges(&env, &user)
    }

    /// Get metadata for a badge type
    pub fn get_badge_metadata(env: Env, badge_type: BadgeType) -> BadgeMetadata {
        storage::get_badge_metadata(&env, &badge_type)
    }
}
